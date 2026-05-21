import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiSession, badRequest, forbidden } from "@/lib/api";
import { canSupervisorDo, isManagerLike } from "@/lib/permissions";

export async function GET() {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const suppliers = await prisma.supplier.findMany({
    where: { companyId: auth.session.user.companyId, active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, contactName: true, email: true, phone: true },
  });
  return NextResponse.json({ suppliers });
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  contactName: z.string().max(200).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const user = auth.session.user;

  if (!isManagerLike(user.role)) {
    if (user.role !== "supervisor") return forbidden("Role not authorized");
    const allowed = await canSupervisorDo("canReceiveStock", user.companyId);
    if (!allowed) return forbidden("Not permitted");
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return badRequest("invalid_body", parsed.error.format());

  try {
    const supplier = await prisma.supplier.create({
      data: {
        companyId: user.companyId,
        name: parsed.data.name,
        contactName: parsed.data.contactName ?? null,
        email: parsed.data.email ?? null,
        phone: parsed.data.phone ?? null,
        active: true,
      },
    });
    return NextResponse.json({ supplier }, { status: 201 });
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
