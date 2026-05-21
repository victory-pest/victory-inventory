import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiSession, badRequest, forbidden, notFound } from "@/lib/api";
import { isManagerLike } from "@/lib/permissions";

const schema = z.object({
  name: z.string().min(1).max(120).optional(),
  address: z.string().max(200).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  state: z.string().max(60).nullable().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  if (!isManagerLike(auth.session.user.role)) return forbidden("Manager only");

  const { id } = await ctx.params;
  const existing = await prisma.location.findFirst({
    where: { id, companyId: auth.session.user.companyId },
  });
  if (!existing) return notFound("location_not_found");

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("invalid_body", parsed.error.format());

  try {
    const updated = await prisma.location.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json({ location: updated });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return badRequest("A location with that name already exists.");
    }
    throw e;
  }
}
