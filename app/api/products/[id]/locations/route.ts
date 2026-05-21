import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  requireApiSession,
  badRequest,
  forbidden,
  notFound,
} from "@/lib/api";
import { isManagerLike } from "@/lib/permissions";

// GET — return active locations in scope + their LocationProduct settings for this product
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const user = auth.session.user;

  const allowed =
    isManagerLike(user.role as never) || user.role === "supervisor";
  if (!allowed) return forbidden("Not permitted");

  const { id } = await ctx.params;
  const product = await prisma.product.findFirst({
    where: { id, companyId: user.companyId },
    select: { id: true, name: true },
  });
  if (!product) return notFound("product_not_found");

  // Scope locations for supervisors
  const locationWhere =
    user.role === "supervisor"
      ? {
          id: { in: user.supervisedLocationIds },
          companyId: user.companyId,
          active: true,
        }
      : { companyId: user.companyId, active: true };

  const locations = await prisma.location.findMany({
    where: locationWhere,
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const settings = await prisma.locationProduct.findMany({
    where: {
      productId: id,
      locationId: { in: locations.map((l) => l.id) },
    },
    select: {
      locationId: true,
      minStock: true,
      maxStock: true,
      active: true,
    },
  });

  return NextResponse.json({
    product,
    locations,
    settings: settings.map((s) => ({
      locationId: s.locationId,
      minStock: Number(s.minStock),
      maxStock: Number(s.maxStock),
      active: s.active,
    })),
  });
}

// PATCH — bulk upsert LocationProduct settings
const patchSchema = z.object({
  settings: z.array(
    z.object({
      locationId: z.string(),
      minStock: z.number().min(0),
      maxStock: z.number().min(0),
      active: z.boolean(),
    }),
  ),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const user = auth.session.user;

  const allowed =
    isManagerLike(user.role as never) || user.role === "supervisor";
  if (!allowed) return forbidden("Not permitted");

  const { id } = await ctx.params;
  const product = await prisma.product.findFirst({
    where: { id, companyId: user.companyId },
    select: { id: true },
  });
  if (!product) return notFound("product_not_found");

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return badRequest("invalid_body", parsed.error.format());

  // Validate: max >= min (or max=0 meaning no limit)
  for (const s of parsed.data.settings) {
    if (s.maxStock > 0 && s.maxStock < s.minStock) {
      return badRequest(
        "Max stock must be >= min stock at every location (or set Max to 0 for no limit).",
      );
    }
  }

  // Validate location ownership + supervisor scope
  const incomingIds = parsed.data.settings.map((s) => s.locationId);
  const validLocs = await prisma.location.findMany({
    where: {
      id: { in: incomingIds },
      companyId: user.companyId,
      active: true,
    },
    select: { id: true },
  });
  const validIdSet = new Set(validLocs.map((l) => l.id));
  for (const lid of incomingIds) {
    if (!validIdSet.has(lid)) {
      return badRequest(`Invalid location: ${lid}`);
    }
  }
  if (user.role === "supervisor") {
    for (const lid of incomingIds) {
      if (!user.supervisedLocationIds.includes(lid)) {
        return forbidden(`Not authorized for location: ${lid}`);
      }
    }
  }

  // Upsert each row
  for (const s of parsed.data.settings) {
    await prisma.locationProduct.upsert({
      where: {
        locationId_productId: {
          locationId: s.locationId,
          productId: id,
        },
      },
      update: {
        minStock: s.minStock,
        maxStock: s.maxStock,
        active: s.active,
      },
      create: {
        locationId: s.locationId,
        productId: id,
        minStock: s.minStock,
        maxStock: s.maxStock,
        active: s.active,
      },
    });
    // Also ensure a Stock row exists at this location (in case the product
    // was created before this location, or vice versa)
    await prisma.stock.upsert({
      where: {
        locationId_productId: {
          locationId: s.locationId,
          productId: id,
        },
      },
      update: {},
      create: {
        locationId: s.locationId,
        productId: id,
        quantity: 0,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
