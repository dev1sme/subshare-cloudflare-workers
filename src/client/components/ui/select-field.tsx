import { ChevronDown } from "lucide-react";
import { type ComponentProps, useId } from "react";
import { cn } from "../../lib/cn";

type SelectFieldProps = ComponentProps<"select"> & { label: string };

// M3 outlined field around a native <select>: the phone opens its own picker, keyboard and screen
// readers work as is, and nothing injects a <style> tag (Radix Select does, and CSP blocks it).
// The label always sits on the border — a select always shows a value.
export function SelectField({ label, className, id, children, ...props }: SelectFieldProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <div className={cn("relative", className)}>
      <select
        id={selectId}
        className={cn(
          "min-h-14 w-full cursor-pointer appearance-none rounded-field border border-outline bg-transparent pr-11 pl-4 text-base text-on-surface transition-[border-color,box-shadow] duration-200 ease-emphasized outline-none",
          "hover:border-on-surface focus:border-primary focus:shadow-[inset_0_0_0_1px_var(--color-primary)] disabled:opacity-40",
        )}
        {...props}
      >
        {children}
      </select>
      <label
        htmlFor={selectId}
        className="pointer-events-none absolute top-0 left-3 -translate-y-1/2 bg-(--field-bg) px-1 text-xs text-on-surface-variant"
      >
        {label}
      </label>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-on-surface-variant" aria-hidden="true" />
    </div>
  );
}
