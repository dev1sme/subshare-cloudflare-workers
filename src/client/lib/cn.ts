import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Joins class names and lets a later Tailwind class override an earlier one (shadcn convention).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
