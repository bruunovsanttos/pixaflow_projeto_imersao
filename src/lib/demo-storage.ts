import { z } from "zod";

// Browser-only persistence; callers expose failures instead of claiming a successful save.
export function readDemo<T>(key: string, schema: z.ZodType<T>, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  return schema.parse(JSON.parse(raw));
}

export function writeDemo(key: string, value: unknown): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}
