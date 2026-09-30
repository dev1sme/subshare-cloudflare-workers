import { type ComponentProps, type ReactNode, useId } from "react";
import { cn } from "../../lib/cn";

type TextFieldProps = Omit<ComponentProps<"input">, "placeholder"> & {
  label: string;
  // Rendered inside the field on the right, e.g. a show-password button.
  trailing?: ReactNode;
};

// M3 outlined text field with a floating label. The label is a real <label> (never a placeholder
// posing as one); it rests inside the field and floats onto the border on focus or when filled.
// The `placeholder=" "` is what lets CSS tell "filled" from "empty" (:placeholder-shown).
export function TextField({ label, trailing, className, id, ...props }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className={cn("relative", className)}>
      <input
        id={inputId}
        placeholder=" "
        className={cn(
          "peer min-h-14 w-full rounded-field border border-outline bg-transparent px-4 pt-2 text-base text-on-surface transition-[border-color,box-shadow] duration-200 ease-emphasized outline-none",
          "hover:border-on-surface focus:border-primary focus:shadow-[inset_0_0_0_1px_var(--color-primary)]",
          "aria-invalid:border-error disabled:opacity-40",
          trailing ? "pr-12" : "",
        )}
        {...props}
      />
      <label
        htmlFor={inputId}
        className={cn(
          "pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 bg-surface-container-lowest px-1 text-base text-on-surface-variant transition-all duration-200 ease-emphasized",
          "peer-focus:top-0 peer-focus:text-xs peer-focus:text-primary",
          "peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs",
        )}
      >
        {label}
      </label>
      {trailing && <div className="absolute top-1/2 right-1 -translate-y-1/2">{trailing}</div>}
    </div>
  );
}
