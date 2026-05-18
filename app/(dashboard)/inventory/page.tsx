import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getInventoryView } from "@/lib/inventory";
import { canSupervisorDo, isManagerLike } from "@/lib/permissions";
import { InventoryTable } from "@/components/inventory/InventoryTable";

export default async function InventoryPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const user = session.user;
  if (user.role === "technician") redirect("/dashboard");

  const scopedLocationIds =
    user.role === "supervisor" ? user.supervisedLocationIds : null;

  const { rows, locations } = await getInventoryView({
    companyId: user.companyId,
    locationIds: scopedLocationIds,
  });

  let canAdjust = isManagerLike(user.role);
  if (!canAdjust && user.role === "supervisor") {
    canAdjust = await canSupervisorDo("canAdjustStock", user.companyId);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-brand-dark">
          Inventory
        </h1>
        <p className="text-sm text-brand-dark/60">
          {scopedLocationIds && scopedLocationIds.length > 0
            ? `Your supervised location${scopedLocationIds.length > 1 ? "s" : ""} stock`
            : "Stock across all company locations"}
        </p>
      </div>

      <InventoryTable
        rows={rows}
        locations={locations}
        canAdjust={canAdjust}
      />
    </div>
  );
}
