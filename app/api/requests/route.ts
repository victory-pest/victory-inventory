import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiSession, badRequest } from "@/lib/api";
import {
  notifyNewRequest,
  notifyRequestAutoAdjusted,
} from "@/lib/notify";

const createSchema = z.object({
  priority: z.enum(["urgent", "high", "normal", "low"]).default("normal"),
  note: z.string().max(1000).optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

export async function GET(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;

  const user = auth.session.user;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");

  const where: Prisma.RequestWhereInput = {
    companyId: user.companyId,
  };

  if (user.role === "technician") {
    where.technicianId = user.id;
  } else if (user.role === "supervisor") {
    where.locationId = { in: user.supervisedLocationIds };
  }

  if (status) where.status = status as Prisma.RequestWhereInput["status"];
  if (priority) where.priority = priority as Prisma.RequestWhereInput["priority"];

  const requests = await prisma.request.findMany({
    where,
    include: {
      technician: { select: { id: true, name: true } },
      approver: { select: { id: true, name: true } },
      location: { select: { id: true, name: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true } },
        },
      },
    },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ requests });
}

export async function POST(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;

  const user = auth.session.user;
  if (user.role !== "technician") {
    return badRequest("Only technicians can create requests");
  }
  if (!user.locationId) {
    return badRequest("Technician has no assigned location");
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return badRequest("invalid_body", parsed.error.format());

  const { priority, note, items } = parsed.data;

  const productIds = items.map((i) => i.productId);
  const [products, stockRows, locationProducts] = await Promise.all([
    prisma.product.findMany({
      where: {
        id: { in: productIds },
        companyId: user.companyId,
        active: true,
      },
      include: { licenses: { select: { licenseTypeId: true } } },
    }),
    prisma.stock.findMany({
      where: { productId: { in: productIds }, locationId: user.locationId },
    }),
    prisma.locationProduct.findMany({
      where: {
        productId: { in: productIds },
        locationId: user.locationId,
        active: true,
      },
    }),
  ]);

  const productMap = new Map(products.map((p) => [p.id, p]));
  const stockMap = new Map(stockRows.map((s) => [s.productId, Number(s.quantity)]));
  const locProdSet = new Set(locationProducts.map((lp) => lp.productId));

  const adjustments: {
    productId: string;
    productName: string;
    requested: number;
    approved: number;
  }[] = [];
  const finalItems: { productId: string; quantity: number; unitCost: number }[] = [];

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) return badRequest(`Product not found: ${item.productId}`);
    if (!locProdSet.has(product.id))
      return badRequest(`Product not available at this location: ${product.name}`);

    if (product.requiresLicense) {
      const required = product.licenses.map((l) => l.licenseTypeId);
      const ok = required.every((id) => user.licenseIds.includes(id));
      if (!ok) return badRequest(`License missing for product: ${product.name}`);
    }

    const available = stockMap.get(product.id) ?? 0;
    if (available <= 0) return badRequest(`Out of stock: ${product.name}`);

    const requested = item.quantity;
    const approved = Math.min(requested, available);

    if (approved < requested) {
      adjustments.push({
        productId: product.id,
        productName: product.name,
        requested,
        approved,
      });
    }

    finalItems.push({
      productId: product.id,
      quantity: approved,
      unitCost: Number(product.unitCost),
    });
  }

  const created = await prisma.request.create({
    data: {
      companyId: user.companyId,
      locationId: user.locationId,
      technicianId: user.id,
      priority,
      note: note ?? null,
      status: "pending",
      items: {
        create: finalItems.map((i) => ({
          productId: i.productId,
          quantityRequested: i.quantity,
          unitCostAtTime: i.unitCost,
        })),
      },
    },
    include: {
      items: { include: { product: { select: { name: true, sku: true } } } },
    },
  });

  await notifyNewRequest({
    companyId: user.companyId,
    locationId: user.locationId,
    requestId: created.id,
    priority,
    technicianName: user.name,
  });

  if (adjustments.length > 0) {
    await notifyRequestAutoAdjusted({
      companyId: user.companyId,
      locationId: user.locationId,
      requestId: created.id,
      technicianName: user.name,
    });
  }

  return NextResponse.json({ request: created, adjustments }, { status: 201 });
}
