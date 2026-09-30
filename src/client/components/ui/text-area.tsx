import { type ComponentProps, useId } from "react";
import { cn } from "../../lib/cn";

// Outlined multi-line field with its label above (a floating label does not suit a box that
// grows). The label is a real <label>.
export function TextArea({ label, className, id, ...props }: ComponentProps<"textarea"> & { label: string }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-on-surface-variant">
        {label}
      </label>
      <textarea
        id={inputId}
        rows={3}
        className="min-h-24 w-full resize-none rounded-field border border-outline bg-transparent px-4 py-3 text-base text-on-surface transition-[border-color,box-shadow] duration-200 ease-emphasized outline-none hover:border-on-surface focus:border-primary focus:shadow-[inset_0_0_0_1px_var(--color-primary)]"
        {...props}
      />
    </div>
  );
}
