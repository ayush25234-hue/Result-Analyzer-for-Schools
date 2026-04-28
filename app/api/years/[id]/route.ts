import { NextResponse } from "next/server";

import { requireAdminResponse } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { academicYearSchema } from "@/lib/schemas";

type RouteContext = {
  params: { id: string };
};

export async function PUT(request: Request, { params }: RouteContext) {
  const unauthorized = requireAdminResponse();
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const payload = academicYearSchema.parse(body);

  const year = await prisma.academicYear.update({
    where: { id: params.id },
    data: payload
  });

  return NextResponse.json(year);
}

export async function DELETE(_: Request, { params }: RouteContext) {
  const unauthorized = requireAdminResponse();
  if (unauthorized) return unauthorized;

  await prisma.academicYear.delete({
    where: { id: params.id }
  });

  return NextResponse.json({ success: true });
}
