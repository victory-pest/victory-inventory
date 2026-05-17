import { prisma } from "./prisma";
import type { Role } from "./nav";
import { stockStatus } from "./inventory";

export type ReportType =
  | "catalog"
  | "stock"
  | "below-min"
  | "request-history"
  | "reception-log"
  | "adjustment-log"
  | "consumption-tech"
  | "consumption-product"
  | "inventory-valuation"
  | "most-requested"
  | "waste-shrinkage"
  | "location-comparison"
  | "transfer-history";

export type ColumnFormat =
  | "text"
  | "number"
  | "currency"
  | "date"
  | "datetime"
  | "status"
  | "priority"
  | "percent";

export type ReportColumn = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  format?: ColumnFormat;
  width?: number;
};

export type ReportDefinition = {
  id: ReportType;
  title: string;
  description: string;
  managerOnly: boolean;
  needsDateRange: boolean;
  needsLocation?: boolean;
  groupBy?: string;
  columns: ReportColumn[];
};

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    id: "catalog",
    title: "Product Catalog",
    description: "Master list of products with all attributes, grouped by category",
    managerOnly: false,
    needsDateRange: false,
    needsLocation: false,
    groupBy: "category",
    columns: [
      { key: "name", label: "Product" },
      { key: "sku", label: "SKU" },
      { key: "category", label: "Category" },
      { key: "activeIngredient", label: "Active Ingredient" },
      { key: "epaRegistration", label: "EPA Reg #" },
      { key: "supplier", label: "Supplier" },
      { key: "unit", label: "Unit" },
      { key: "unitCost", label: "Unit Cost", align: "right", format: "currency" },
      { key: "licenses", label: "Licenses" },
      { key: "status", label: "Status", format: "status" },
    ],
  },
  {
    id: "stock",
    title: "Current Stock",
    description: "On-hand stock by product with min/max status",
    managerOnly: false,
    needsDateRange: false,
    columns: [
      { key: "product", label: "Product" },
      { key: "sku", label: "SKU" },
      { key: "category", label: "Category" },
      { key: "unit", label: "Unit" },
      { key: "location", label: "Location" },
      { key: "stock", label: "Stock", align: "right", format: "number" },
      { key: "min", label: "Min", align: "right", format: "number" },
      { key: "max", label: "Max", align: "right", format: "number" },
      { key: "status", label: "Status", format: "status" },
      { key: "unitCost", label: "Unit Cost", align: "right", format: "currency" },
      { key: "totalValue", label: "Total Value", align: "right", format: "currency" },
    ],
  },
  {
    id: "below-min",
    title: "Below Minimum",
    description: "Items at or below their minimum stock level",
    managerOnly: false,
    needsDateRange: false,
    columns: [
      { key: "product", label: "Product" },
      { key: "sku", label: "SKU" },
      { key: "location", label: "Location" },
      { key: "current", label: "Current", align: "right", format: "number" },
      { key: "min", label: "Min", align: "right", format: "number" },
      { key: "deficit", label: "Deficit", align: "right", format: "number" },
      { key: "supplier", label: "Supplier" },
    ],
  },
  {
    id: "request-history",
    title: "Request History",
    description: "All requests in the selected date range",
    managerOnly: false,
    needsDateRange: true,
    columns: [
      { key: "id", label: "ID" },
      { key: "date", label: "Date", format: "datetime" },
      { key: "technician", label: "Technician" },
      { key: "location", label: "Location" },
      { key: "priority", label: "Priority", format: "priority" },
      { key: "products", label: "Products" },
      { key: "status", label: "Status", format: "status" },
      { key: "approver", label: "Approved By" },
    ],
  },
  {
    id: "reception-log",
    title: "Reception Log",
    description: "Incoming stock by date",
    managerOnly: false,
    needsDateRange: true,
    columns: [
      { key: "date", label: "Date", format: "date" },
      { key: "supplier", label: "Supplier" },
      { key: "invoice", label: "Invoice" },
      { key: "location", label: "Location" },
      { key: "products", label: "Products" },
      { key: "totalQty", label: "Total Qty", align: "right", format: "number" },
      { key: "totalCost", label: "Total Cost", align: "right", format: "currency" },
      { key: "receiver", label: "Received By" },
    ],
  },
  {
    id: "adjustment-log",
    title: "Adjustment Log",
    description: "Manual stock adjustments with before/after values",
    managerOnly: false,
    needsDateRange: true,
    columns: [
      { key: "date", label: "Date", format: "datetime" },
      { key: "product", label: "Product" },
      { key: "location", label: "Location" },
      { key: "before", label: "Before", align: "right", format: "number" },
      { key: "after", label: "After", align: "right", format: "number" },
      { key: "delta", label: "Delta", align: "right", format: "number" },
      { key: "reason", label: "Reason" },
      { key: "by", label: "By" },
    ],
  },
  {
    id: "consumption-tech",
    title: "Consumption by Technician",
    description: "Approved request totals per technician",
    managerOnly: true,
    needsDateRange: true,
    columns: [
      { key: "technician", label: "Technician" },
      { key: "location", label: "Location" },
      { key: "requests", label: "Requests", align: "right", format: "number" },
      { key: "items", label: "Items", align: "right", format: "number" },
      { key: "totalValue", label: "Total Value", align: "right", format: "currency" },
    ],
  },
  {
    id: "consumption-product",
    title: "Consumption by Product",
    description: "Approved quantities per product",
    managerOnly: true,
    needsDateRange: true,
    columns: [
      { key: "product", label: "Product" },
      { key: "sku", label: "SKU" },
      { key: "requests", label: "Requests", align: "right", format: "number" },
      { key: "totalQty", label: "Total Qty", align: "right", format: "number" },
      { key: "totalValue", label: "Total Value", align: "right", format: "currency" },
    ],
  },
  {
    id: "inventory-valuation",
    title: "Inventory Valuation",
    description: "Stock × unit cost, totaled across locations",
    managerOnly: true,
    needsDateRange: false,
    columns: [
      { key: "product", label: "Product" },
      { key: "category", label: "Category" },
      { key: "location", label: "Location" },
      { key: "stock", label: "Stock", align: "right", format: "number" },
      { key: "unitCost", label: "Unit Cost", align: "right", format: "currency" },
      { key: "totalValue", label: "Total Value", align: "right", format: "currency" },
    ],
  },
  {
    id: "most-requested",
    title: "Most Requested",
    description: "Products ranked by request count",
    managerOnly: true,
    needsDateRange: true,
    columns: [
      { key: "rank", label: "Rank", align: "right", format: "number" },
      { key: "product", label: "Product" },
      { key: "sku", label: "SKU" },
      { key: "requestCount", label: "Requests", align: "right", format: "number" },
      { key: "totalQty", label: "Total Qty", align: "right", format: "number" },
    ],
  },
  {
    id: "waste-shrinkage",
    title: "Waste / Shrinkage",
    description: "Variances from physical counts",
    managerOnly: true,
    needsDateRange: true,
    columns: [
      { key: "product", label: "Product" },
      { key: "location", label: "Location" },
      { key: "countDate", label: "Count Date", format: "date" },
      { key: "systemQty", label: "System", align: "right", format: "number" },
      { key: "countedQty", label: "Counted", align: "right", format: "number" },
      { key: "variance", label: "Variance", align: "right", format: "number" },
      { key: "variancePct", label: "Variance %", align: "right", format: "percent" },
      { key: "reason", label: "Reason" },
    ],
  },
  {
    id: "location-comparison",
    title: "Location Comparison",
    description: "Stock value, requests, and consumption per location",
    managerOnly: true,
    needsDateRange: true,
    columns: [
      { key: "location", label: "Location" },
      { key: "stockValue", label: "Stock Value", align: "right", format: "currency" },
      { key: "requests", label: "Requests", align: "right", format: "number" },
      { key: "consumption", label: "Consumption", align: "right", format: "currency" },
      { key: "lowStock", label: "Low Stock Items", align: "right", format: "number" },
    ],
  },
  {
    id: "transfer-history",
    title: "Transfer History",
    description: "Stock transfers between locations",
    managerOnly: true,
    needsDateRange: true,
    columns: [
      { key: "date", label: "Date", format: "datetime" },
      { key: "from", label: "From" },
      { key: "to", label: "To" },
      { key: "products", label: "Products" },
      { key: "totalQty", label: "Total Qty", align: "right", format: "number" },
      { key: "status", label: "Status", format: "status" },
      { key: "approver", label: "Approved By" },
    ],
  },
];

