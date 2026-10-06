import { getCollection, type CollectionEntry } from 'astro:content';
import { courseConfig } from '../config/course';
import type { ContentType, Difficulty, SearchableItem } from './types';
import { normalizePersian } from './utils';
import { renderContent } from './render';

/**
 * A single, uniform view over every content collection.
 *
 * The engine never asks "is this a physics lesson?" — it asks "what kind of
 * entry is this, and where does it belong?". That keeps the core independent of
 * any subject.
 */

export type AnyEntry = CollectionEntry<'lesson'> | CollectionEntry<'concept'> | CollectionEntry<'formula'>
  | CollectionEntry<'example'> | CollectionEntry<'question'> | CollectionEntry<'glossary'>;

export type EntryKind = ContentType;

type LessonData = CollectionEntry<'lesson'>['data'];
type ConceptData = CollectionEntry<'concept'>['data'];
type FormulaData = CollectionEntry<'formula'>['data'];
type ExampleData = CollectionEntry<'example'>['data'];
type QuestionData = CollectionEntry<'question'>['data'];
type GlossaryData = CollectionEntry<'glossary'>['data'];

export type { LessonData, ConceptData, FormulaData, ExampleData, QuestionData, GlossaryData };

export interface CourseEntry {
  id: string;
  kind: EntryKind;
  /**
   * Globally unique identity: `<kind>/<slug>`.
   *
   * Slugs are only unique *within* a collection, so a glossary term named
   * "derivative" legitimately shares its slug with a concept of the same name.
   * References may use the plain slug (resolved within the same collection, then
   * globally if unique) or the qualified form to be explicit.
   */
  qualifiedId: string;
  title: string;
  description: string;
  /** URL path relative to the site root, already base-path free. */
  path: string;
  section?: string;
  order: number;
  difficulty?: Difficulty;
  estimatedMinutes?: number;
  prerequisites: string[];
  tags: string[];
  /** Search-friendly plain text. */
  searchText: string;
  /** Normalised search text; produced once at build time. */
  normalized: string;
  /** Raw entry kept so a page can render its body. */
  entry: AnyEntry;
}

const URL_BY_KIND: Record<EntryKind, (id: string) => string> = {
  lesson: (id) => `/lessons/${id}`,
  concept: (id) => `/concepts/${id}`,
  formula: (id) => `/formulas/${id}`,
  example: (id) => `/examples/${id}`,
  question: (id) => `/practice/${id}`,
  glossary: (id) => `/glossary/${id}`,
};

const SINGULAR_LABELS: Record<EntryKind, string> = {
  lesson: 'درس',
  concept: 'مفهوم',
  formula: 'فرمول',
  example: 'مثال',
  question: 'تمرین',
  glossary: 'واژه',
};

const PLURAL_LABELS: Record<EntryKind, string> = {
  lesson: 'درس‌ها',
  concept: 'مفاهیم',
  formula: 'فرمول‌ها',
  example: 'مثال‌ها',
  question: 'تمرین‌ها',
  glossary: 'واژه‌ها',
};

export { SINGULAR_LABELS, PLURAL_LABELS, URL_BY_KIND };

/**
 * Glossary entries carry a `term` instead of a `title`, and have no section or
 * ordering, so they are projected into the same shape for search and linking.
 */
function project(entry: AnyEntry): CourseEntry {
  const data = entry.data as Record<string, unknown>;
  const kind = data.type as EntryKind;
  const title = kind === 'glossary' ? (data.term as string) : (data.title as string);
  const description =
    kind === 'glossary'
      ? (data.short as string)
      : kind === 'example'
        ? (data.problem as string)
        : (data.description as string);

  const extra = kind === 'concept' ? (data.short as string | undefined) : undefined;

  const searchText = [title, description, extra, ...((data.tags as string[] | undefined) ?? [])]
    .filter(Boolean)
    .join(' ');

  return {
    id: entry.id,
    kind,
    qualifiedId: `${kind}/${entry.id}`,
    title,
    description,
    path: URL_BY_KIND[kind](entry.id),
    section: data.section as string | undefined,
    order: (data.order as number | undefined) ?? 0,
    difficulty: data.difficulty as Difficulty | undefined,
    estimatedMinutes: data.estimatedMinutes as number | undefined,
    prerequisites: (data.prerequisites as string[] | undefined) ?? [],
    tags: (data.tags as string[] | undefined) ?? [],
    searchText,
    normalized: normalizePersian(searchText),
    entry,
  };
}

