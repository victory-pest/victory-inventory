import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiSession, badRequest, forbidden, notFound } from "@/lib/api";
import { canSupervisorDo, isManagerLike } from "@/lib/permissions";

const schema = z.object({
  name: z.string().min(1).max(200).optional(),
  contactName: z.string().max(200).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const user = auth.session.user;
  let allowed = isManagerLike(user.role);
  if (!allowed && user.role === "supervisor") {
    allowed =
      (await canSupervisorDo("canManageCatalog", user.companyId)) ||
      (await canSupervisorDo("canReceiveStock", user.companyId));
  }
  if (!allowed) return forbidden("Not permitted");

  const { id } = await ctx.params;
  const existing = await prisma.supplier.findFirst({
    where: { id, companyId: user.companyId },
  });
  if (!existing) return notFound("supplier_not_found");

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("invalid_body", parsed.error.format());

  try {
    const updated = await prisma.supplier.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json({ supplier: updated });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return badRequest("A supplier with that name already exists.");
    }
    throw e;
  }
}
