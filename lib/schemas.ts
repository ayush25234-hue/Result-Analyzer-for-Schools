import { z } from "zod";

export const collegeSchema = z.object({
  name: z.string().min(2),
  location: z.string().min(2)
});

export const academicYearSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  collegeId: z.string().min(1)
});

export const studentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  rollNumber: z.string().min(3),
  stream: z.string().optional().or(z.literal("")),
  districtCode: z.string().optional().or(z.literal("")),
  schoolCode: z.string().optional().or(z.literal("")),
  collegeId: z.string().min(1),
  academicYearId: z.string().min(1),
  subjects: z.array(
    z.object({
      name: z.string().min(1),
      marks: z.coerce.number().min(0).max(100)
    })
  ).min(1)
});

export const importCommitSchema = z.object({
  commit: z.boolean().default(false),
  collegeId: z.string().min(1),
  academicYearId: z.string().min(1),
  source: z.enum(["excel", "smart-paste"]),
  rows: z.array(z.record(z.any())).min(1)
});

export const settingsSchema = z.object({
  passWeight: z.coerce.number().min(0).max(100),
  averageWeight: z.coerce.number().min(0).max(100),
  topPerformerWeight: z.coerce.number().min(0).max(100),
  consistencyWeight: z.coerce.number().min(0).max(100),
  lowFailureWeight: z.coerce.number().min(0).max(100),
  improvementWeight: z.coerce.number().min(0).max(100),
  subjectNormalizationJson: z.record(z.string()).default({})
});