let cache: CourseEntry[] | null = null;

/** Every non-draft entry, sorted by section order then entry order. */
export async function getAllEntries(): Promise<CourseEntry[]> {
  if (cache) return cache;

  const [lessons, concepts, formulas, examples, questions, glossary] = await Promise.all([
    getCollection('lesson'),
    getCollection('concept'),
    getCollection('formula'),
    getCollection('example'),
    getCollection('question'),
    getCollection('glossary'),
  ]);

  const all = [...lessons, ...concepts, ...formulas, ...examples, ...questions, ...glossary]
    .map(project)
    .filter((e) => e.entry.data.draft !== true);

  const sectionOrder = new Map(courseConfig.sections.map((s) => [s.id, s.order]));
  const kindOrder: Record<EntryKind, number> = { lesson: 0, concept: 1, formula: 2, example: 3, question: 4, glossary: 5 };

  all.sort((a, b) => {
    const sa = a.section ? (sectionOrder.get(a.section) ?? 99) : 98;
    const sb = b.section ? (sectionOrder.get(b.section) ?? 99) : 98;
    if (sa !== sb) return sa - sb;
    const ka = kindOrder[a.kind];
    const kb = kindOrder[b.kind];
    if (ka !== kb) return ka - kb;
    if (a.order !== b.order) return a.order - b.order;
    return a.title.localeCompare(b.title, 'fa');
  });

  cache = all;
  return all;
}

export async function getEntriesByKind<K extends EntryKind>(kind: K): Promise<CourseEntry[]> {
  return (await getAllEntries()).filter((e) => e.kind === kind);
}

/** Entries grouped by configured section, in configuration order. */
export interface SectionGroup {
  id: string;
  title: string;
  description?: string;
  order: number;
  entries: CourseEntry[];
}

export async function getSectionGroups(): Promise<SectionGroup[]> {
  const all = await getAllEntries();
  return courseConfig.sections
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((section) => ({
      id: section.id,
      title: section.title,
      description: section.description,
      order: section.order,
      entries: all.filter((e) => e.section === section.id),
    }));
}

/**
 * Resolve a reference to an entry.
 *
 * Accepts either `<kind>/<slug>` (unambiguous) or a bare `<slug>`. A bare slug
 * is preferred within the same collection, then falls back to a globally unique
 * match. Returns undefined when nothing matches or when a bare slug is
 * ambiguous — callers surface that as a build error rather than linking wrongly.
 */
export async function resolveEntry(
  reference: string,
  preferKind?: EntryKind,
): Promise<CourseEntry | undefined> {
  const all = await getAllEntries();
  const [maybeKind, maybeId] = reference.includes('/') ? reference.split('/') : [undefined, reference];

  if (maybeKind && maybeId) {
    return all.find((e) => e.kind === maybeKind && e.id === maybeId);
  }

  const sameKind = preferKind ? all.filter((e) => e.kind === preferKind && e.id === maybeId) : [];
  if (sameKind.length === 1) return sameKind[0];

  const matches = all.filter((e) => e.id === maybeId);
  return matches.length === 1 ? matches[0] : undefined;
}

/** Entries that declare `id` as a prerequisite. */
export async function getDependents(qualifiedId: string): Promise<CourseEntry[]> {
  return (await getAllEntries()).filter((e) => e.prerequisites.includes(qualifiedId));
}

