import { m } from "motion/react";

// Decorative M3 Expressive shapes behind the login card. They float in once, then stay still:
// continuous background motion distracts from a form (and is skipped under reduced motion).
export function LoginBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <m.div
        className="absolute -top-24 -right-20 size-72 rounded-[42%_58%_63%_37%/41%_44%_56%_59%] bg-primary-container"
        initial={{ opacity: 0, scale: 0.6, rotate: -30 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
      />
      <m.div
        className="absolute -bottom-16 -left-16 size-56 rounded-[3rem] bg-tertiary-container"
        initial={{ opacity: 0, scale: 0.6, rotate: 30 }}
        animate={{ opacity: 1, scale: 1, rotate: 12 }}
        transition={{ type: "spring", stiffness: 120, damping: 18, delay: 0.1 }}
      />
      <m.div
        className="absolute top-1/3 -left-6 size-16 rounded-full bg-secondary-container"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.25 }}
      />
    </div>
  );
}
