import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canSupervisorDo, isManagerLike } from "@/lib/permissions";
import { ReceptionForm } from "@/components/receptions/ReceptionForm";

export default async function NewReceptionPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const user = session.user;

  let canCreate = isManagerLike(user.role);
  if (!canCreate && user.role === "supervisor") {
    canCreate = await canSupervisorDo("canReceiveStock", user.companyId);
  }
  if (!canCreate) redirect("/receptions");

  const [locations, suppliers, products] = await Promise.all([
    prisma.location.findMany({
      where: { companyId: user.companyId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.supplier.findMany({
      where: { companyId: user.companyId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { companyId: user.companyId, active: true },
      select: {
        id: true,
        name: true,
        sku: true,
        unitCost: true,
        unitsPerPurchase: true,
        unit: { select: { name: true, abbreviation: true } },
        purchaseUnit: { select: { name: true, abbreviation: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const defaultLocation =
    (user.role === "supervisor" && user.locationId) || locations[0]?.id;
  if (!defaultLocation) redirect("/receptions");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-brand-dark">
          New reception
        </h1>
        <p className="text-sm text-brand-dark/60">
          Record incoming stock from a supplier
        </p>
      </div>

      <ReceptionForm
        locations={locations}
        suppliers={suppliers}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          unitCost: Number(p.unitCost),
          unit: p.unit,
          purchaseUnit: p.purchaseUnit,
          unitsPerPurchase: Number(p.unitsPerPurchase),
        }))}
        defaultLocationId={defaultLocation}
        lockLocation={user.role === "supervisor"}
      />
    </div>
  );
}