export function getReportDefinition(type: ReportType): ReportDefinition {
  const def = REPORT_DEFINITIONS.find((r) => r.id === type);
  if (!def) throw new Error(`Unknown report type: ${type}`);
  return def;
}

export function reportsForRole(role: Role): ReportDefinition[] {
  if (role === "manager" || role === "super_admin") return REPORT_DEFINITIONS;
  if (role === "supervisor")
    return REPORT_DEFINITIONS.filter((r) => !r.managerOnly);
  return [];
}

export type ReportFilters = {
  companyId: string;
  role: Role;
  userLocationId: string | null;
  rangeStart: Date;
  rangeEnd: Date;
  locationId: string | null;
  activeFilter?: "active" | "inactive" | "all";
};

export type ReportRow = Record<string, string | number | null>;

export type ReportResult = {
  rows: ReportRow[];
};

function effectiveLocation(filters: ReportFilters): string | null {
  if (filters.role === "supervisor") return filters.userLocationId;
  return filters.locationId;
}

export async function runReport(
  type: ReportType,
  filters: ReportFilters,
): Promise<ReportResult> {
  switch (type) {
    case "catalog":
      return runCatalogReport(filters);
    case "stock":
      return runStockReport(filters);
    case "below-min":
      return runBelowMinReport(filters);
    case "request-history":
      return runRequestHistoryReport(filters);
    case "reception-log":
      return runReceptionLogReport(filters);
    case "adjustment-log":
      return runAdjustmentLogReport(filters);
    case "consumption-tech":
      return runConsumptionTechReport(filters);
    case "consumption-product":
      return runConsumptionProductReport(filters);
    case "inventory-valuation":
      return runInventoryValuationReport(filters);
    case "most-requested":
      return runMostRequestedReport(filters);
    case "waste-shrinkage":
      return runWasteShrinkageReport(filters);
    case "location-comparison":
      return runLocationComparisonReport(filters);
    case "transfer-history":
      return runTransferHistoryReport(filters);
  }
}

