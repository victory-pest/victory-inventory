import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiSession, badRequest, forbidden } from "@/lib/api";
import { isManagerLike } from "@/lib/permissions";

const channels = z.object({
  inApp: z.boolean(),
  push: z.boolean(),
  email: z.boolean(),
});

const schema = z.object({
  events: z.record(z.string(), channels),
});

export async function PUT(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  if (!isManagerLike(auth.session.user.role)) return forbidden("Manager only");

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("invalid_body", parsed.error.format());

  const updated = await prisma.company.update({
    where: { id: auth.session.user.companyId },
    data: { notificationSettings: parsed.data.events },
  });
  return NextResponse.json({ settings: updated.notificationSettings });
}
