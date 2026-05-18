import { prisma } from "./prisma";
import type { Role } from "./nav";

export type CatalogQuery = {
  companyId: string;
  role: Role;
  locationId: string | null;
  licenseIds: string[];
  categoryId?: string | null;
  search?: string | null;
};

export type CatalogProduct = {
  id: string;
  name: string;
  sku: string | null;
  activeIngredient: string | null;
  photoUrl: string | null;
  requiresLicense: boolean;
  unitCost: number;
  category: { id: string; name: string } | null;
  unit: { id: string; name: string; abbreviation: string | null } | null;
  purchaseUnit: { name: string; abbreviation: string | null } | null;
  unitsPerPurchase: number;
  locationId: string | null;
  stock: number;
  minStock: number;
  maxStock: number;
  authorized: boolean;
};

export type CatalogCategory = { id: string; name: string };

const isTechnicianRole = (role: Role) => role === "technician";

export async function getCatalog(q: CatalogQuery): Promise<{
  products: CatalogProduct[];
  categories: CatalogCategory[];
}> {
  const techScope = isTechnicianRole(q.role) && !!q.locationId;

  const categories = await prisma.productCategory.findMany({
    where: { companyId: q.companyId, active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const products = await prisma.product.findMany({
    where: {
      companyId: q.companyId,
      active: true,
      ...(q.categoryId ? { categoryId: q.categoryId } : {}),
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search, mode: "insensitive" as const } },
              { sku: { contains: q.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(techScope
        ? {
            locationProducts: {
              some: { locationId: q.locationId!, active: true },
            },
          }
        : {}),
    },
    include: {
      category: { select: { id: true, name: true } },
      unit: { select: { id: true, name: true, abbreviation: true } },
      purchaseUnit: { select: { name: true, abbreviation: true } },
      licenses: { select: { licenseTypeId: true } },
      stock: q.locationId
        ? { where: { locationId: q.locationId } }
        : { select: { quantity: true, locationId: true } },
      locationProducts: q.locationId
        ? { where: { locationId: q.locationId } }
        : { select: { minStock: true, maxStock: true, locationId: true } },
    },
    orderBy: { name: "asc" },
  });

  return {
    categories,
    products: products
      .map((p) => {
        const stockRow = p.stock[0];
        const lp = p.locationProducts[0];
        const required = p.licenses.map((l) => l.licenseTypeId);
        const authorized =
          !p.requiresLicense || required.every((id) => q.licenseIds.includes(id));

        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          activeIngredient: p.activeIngredient,
          photoUrl: p.photoUrl,
          requiresLicense: p.requiresLicense,
          unitCost: Number(p.unitCost),
          category: p.category,
          unit: p.unit,
          purchaseUnit: p.purchaseUnit,
          unitsPerPurchase: Number(p.unitsPerPurchase),
          locationId: q.locationId,
          stock: stockRow ? Number(stockRow.quantity) : 0,
          minStock: lp ? Number(lp.minStock) : 0,
          maxStock: lp ? Number(lp.maxStock) : 0,
          authorized,
        };
      })
      .filter((p) => (techScope ? p.authorized : true)),
  };
}
