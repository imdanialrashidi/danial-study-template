/**
 * IslandIcon — the React twin of `Icon.astro`.
 *
 * Same 20px-grid / 1.5px-stroke / currentColor family, same path data
 * (`../ui/icon-paths`), so islands never fork their own SVG copies. Sizes
 * mirror the call sites they replace; stroke converges on the canonical 1.5.
 */
import type { IconName } from '../../components/ui/icon-names';
import { ICON_PATHS } from '../../components/ui/icon-paths';

export interface IslandIconProps {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
  /** Filled glyph (e.g. saved bookmark); default `none` matches Icon.astro. */
  fill?: string;
}

export default function IslandIcon({ name, size = 18, className, strokeWidth = 1.5, fill = 'none' }: IslandIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] }}
    />
  );
}