async function runCatalogReport(filters: ReportFilters): Promise<ReportResult> {
  const activeFilter = filters.activeFilter ?? "active";
  const products = await prisma.product.findMany({
    where: {
      companyId: filters.companyId,
      ...(activeFilter === "active" ? { active: true } : {}),
      ...(activeFilter === "inactive" ? { active: false } : {}),
    },
    include: {
      category: { select: { name: true } },
      supplier: { select: { name: true } },
      unit: { select: { abbreviation: true, name: true } },
      licenses: { include: { licenseType: { select: { name: true } } } },
    },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });

  const rows: ReportRow[] = products.map((p) => ({
    name: p.name,
    sku: p.sku ?? "",
    category: p.category?.name ?? "",
    activeIngredient: p.activeIngredient ?? "",
    epaRegistration: p.epaRegistration ?? "",
    supplier: p.supplier?.name ?? "",
    unit: p.unit?.abbreviation ?? p.unit?.name ?? "",
    unitCost: Number(p.unitCost),
    licenses: p.licenses.map((l) => l.licenseType.name).join(", "),
    status: p.active ? "active" : "inactive",
  }));

  rows.sort(
    (a, b) =>
      String(a.category).localeCompare(String(b.category)) ||
      String(a.name).localeCompare(String(b.name)),
  );

  return { rows };
}

async function runStockReport(filters: ReportFilters): Promise<ReportResult> {
  const locId = effectiveLocation(filters);
  const stocks = await prisma.stock.findMany({
    where: {
      ...(locId ? { locationId: locId } : { location: { companyId: filters.companyId } }),
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
        },
      },
      location: { select: { name: true } },
    },
  });
  const lps = await prisma.locationProduct.findMany({
    where: locId
      ? { locationId: locId }
      : { location: { companyId: filters.companyId } },
    select: { locationId: true, productId: true, minStock: true, maxStock: true },
  });
  const lpMap = new Map(
    lps.map((lp) => [
      `${lp.locationId}:${lp.productId}`,
      { min: Number(lp.minStock), max: Number(lp.maxStock) },
    ]),
  );

  const rows: ReportRow[] = stocks
    .map((s) => {
      const lp = lpMap.get(`${s.locationId}:${s.productId}`) ?? { min: 0, max: 0 };
      const stock = Number(s.quantity);
      const unitCost = Number(s.product.unitCost);
      return {
        product: s.product.name,
        sku: s.product.sku ?? "",
        category: s.product.category?.name ?? "",
        unit: s.product.unit?.abbreviation ?? "",
        location: s.location.name,
        stock,
        min: lp.min,
        max: lp.max,
        status: stockStatus(stock, lp.min, lp.max),
        unitCost,
        totalValue: stock * unitCost,
      };
    })
    .sort((a, b) => String(a.product).localeCompare(String(b.product)));
  return { rows };
}

