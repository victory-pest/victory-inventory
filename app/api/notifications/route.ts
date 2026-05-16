import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const user = auth.session.user;

  const { searchParams } = new URL(req.url);
  const onlyUnread = searchParams.get("unread") === "1";

  const notifications = await prisma.notification.findMany({
    where: {
      userId: user.id,
      companyId: user.companyId,
      ...(onlyUnread ? { read: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ notifications });
}
