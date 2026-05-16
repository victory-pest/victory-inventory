import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  NotificationList,
  type NotificationRow,
} from "@/components/notifications/NotificationList";
import { PushManager } from "@/components/notifications/PushManager";

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const user = session.user;

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id, companyId: user.companyId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const rows: NotificationRow[] = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    read: n.read,
    referenceId: n.referenceId,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <PushManager />
      </div>
      <NotificationList initial={rows} />
    </div>
  );
}
