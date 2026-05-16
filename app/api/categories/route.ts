import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiSession, badRequest, forbidden } from "@/lib/api";
import { canSupervisorDo, isManagerLike } from "@/lib/permissions";

async function canManage(role: string, companyId: string) {
  if (isManagerLike(role as never)) return true;
  if (role === "supervisor") return canSupervisorDo("canManageCatalog", companyId);
  return false;
}

export async function GET() {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const rows = await prisma.productCategory.findMany({
    where: { companyId: auth.session.user.companyId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ categories: rows });
}

const schema = z.object({
  name: z.string().min(1).max(80),
});

export async function POST(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  if (!(await canManage(auth.session.user.role, auth.session.user.companyId)))
    return forbidden("Catalog management not permitted");

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("invalid_body", parsed.error.format());

  const row = await prisma.productCategory.create({
    data: {
      companyId: auth.session.user.companyId,
      name: parsed.data.name,
      active: true,
    },
  });
  return NextResponse.json({ category: row }, { status: 201 });
}
