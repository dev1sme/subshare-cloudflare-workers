import { m } from "motion/react";
import type { ReactNode } from "react";
import { pageEnter } from "../lib/motion";

// Wraps a screen's content so it rises in when the route changes. The layout keys it by path.
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <m.div variants={pageEnter} initial="hidden" animate="visible">
      {children}
    </m.div>
  );
}
