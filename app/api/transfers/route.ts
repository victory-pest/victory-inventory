import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiSession, badRequest, forbidden, notFound } from "@/lib/api";
import { canSupervisorDo, isManagerLike } from "@/lib/permissions";
import { notifyTransferRequested } from "@/lib/notify";

export async function GET() {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const user = auth.session.user;

  const where =
    user.role === "supervisor" && user.locationId
      ? {
          companyId: user.companyId,
          OR: [
            { fromLocationId: user.locationId },
            { toLocationId: user.locationId },
          ],
        }
      : { companyId: user.companyId };

  const transfers = await prisma.transfer.findMany({
    where,
    include: {
      fromLocation: { select: { id: true, name: true } },
      toLocation: { select: { id: true, name: true } },
      requester: { select: { id: true, name: true } },
      approver: { select: { id: true, name: true } },
      items: {
        include: { product: { select: { id: true, name: true, sku: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ transfers });
}

const createSchema = z.object({
  fromLocationId: z.string().min(1),
  toLocationId: z.string().min(1),
  note: z.string().max(1000).optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().positive(),
      }),
    )
    .min(1),
});

export async function POST(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const user = auth.session.user;

  if (!isManagerLike(user.role)) {
    if (user.role !== "supervisor") return forbidden("Role not authorized");
    const allowed = await canSupervisorDo("canTransferStock", user.companyId);
    if (!allowed) return forbidden("Transfers not permitted");
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return badRequest("invalid_body", parsed.error.format());
  const { fromLocationId, toLocationId, note, items } = parsed.data;

  if (fromLocationId === toLocationId) {
    return badRequest("Source and destination must differ");
  }

  if (user.role === "supervisor" && user.locationId !== fromLocationId) {
    return forbidden("Can only transfer from your own location");
  }

  const locations = await prisma.location.findMany({
    where: {
      id: { in: [fromLocationId, toLocationId] },
      companyId: user.companyId,
    },
  });
  if (locations.length !== 2) return notFound("location_not_found");

  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, companyId: user.companyId },
    select: { id: true, unitCost: true, name: true },
  });
  if (products.length !== productIds.length) {
    return badRequest("Some products not found");
  }
  const productMap = new Map(products.map((p) => [p.id, p]));

  const stockRows = await prisma.stock.findMany({
    where: {
      locationId: fromLocationId,
      productId: { in: productIds },
    },
  });
  const stockMap = new Map(stockRows.map((s) => [s.productId, Number(s.quantity)]));

  for (const it of items) {
    const available = stockMap.get(it.productId) ?? 0;
    if (available < it.quantity) {
      const p = productMap.get(it.productId);
      return badRequest(
        `Insufficient stock for ${p?.name ?? it.productId}: ${available} available`,
      );
    }
  }

  const transfer = await prisma.transfer.create({
    data: {
      companyId: user.companyId,
      fromLocationId,
      toLocationId,
      requestedBy: user.id,
      status: "pending",
      note: note ?? null,
      items: {
        create: items.map((i) => {
          const p = productMap.get(i.productId)!;
          return {
            productId: i.productId,
            quantityRequested: i.quantity,
            unitCostAtTime: Number(p.unitCost),
          };
        }),
      },
    },
  });

  await notifyTransferRequested({
    companyId: user.companyId,
    transferId: transfer.id,
    fromName: locations.find((l) => l.id === fromLocationId)?.name ?? "Source",
    toName: locations.find((l) => l.id === toLocationId)?.name ?? "Destination",
  });

  return NextResponse.json({ transfer }, { status: 201 });
}