/**
 * Related entries derived from metadata — never hard-coded per page.
 *
 * Scoring: +3 per shared tag, +2 for the same section, +2 when the candidate
 * lists this entry as a prerequisite (or vice versa). Explicit cross-links
 * (formulas/concepts declared in frontmatter) are excluded so the two rails
 * complement rather than repeat each other. Deterministic ordering: score,
 * then section order, then Persian title.
 */
export async function getRelatedEntries(entry: CourseEntry, limit = 4): Promise<CourseEntry[]> {
  const all = await getAllEntries();
  const linked = new Set<string>();
  try {
    const cross = await getCrossLinks(entry);
    for (const e of [...cross.formulas, ...cross.concepts, ...cross.prerequisites, ...cross.dependents]) {
      linked.add(e.qualifiedId);
    }
  } catch {
    /* unresolved refs are reported by validation; related still works */
  }
  const tags = new Set(entry.tags);
  return all
    .filter((e) => e.qualifiedId !== entry.qualifiedId && !linked.has(e.qualifiedId) && e.kind !== 'glossary')
    .map((candidate) => {
      let score = 0;
      for (const tag of candidate.tags) if (tags.has(tag)) score += 3;
      if (candidate.section && candidate.section === entry.section) score += 2;
      if (candidate.prerequisites.includes(entry.qualifiedId) || entry.prerequisites.includes(candidate.qualifiedId)) score += 2;
      return { candidate, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.candidate.title.localeCompare(b.candidate.title, 'fa'))
    .slice(0, limit)
    .map((s) => s.candidate);
}

export async function getEntryById(id: string): Promise<CourseEntry | undefined> {
  return resolveEntry(id);
}

/** Cross-links between content types, used by lesson pages. */
export interface CrossLinks {
  formulas: CourseEntry[];
  concepts: CourseEntry[];
  prerequisites: CourseEntry[];
  dependents: CourseEntry[];
  /** References that could not be resolved — surfaced as build errors. */
  unresolved: string[];
}

export async function getCrossLinks(entry: CourseEntry): Promise<CrossLinks> {
  const data = entry.entry.data as Record<string, unknown>;
  const referenced = [
    ...((data.formulas as string[] | undefined) ?? []),
    ...((data.concepts as string[] | undefined) ?? []),
    ...(data.formula !== undefined ? [data.formula as string] : []),
  ];

  const unresolved: string[] = [];
  const resolve = async (ids: string[], preferKind?: EntryKind) => {
    const out: CourseEntry[] = [];
    for (const raw of ids) {
      const ref = raw.split('#')[0];
      const found = await resolveEntry(ref, preferKind);
      if (found) {
        if (!out.some((e) => e.qualifiedId === found.qualifiedId)) out.push(found);
      } else {
        unresolved.push(raw);
      }
    }
    return out;
  };

  const [prerequisites, dependents, linked] = await Promise.all([
    resolve(entry.prerequisites),
    getDependents(entry.qualifiedId),
    resolve(referenced),
  ]);

  if (unresolved.length > 0) {
    throw new Error(
      `"${entry.title}" references content that does not exist: ${unresolved.join(', ')}. ` +
        'Check the slugs, or qualify them as "<kind>/<slug>".',
    );
  }

  return {
    formulas: linked.filter((e) => e.kind === 'formula'),
    concepts: linked.filter((e) => e.kind === 'concept'),
    prerequisites,
    dependents,
    unresolved,
  };
}

/**
 * Compact search payload. Kept small on purpose — it ships to the client.
 *
 * The `href` values carry the deployment base so result links work on a
 * project-site deployment. The base is read from the runtime rather than baked
 * in at module load, because this module is also imported by tests.
 */
export function buildSearchIndex(entries: CourseEntry[]): SearchableItem[] {
  const base = ((import.meta.env?.BASE_URL ?? '/') as string).replace(/\/$/, '');
  const href = (path: string) => (base && path.startsWith('/') ? `${base}${path}` : path);

  return entries.map((e) => ({
    id: e.id,
    title: e.title,
    slug: e.id,
    type: e.kind,
    section: e.section,
    excerpt: e.description.slice(0, 180),
    tags: e.tags,
    href: href(e.path),
  }));
}

/**
 * Kind-specific frontmatter accessors.
 *
 * `AnyEntry` is a discriminated union on `data.type`, so a layout that renders
 * every kind must narrow before reading a kind-specific field. These helpers
 * keep that narrowing in one place instead of scattering `as` casts through the
 * templates — a cast there would silently produce `undefined` for the wrong
 * kind, which is exactly the "silently broken page" the typed contract exists
 * to prevent.
 */
export function lessonData(entry: CourseEntry): LessonData | undefined {
  return entry.kind === 'lesson' ? (entry.entry.data as LessonData) : undefined;
}

export function conceptData(entry: CourseEntry): ConceptData | undefined {
  return entry.kind === 'concept' ? (entry.entry.data as ConceptData) : undefined;
}

export function formulaData(entry: CourseEntry): FormulaData | undefined {
  return entry.kind === 'formula' ? (entry.entry.data as FormulaData) : undefined;
}

export function exampleData(entry: CourseEntry): ExampleData | undefined {
  return entry.kind === 'example' ? (entry.entry.data as ExampleData) : undefined;
}

export function questionData(entry: CourseEntry): QuestionData | undefined {
  return entry.kind === 'question' ? (entry.entry.data as QuestionData) : undefined;
}

export function glossaryData(entry: CourseEntry): GlossaryData | undefined {
  return entry.kind === 'glossary' ? (entry.entry.data as GlossaryData) : undefined;
}

/**
 * Validate that every declared prerequisite and reference resolves.
 * Used by the build-time validation script.
 */
export interface LinkProblem {
  from: string;
  kind: 'prerequisite' | 'formula' | 'concept';
  target: string;
  message: string;
}

export async function collectLinkProblems(entries: CourseEntry[]): Promise<LinkProblem[]> {
  const problems: LinkProblem[] = [];

  for (const entry of entries) {
    for (const target of entry.prerequisites) {
      if (!resolveSync(entries, target, entry.kind)) {
        problems.push({
          from: entry.qualifiedId,
          kind: 'prerequisite',
          target,
          message: `پیش‌نیاز «${target}» در «${entry.title}» یافت نشد`,
        });
      }
    }

    const data = entry.entry.data as Record<string, unknown>;
    const refs: Array<[LinkProblem['kind'], string[]]> = [
      ['formula', (data.formulas as string[] | undefined) ?? (data.formula ? [data.formula as string] : [])],
      ['concept', (data.concepts as string[] | undefined) ?? []],
    ];

    for (const [kind, list] of refs) {
      for (const raw of list) {
        const [target, fragment] = raw.split('#');
        const resolved = resolveSync(entries, target, entry.kind);
        if (!resolved) {
          problems.push({
            from: entry.qualifiedId,
            kind,
            target: raw,
            message: `ارجاع ${kind} «${raw}» در «${entry.title}» یافت نشد`,
          });
        } else if (fragment) {
          const body = await renderContent(resolved.entry);
          if (body && !new RegExp(`id=["']${fragment}["']`).test(body.Content.toString())) {
            problems.push({
              from: entry.qualifiedId,
              kind,
              target: raw,
              message: `شناسهٔ «${fragment}» در صفحهٔ «${target}» وجود ندارد`,
            });
          }
        }
      }
    }
  }

  return problems;
}

/** Synchronous resolution helper mirroring `resolveEntry`, for validation. */
function resolveSync(entries: CourseEntry[], reference: string, preferKind?: EntryKind): CourseEntry | undefined {
  if (reference.includes('/')) {
    const [kind, id] = reference.split('/');
    return entries.find((e) => e.kind === kind && e.id === id);
  }
  const sameKind = entries.filter((e) => e.kind === preferKind && e.id === reference);
  if (sameKind.length === 1) return sameKind[0];
  const matches = entries.filter((e) => e.id === reference);
  return matches.length === 1 ? matches[0] : undefined;
}