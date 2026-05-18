import { prisma } from "./prisma";

export type StockStatus = "ok" | "low" | "critical" | "over";

export type InventoryRow = {
  productId: string;
  productName: string;
  sku: string | null;
  categoryName: string | null;
  unitAbbr: string | null;
  purchaseUnitAbbr: string | null;
  unitsPerPurchase: number;
  unitCost: number;
  stock: number;
  minStock: number;
  maxStock: number;
  status: StockStatus;
  locationId: string;
  locationName: string;
};

export function stockStatus(stock: number, min: number, max: number): StockStatus {
  if (min > 0 && stock <= 0) return "critical";
  if (min > 0 && stock <= min) return "low";
  if (max > 0 && stock > max) return "over";
  return "ok";
}

export async function getInventoryView({
  companyId,
  locationIds,
}: {
  companyId: string;
  locationIds?: string[] | null;
}): Promise<{ rows: InventoryRow[]; locations: { id: string; name: string }[] }> {
  const scoped = !!(locationIds && locationIds.length > 0);
  const locations = await prisma.location.findMany({
    where: {
      companyId,
      active: true,
      ...(scoped ? { id: { in: locationIds } } : {}),
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const stockRows = await prisma.stock.findMany({
    where: {
      ...(scoped
        ? { locationId: { in: locationIds } }
        : { location: { companyId } }),
      product: { active: true },
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          unitCost: true,
          category: { select: { name: true } },
          unit: { select: { abbreviation: true } },
          purchaseUnit: { select: { abbreviation: true } },
          unitsPerPurchase: true,
        },
      },
      location: { select: { id: true, name: true } },
    },
  });

  const lps = await prisma.locationProduct.findMany({
    where: scoped
      ? { locationId: { in: locationIds } }
      : { location: { companyId } },
    select: { locationId: true, productId: true, minStock: true, maxStock: true },
  });
  const lpMap = new Map(
    lps.map((lp) => [
      `${lp.locationId}:${lp.productId}`,
      { min: Number(lp.minStock), max: Number(lp.maxStock) },
    ]),
  );

  const rows: InventoryRow[] = stockRows
    .filter((s) => s.product) // safety
    .map((s) => {
      const lp = lpMap.get(`${s.locationId}:${s.productId}`) ?? { min: 0, max: 0 };
      const stock = Number(s.quantity);
      return {
        productId: s.product.id,
        productName: s.product.name,
        sku: s.product.sku,
        categoryName: s.product.category?.name ?? null,
        unitAbbr: s.product.unit?.abbreviation ?? null,
        purchaseUnitAbbr: s.product.purchaseUnit?.abbreviation ?? null,
        unitsPerPurchase: Number(s.product.unitsPerPurchase),
        unitCost: Number(s.product.unitCost),
        stock,
        minStock: lp.min,
        maxStock: lp.max,
        status: stockStatus(stock, lp.min, lp.max),
        locationId: s.location.id,
        locationName: s.location.name,
      };
    })
    .sort((a, b) => a.productName.localeCompare(b.productName));

  return { rows, locations };
}
