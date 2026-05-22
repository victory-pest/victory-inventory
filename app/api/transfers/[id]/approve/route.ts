import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiSession, badRequest, forbidden, notFound } from "@/lib/api";
import { isManagerLike } from "@/lib/permissions";
import { notifyTransferDecision, checkLowStockCrossings } from "@/lib/notify";

const schema = z.object({
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

  if (!isManagerLike(user.role)) return forbidden("Manager only");

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("invalid_body", parsed.error.format());

  const transfer = await prisma.transfer.findFirst({
    where: { id, companyId: user.companyId },
    include: { items: true },
  });
  if (!transfer) return notFound("transfer_not_found");
  if (transfer.status !== "pending")
    return badRequest("Transfer is not pending");

  const approvalsById = new Map(
    parsed.data.items.map((i) => [i.itemId, i.quantityApproved]),
  );
  for (const it of transfer.items) {
    if (!approvalsById.has(it.id)) {
      return badRequest(`Missing approval for item ${it.id}`);
    }
  }

  const productIds = transfer.items.map((i) => i.productId);
  const sourceStock = await prisma.stock.findMany({
    where: {
      locationId: transfer.fromLocationId,
      productId: { in: productIds },
    },
  });
  const sourceMap = new Map(sourceStock.map((s) => [s.productId, s]));

  for (const item of transfer.items) {
    const approved = approvalsById.get(item.id) ?? 0;
    if (approved <= 0) continue;
    const stock = sourceMap.get(item.productId);
    if (!stock || Number(stock.quantity) < approved) {
      return badRequest(`Insufficient source stock for ${item.productId}`);
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    for (const item of transfer.items) {
      const approved = approvalsById.get(item.id) ?? 0;
      await tx.transferItem.update({
        where: { id: item.id },
        data: { quantityApproved: approved },
      });

      if (approved <= 0) continue;

      const source = sourceMap.get(item.productId)!;
      await tx.stock.update({
        where: { id: source.id },
        data: { quantity: { decrement: approved } },
      });

      await tx.stock.upsert({
        where: {
          locationId_productId: {
            locationId: transfer.toLocationId,
            productId: item.productId,
          },
        },
        update: { quantity: { increment: approved } },
        create: {
          locationId: transfer.toLocationId,
          productId: item.productId,
          quantity: approved,
        },
      });

      await tx.stockMovement.create({
        data: {
          companyId: user.companyId,
          locationId: transfer.fromLocationId,
          productId: item.productId,
          movementType: "transfer_out",
          quantity: -approved,
          referenceId: transfer.id,
          performedBy: user.id,
          note: `Transfer to ${transfer.toLocationId}`,
        },
      });
      await tx.stockMovement.create({
        data: {
          companyId: user.companyId,
          locationId: transfer.toLocationId,
          productId: item.productId,
          movementType: "transfer_in",
          quantity: approved,
          referenceId: transfer.id,
          performedBy: user.id,
          note: `Transfer from ${transfer.fromLocationId}`,
        },
      });
    }

    return tx.transfer.update({
      where: { id: transfer.id },
      data: { status: "approved", approvedBy: user.id },
    });
  });

  await notifyTransferDecision({
    companyId: user.companyId,
    transferId: transfer.id,
    requesterId: transfer.requestedBy,
    approved: true,
  });

  await checkLowStockCrossings({
    companyId: user.companyId,
    locationId: transfer.fromLocationId,
    changes: transfer.items.map((it) => {
      const approved = approvalsById.get(it.id) ?? 0;
      const before = Number(sourceMap.get(it.productId)?.quantity ?? 0);
      return {
        productId: it.productId,
        qtyBefore: before,
        qtyAfter: before - approved,
      };
    }),
  });

  return NextResponse.json({ transfer: updated });
}
