import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession, notFound } from "@/lib/api";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const user = auth.session.user;

  const { id } = await ctx.params;
  const existing = await prisma.notification.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return notFound("notification_not_found");

  const updated = await prisma.notification.update({
    where: { id: existing.id },
    data: { read: true },
  });
  return NextResponse.json({ notification: updated });
}
