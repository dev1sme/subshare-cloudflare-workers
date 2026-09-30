import type { Transition, Variants } from "motion/react";

// Shared motion tokens (docs/design-system.md#chuyển-động). One rhythm for the whole app:
// springs for things that move, the M3 emphasized curve for fades. Exits are ~60% of enters.

export const spring: Transition = { type: "spring", stiffness: 380, damping: 30, mass: 0.8 };

// Slightly bouncy, for small elements that "arrive" (badges, the success check) — never lists.
export const springExpressive: Transition = { type: "spring", stiffness: 500, damping: 22 };

export const emphasizedDecelerate = [0.05, 0.7, 0.1, 1] as const;

// A screen entering: fade + short rise. Enter only; the previous screen is simply replaced.
export const pageEnter: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: emphasizedDecelerate } },
};

// A list whose rows arrive one after another, ~50ms apart.
export const listStagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: spring },
};
