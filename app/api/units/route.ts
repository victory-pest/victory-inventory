import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiSession, badRequest, forbidden } from "@/lib/api";
import { canSupervisorDo, isManagerLike } from "@/lib/permissions";

export async function GET() {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const rows = await prisma.unitOfMeasure.findMany({
    where: { companyId: auth.session.user.companyId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ units: rows });
}

const schema = z.object({
  name: z.string().min(1).max(60),
  abbreviation: z.string().max(20).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const user = auth.session.user;
  let allowed = isManagerLike(user.role);
  if (!allowed && user.role === "supervisor") {
    allowed = await canSupervisorDo("canManageCatalog", user.companyId);
  }
  if (!allowed) return forbidden("Catalog management not permitted");

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("invalid_body", parsed.error.format());

  const row = await prisma.unitOfMeasure.create({
    data: {
      companyId: user.companyId,
      name: parsed.data.name,
      abbreviation: parsed.data.abbreviation ?? null,
      active: true,
    },
  });
  return NextResponse.json({ unit: row }, { status: 201 });
}
