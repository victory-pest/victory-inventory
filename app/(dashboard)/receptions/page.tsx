import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { PackagePlus, Plus } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canSupervisorDo, isManagerLike } from "@/lib/permissions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function ReceptionsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const user = session.user;

  let canCreate = isManagerLike(user.role);
  if (!canCreate && user.role === "supervisor") {
    canCreate = await canSupervisorDo("canReceiveStock", user.companyId);
  }

  const where =
    user.role === "supervisor" && user.locationId
      ? { companyId: user.companyId, locationId: user.locationId }
      : { companyId: user.companyId };

  const receptions = await prisma.reception.findMany({
    where,
    include: {
      location: { select: { name: true } },
      supplier: { select: { name: true } },
      receiver: { select: { name: true } },
      items: {
        include: { product: { select: { name: true, sku: true } } },
      },
    },
    orderBy: { receptionDate: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-brand-dark">
            Receptions
          </h1>
          <p className="text-sm text-brand-dark/60">
            Incoming stock log
          </p>
        </div>
        {canCreate && (
          <Button asChild className="bg-brand-primary hover:bg-brand-primary/90">
            <Link href="/receptions/new">
              <Plus className="mr-1 h-4 w-4" />
              New reception
            </Link>
          </Button>
        )}
      </div>

      {receptions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-2">
            <PackagePlus className="h-8 w-8 text-brand-dark/40 mx-auto" />
            <p className="text-sm text-brand-dark/60">
              No receptions logged yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {receptions.map((r) => {
            const total = r.items.reduce(
              (s, it) => s + Number(it.quantity) * Number(it.unitCost),
              0,
            );
            return (
              <Card key={r.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-brand-dark">
                        {r.supplier?.name ?? "Unspecified supplier"}
                        {r.invoiceNumber ? ` · #${r.invoiceNumber}` : ""}
                      </p>
                      <p className="text-xs text-brand-dark/60">
                        {new Date(r.receptionDate).toLocaleDateString()} ·{" "}
                        {r.location.name} · received by {r.receiver.name}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-brand-dark tabular-nums whitespace-nowrap">
                      ${total.toFixed(2)}
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y text-sm">
                    {r.items.map((it) => (
                      <li
                        key={it.id}
                        className="flex items-center justify-between py-1.5"
                      >
                        <div className="min-w-0">
                          <p className="text-brand-dark truncate">
                            {it.product.name}
                          </p>
                          {it.product.sku && (
                            <p className="text-xs text-brand-dark/50">
                              {it.product.sku}
                            </p>
                          )}
                        </div>
                        <div className="text-right tabular-nums">
                          <p className="text-brand-dark">
                            {Number(it.quantity)}
                          </p>
                          <p className="text-xs text-brand-dark/60">
                            @ ${Number(it.unitCost).toFixed(2)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
