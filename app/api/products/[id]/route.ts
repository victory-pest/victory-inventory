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
  activeIngredient: z.string().max(500).nullable().optional(),
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

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const user = auth.session.user;
  if (!(await checkPermission(user.role, user.companyId)))
    return forbidden("Product management not permitted");

  const force = new URL(req.url).searchParams.get("force") === "true";
  if (force && !isManagerLike(user.role as never)) {
    return forbidden("Force delete requires manager role");
  }

  const { id } = await ctx.params;
  const existing = await prisma.product.findFirst({
    where: { id, companyId: user.companyId },
  });
  if (!existing) return notFound("product_not_found");

  // Block delete if product still has non-zero stock anywhere
  const stockWithQty = await prisma.stock.findFirst({
    where: { productId: id, quantity: { gt: 0 } },
    select: { id: true },
  });
  if (stockWithQty) {
    return NextResponse.json(
      {
        error:
          "Cannot delete: product has non-zero stock. Adjust stock to 0 first, or use the Active toggle to deactivate.",
      },
      { status: 409 },
    );
  }

  // Block if product has real transactions — UNLESS force=true (admin override)
  if (!force) {
    const [reqCount, recCount, trCount, pcCount] = await Promise.all([
      prisma.requestItem.count({ where: { productId: id } }),
      prisma.receptionItem.count({ where: { productId: id } }),
      prisma.transferItem.count({ where: { productId: id } }),
      prisma.physicalCountItem.count({ where: { productId: id } }),
    ]);
    const blockers: string[] = [];
    if (reqCount > 0) blockers.push(`${reqCount} request item(s)`);
    if (recCount > 0) blockers.push(`${recCount} reception item(s)`);
    if (trCount > 0) blockers.push(`${trCount} transfer item(s)`);
    if (pcCount > 0)
      blockers.push(`${pcCount} physical count entr${pcCount === 1 ? "y" : "ies"}`);
    if (blockers.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: product is referenced in ${blockers.join(", ")}. Force delete (admin) or use the Active toggle to deactivate instead.`,
        },
        { status: 409 },
      );
    }
  }

  // Clean delete: wipe metadata/history first, then the product itself
  // If force=true, also wipe transactional line items (admin override)
  try {
    await prisma.$transaction([
      ...(force
        ? [
            prisma.requestItem.deleteMany({ where: { productId: id } }),
            prisma.receptionItem.deleteMany({ where: { productId: id } }),
            prisma.transferItem.deleteMany({ where: { productId: id } }),
            prisma.physicalCountItem.deleteMany({ where: { productId: id } }),
          ]
        : []),
      prisma.stockMovement.deleteMany({ where: { productId: id } }),
      prisma.truckInventory.deleteMany({ where: { productId: id } }),
      prisma.productLicense.deleteMany({ where: { productId: id } }),
      prisma.stock.deleteMany({ where: { productId: id } }),
      prisma.locationProduct.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
    ]);
  } catch {
    return NextResponse.json(
      {
        error:
          "Cannot delete: unexpected reference to this product. Use the Active toggle to deactivate instead.",
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}
