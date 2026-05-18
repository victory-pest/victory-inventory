import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiSession, badRequest, forbidden, notFound } from "@/lib/api";
import { isManagerLike } from "@/lib/permissions";

const schema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().nullable().optional(),
  username: z.string().min(2).max(60).nullable().optional(),
  role: z
    .enum(["super_admin", "manager", "supervisor", "technician"])
    .optional(),
  locationId: z.string().nullable().optional(),
  supervisedLocationIds: z.array(z.string()).optional(),
  licenseIds: z.array(z.string()).optional(),
  password: z.string().min(6).max(120).optional(),
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
  const existing = await prisma.user.findFirst({
    where: { id, companyId: auth.session.user.companyId },
  });
  if (!existing) return notFound("user_not_found");

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("invalid_body", parsed.error.format());

  const data = parsed.data;
  if (data.locationId) {
    const loc = await prisma.location.findFirst({
      where: { id: data.locationId, companyId: auth.session.user.companyId },
    });
    if (!loc) return badRequest("Invalid location");
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.active !== undefined) updateData.active = data.active;
  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, 10);
  }

  // Resolve effective role: from payload or existing
  const effectiveRole = data.role ?? existing.role;
  const willBeSupervisor = effectiveRole === "supervisor";
  const willBeTech = effectiveRole === "technician";

  // Role-based email/username enforcement (prevents browser autofill leakage)
  if (willBeTech) {
    // Technician: clear email, allow username
    updateData.email = null;
    updateData.hasCompanyEmail = false;
    if (data.username !== undefined) updateData.username = data.username;
  } else {
    // Non-tech (manager/supervisor/super_admin): clear username, allow email
    updateData.username = null;
    if (data.email !== undefined) {
      updateData.email = data.email;
      updateData.hasCompanyEmail = !!data.email;
    }
  }

  if (willBeSupervisor) {
    // Determine the array: from payload if provided, else existing
    const newSupervised =
      data.supervisedLocationIds !== undefined
        ? data.supervisedLocationIds
        : existing.supervisedLocationIds;
    if (!newSupervised || newSupervised.length === 0) {
      return badRequest("Supervisors must have at least one location");
    }
    // Validate all locations belong to company
    const locs = await prisma.location.findMany({
      where: {
        id: { in: newSupervised },
        companyId: auth.session.user.companyId,
      },
    });
    if (locs.length !== newSupervised.length) {
      return badRequest("Invalid supervised location(s)");
    }
    updateData.supervisedLocationIds = newSupervised;
    updateData.locationId = null;
  } else {
    // Non-supervisor: clear supervisedLocationIds, use locationId
    updateData.supervisedLocationIds = [];
    if (data.locationId !== undefined) updateData.locationId = data.locationId;
  }

  await prisma.user.update({ where: { id }, data: updateData });

  if (data.licenseIds) {
    await prisma.userLicense.deleteMany({ where: { userId: id } });
    if (data.licenseIds.length > 0) {
      await prisma.userLicense.createMany({
        data: data.licenseIds.map((licenseTypeId) => ({
          userId: id,
          licenseTypeId,
        })),
      });
    }
  }

  return NextResponse.json({ ok: true });
}
