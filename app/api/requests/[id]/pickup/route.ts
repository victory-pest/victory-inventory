import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession, badRequest, notFound, forbidden } from "@/lib/api";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const user = auth.session.user;

  const { id } = await ctx.params;
  const request = await prisma.request.findFirst({
    where: { id, companyId: user.companyId },
    include: { items: true, company: { select: { truckInventoryEnabled: true } } },
  });
  if (!request) return notFound("request_not_found");
  if (request.technicianId !== user.id) return forbidden("Not your request");
  if (request.status !== "approved")
    return badRequest("Only approved requests can be picked up");

  const updated = await prisma.$transaction(async (tx) => {
    if (request.company.truckInventoryEnabled) {
      for (const item of request.items) {
        const qty = Number(item.quantityApproved ?? 0);
        if (qty <= 0) continue;
        await tx.truckInventory.upsert({
          where: {
            userId_productId: { userId: user.id, productId: item.productId },
          },
          update: { quantity: { increment: qty } },
          create: { userId: user.id, productId: item.productId, quantity: qty },
        });
      }
    }

    return tx.request.update({
      where: { id: request.id },
      data: { status: "picked_up", pickedUpAt: new Date() },
    });
  });

  return NextResponse.json({ request: updated });
}
