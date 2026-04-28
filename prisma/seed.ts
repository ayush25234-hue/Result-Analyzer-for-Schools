import { PrismaClient, ResultStatus } from "@prisma/client";

import { gradeFromPercentage } from "../lib/utils";

const prisma = new PrismaClient();

const subjectSets = {
  science: [
    { name: "English", marks: 78 },
    { name: "Physics", marks: 81 },
    { name: "Chemistry", marks: 75 },
    { name: "Mathematics", marks: 88 },
    { name: "Hindi", marks: 73 }
  ],
  commerce: [
    { name: "English", marks: 74 },
    { name: "Accountancy", marks: 84 },
    { name: "Business Studies", marks: 79 },
    { name: "Economics", marks: 77 },
    { name: "Hindi", marks: 70 }
  ],
  arts: [
    { name: "English", marks: 69 },
    { name: "History", marks: 76 },
    { name: "Political Science", marks: 72 },
    { name: "Geography", marks: 74 },
    { name: "Hindi", marks: 68 }
  ]
};

async function createStudentResult(
  collegeId: string,
  academicYearId: string,
  student: {
    name: string;
    rollNumber: string;
    stream: string;
    marks: { name: string; marks: number }[];
  }
) {
  const createdStudent = await prisma.student.create({
    data: {
      name: student.name,
      rollNumber: student.rollNumber,
      stream: student.stream,
      collegeId,
      academicYearId
    }
  });

  const subjects = await Promise.all(
    student.marks.map((subject) =>
      prisma.subject.upsert({
        where: { name: subject.name },
        update: {},
        create: { name: subject.name }
      })
    )
  );

  const total = student.marks.reduce((sum, item) => sum + item.marks, 0);
  const percentage = Number(((total / (student.marks.length * 100)) * 100).toFixed(2));
  const status = student.marks.some((subject) => subject.marks < 33) ? ResultStatus.FAIL : ResultStatus.PASS;

  return prisma.result.create({
    data: {
      studentId: createdStudent.id,
      total,
      percentage,
      grade: gradeFromPercentage(percentage),
      status,
      strongSubject: student.marks.slice().sort((a, b) => b.marks - a.marks)[0]?.name,
      weakSubject: student.marks.slice().sort((a, b) => a.marks - b.marks)[0]?.name,
      subjectMarks: {
        create: student.marks.map((subject, index) => ({
          subjectId: subjects[index].id,
          marks: subject.marks
        }))
      }
    }
  });
}

async function main() {
  await prisma.subjectMarks.deleteMany();
  await prisma.result.deleteMany();
  await prisma.student.deleteMany();
  await prisma.importBatch.deleteMany();
  await prisma.subjectAlias.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.college.deleteMany();
  await prisma.appSettings.deleteMany();

  await prisma.appSettings.create({
    data: {
      id: "default",
      passWeight: 35,
      averageWeight: 25,
      topPerformerWeight: 15,
      consistencyWeight: 10,
      lowFailureWeight: 10,
      improvementWeight: 5,
      subjectNormalizationJson: {
        ENG: "English",
        MATHS: "Mathematics"
      }
    }
  });

  const colleges = await Promise.all([
    prisma.college.create({
      data: {
        name: "Saraswati Inter College",
        location: "Prayagraj"
      }
    }),
    prisma.college.create({
      data: {
        name: "Vidya Mandir Senior Secondary",
        location: "Lucknow"
      }
    })
  ]);

  const years = await Promise.all([
    prisma.academicYear.create({ data: { year: 2024, collegeId: colleges[0].id } }),
    prisma.academicYear.create({ data: { year: 2025, collegeId: colleges[0].id } }),
    prisma.academicYear.create({ data: { year: 2026, collegeId: colleges[0].id } }),
    prisma.academicYear.create({ data: { year: 2025, collegeId: colleges[1].id } }),
    prisma.academicYear.create({ data: { year: 2026, collegeId: colleges[1].id } })
  ]);

  const studentFixtures = [
    {
      collegeId: colleges[0].id,
      academicYearId: years[1].id,
      students: [
        { name: "Aditi Sharma", rollNumber: "2500111", stream: "Science", marks: subjectSets.science },
        { name: "Priya Singh", rollNumber: "2500112", stream: "Commerce", marks: subjectSets.commerce },
        {
          name: "Rahul Verma",
          rollNumber: "2500113",
          stream: "Arts",
          marks: subjectSets.arts.map((subject) =>
            subject.name === "English" ? { ...subject, marks: 31 } : subject
          )
        }
      ]
    },
    {
      collegeId: colleges[0].id,
      academicYearId: years[2].id,
      students: [
        {
          name: "Anjali Yadav",
          rollNumber: "2600211",
          stream: "Science",
          marks: subjectSets.science.map((subject) =>
            subject.name === "English" ? { ...subject, marks: 82 } : subject
          )
        },
        {
          name: "Harsh Mishra",
          rollNumber: "2600212",
          stream: "Commerce",
          marks: subjectSets.commerce.map((subject) =>
            subject.name === "Accountancy" ? { ...subject, marks: 89 } : subject
          )
        },
        {
          name: "Neha Tiwari",
          rollNumber: "2600213",
          stream: "Arts",
          marks: subjectSets.arts.map((subject) =>
            subject.name === "Political Science" ? { ...subject, marks: 80 } : subject
          )
        }
      ]
    },
    {
      collegeId: colleges[1].id,
      academicYearId: years[4].id,
      students: [
        {
          name: "Rohan Saxena",
          rollNumber: "2600311",
          stream: "Science",
          marks: subjectSets.science.map((subject) =>
            subject.name === "Physics" ? { ...subject, marks: 84 } : subject
          )
        },
        {
          name: "Simran Gupta",
          rollNumber: "2600312",
          stream: "Commerce",
          marks: subjectSets.commerce.map((subject) =>
            subject.name === "Economics" ? { ...subject, marks: 83 } : subject
          )
        }
      ]
    }
  ];

  for (const fixture of studentFixtures) {
    for (const student of fixture.students) {
      await createStudentResult(fixture.collegeId, fixture.academicYearId, student);
    }
  }

  const allResults = await prisma.result.findMany({
    include: {
      student: true
    },
    orderBy: { percentage: "desc" }
  });

  await Promise.all(
    allResults.map((result, index) =>
      prisma.result.update({
        where: { id: result.id },
        data: { rank: index + 1 }
      })
    )
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
