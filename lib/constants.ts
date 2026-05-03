import type { Route } from "next";

export const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/upload", label: "Upload" },
  { href: "/reports", label: "Student Insights" },
  { href: "/settings", label: "Settings" }
] as const satisfies ReadonlyArray<{ href: Route; label: string }>;

export const defaultNormalizationMap: Record<string, string> = {
  ENG: "English",
  ENGLISH: "English",
  HIN: "Hindi",
  HINDI: "Hindi",
  PHY: "Physics",
  CHEM: "Chemistry",
  BIO: "Biology",
  MATH: "Mathematics",
  MATHS: "Mathematics",
  ECO: "Economics",
  BST: "Business Studies",
  ACC: "Accountancy",
  CS: "Computer Science"
};

export const scoreGradeBands = [
  { min: 90, grade: "A++" },
  { min: 80, grade: "A+" },
  { min: 70, grade: "A" },
  { min: 60, grade: "B" },
  { min: 50, grade: "C" },
  { min: 0, grade: "Needs Improvement" }
];
