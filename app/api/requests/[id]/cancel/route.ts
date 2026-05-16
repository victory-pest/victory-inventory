import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession, badRequest, notFound, forbidden } from "@/lib/api";
import { notifyRequestCancelled } from "@/lib/notify";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const user = auth.session.user;

  const { id } = await ctx.params;
  const request = await prisma.request.findFirst({
    where: { id, companyId: user.companyId },
  });
  if (!request) return notFound("request_not_found");
  if (request.technicianId !== user.id) return forbidden("Not your request");
  if (request.status !== "pending") return badRequest("Only pending requests can be cancelled");

  const updated = await prisma.request.update({
    where: { id: request.id },
    data: { status: "cancelled" },
  });

  await notifyRequestCancelled({
    companyId: user.companyId,
    locationId: request.locationId,
    requestId: request.id,
    technicianName: user.name,
  });

  return NextResponse.json({ request: updated });
}
