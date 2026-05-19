import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiSession, badRequest, forbidden } from "@/lib/api";
import { isManagerLike } from "@/lib/permissions";

export async function GET() {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  if (!isManagerLike(auth.session.user.role)) return forbidden("Manager only");

  const users = await prisma.user.findMany({
    where: { companyId: auth.session.user.companyId },
    include: {
      location: { select: { id: true, name: true } },
      licenses: { select: { licenseTypeId: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      username: u.username,
      role: u.role,
      locationId: u.locationId,
      locationName: u.location?.name ?? null,
      supervisedLocationIds: u.supervisedLocationIds,
      active: u.active,
      hasCompanyEmail: u.hasCompanyEmail,
      licenseIds: u.licenses.map((l) => l.licenseTypeId),
    })),
  });
}

const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().optional().nullable(),
  username: z.string().min(2).max(60).optional().nullable(),
  role: z.enum(["super_admin", "manager", "supervisor", "technician"]),
  locationId: z.string().nullable().optional(),
  supervisedLocationIds: z.array(z.string()).default([]),
  licenseIds: z.array(z.string()).default([]),
  password: z.string().min(6).max(120),
  active: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  if (!isManagerLike(auth.session.user.role)) return forbidden("Manager only");

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("invalid_body", parsed.error.format());

  const data = parsed.data;
  if (data.role === "technician" && !data.username) {
    return badRequest("Technicians must have a username");
  }
  if (data.role !== "technician" && !data.email) {
    return badRequest("This role requires an email");
  }

  if (data.locationId) {
    const loc = await prisma.location.findFirst({
      where: { id: data.locationId, companyId: auth.session.user.companyId },
    });
    if (!loc) return badRequest("Invalid location");
  }

  const isSupervisor = data.role === "supervisor";
  if (isSupervisor) {
    if (data.supervisedLocationIds.length === 0) {
      return badRequest("Supervisors must have at least one location");
    }
    const locs = await prisma.location.findMany({
      where: {
        id: { in: data.supervisedLocationIds },
        companyId: auth.session.user.companyId,
      },
    });
    if (locs.length !== data.supervisedLocationIds.length) {
      return badRequest("Invalid supervised location(s)");
    }
  }

  const isTech = data.role === "technician";
  const passwordHash = await bcrypt.hash(data.password, 10);
  try {
    const user = await prisma.user.create({
      data: {
        companyId: auth.session.user.companyId,
        name: data.name,
        email: isTech ? null : (data.email ?? null),
        username: isTech ? (data.username ?? null) : null,
        role: data.role,
        locationId: isSupervisor ? null : (data.locationId ?? null),
        supervisedLocationIds: isSupervisor ? data.supervisedLocationIds : [],
        hasCompanyEmail: !isTech && !!data.email,
        passwordHash,
        active: data.active ?? true,
        licenses: {
          create: data.licenseIds.map((licenseTypeId) => ({ licenseTypeId })),
        },
      },
    });
    return NextResponse.json({ user: { id: user.id } }, { status: 201 });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      const target = (e.meta?.target as string[] | undefined) ?? [];
      const field = target.includes("username")
        ? "username"
        : target.includes("email")
        ? "email"
        : target[0] ?? "field";
      return badRequest(
        `A user with that ${field} already exists. Please choose a different ${field}.`
      );
    }
    throw e;
  }
}
