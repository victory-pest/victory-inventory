import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRequestsForUser } from "@/lib/requests";
import { TechnicianRequestsList } from "@/components/requests/TechnicianRequestsList";
import { StaffRequestsList } from "@/components/requests/StaffRequestsList";

export default async function RequestsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const requests = await getRequestsForUser({
    id: session.user.id,
    role: session.user.role,
    companyId: session.user.companyId,
    locationId: session.user.locationId ?? null,
  });

  if (session.user.role === "technician") {
    return <TechnicianRequestsList requests={requests} />;
  }

  const locations = await prisma.location.findMany({
    where: { companyId: session.user.companyId, active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <StaffRequestsList
      requests={requests}
      locations={locations}
      scope={session.user.role === "supervisor" ? "supervisor" : "manager"}
    />
  );
}
