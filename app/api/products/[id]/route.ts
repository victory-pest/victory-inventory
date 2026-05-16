import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiSession, badRequest, forbidden, notFound } from "@/lib/api";
import { canSupervisorDo, isManagerLike } from "@/lib/permissions";

const schema = z.object({
  name: z.string().min(1).max(200).optional(),
  sku: z.string().max(60).nullable().optional(),
  categoryId: z.string().nullable().optional(),
  unitId: z.string().nullable().optional(),
  supplierId: z.string().nullable().optional(),
  unitCost: z.number().min(0).optional(),
  epaRegistration: z.string().max(60).nullable().optional(),
  photoUrl: z.string().url().nullable().optional(),
  requiresLicense: z.boolean().optional(),
  licenseTypeIds: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});

async function checkPermission(role: string, companyId: string) {
  if (isManagerLike(role as never)) return true;
  if (role === "supervisor") {
    return (
      (await canSupervisorDo("canManageCatalog", companyId)) ||
      (await canSupervisorDo("canEditProducts", companyId))
    );
  }
  return false;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const user = auth.session.user;
  if (!(await checkPermission(user.role, user.companyId)))
    return forbidden("Product management not permitted");

  const { id } = await ctx.params;
  const existing = await prisma.product.findFirst({
    where: { id, companyId: user.companyId },
  });
  if (!existing) return notFound("product_not_found");

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("invalid_body", parsed.error.format());

  const { licenseTypeIds, ...rest } = parsed.data;
  await prisma.product.update({ where: { id }, data: rest });

  if (licenseTypeIds) {
    await prisma.productLicense.deleteMany({ where: { productId: id } });
    if (licenseTypeIds.length > 0) {
      await prisma.productLicense.createMany({
        data: licenseTypeIds.map((licenseTypeId) => ({
          productId: id,
          licenseTypeId,
        })),
      });
    }
  }

  return NextResponse.json({ ok: true });
}
