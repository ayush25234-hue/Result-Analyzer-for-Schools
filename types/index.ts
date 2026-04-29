export type College = {
  id: string;
  name: string;
  location: string;
  createdAt: string;
  academicYears: AcademicYear[];
};

export type AcademicYear = {
  id: string;
  year: number;
  collegeId: string;
};

export type SubjectMark = {
  id?: string;
  marks: number;
  subject: {
    id?: string;
    name: string;
  };
};

export type StudentRecord = {
  id: string;
  name: string;
  rollNumber: string;
  stream?: string | null;
  districtCode?: string | null;
  schoolCode?: string | null;
  collegeId: string;
  academicYearId: string;
  result?: {
    id: string;
    total: number;
    percentage: number;
    grade: string;
    status: "PASS" | "FAIL";
    rank?: number | null;
    strongSubject?: string | null;
    weakSubject?: string | null;
    subjectMarks: SubjectMark[];
  } | null;
};

export type DashboardPayload = {
  summary: {
    totalStudents: number;
    passPercentage: number;
    failPercentage: number;
    averagePercentage: number;
    highestPercentage: number;
    lowestPercentage: number;
    topper: {
      name: string;
      percentage: number;
      rollNumber: string;
    } | null;
  };
  scoreBands: {
    above93: number;
    above80: number;
    above75: number;
    above60: number;
  };
  studentPerformanceList: Array<{
    id: string;
    name: string;
    rollNumber: string;
    percentage: number;
    grade: string;
    status: "PASS" | "FAIL";
    rank: number;
    stream?: string | null;
  }>;
  subjectThresholdPerformanceList: Array<{
    id: string;
    studentId: string;
    name: string;
    rollNumber: string;
    stream?: string | null;
    rank: number;
    subject: string;
    marks: number;
    overallPercentage: number;
    grade: string;
  }>;
  top10Students: Array<{
    id: string;
    name: string;
    percentage: number;
    grade: string;
    rollNumber: string;
    stream?: string | null;
    rank: number;
  }>;
  failureList: Array<{
    id: string;
    name: string;
    rollNumber: string;
    percentage: number;
    weakSubject?: string | null;
  }>;
  subjectWiseAverages: Array<{
    subject: string;
    average: number;
    variance: number;
  }>;
  weakSubjectTrends: Array<{
    subject: string;
    average: number;
    variance: number;
  }>;
  streamWiseAnalysis: Array<{
    stream: string;
    averagePercentage: number;
    strength: number;
  }>;
  comparison: {
    rankings: Array<{
      collegeId: string;
      college: string;
      year: number | null;
      score: number;
      grade: string;
      averagePercentage: number;
      metrics: {
        passPercentage: number;
        averagePercentage: number;
        topPerformerIndex: number;
        subjectConsistency: number;
        lowFailureRate: number;
        improvement: number;
      };
    }>;
    bestCollege: {
      college: string;
      score: number;
      grade: string;
    } | null;
    mostImprovedCollege: {
      college: string;
      metrics: {
        improvement: number;
      };
    } | null;
    trend: Array<{
      year: number;
      averagePercentage: number;
      passPercentage: number;
    }>;
  };
  years: AcademicYear[];
  colleges: College[];
  previousYear: number | null;
  previousYearAverage: number;
};

export type ImportPreview = {
  parsedRows: Array<{
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
  }>;
  duplicates: string[];
  errors: Array<{ row: number; message: string }>;
  detectedColumns: string[];
};
