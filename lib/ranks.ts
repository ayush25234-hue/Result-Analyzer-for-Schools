import { PrismaClient } from "@prisma/client";

type RankClient = PrismaClient | Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export async function recalculateRanksForAcademicYear(
  client: RankClient,
  collegeId: string,
  academicYearId: string
) {
  const results = await client.result.findMany({
    where: {
      student: {
        collegeId,
        academicYearId
      }
    },
    orderBy: [{ percentage: "desc" }, { total: "desc" }, { student: { name: "asc" } }]
  });

  await Promise.all(
    results.map((result, index) =>
      client.result.update({
        where: { id: result.id },
        data: { rank: index + 1 }
      })
    )
  );
}
