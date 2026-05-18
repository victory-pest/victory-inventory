import Link from "next/link";
import { ClipboardList, AlertTriangle, MapPin, Users, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

type Props = {
  companyId: string;
};

export async function ManagerDashboard({ companyId }: Props) {
  const [pendingCount, locations, technicianCount, stockRows, locationProducts] =
    await Promise.all([
      prisma.request.count({ where: { companyId, status: "pending" } }),
      prisma.location.findMany({
        where: { companyId, active: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.user.count({
        where: { companyId, role: "technician", active: true },
      }),
      prisma.stock.findMany({
        where: { product: { companyId, active: true } },
        include: {
          product: { select: { id: true, name: true, unitCost: true } },
          location: { select: { id: true, name: true } },
        },
      }),
      prisma.locationProduct.findMany({
        where: { active: true, location: { companyId } },
        select: { locationId: true, productId: true, minStock: true },
      }),
    ]);

  const minMap = new Map(
    locationProducts.map((lp) => [`${lp.locationId}:${lp.productId}`, Number(lp.minStock)]),
  );

  let lowStockCount = 0;
  const stockByLocation = new Map<string, { value: number; lowCount: number }>();
  for (const s of stockRows) {
    const qty = Number(s.quantity);
    const min = minMap.get(`${s.locationId}:${s.productId}`) ?? 0;
    const value = qty * Number(s.product.unitCost);
    const entry = stockByLocation.get(s.locationId) ?? { value: 0, lowCount: 0 };
    entry.value += value;
    if (min > 0 && qty <= min) {
      entry.lowCount += 1;
      lowStockCount += 1;
    }
    stockByLocation.set(s.locationId, entry);
  }

  const stats = [
    { label: "Pending requests", value: pendingCount, icon: ClipboardList, tone: "primary" as const, href: "/requests" },
    { label: "Low stock items", value: lowStockCount, icon: AlertTriangle, tone: "warning" as const, href: "/inventory" },
    { label: "Locations", value: locations.length, icon: MapPin, tone: "secondary" as const, href: "/settings" },
    { label: "Active technicians", value: technicianCount, icon: Users, tone: "secondary" as const, href: "/settings" },
  ];

  const toneStyles = {
    primary: "text-brand-primary bg-brand-primary/10",
    secondary: "text-brand-secondary bg-brand-secondary/10",
    warning: "text-brand-warning bg-brand-warning/10",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-brand-dark">
          Manager dashboard
        </h1>
        <p className="text-sm text-brand-dark/60">
          Cross-location overview
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href}>
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardContent className="p-4">
                  <div className={`inline-flex h-9 w-9 items-center justify-center rounded-md ${toneStyles[s.tone]} mb-3`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-2xl font-heading font-semibold text-brand-dark leading-none">
                    {s.value}
                  </p>
                  <p className="mt-1 text-xs text-brand-dark/60">{s.label}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Stock by location</CardTitle>
        </CardHeader>
        <CardContent>
          {locations.length === 0 ? (
            <p className="text-sm text-brand-dark/60">No locations configured.</p>
          ) : (
            <ul className="divide-y">
              {locations.map((loc) => {
                const entry = stockByLocation.get(loc.id) ?? { value: 0, lowCount: 0 };
                return (
                  <li key={loc.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium text-brand-dark">{loc.name}</p>
                      {entry.lowCount > 0 && (
                        <p className="text-xs text-brand-error">
                          {entry.lowCount} low stock
                        </p>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-brand-dark tabular-nums">
                      ${entry.value.toFixed(2)}
                    </p>
                  </li>
                );
              })}
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
          <p className="text-sm text-brand-dark/60">
            No recent activity across locations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
