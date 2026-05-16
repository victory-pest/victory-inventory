import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { Role } from "./nav";

export type RequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "picked_up";
export type Priority = "urgent" | "high" | "normal" | "low";

export type RequestListItem = {
  id: string;
  productId: string;
  productName: string;
  productSku: string | null;
  unitAbbr: string | null;
  quantityRequested: number;
  quantityApproved: number | null;
  unitCostAtTime: number;
  currentStock: number;
};

export type RequestListEntry = {
  id: string;
  status: RequestStatus;
  priority: Priority;
  note: string | null;
  rejectionNote: string | null;
  createdAt: string;
  approvedAt: string | null;
  pickedUpAt: string | null;
  location: { id: string; name: string };
  technician: { id: string; name: string };
  approver: { id: string; name: string } | null;
  items: RequestListItem[];
};

const priorityRank: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export async function getRequestsForUser(user: {
  id: string;
  role: Role;
  companyId: string;
  locationId: string | null;
}): Promise<RequestListEntry[]> {
  const where: Prisma.RequestWhereInput = {
    companyId: user.companyId,
  };
  if (user.role === "technician") {
    where.technicianId = user.id;
  } else if (user.role === "supervisor" && user.locationId) {
    where.locationId = user.locationId;
  }

  const requests = await prisma.request.findMany({
    where,
    include: {
      location: { select: { id: true, name: true } },
      technician: { select: { id: true, name: true } },
      approver: { select: { id: true, name: true } },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              unit: { select: { abbreviation: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Pre-fetch stock for (locationId, productId) pairs across all requests
  const keyPairs = new Set<string>();
  const locationIds = new Set<string>();
  const productIds = new Set<string>();
  for (const r of requests) {
    for (const it of r.items) {
      keyPairs.add(`${r.locationId}:${it.productId}`);
      locationIds.add(r.locationId);
      productIds.add(it.productId);
    }
  }
  const stockRows =
    locationIds.size && productIds.size
      ? await prisma.stock.findMany({
          where: {
            locationId: { in: Array.from(locationIds) },
            productId: { in: Array.from(productIds) },
          },
        })
      : [];
  const stockMap = new Map(
    stockRows.map((s) => [`${s.locationId}:${s.productId}`, Number(s.quantity)]),
  );

  const entries: RequestListEntry[] = requests.map((r) => ({
    id: r.id,
    status: r.status as RequestStatus,
    priority: r.priority as Priority,
    note: r.note,
    rejectionNote: r.rejectionNote,
    createdAt: r.createdAt.toISOString(),
    approvedAt: r.approvedAt?.toISOString() ?? null,
    pickedUpAt: r.pickedUpAt?.toISOString() ?? null,
    location: r.location,
    technician: r.technician,
    approver: r.approver,
    items: r.items.map((it) => ({
      id: it.id,
      productId: it.productId,
      productName: it.product.name,
      productSku: it.product.sku,
      unitAbbr: it.product.unit?.abbreviation ?? null,
      quantityRequested: Number(it.quantityRequested),
      quantityApproved:
        it.quantityApproved !== null ? Number(it.quantityApproved) : null,
      unitCostAtTime: Number(it.unitCostAtTime),
      currentStock: stockMap.get(`${r.locationId}:${it.productId}`) ?? 0,
    })),
  }));

  // Sort: pending urgent first, then by priority, then by createdAt desc
  entries.sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (b.status === "pending" && a.status !== "pending") return 1;
    if (a.status === "pending" && b.status === "pending") {
      const p = priorityRank[a.priority] - priorityRank[b.priority];
      if (p !== 0) return p;
    }
    return b.createdAt.localeCompare(a.createdAt);
  });

  return entries;
}
