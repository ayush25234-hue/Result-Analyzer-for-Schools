import { defaultNormalizationMap } from "@/lib/constants";
import { gradeFromPercentage, safeNumber } from "@/lib/utils";

type NormalizationMap = Record<string, string>;

const nameAliases = [
  "name",
  "studentname",
  "student",
  "studentfullname",
  "fullname",
  "candidate",
  "candidatename"
];

const rollAliases = [
  "roll",
  "rollno",
  "rollnumber",
  "rollnum",
  "boardroll",
  "boardrollnumber",
  "scholarno",
  "admitcardno"
];

const streamAliases = ["stream", "faculty", "group"];
const schoolCodeAliases = ["schoolcode", "school"];
const districtCodeAliases = ["districtcode", "district"];
const motherNameAliases = ["mothername", "mother"];
const fatherNameAliases = ["fathername", "father"];
const totalAliases = ["total", "totalmarks", "grandtotal", "marksobtained"];
const percentageAliases = ["percentage", "percent", "per"];
const gradeAliases = ["grade", "division"];
const statusAliases = ["result", "status", "outcome"];

const reservedColumns = new Set([
  ...nameAliases,
  ...rollAliases,
  ...streamAliases,
  ...schoolCodeAliases,
  ...districtCodeAliases,
  ...motherNameAliases,
  ...fatherNameAliases,
  ...totalAliases,
  ...percentageAliases,
  ...gradeAliases,
  ...statusAliases,
  "sno",
  "serialno",
  "srno",
  "remarks"
]);

export type ParsedStudentRow = {
  name: string;
  rollNumber: string;
  stream?: string;
  schoolCode?: string;
  districtCode?: string;
  subjects: { name: string; marks: number }[];
  total: number;
  percentage: number;
  grade: string;
  status: "PASS" | "FAIL";
  strongSubject?: string;
  weakSubject?: string;
};

export type ImportPreview = {
  parsedRows: ParsedStudentRow[];
  duplicates: string[];
  errors: { row: number; message: string }[];
  detectedColumns: string[];
};

