import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiSession, badRequest, forbidden } from "@/lib/api";
import { getCatalog } from "@/lib/catalog";
import { canSupervisorDo, isManagerLike } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");
  const search = searchParams.get("q");
  const locationParam = searchParams.get("locationId");

  const result = await getCatalog({
    companyId: auth.session.user.companyId,
    role: auth.session.user.role,
    locationId:
      auth.session.user.role === "technician"
        ? auth.session.user.locationId
        : (locationParam ?? auth.session.user.locationId),
    licenseIds: auth.session.user.licenseIds,
    categoryId,
    search,
  });

  return NextResponse.json(result);
}

const schema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().max(60).nullable().optional(),
  categoryId: z.string().nullable().optional(),
  unitId: z.string().nullable().optional(),
  purchaseUnitId: z.string().nullable().optional(),
  unitsPerPurchase: z.number().min(0.01).default(1),
  supplierId: z.string().nullable().optional(),
  unitCost: z.number().min(0).default(0),
  epaRegistration: z.string().max(60).nullable().optional(),
  activeIngredient: z.string().max(500).nullable().optional(),
  photoUrl: z.string().url().nullable().optional(),
  requiresLicense: z.boolean().default(false),
  licenseTypeIds: z.array(z.string()).default([]),
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

export async function POST(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const user = auth.session.user;
  if (!(await checkPermission(user.role, user.companyId)))
    return forbidden("Product management not permitted");

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("invalid_body", parsed.error.format());

  const product = await prisma.product.create({
    data: {
      companyId: user.companyId,
      name: parsed.data.name,
      sku: parsed.data.sku ?? null,
      categoryId: parsed.data.categoryId ?? null,
      unitId: parsed.data.unitId ?? null,
      purchaseUnitId: parsed.data.purchaseUnitId ?? null,
      unitsPerPurchase: parsed.data.unitsPerPurchase,
      supplierId: parsed.data.supplierId ?? null,
      unitCost: parsed.data.unitCost,
      epaRegistration: parsed.data.epaRegistration ?? null,
      activeIngredient: parsed.data.activeIngredient ?? null,
      photoUrl: parsed.data.photoUrl ?? null,
      requiresLicense: parsed.data.requiresLicense,
      active: parsed.data.active ?? true,
      licenses: {
        create: parsed.data.licenseTypeIds.map((licenseTypeId) => ({
          licenseTypeId,
        })),
      },
    },
  });

  // Make product available at all active locations by default
  const locations = await prisma.location.findMany({
    where: { companyId: user.companyId, active: true },
    select: { id: true },
  });
  for (const l of locations) {
    await prisma.locationProduct.upsert({
      where: { locationId_productId: { locationId: l.id, productId: product.id } },
      update: { active: true },
      create: {
        locationId: l.id,
        productId: product.id,
        active: true,
        minStock: 0,
        maxStock: 0,
      },
    });
  }

  return NextResponse.json({ product }, { status: 201 });
}
