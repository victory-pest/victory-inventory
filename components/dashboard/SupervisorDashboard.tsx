import Link from "next/link";
import { AlertTriangle, CheckCircle2, Activity, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";

type Props = {
  companyId: string;
  locationId: string | null;
  locationName: string | null;
};

export async function SupervisorDashboard({ companyId, locationId, locationName }: Props) {
  const where = locationId ? { companyId, locationId } : { companyId };

  const [pendingCount, urgentCount, stockRows] = await Promise.all([
    prisma.request.count({ where: { ...where, status: "pending" } }),
    prisma.request.count({
      where: { ...where, status: "pending", priority: "urgent" },
    }),
    prisma.stock.findMany({
      where: locationId ? { locationId } : {},
      include: {
        product: { select: { id: true, name: true, sku: true } },
        location: { select: { id: true, name: true } },
      },
    }),
  ]);

  const locationProducts = await prisma.locationProduct.findMany({
    where: locationId ? { locationId, active: true } : { active: true },
    select: { locationId: true, productId: true, minStock: true },
  });
  const minMap = new Map(
    locationProducts.map((lp) => [`${lp.locationId}:${lp.productId}`, Number(lp.minStock)]),
  );
  const lowStock = stockRows
    .map((s) => {
      const min = minMap.get(`${s.locationId}:${s.productId}`) ?? 0;
      return { stock: s, min, qty: Number(s.quantity) };
    })
    .filter((r) => r.min > 0 && r.qty <= r.min)
    .sort((a, b) => a.qty - a.min - (b.qty - b.min))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-brand-dark">
          Supervisor dashboard
        </h1>
        <p className="text-sm text-brand-dark/60">
          {locationName ?? "All locations"}
        </p>
      </div>

      <Card className="border-l-4 border-l-brand-primary">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-brand-primary" />
              Pending approvals
            </span>
            <Badge variant="secondary" className="text-base px-2.5">
              {pendingCount}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {urgentCount > 0 && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-brand-error">
              <AlertTriangle className="h-4 w-4" />
              {urgentCount} urgent request{urgentCount === 1 ? "" : "s"} awaiting review
            </div>
          )}
          <Button asChild className="bg-brand-primary hover:bg-brand-primary/90">
            <Link href="/requests">
              Review now <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-brand-warning" />
            Low stock alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lowStock.length === 0 ? (
            <p className="text-sm text-brand-dark/60">
              All stock above minimum thresholds.
            </p>
          ) : (
            <ul className="divide-y">
              {lowStock.map(({ stock, min, qty }) => (
                <li key={stock.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-brand-dark">{stock.product.name}</p>
                    <p className="text-xs text-brand-dark/60">
                      {stock.product.sku ?? "—"} · {stock.location.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-brand-error">{qty}</p>
                    <p className="text-xs text-brand-dark/60">min {min}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5 text-brand-secondary" />
            Recent activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-brand-dark/60">No recent stock movements.</p>
        </CardContent>
      </Card>
    </div>
  );
}
