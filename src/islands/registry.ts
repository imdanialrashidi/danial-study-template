import type { ComponentType } from 'react';
import Quiz from './common/Quiz';
import SearchIsland from './common/SearchIsland';
import StepReveal from './common/StepReveal';
import ProgressToggle from './common/ProgressToggle';
import CommandPalette from './common/CommandPalette';
import ParamLab, { Slider, Toggle, Tabs, Reveal, LiveReadout, FunctionPlot } from './common/Controls';

/**
 * React island registry.
 *
 * The core layout never imports an island directly. Instead, an island is
 * registered here and referenced from MDX (via the MDX component map) or from a
 * page that genuinely needs client-side interaction.
 *
 * This pattern lets a future course add a new interactive component **without
 * touching any core layout or UI file**: drop the component in
 * `src/islands/course/`, register it here, and add it to the MDX map. The
 * engine gains a new capability without being rewritten.
 *
 * Guidelines:
 * - An island must earn its place: no island for something achievable with
 *   static HTML + a few lines of CSS.
 * - Interactive content should ship its own copy in the static HTML so the
 *   island adds behaviour, not information.
 * - Keep islands dependency-light; React is already present, heavy libraries are not.
 */

export interface IslandMeta {
  /** Stable name used in content/MDX. */
  name: string;
  /** Why this needs the client (used to prevent gratuitous hydration). */
  reason: string;
  component: ComponentType<never>;
}

/** Islands available to every course. */
const commonIslands: IslandMeta[] = [
  { name: 'Quiz', reason: 'multi-step state + grading', component: Quiz as ComponentType<never> },
  { name: 'SearchIsland', reason: 'query state over a client index', component: SearchIsland as ComponentType<never> },
  { name: 'StepReveal', reason: 'progressive disclosure state', component: StepReveal as ComponentType<never> },
  { name: 'ProgressToggle', reason: 'localStorage-backed state', component: ProgressToggle as ComponentType<never> },
  { name: 'CommandPalette', reason: 'global shortcut + query state', component: CommandPalette as ComponentType<never> },
  { name: 'ParamLab', reason: 'parameter + visualization state', component: ParamLab as ComponentType<never> },
  { name: 'Slider', reason: 'parameter input state', component: Slider as unknown as ComponentType<never> },
  { name: 'Toggle', reason: 'switch state', component: Toggle as unknown as ComponentType<never> },
  { name: 'Tabs', reason: 'tab selection state', component: Tabs as unknown as ComponentType<never> },
  { name: 'Reveal', reason: 'disclosure state', component: Reveal as unknown as ComponentType<never> },
  { name: 'LiveReadout', reason: 'announced derived state', component: LiveReadout as unknown as ComponentType<never> },
  { name: 'FunctionPlot', reason: 'parameter-driven visualization', component: FunctionPlot as unknown as ComponentType<never> },
];

// Course-specific islands are appended by the course repository.
// They are intentionally empty in the template.

export const islands: IslandMeta[] = [...commonIslands];

export function getIsland(name: string): IslandMeta | undefined {
  return islands.find((island) => island.name === name);
}