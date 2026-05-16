import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiSession, badRequest, forbidden } from "@/lib/api";
import { isManagerLike } from "@/lib/permissions";

export async function GET() {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const locations = await prisma.location.findMany({
    where: { companyId: auth.session.user.companyId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ locations });
}

const schema = z.object({
  name: z.string().min(1).max(120),
  address: z.string().max(200).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  state: z.string().max(60).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  if (!isManagerLike(auth.session.user.role)) return forbidden("Manager only");

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("invalid_body", parsed.error.format());

  const location = await prisma.location.create({
    data: {
      companyId: auth.session.user.companyId,
      name: parsed.data.name,
      address: parsed.data.address ?? null,
      city: parsed.data.city ?? null,
      state: parsed.data.state ?? null,
      active: true,
    },
  });
  return NextResponse.json({ location }, { status: 201 });
}
