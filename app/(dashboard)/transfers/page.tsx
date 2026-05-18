import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canSupervisorDo, isManagerLike } from "@/lib/permissions";
import {
  TransfersList,
  type TransferRow,
} from "@/components/transfers/TransfersList";

export default async function TransfersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const user = session.user;

  let canCreate = isManagerLike(user.role);
  if (!canCreate && user.role === "supervisor") {
    canCreate = await canSupervisorDo("canTransferStock", user.companyId);
  }

  const where =
    user.role === "supervisor"
      ? {
          companyId: user.companyId,
          OR: [
            { fromLocationId: { in: user.supervisedLocationIds } },
            { toLocationId: { in: user.supervisedLocationIds } },
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

  const productSet = new Set<string>();
  const locationSet = new Set<string>();
  for (const t of transfers) {
    locationSet.add(t.fromLocationId);
    for (const it of t.items) productSet.add(it.productId);
  }
  const stockRows =
    productSet.size && locationSet.size
      ? await prisma.stock.findMany({
          where: {
            locationId: { in: Array.from(locationSet) },
            productId: { in: Array.from(productSet) },
          },
          select: { locationId: true, productId: true, quantity: true },
        })
      : [];
  const stockMap = new Map(
    stockRows.map((s) => [
      `${s.locationId}:${s.productId}`,
      Number(s.quantity),
    ]),
  );

  const rows: TransferRow[] = transfers.map((t) => ({
    id: t.id,
    status: t.status as TransferRow["status"],
    createdAt: t.createdAt.toISOString(),
    note: t.note,
    fromLocation: t.fromLocation,
    toLocation: t.toLocation,
    requester: t.requester,
    approver: t.approver,
    items: t.items.map((it) => ({
      id: it.id,
      productId: it.productId,
      productName: it.product.name,
      productSku: it.product.sku,
      quantityRequested: Number(it.quantityRequested),
      quantityApproved:
        it.quantityApproved !== null ? Number(it.quantityApproved) : null,
      sourceStock: stockMap.get(`${t.fromLocationId}:${it.productId}`) ?? 0,
    })),
  }));

  return (
    <TransfersList
      transfers={rows}
      canCreate={canCreate}
      isManager={isManagerLike(user.role)}
    />
  );
}
