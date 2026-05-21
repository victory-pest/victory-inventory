import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiSession, badRequest, forbidden, notFound } from "@/lib/api";
import { canSupervisorDo, isManagerLike } from "@/lib/permissions";

const schema = z.object({
  name: z.string().min(1).max(200).optional(),
  sku: z.string().max(60).nullable().optional(),
  categoryId: z.string().nullable().optional(),
  unitId: z.string().nullable().optional(),
  purchaseUnitId: z.string().nullable().optional(),
  unitsPerPurchase: z.number().min(0.01).optional(),
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
  try {
    await prisma.product.update({ where: { id }, data: rest });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return badRequest("A product with that name already exists.");
    }
    throw e;
  }

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

  // Clean delete inside an interactive transaction so we can cascade orphan cleanup
  try {
    await prisma.$transaction(async (tx) => {
      if (force) {
        // 1) Capture parent ids BEFORE deleting items so we know which to check
        const [reqItems, recItems, trItems, pcItems] = await Promise.all([
          tx.requestItem.findMany({
            where: { productId: id },
            select: { requestId: true },
            distinct: ["requestId"],
          }),
          tx.receptionItem.findMany({
            where: { productId: id },
            select: { receptionId: true },
            distinct: ["receptionId"],
          }),
          tx.transferItem.findMany({
            where: { productId: id },
            select: { transferId: true },
            distinct: ["transferId"],
          }),
          tx.physicalCountItem.findMany({
            where: { productId: id },
            select: { physicalCountId: true },
            distinct: ["physicalCountId"],
          }),
        ]);
        const reqParentIds = reqItems.map((r) => r.requestId);
        const recParentIds = recItems.map((r) => r.receptionId);
        const trParentIds = trItems.map((r) => r.transferId);
        const pcParentIds = pcItems.map((p) => p.physicalCountId);

        // 2) Wipe the line items
        await tx.requestItem.deleteMany({ where: { productId: id } });
        await tx.receptionItem.deleteMany({ where: { productId: id } });
        await tx.transferItem.deleteMany({ where: { productId: id } });
        await tx.physicalCountItem.deleteMany({ where: { productId: id } });

        // 3) Delete parents that became empty (no items left for any product)
        for (const rid of reqParentIds) {
          const c = await tx.requestItem.count({ where: { requestId: rid } });
          if (c === 0) await tx.request.delete({ where: { id: rid } });
        }
        for (const rid of recParentIds) {
          const c = await tx.receptionItem.count({ where: { receptionId: rid } });
          if (c === 0) await tx.reception.delete({ where: { id: rid } });
        }
        for (const tid of trParentIds) {
          const c = await tx.transferItem.count({ where: { transferId: tid } });
          if (c === 0) await tx.transfer.delete({ where: { id: tid } });
        }
        for (const pid of pcParentIds) {
          const c = await tx.physicalCountItem.count({
            where: { physicalCountId: pid },
          });
          if (c === 0) await tx.physicalCount.delete({ where: { id: pid } });
        }
      }

      // 4) Always wipe metadata/history then the product itself
      await tx.stockMovement.deleteMany({ where: { productId: id } });
      await tx.truckInventory.deleteMany({ where: { productId: id } });
      await tx.productLicense.deleteMany({ where: { productId: id } });
      await tx.stock.deleteMany({ where: { productId: id } });
      await tx.locationProduct.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });
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
