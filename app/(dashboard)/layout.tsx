import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const tenant = await requireTenant();

  const [locationRow, unreadCount] = await Promise.all([
    session.user.locationId
      ? prisma.location.findUnique({
          where: { id: session.user.locationId },
          select: { name: true },
        })
      : Promise.resolve(null),
    prisma.notification.count({
      where: {
        userId: session.user.id,
        companyId: session.user.companyId,
        read: false,
      },
    }),
  ]);
  const locationName = locationRow?.name ?? null;

  return (
    <div className="min-h-screen bg-brand-bg">
      <Sidebar
        role={session.user.role}
        userName={session.user.name}
        userEmail={session.user.email ?? null}
        locationName={locationName}
        logoUrl={tenant.logoUrl}
        tenantName={tenant.name}
      />

      <div className="md:pl-64">
        <Header
          role={session.user.role}
          userName={session.user.name}
          userEmail={session.user.email ?? null}
          locationName={locationName}
          tenantName={tenant.name}
          logoUrl={tenant.logoUrl}
          unreadCount={unreadCount}
        />
        <main className="pb-20 md:pb-8">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">
            {children}
          </div>
        </main>
      </div>

      <BottomNav role={session.user.role} />
    </div>
  );
}
