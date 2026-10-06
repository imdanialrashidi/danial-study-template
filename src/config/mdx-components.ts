/**
 * MDX components made available to every .mdx file without an explicit import.
 *
 * This is the ergonomic contract for authors and AI agents: any educational
 * component can be used directly in MDX prose. Adding a component here makes it
 * globally available; nothing else needs to change.
 */
import Callout from '../components/educational/Callout.astro';
import Definition from '../components/educational/Definition.astro';
import Misconception from '../components/educational/Misconception.astro';
import Formula from '../components/educational/Formula.astro';
import FormulaBreakdown from '../components/educational/FormulaBreakdown.astro';
import InteractiveFigure from '../components/educational/InteractiveFigure.astro';
import WorkedExample from '../components/educational/WorkedExample.astro';
import Prerequisite from '../components/educational/Prerequisite.astro';
import GlossaryTerm from '../components/educational/GlossaryTerm.astro';
import StepReveal from '../islands/common/StepReveal';
import Quiz from '../islands/common/Quiz';

export const components = {
  Callout,
  Definition,
  Misconception,
  Formula,
  FormulaBreakdown,
  InteractiveFigure,
  WorkedExample,
  Prerequisite,
  GlossaryTerm,
  StepReveal,
  Quiz,
};