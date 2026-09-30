import { Switch as SwitchPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

// M3 switch: 52×32 track, the thumb grows from 16px to 24px when on and slides with the
// emphasized curve. The 48px hit area comes from the padding around the track.
export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "group relative inline-flex h-8 w-[3.25rem] shrink-0 cursor-pointer items-center rounded-full border-2 border-outline bg-surface-container-highest transition-colors duration-300 ease-emphasized",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary",
        "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40",
        "before:absolute before:-inset-2 before:content-['']",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "block size-4 translate-x-1.5 rounded-full bg-outline transition-all duration-300 ease-emphasized",
          "group-active:size-7 data-[state=checked]:size-6 data-[state=checked]:translate-x-[1.375rem] data-[state=checked]:bg-on-primary",
        )}
      />
    </SwitchPrimitive.Root>
  );
}
