import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiSession, badRequest, forbidden, notFound } from "@/lib/api";
import { isManagerLike } from "@/lib/permissions";
import { notifyTransferDecision } from "@/lib/notify";

const schema = z.object({
  note: z.string().min(1).max(1000),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const user = auth.session.user;
  if (!isManagerLike(user.role)) return forbidden("Manager only");

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Rejection note required");

  const transfer = await prisma.transfer.findFirst({
    where: { id, companyId: user.companyId },
  });
  if (!transfer) return notFound("transfer_not_found");
  if (transfer.status !== "pending") return badRequest("Transfer is not pending");

  const updated = await prisma.transfer.update({
    where: { id: transfer.id },
    data: {
      status: "rejected",
      approvedBy: user.id,
      note: parsed.data.note,
    },
  });

  await notifyTransferDecision({
    companyId: user.companyId,
    transferId: transfer.id,
    requesterId: transfer.requestedBy,
    approved: false,
    note: parsed.data.note,
  });

  return NextResponse.json({ transfer: updated });
}
