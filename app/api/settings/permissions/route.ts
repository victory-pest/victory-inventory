import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiSession, badRequest, forbidden } from "@/lib/api";
import { isManagerLike } from "@/lib/permissions";

const schema = z.object({
  canApproveRequests: z.boolean(),
  canEditQuantities: z.boolean(),
  canRejectRequests: z.boolean(),
  canManageCatalog: z.boolean(),
  canEditProducts: z.boolean(),
  canAdjustStock: z.boolean(),
  canReceiveStock: z.boolean(),
  canViewReports: z.boolean(),
  canManageTechnicians: z.boolean(),
  canTransferStock: z.boolean(),
});

export async function PUT(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  if (!isManagerLike(auth.session.user.role)) return forbidden("Manager only");

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("invalid_body", parsed.error.format());

  const updated = await prisma.supervisorPermissions.upsert({
    where: { companyId: auth.session.user.companyId },
    update: parsed.data,
    create: { companyId: auth.session.user.companyId, ...parsed.data },
  });
  return NextResponse.json({ permissions: updated });
}