async function runBelowMinReport(filters: ReportFilters): Promise<ReportResult> {
  const stockRes = await runStockReport(filters);
  const rows = stockRes.rows
    .filter((r) => {
      const min = Number(r.min);
      const stock = Number(r.stock);
      return min > 0 && stock <= min;
    })
    .map((r) => ({
      product: r.product,
      sku: r.sku,
      location: r.location,
      current: r.stock,
      min: r.min,
      deficit: Number(r.min) - Number(r.stock),
      supplier: "—",
    }));

  // Attach supplier names
  const productNames = new Set(rows.map((r) => String(r.product)));
  if (productNames.size > 0) {
    const products = await prisma.product.findMany({
      where: {
        companyId: filters.companyId,
        name: { in: Array.from(productNames) },
      },
      select: { name: true, supplier: { select: { name: true } } },
    });
    const supMap = new Map(products.map((p) => [p.name, p.supplier?.name ?? "—"]));
    for (const r of rows) r.supplier = supMap.get(String(r.product)) ?? "—";
  }

  return { rows };
}

async function runRequestHistoryReport(filters: ReportFilters): Promise<ReportResult> {
  const locId = effectiveLocation(filters);
  const requests = await prisma.request.findMany({
    where: {
      companyId: filters.companyId,
      ...(locId ? { locationId: locId } : {}),
      createdAt: { gte: filters.rangeStart, lte: filters.rangeEnd },
    },
    include: {
      technician: { select: { name: true } },
      approver: { select: { name: true } },
      location: { select: { name: true } },
      items: { include: { product: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  const rows: ReportRow[] = requests.map((r) => ({
    id: r.id.slice(0, 8),
    date: r.createdAt.toISOString(),
    technician: r.technician.name,
    location: r.location.name,
    priority: r.priority,
    products: r.items
      .map((it) => `${it.product.name} (${Number(it.quantityRequested)})`)
      .join(", "),
    status: r.status,
    approver: r.approver?.name ?? "—",
  }));
  return { rows };
}

async function runReceptionLogReport(filters: ReportFilters): Promise<ReportResult> {
  const locId = effectiveLocation(filters);
  const receptions = await prisma.reception.findMany({
    where: {
      companyId: filters.companyId,
      ...(locId ? { locationId: locId } : {}),
      receptionDate: { gte: filters.rangeStart, lte: filters.rangeEnd },
    },
    include: {
      supplier: { select: { name: true } },
      location: { select: { name: true } },
      receiver: { select: { name: true } },
      items: { include: { product: { select: { name: true } } } },
    },
    orderBy: { receptionDate: "desc" },
  });

  const rows: ReportRow[] = receptions.map((r) => {
    const totalQty = r.items.reduce((s, it) => s + Number(it.quantity), 0);
    const totalCost = r.items.reduce(
      (s, it) => s + Number(it.quantity) * Number(it.unitCost),
      0,
    );
    return {
      date: r.receptionDate.toISOString(),
      supplier: r.supplier?.name ?? "—",
      invoice: r.invoiceNumber ?? "—",
      location: r.location.name,
      products: r.items.map((it) => it.product.name).join(", "),
      totalQty,
      totalCost,
      receiver: r.receiver.name,
    };
  });
  return { rows };
}

async function runAdjustmentLogReport(filters: ReportFilters): Promise<ReportResult> {
  const locId = effectiveLocation(filters);

  // Pull ALL movements (chronological) for the products with adjustments in range,
  // so we can replay running totals for before/after.
  const adjMovements = await prisma.stockMovement.findMany({
    where: {
      companyId: filters.companyId,
      movementType: "manual_adjustment",
      ...(locId ? { locationId: locId } : {}),
      createdAt: { gte: filters.rangeStart, lte: filters.rangeEnd },
    },
    select: { locationId: true, productId: true },
  });

  if (adjMovements.length === 0) return { rows: [] };

  const pairs = Array.from(
    new Set(adjMovements.map((m) => `${m.locationId}:${m.productId}`)),
  ).map((s) => {
    const [locationId, productId] = s.split(":");
    return { locationId, productId };
  });

  const locationIds = Array.from(new Set(pairs.map((p) => p.locationId)));
  const productIds = Array.from(new Set(pairs.map((p) => p.productId)));

  const allMovements = await prisma.stockMovement.findMany({
    where: {
      companyId: filters.companyId,
      locationId: { in: locationIds },
      productId: { in: productIds },
    },
    include: {
      product: { select: { name: true } },
      location: { select: { name: true } },
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const running = new Map<string, number>();
  const rows: ReportRow[] = [];

  for (const m of allMovements) {
    const key = `${m.locationId}:${m.productId}`;
    const before = running.get(key) ?? 0;
    const delta = Number(m.quantity);
    const after = before + delta;
    running.set(key, after);

    if (
      m.movementType === "manual_adjustment" &&
      m.createdAt >= filters.rangeStart &&
      m.createdAt <= filters.rangeEnd &&
      (!locId || m.locationId === locId)
    ) {
      rows.push({
        date: m.createdAt.toISOString(),
        product: m.product.name,
        location: m.location.name,
        before,
        after,
        delta,
        reason: m.note ?? "—",
        by: m.user.name,
      });
    }
  }
  rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return { rows };
}

async function runConsumptionTechReport(filters: ReportFilters): Promise<ReportResult> {
  const locId = effectiveLocation(filters);
  const requests = await prisma.request.findMany({
    where: {
      companyId: filters.companyId,
      ...(locId ? { locationId: locId } : {}),
      status: { in: ["approved", "picked_up"] },
      approvedAt: { gte: filters.rangeStart, lte: filters.rangeEnd },
    },
    include: {
      technician: { select: { id: true, name: true } },
      location: { select: { name: true } },
      items: true,
    },
  });

  const acc = new Map<
    string,
    {
      technician: string;
      location: string;
      requests: number;
      items: number;
      totalValue: number;
    }
  >();

  for (const r of requests) {
    const key = `${r.technicianId}:${r.locationId}`;
    const entry = acc.get(key) ?? {
      technician: r.technician.name,
      location: r.location.name,
      requests: 0,
      items: 0,
      totalValue: 0,
    };
    entry.requests += 1;
    for (const it of r.items) {
      const qty = Number(it.quantityApproved ?? 0);
      entry.items += qty;
      entry.totalValue += qty * Number(it.unitCostAtTime);
    }
    acc.set(key, entry);
  }

  const rows: ReportRow[] = Array.from(acc.values())
    .sort((a, b) => b.totalValue - a.totalValue)
    .map((e) => ({
      technician: e.technician,
      location: e.location,
      requests: e.requests,
      items: e.items,
      totalValue: e.totalValue,
    }));
  return { rows };
}

async function runConsumptionProductReport(filters: ReportFilters): Promise<ReportResult> {
  const locId = effectiveLocation(filters);
  const items = await prisma.requestItem.findMany({
    where: {
      request: {
        companyId: filters.companyId,
        ...(locId ? { locationId: locId } : {}),
        status: { in: ["approved", "picked_up"] },
        approvedAt: { gte: filters.rangeStart, lte: filters.rangeEnd },
      },
    },
    include: {
      product: { select: { id: true, name: true, sku: true } },
      request: { select: { id: true } },
    },
  });

  const acc = new Map<
    string,
    {
      product: string;
      sku: string;
      requestSet: Set<string>;
      totalQty: number;
      totalValue: number;
    }
  >();
  for (const it of items) {
    const entry = acc.get(it.product.id) ?? {
      product: it.product.name,
      sku: it.product.sku ?? "",
      requestSet: new Set<string>(),
      totalQty: 0,
      totalValue: 0,
    };
    entry.requestSet.add(it.request.id);
    const qty = Number(it.quantityApproved ?? 0);
    entry.totalQty += qty;
    entry.totalValue += qty * Number(it.unitCostAtTime);
    acc.set(it.product.id, entry);
  }

  const rows: ReportRow[] = Array.from(acc.values())
    .sort((a, b) => b.totalValue - a.totalValue)
    .map((e) => ({
      product: e.product,
      sku: e.sku,
      requests: e.requestSet.size,
      totalQty: e.totalQty,
      totalValue: e.totalValue,
    }));
  return { rows };
}

async function runInventoryValuationReport(
  filters: ReportFilters,
): Promise<ReportResult> {
  const locId = effectiveLocation(filters);
  const stocks = await prisma.stock.findMany({
    where: locId
      ? { locationId: locId }
      : { location: { companyId: filters.companyId } },
    include: {
      product: {
        select: {
          name: true,
          unitCost: true,
          category: { select: { name: true } },
        },
      },
      location: { select: { name: true } },
    },
  });
  const rows: ReportRow[] = stocks
    .map((s) => {
      const stock = Number(s.quantity);
      const unitCost = Number(s.product.unitCost);
      return {
        product: s.product.name,
        category: s.product.category?.name ?? "",
        location: s.location.name,
        stock,
        unitCost,
        totalValue: stock * unitCost,
      };
    })
    .sort((a, b) => Number(b.totalValue) - Number(a.totalValue));
  return { rows };
}

async function runMostRequestedReport(filters: ReportFilters): Promise<ReportResult> {
  const items = await prisma.requestItem.findMany({
    where: {
      request: {
        companyId: filters.companyId,
        ...(effectiveLocation(filters)
          ? { locationId: effectiveLocation(filters)! }
          : {}),
        createdAt: { gte: filters.rangeStart, lte: filters.rangeEnd },
      },
    },
    include: {
      product: { select: { id: true, name: true, sku: true } },
      request: { select: { id: true } },
    },
  });

  const acc = new Map<
    string,
    {
      product: string;
      sku: string;
      requestSet: Set<string>;
      totalQty: number;
    }
  >();
  for (const it of items) {
    const entry = acc.get(it.product.id) ?? {
      product: it.product.name,
      sku: it.product.sku ?? "",
      requestSet: new Set<string>(),
      totalQty: 0,
    };
    entry.requestSet.add(it.request.id);
    entry.totalQty += Number(it.quantityRequested);
    acc.set(it.product.id, entry);
  }

  const sorted = Array.from(acc.values()).sort(
    (a, b) => b.requestSet.size - a.requestSet.size || b.totalQty - a.totalQty,
  );
  const rows: ReportRow[] = sorted.map((e, idx) => ({
    rank: idx + 1,
    product: e.product,
    sku: e.sku,
    requestCount: e.requestSet.size,
    totalQty: e.totalQty,
  }));
  return { rows };
}

async function runWasteShrinkageReport(filters: ReportFilters): Promise<ReportResult> {
  const locId = effectiveLocation(filters);
  const counts = await prisma.physicalCount.findMany({
    where: {
      companyId: filters.companyId,
      ...(locId ? { locationId: locId } : {}),
      countDate: { gte: filters.rangeStart, lte: filters.rangeEnd },
    },
    include: {
      location: { select: { name: true } },
      items: { include: { product: { select: { name: true } } } },
    },
    orderBy: { countDate: "desc" },
  });

  const rows: ReportRow[] = [];
  for (const c of counts) {
    for (const it of c.items) {
      const system = Number(it.systemQuantity);
      const counted = Number(it.countedQuantity);
      const variance = counted - system;
      const pct = system === 0 ? 0 : (variance / system) * 100;
      rows.push({
        product: it.product.name,
        location: c.location.name,
        countDate: c.countDate.toISOString(),
        systemQty: system,
        countedQty: counted,
        variance,
        variancePct: Math.round(pct * 10) / 10,
        reason: it.adjustmentReason ?? "—",
      });
    }
  }
  return { rows };
}

async function runLocationComparisonReport(
  filters: ReportFilters,
): Promise<ReportResult> {
  const locations = await prisma.location.findMany({
    where: { companyId: filters.companyId, active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const [stocks, lps, requests, consumption] = await Promise.all([
    prisma.stock.findMany({
      where: { location: { companyId: filters.companyId } },
      include: { product: { select: { unitCost: true } } },
    }),
    prisma.locationProduct.findMany({
      where: { active: true, location: { companyId: filters.companyId } },
      select: { locationId: true, productId: true, minStock: true },
    }),
    prisma.request.groupBy({
      by: ["locationId"],
      where: {
        companyId: filters.companyId,
        createdAt: { gte: filters.rangeStart, lte: filters.rangeEnd },
      },
      _count: { _all: true },
    }),
    prisma.requestItem.findMany({
      where: {
        request: {
          companyId: filters.companyId,
          status: { in: ["approved", "picked_up"] },
          approvedAt: { gte: filters.rangeStart, lte: filters.rangeEnd },
        },
      },
      include: { request: { select: { locationId: true } } },
    }),
  ]);

  const minMap = new Map(
    lps.map((lp) => [`${lp.locationId}:${lp.productId}`, Number(lp.minStock)]),
  );
  const valueByLoc = new Map<string, number>();
  const lowByLoc = new Map<string, number>();
  for (const s of stocks) {
    const qty = Number(s.quantity);
    const val = qty * Number(s.product.unitCost);
    valueByLoc.set(s.locationId, (valueByLoc.get(s.locationId) ?? 0) + val);
    const min = minMap.get(`${s.locationId}:${s.productId}`) ?? 0;
    if (min > 0 && qty <= min) {
      lowByLoc.set(s.locationId, (lowByLoc.get(s.locationId) ?? 0) + 1);
    }
  }
  const reqCount = new Map(requests.map((r) => [r.locationId, r._count._all]));
  const consByLoc = new Map<string, number>();
  for (const it of consumption) {
    const v = Number(it.quantityApproved ?? 0) * Number(it.unitCostAtTime);
    consByLoc.set(
      it.request.locationId,
      (consByLoc.get(it.request.locationId) ?? 0) + v,
    );
  }

  const rows: ReportRow[] = locations.map((l) => ({
    location: l.name,
    stockValue: valueByLoc.get(l.id) ?? 0,
    requests: reqCount.get(l.id) ?? 0,
    consumption: consByLoc.get(l.id) ?? 0,
    lowStock: lowByLoc.get(l.id) ?? 0,
  }));
  return { rows };
}

async function runTransferHistoryReport(
  filters: ReportFilters,
): Promise<ReportResult> {
  const locId = effectiveLocation(filters);
  const transfers = await prisma.transfer.findMany({
    where: {
      companyId: filters.companyId,
      createdAt: { gte: filters.rangeStart, lte: filters.rangeEnd },
      ...(locId
        ? { OR: [{ fromLocationId: locId }, { toLocationId: locId }] }
        : {}),
    },
    include: {
      fromLocation: { select: { name: true } },
      toLocation: { select: { name: true } },
      approver: { select: { name: true } },
      items: { include: { product: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows: ReportRow[] = transfers.map((t) => {
    const totalQty = t.items.reduce(
      (s, it) => s + Number(it.quantityApproved ?? it.quantityRequested),
      0,
    );
    return {
      date: t.createdAt.toISOString(),
      from: t.fromLocation.name,
      to: t.toLocation.name,
      products: t.items.map((it) => it.product.name).join(", "),
      totalQty,
      status: t.status,
      approver: t.approver?.name ?? "—",
    };
  });
  return { rows };
}

export type DateRangePreset =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "custom";

export function resolveDateRange(
  preset: DateRangePreset,
  customFrom?: string | null,
  customTo?: string | null,
): { start: Date; end: Date; preset: DateRangePreset } {
  const now = new Date();
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );

  if (preset === "weekly") {
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { start, end, preset };
  }
  if (preset === "biweekly") {
    const start = new Date(end);
    start.setDate(start.getDate() - 13);
    start.setHours(0, 0, 0, 0);
    return { start, end, preset };
  }
  if (preset === "monthly") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return { start, end, preset };
  }
  if (preset === "quarterly") {
    const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const start = new Date(now.getFullYear(), qStartMonth, 1, 0, 0, 0, 0);
    return { start, end, preset };
  }
  // custom
  const start = customFrom
    ? new Date(customFrom + "T00:00:00")
    : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const customEnd = customTo
    ? new Date(customTo + "T23:59:59.999")
    : end;
  return { start, end: customEnd, preset };
}

export function formatDateRange(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}