function normalizeSubjectName(subject: string, map: NormalizationMap) {
  const key = subject.trim().toUpperCase();
  return map[key] ?? defaultNormalizationMap[key] ?? subject.trim();
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function extractValue(row: Record<string, unknown>, names: string[]) {
  const rowEntries = Object.entries(row);
  const found = rowEntries.find(([key]) => names.includes(normalizeKey(key)));
  return found?.[1];
}

function hasMeaningfulValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function isNumericLike(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  const text = String(value ?? "").trim();
  if (!text) return false;

  return /^-?\d+(\.\d+)?$/.test(text);
}

function extractMarksAndQualifier(value: unknown) {
  if (typeof value === "number") {
    return {
      marks: value,
      qualifier: ""
    };
  }

  const text = String(value ?? "").trim();
  const match = text.match(/^(-?\d+(?:\.\d+)?)\s*(?:[\(\[\- ]*([a-zA-Z]+)[\)\]]*)?$/);

  if (!match) {
    return null;
  }

  return {
    marks: Number(match[1]),
    qualifier: (match[2] ?? "").trim().toUpperCase()
  };
}

function resolveCombinedSubjectName(subject: string, qualifier: string, map: NormalizationMap) {
  const options = subject
    .split(/[\/|]/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (options.length <= 1) {
    return normalizeSubjectName(subject, map);
  }

  if (!qualifier) {
    return normalizeSubjectName(subject, map);
  }

  const normalizedQualifier = qualifier.toUpperCase();
  const matchedOption = options.find((option) => {
    const normalizedOption = normalizeSubjectName(option, map).toUpperCase();
    return (
      normalizedOption.startsWith(normalizedQualifier) ||
      normalizedQualifier.startsWith(normalizedOption.slice(0, 1))
    );
  });

  return normalizeSubjectName(matchedOption ?? subject, map);
}

function parseSubjectCell(key: string, value: unknown, normalizationMap: NormalizationMap) {
  const parsed = extractMarksAndQualifier(value);
  if (!parsed || !Number.isFinite(parsed.marks)) {
    return null;
  }

  return {
    name: resolveCombinedSubjectName(key, parsed.qualifier, normalizationMap),
    marks: parsed.marks
  };
}

function isRowEmpty(row: Record<string, unknown>) {
  return !Object.values(row).some((value) => hasMeaningfulValue(value));
}

function isMetaRow(row: Record<string, unknown>) {
  const values = Object.values(row)
    .map((value) => String(value ?? "").trim().toLowerCase())
    .filter(Boolean);

  if (values.length === 0) {
    return true;
  }

  const joined = values.join(" ");
  return (
    joined.includes("up board") ||
    joined.includes("intermediate") ||
    joined.includes("class 12") ||
    joined.includes("class xii") ||
    joined.includes("session") ||
    joined.includes("school name")
  );
}

export function parseRows(
  rows: Record<string, unknown>[],
  normalizationMap: NormalizationMap = {}
): ImportPreview {
  const duplicates = new Set<string>();
  const seenRollNumbers = new Set<string>();
  const errors: { row: number; message: string }[] = [];
  const parsedRows: ParsedStudentRow[] = [];

  rows.forEach((row, index) => {
    if (isRowEmpty(row) || isMetaRow(row)) {
      return;
    }

    const name = String(extractValue(row, nameAliases) ?? "").trim();
    const rollNumber = String(extractValue(row, rollAliases) ?? "").trim();

    if (!name || !rollNumber) {
      errors.push({ row: index + 1, message: "Missing student name or roll number." });
      return;
    }

    if (seenRollNumbers.has(rollNumber)) {
      duplicates.add(rollNumber);
    }
    seenRollNumbers.add(rollNumber);

    const subjects = Object.entries(row)
      .filter(([key, value]) => {
        const normalizedKey = normalizeKey(key);
        return !reservedColumns.has(normalizedKey) && hasMeaningfulValue(value);
      })
      .map(([key, value]) => parseSubjectCell(key, value, normalizationMap))
      .filter((subject): subject is { name: string; marks: number } => !!subject)
      .filter((subject) => subject.name && subject.marks >= 0);

    if (subjects.length === 0) {
      errors.push({ row: index + 1, message: "No subject marks detected." });
      return;
    }

    const total = safeNumber(extractValue(row, totalAliases)) || subjects.reduce((sum, item) => sum + item.marks, 0);
    const percentage =
      safeNumber(extractValue(row, percentageAliases)) || Number((total / (subjects.length * 100)) * 100);
    const grade = String(extractValue(row, gradeAliases) ?? gradeFromPercentage(percentage));
    const hasFailingSubject = subjects.some((subject) => subject.marks < 33);
    const statusValue = String(extractValue(row, statusAliases) ?? "").toUpperCase();
    const status = statusValue.includes("FAIL") || hasFailingSubject ? "FAIL" : "PASS";

    const sortedByMarks = [...subjects].sort((a, b) => b.marks - a.marks);

    parsedRows.push({
      name,
      rollNumber,
      stream: String(extractValue(row, streamAliases) ?? "").trim() || undefined,
      schoolCode: String(extractValue(row, schoolCodeAliases) ?? "").trim() || undefined,
      districtCode: String(extractValue(row, districtCodeAliases) ?? "").trim() || undefined,
      subjects,
      total,
      percentage,
      grade,
      status,
      strongSubject: sortedByMarks[0]?.name,
      weakSubject: sortedByMarks.at(-1)?.name
    });
  });

  return {
    parsedRows,
    duplicates: [...duplicates],
    errors,
    detectedColumns: rows.find((row) => !isRowEmpty(row)) ? Object.keys(rows.find((row) => !isRowEmpty(row)) as Record<string, unknown>) : []
  };
}

export function parseSmartPaste(text: string, normalizationMap: NormalizationMap = {}) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const student: Record<string, unknown> = {};
  const subjects: Record<string, number> = {};

  lines.forEach((line) => {
    const [label, ...rest] = line.split(":");
    if (!rest.length) return;

    const key = label.trim().toLowerCase();
    const value = rest.join(":").trim();

    if (key.includes("name")) student.name = value;
    else if (key.includes("roll")) student["roll number"] = value;
    else if (key.includes("stream")) student.stream = value;
    else if (key.includes("school")) student["school code"] = value;
    else if (key.includes("district")) student["district code"] = value;
    else if (key.includes("total")) student.total = value;
    else if (key.includes("result") || key.includes("status")) student.status = value;
    else if (/\d+/.test(value)) {
      subjects[normalizeSubjectName(label, normalizationMap)] = safeNumber(value);
    }
  });

  return parseRows([{ ...student, ...subjects }], normalizationMap);
}
