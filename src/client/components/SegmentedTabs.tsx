import { m } from "motion/react";
import { cn } from "../lib/cn";
import { spring } from "../lib/motion";

type Segment<T extends string> = { value: T; label: string };

// M3 segmented buttons: one choice among a few views of the same list. A group of toggle buttons
// (aria-pressed), not ARIA tabs — each choice only filters the list below. The selected pill
// slides between segments (one shared layoutId per group).
export function SegmentedTabs<T extends string>({
  segments,
  value,
  onChange,
  label,
  layoutId,
}: {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  layoutId: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex rounded-full border border-outline-variant p-1">
      {segments.map((segment) => {
        const selected = segment.value === value;
        return (
          <button
            key={segment.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(segment.value)}
            className={cn(
              "relative min-h-11 flex-1 cursor-pointer rounded-full px-3 text-sm font-semibold transition-colors duration-200 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary",
              selected ? "text-on-secondary-container" : "text-on-surface-variant",
            )}
          >
            {selected && <m.span layoutId={layoutId} transition={spring} className="absolute inset-0 rounded-full bg-secondary-container" />}
            <span className="relative">{segment.label}</span>
          </button>
        );
      })}
    </div>
  );
}
