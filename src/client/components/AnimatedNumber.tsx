import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

// Counts from the previous value to the new one. The final text is always the exact formatted
// value; screen readers get it through aria-live on the parent, not every intermediate frame.
export function AnimatedNumber({ value, format }: { value: number; format: (value: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const from = previous.current;
    previous.current = value;
    if (reduceMotion || from === value) {
      node.textContent = format(value);
      return;
    }
    const controls = animate(from, value, {
      duration: 0.8,
      ease: [0.05, 0.7, 0.1, 1],
      onUpdate: (latest) => {
        node.textContent = format(Math.round(latest));
      },
    });
    return () => controls.stop();
  }, [value, format, reduceMotion]);

  return <span ref={ref}>{format(value)}</span>;
}
