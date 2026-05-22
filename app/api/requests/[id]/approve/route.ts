import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiSession, badRequest, notFound, forbidden } from "@/lib/api";
import { authorizeRequestAction } from "@/lib/permissions";
import { notifyRequestApproved, checkLowStockCrossings } from "@/lib/notify";

const approveSchema = z.object({
  items: z.array(
    z.object({
      itemId: z.string().min(1),
      quantityApproved: z.number().int().nonnegative(),
    }),
  ),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;

  const user = auth.session.user;
  const allowed = await authorizeRequestAction(
    { id: user.id, role: user.role, companyId: user.companyId, locationId: user.locationId },
    "approve",
  );
  if (!allowed.ok) return forbidden(allowed.reason);

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = approveSchema.safeParse(body);
  if (!parsed.success) return badRequest("invalid_body", parsed.error.format());

  const request = await prisma.request.findFirst({
    where: { id, companyId: user.companyId },
    include: { items: true },
  });
  if (!request) return notFound("request_not_found");
  if (request.status !== "pending")
    return badRequest("Request is not pending");

  if (
    user.role === "supervisor" &&
    !user.supervisedLocationIds.includes(request.locationId)
  ) {
    return forbidden("Not one of your supervised locations");
  }

  const approvalsById = new Map(
    parsed.data.items.map((i) => [i.itemId, i.quantityApproved]),
  );
  for (const it of request.items) {
    if (!approvalsById.has(it.id)) {
      return badRequest(`Missing approval for item ${it.id}`);
    }
  }

  const productIds = request.items.map((i) => i.productId);
  const stockRows = await prisma.stock.findMany({
    where: { locationId: request.locationId, productId: { in: productIds } },
  });
  const stockMap = new Map(stockRows.map((s) => [s.productId, s]));

  for (const item of request.items) {
    const approved = approvalsById.get(item.id) ?? 0;
    if (approved <= 0) continue;
    const stock = stockMap.get(item.productId);
    if (!stock || Number(stock.quantity) < approved) {
      return badRequest(`Insufficient stock for ${item.productId}`);
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    for (const item of request.items) {
      const approved = approvalsById.get(item.id) ?? 0;
      await tx.requestItem.update({
        where: { id: item.id },
        data: { quantityApproved: approved },
      });

      if (approved <= 0) continue;

      const stock = stockMap.get(item.productId)!;
      await tx.stock.update({
        where: { id: stock.id },
        data: { quantity: { decrement: approved } },
      });

      await tx.stockMovement.create({
        data: {
          companyId: user.companyId,
          locationId: request.locationId,
          productId: item.productId,
          movementType: "request_approval",
          quantity: -approved,
          referenceId: request.id,
          performedBy: user.id,
          note: `Request ${request.id} approved`,
        },
      });
    }

    return tx.request.update({
      where: { id: request.id },
      data: {
        status: "approved",
        approvedBy: user.id,
        approvedAt: new Date(),
      },
      include: {
        items: { include: { product: { select: { name: true, sku: true } } } },
        technician: { select: { id: true, name: true } },
      },
    });
  });

  await notifyRequestApproved({
    companyId: user.companyId,
    technicianId: updated.technicianId,
    requestId: updated.id,
  });

  await checkLowStockCrossings({
    companyId: user.companyId,
    locationId: request.locationId,
    changes: request.items.map((it) => {
      const approved = approvalsById.get(it.id) ?? 0;
      const before = Number(stockMap.get(it.productId)?.quantity ?? 0);
      return {
        productId: it.productId,
        qtyBefore: before,
        qtyAfter: before - approved,
      };
    }),
  });

  return NextResponse.json({ request: updated });
}
