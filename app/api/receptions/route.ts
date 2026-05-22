import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiSession, badRequest, forbidden, notFound } from "@/lib/api";
import { canSupervisorDo, isManagerLike } from "@/lib/permissions";
import { notifyReception } from "@/lib/notify";

export async function GET() {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const user = auth.session.user;

  const where =
    user.role === "supervisor"
      ? {
          companyId: user.companyId,
          locationId: { in: user.supervisedLocationIds },
        }
      : { companyId: user.companyId };

  const receptions = await prisma.reception.findMany({
    where,
    include: {
      location: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
      receiver: { select: { id: true, name: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true } },
        },
      },
    },
    orderBy: { receptionDate: "desc" },
    take: 100,
  });
  return NextResponse.json({ receptions });
}

const schema = z.object({
  locationId: z.string().min(1),
  supplierId: z.string().nullable().optional(),
  invoiceNumber: z.string().max(100).optional().nullable(),
  receptionDate: z.string().min(1),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
        unitCost: z.number().min(0).default(0),
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
    const allowed = await canSupervisorDo("canReceiveStock", user.companyId);
    if (!allowed) return forbidden("Receiving not permitted");
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("invalid_body", parsed.error.format());
  const { locationId, supplierId, invoiceNumber, receptionDate, items } = parsed.data;

  const location = await prisma.location.findFirst({
    where: { id: locationId, companyId: user.companyId },
  });
  if (!location) return notFound("location_not_found");
  if (
    user.role === "supervisor" &&
    !user.supervisedLocationIds.includes(locationId)
  ) {
    return forbidden("Not one of your supervised locations");
  }

  if (supplierId) {
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, companyId: user.companyId },
    });
    if (!supplier) return notFound("supplier_not_found");
  }

  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, companyId: user.companyId },
    select: { id: true },
  });
  if (products.length !== productIds.length) {
    return badRequest("Some products not found in this company");
  }

  const created = await prisma.$transaction(async (tx) => {
    const reception = await tx.reception.create({
      data: {
        companyId: user.companyId,
        locationId,
        supplierId: supplierId ?? null,
        invoiceNumber: invoiceNumber ?? null,
        receivedBy: user.id,
        receptionDate: new Date(receptionDate),
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitCost: i.unitCost,
          })),
        },
      },
      include: {
        items: { include: { product: { select: { name: true } } } },
      },
    });

    for (const item of items) {
      await tx.stock.upsert({
        where: { locationId_productId: { locationId, productId: item.productId } },
        update: { quantity: { increment: item.quantity } },
        create: { locationId, productId: item.productId, quantity: item.quantity },
      });

      await tx.stockMovement.create({
        data: {
          companyId: user.companyId,
          locationId,
          productId: item.productId,
          movementType: "reception",
          quantity: item.quantity,
          referenceId: reception.id,
          performedBy: user.id,
          note: invoiceNumber ? `Invoice ${invoiceNumber}` : null,
        },
      });
    }

    return reception;
  });

  await notifyReception({
    companyId: user.companyId,
    receptionId: created.id,
    locationName: location.name,
  });

  return NextResponse.json({ reception: created }, { status: 201 });
}
