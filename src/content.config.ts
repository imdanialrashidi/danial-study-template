import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/*
 * The content contract for course authors and AI agents.
 *
 * Every collection shares a common metadata shape (title, slug, order, section,
 * difficulty, estimated time, prerequisites, tags) so the engine can build
 * navigation, search, and cross-links uniformly without knowing what subject
 * the course teaches. Nothing here assumes physics, calculus, or any other
 * discipline.
 *
 * Validation is fail-fast: a malformed or incomplete entry breaks the build
 * instead of producing a broken page.
 */

const SLUG = z
  .string()
  .min(2, 'slug must be at least 2 characters')
  .max(80, 'slug must be at most 80 characters')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase kebab-case (a-z, 0-9, hyphens)');

/** Section ids come from src/config/course.ts; validated against it at build. */
const SECTION_ID = z
  .string()
  .min(2)
  .max(40)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'section must be lowercase kebab-case');

const DIFFICULTY = z.enum(['beginner', 'intermediate', 'advanced']);

/** Minutes; kept as a number so totals can be computed and rendered. */
const ESTIMATED_MINUTES = z.number().int().positive().max(600);

const TAGS = z.array(z.string().min(1).max(40)).max(12).optional();

/** Slugs of other content entries that must exist before the build succeeds. */
const PREREQUISITES = z.array(SLUG).max(8).optional();

/**
 * Fields shared by every content type.
 */
const baseMeta = z.object({
  // Persian terms are often very short ("حد", "تابع"), so 2 is the floor.
  title: z.string().min(2, 'title must be at least 2 characters').max(140),
  description: z.string().min(10, 'description must be at least 10 characters').max(320),
  section: SECTION_ID,
  difficulty: DIFFICULTY,
  order: z.number().int().min(0).max(9999),
  estimatedMinutes: ESTIMATED_MINUTES,
  prerequisites: PREREQUISITES,
  tags: TAGS,
  draft: z.boolean().default(false),
  /**
   * Last substantive update (`YYYY-MM-DD`). Optional; when set it renders a
   * visible "last updated" line plus `dateModified` structured data.
   */
  updated: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'updated must be YYYY-MM-DD')
    .optional(),
});

/** Reference to a formula entry, optionally with the specific formula id. */
const formulaRef = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*(#[a-z0-9][a-z0-9-]*)?$/, 'must be "formula-slug" or "formula-slug#formula-id"');

const conceptRef = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*(#[a-z0-9][a-z0-9-]*)?$/, 'must be "concept-slug" or "concept-slug#concept-id"');

/* ── Lessons ──────────────────────────────────────────────────────────────
   The main teaching unit. An ordered narrative with prerequisites and
   optional formula/concept references it depends on. */

const lesson = defineCollection({
  loader: glob({ base: './src/content/lessons', pattern: '**/*.{md,mdx}' }),
  schema: baseMeta.extend({
    type: z.literal('lesson'),
    /** Outcome the learner should be able to do after this lesson. */
    objective: z.string().min(10).max(240),
    formulas: z.array(formulaRef).max(12).optional(),
    concepts: z.array(conceptRef).max(12).optional(),
  }),
});

/* ── Concepts ─────────────────────────────────────────────────────────────
   A single idea or term explained once, linkable from anywhere. */

const concept = defineCollection({
  loader: glob({ base: './src/content/concepts', pattern: '**/*.{md,mdx}' }),
  schema: baseMeta.extend({
    type: z.literal('concept'),
    /** Short one-line definition used in lists and search results. */
    short: z.string().min(10).max(200),
    formulas: z.array(formulaRef).max(8).optional(),
  }),
});

/* ── Formulas ─────────────────────────────────────────────────────────────
   A formula sheet page. The body may contain several <Formula id="..."> blocks. */

const formula = defineCollection({
  loader: glob({ base: './src/content/formulas', pattern: '**/*.{md,mdx}' }),
  schema: baseMeta.extend({
    type: z.literal('formula'),
    /** Human-readable name, e.g. "قاعده زنجیره‌ای". */
    name: z.string().min(2).max(120),
    /** TeX source of the headline formula, rendered at build time. */
    latex: z.string().min(3).max(500),
    /** Units or applicability, shown as a plate footnote. */
    units: z.string().max(60).optional(),
    /** Where this formula is valid — prevents misuse. */
    conditions: z.array(z.string().min(3).max(200)).max(8).optional(),
  }),
});

/* ── Worked examples ──────────────────────────────────────────────────────
   A full problem walked through in steps. */

const example = defineCollection({
  loader: glob({ base: './src/content/examples', pattern: '**/*.{md,mdx}' }),
  schema: baseMeta.extend({
    type: z.literal('example'),
    difficulty: DIFFICULTY,
    /** The problem statement, shown before the hidden solution. */
    problem: z.string().min(10).max(600),
    /** Optional reference to the formula this example applies. */
    formula: formulaRef.optional(),
  }),
});

/* ── Practice / questions ─────────────────────────────────────────────────
   A set of practice questions for one topic. */

const question = defineCollection({
  loader: glob({ base: './src/content/questions', pattern: '**/*.{md,mdx}' }),
  schema: baseMeta.extend({
    type: z.literal('question'),
    /** Marks for this set, used for the score summary. */
    points: z.number().int().positive().max(100).default(1),
    /** Shown before the learner starts. */
    instructions: z.string().max(400).optional(),
  }),
});

/* ── Glossary ─────────────────────────────────────────────────────────────
   Term → definition, one per file. */

const glossary = defineCollection({
  loader: glob({ base: './src/content/glossary', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    type: z.literal('glossary'),
    /** The term as it should be looked up. */
    term: z.string().min(1).max(80),
    /** One-sentence definition shown in the list and search. */
    short: z.string().min(10).max(240),
    /** Optional grouping inside the glossary index. */
    group: z.string().min(2).max(40).optional(),
    tags: TAGS,
    draft: z.boolean().default(false),
    /** Last substantive update (`YYYY-MM-DD`); same rendering as other kinds. */
    updated: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'updated must be YYYY-MM-DD')
      .optional(),
  }),
});

export const collections = { lesson, concept, formula, example, question, glossary };

/** Collection keys → the singular label used in Persian UI. */
export const COLLECTION_LABELS = {
  lesson: 'درس',
  concept: 'مفهوم',
  formula: 'فرمول',
  example: 'مثال حل‌شده',
  question: 'تمرین',
  glossary: 'واژه‌نامه',
} as const;

export type CollectionKey = keyof typeof collections;