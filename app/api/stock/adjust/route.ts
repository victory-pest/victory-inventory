import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiSession, badRequest, forbidden, notFound } from "@/lib/api";
import { canSupervisorDo, isManagerLike } from "@/lib/permissions";
import { checkLowStockCrossings } from "@/lib/notify";

const schema = z.object({
  locationId: z.string().min(1),
  productId: z.string().min(1),
  delta: z.number(),
  reason: z.string().min(1).max(120),
  note: z.string().max(500).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const user = auth.session.user;

  if (!isManagerLike(user.role)) {
    if (user.role !== "supervisor") return forbidden("Role not authorized");
    const allowed = await canSupervisorDo("canAdjustStock", user.companyId);
    if (!allowed) return forbidden("Adjustment not permitted");
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("invalid_body", parsed.error.format());
  const { locationId, productId, delta, reason, note } = parsed.data;

  const location = await prisma.location.findFirst({
    where: { id: locationId, companyId: user.companyId },
  });
  if (!location) return notFound("location_not_found");
  if (user.role === "supervisor" && user.locationId !== locationId) {
    return forbidden("Different location");
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, companyId: user.companyId },
  });
  if (!product) return notFound("product_not_found");

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.stock.findUnique({
      where: { locationId_productId: { locationId, productId } },
    });
    const before = existing ? Number(existing.quantity) : 0;
    const after = before + delta;
    if (after < 0) {
      throw new Error("Resulting stock cannot be negative");
    }

    const stock = await tx.stock.upsert({
      where: { locationId_productId: { locationId, productId } },
      update: { quantity: after },
      create: { locationId, productId, quantity: after },
    });

    await tx.stockMovement.create({
      data: {
        companyId: user.companyId,
        locationId,
        productId,
        movementType: "manual_adjustment",
        quantity: delta,
        performedBy: user.id,
        note: note ? `${reason}: ${note}` : reason,
      },
    });

    return { stock, before, after };
  }).catch((err: Error) => ({ error: err.message }));

  if ("error" in result) return badRequest(result.error);

  await checkLowStockCrossings({
    companyId: user.companyId,
    locationId,
    changes: [{ productId, qtyBefore: result.before, qtyAfter: result.after }],
  });

  return NextResponse.json({
    stock: { ...result.stock, quantity: Number(result.stock.quantity) },
    before: result.before,
    after: result.after,
  });
}
