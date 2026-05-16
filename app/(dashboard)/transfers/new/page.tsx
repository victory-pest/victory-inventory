import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canSupervisorDo, isManagerLike } from "@/lib/permissions";
import { TransferForm } from "@/components/transfers/TransferForm";
import { Card, CardContent } from "@/components/ui/card";

export default async function NewTransferPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const user = session.user;

  let canCreate = isManagerLike(user.role);
  if (!canCreate && user.role === "supervisor") {
    canCreate = await canSupervisorDo("canTransferStock", user.companyId);
  }
  if (!canCreate) redirect("/transfers");

  const [locations, products, stockRows] = await Promise.all([
    prisma.location.findMany({
      where: { companyId: user.companyId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { companyId: user.companyId, active: true },
      select: { id: true, name: true, sku: true },
      orderBy: { name: "asc" },
    }),
    prisma.stock.findMany({
      where: { location: { companyId: user.companyId } },
      select: { locationId: true, productId: true, quantity: true },
    }),
  ]);

  if (locations.length < 2) {
    return (
      <Card className="max-w-lg">
        <CardContent className="p-6 text-center space-y-2">
          <h1 className="font-heading text-lg font-semibold text-brand-dark">
            Need at least two locations
          </h1>
          <p className="text-sm text-brand-dark/60">
            Add a second location in Settings to enable transfers.
          </p>
        </CardContent>
      </Card>
    );
  }

  const stockIndex: Record<string, Record<string, number>> = {};
  for (const s of stockRows) {
    if (!stockIndex[s.productId]) stockIndex[s.productId] = {};
    stockIndex[s.productId][s.locationId] = Number(s.quantity);
  }

  const productPayload = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    stockByLocation: stockIndex[p.id] ?? {},
  }));

  const defaultFromId =
    (user.role === "supervisor" && user.locationId) || locations[0].id;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-brand-dark">
          New transfer
        </h1>
        <p className="text-sm text-brand-dark/60">
          Move stock between locations · manager approval required
        </p>
      </div>

      <TransferForm
        locations={locations}
        products={productPayload}
        defaultFromId={defaultFromId}
        lockFrom={user.role === "supervisor"}
      />
    </div>
  );
}
