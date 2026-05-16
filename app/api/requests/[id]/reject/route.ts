import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiSession, badRequest, notFound, forbidden } from "@/lib/api";
import { authorizeRequestAction } from "@/lib/permissions";
import { notifyRequestRejected } from "@/lib/notify";

const rejectSchema = z.object({
  note: z.string().min(1).max(1000),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const user = auth.session.user;

  const allowed = await authorizeRequestAction(
    { id: user.id, role: user.role, companyId: user.companyId, locationId: user.locationId },
    "reject",
  );
  if (!allowed.ok) return forbidden(allowed.reason);

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = rejectSchema.safeParse(body);
  if (!parsed.success) return badRequest("Rejection note required");

  const request = await prisma.request.findFirst({
    where: { id, companyId: user.companyId },
  });
  if (!request) return notFound("request_not_found");
  if (request.status !== "pending") return badRequest("Request is not pending");
  if (user.role === "supervisor" && request.locationId !== user.locationId) {
    return forbidden("Different location");
  }

  const updated = await prisma.request.update({
    where: { id: request.id },
    data: {
      status: "rejected",
      rejectionNote: parsed.data.note,
      approvedBy: user.id,
      approvedAt: new Date(),
    },
  });

  await notifyRequestRejected({
    companyId: user.companyId,
    technicianId: request.technicianId,
    requestId: request.id,
    note: parsed.data.note,
  });

  return NextResponse.json({ request: updated });
}
