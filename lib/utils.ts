import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPercentage(value: number) {
  return `${value.toFixed(1)}%`;
}

export function gradeFromPercentage(percentage: number) {
  if (percentage >= 90) return "A1";
  if (percentage >= 80) return "A2";
  if (percentage >= 70) return "B1";
  if (percentage >= 60) return "B2";
  if (percentage >= 50) return "C1";
  if (percentage >= 40) return "C2";
  if (percentage >= 33) return "D";
  return "E";
}

export function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function safeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
