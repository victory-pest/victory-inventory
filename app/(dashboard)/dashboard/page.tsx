import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TechnicianDashboard } from "@/components/dashboard/TechnicianDashboard";
import { SupervisorDashboard } from "@/components/dashboard/SupervisorDashboard";
import { ManagerDashboard } from "@/components/dashboard/ManagerDashboard";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const locationName = session.user.locationId
    ? (
        await prisma.location.findUnique({
          where: { id: session.user.locationId },
          select: { name: true },
        })
      )?.name ?? null
    : null;

  switch (session.user.role) {
    case "technician":
      return (
        <TechnicianDashboard
          userName={session.user.name}
          locationName={locationName}
        />
      );
    case "supervisor":
      return (
        <SupervisorDashboard
          companyId={session.user.companyId}
          locationId={session.user.locationId ?? null}
          locationName={locationName}
        />
      );
    case "manager":
    case "super_admin":
      return <ManagerDashboard companyId={session.user.companyId} />;
  }
}
