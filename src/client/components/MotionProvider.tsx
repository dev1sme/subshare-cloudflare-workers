import { LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

const loadFeatures = () => import("../lib/motion-features").then((module) => module.default);

// `m.*` components render immediately and start animating once the features chunk arrives.
// reducedMotion="user": with the OS setting on, transforms are skipped and only opacity changes.
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
