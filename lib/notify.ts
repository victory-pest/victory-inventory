import { prisma } from "./prisma";
import { sendEmail, basicTemplate } from "./email";
import { sendPushToUser } from "./push";
import {
  resolveEventChannels,
  type NotificationSettings,
} from "./notification-events";

type Channel = "in_app" | "push" | "email";

type NotifyOptions = {
  companyId: string;
  userIds: string[];
  type: string;
  title: string;
  message?: string;
  referenceId?: string;
  channels: Channel[];
  url?: string;
};

async function getCompanySettings(
  companyId: string,
): Promise<NotificationSettings | null> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { notificationSettings: true },
  });
  return (company?.notificationSettings as NotificationSettings) ?? null;
}

function filterChannels(requested: Channel[], allowed: {
  inApp: boolean;
  push: boolean;
  email: boolean;
}): Channel[] {
  return requested.filter((c) => {
    if (c === "in_app") return allowed.inApp;
    if (c === "push") return allowed.push;
    if (c === "email") return allowed.email;
    return false;
  });
}

function getAppUrl(): string {
  return (
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "http://localhost:3000"
  );
}

async function dispatch(opts: NotifyOptions) {
  if (opts.userIds.length === 0) return;
  const users = await prisma.user.findMany({
    where: { id: { in: opts.userIds }, active: true },
    select: { id: true, name: true, email: true },
  });
  if (users.length === 0) return;

  const settings = await getCompanySettings(opts.companyId);
  const allowed = resolveEventChannels(opts.type, settings);
  const effective = filterChannels(opts.channels, allowed);
  if (effective.length === 0) return;
  opts = { ...opts, channels: effective };

  // 1. in-app rows
  if (opts.channels.includes("in_app")) {
    await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        companyId: opts.companyId,
        type: opts.type,
        title: opts.title,
        message: opts.message,
        referenceId: opts.referenceId,
      })),
    });
  }

  // 2. push (fire and forget)
  if (opts.channels.includes("push")) {
    const fullUrl = opts.url
      ? `${getAppUrl()}${opts.url.startsWith("/") ? opts.url : "/" + opts.url}`
      : getAppUrl();
    await Promise.all(
      users.map((u) =>
        sendPushToUser(u.id, {
          title: opts.title,
          body: opts.message,
          url: fullUrl,
          tag: opts.referenceId,
        }).catch((err) => {
          console.warn("[notify] push failed for user", u.id, err);
        }),
      ),
    );
  }

  // 3. email
  if (opts.channels.includes("email")) {
    const recipients = users
      .filter((u) => u.email)
      .map((u) => ({ email: u.email as string, name: u.name }));
    if (recipients.length > 0) {
      const url = opts.url ? `${getAppUrl()}${opts.url}` : undefined;
      await sendEmail({
        to: recipients,
        subject: opts.title,
        html: basicTemplate({
          heading: opts.title,
          body: opts.message ? `<p>${opts.message}</p>` : "",
          ctaLabel: url ? "Open in inventory" : undefined,
          ctaUrl: url,
        }),
        text: opts.message,
      });
    }
  }
}

async function findSupervisorsAndManagers(companyId: string, locationId: string | null) {
  const recipients = await prisma.user.findMany({
    where: {
      companyId,
      active: true,
      OR: [
        { role: "manager" },
        locationId ? { role: "supervisor", locationId } : { role: "supervisor" },
      ],
    },
    select: { id: true },
  });
  return recipients.map((r) => r.id);
}

async function findManagers(companyId: string) {
  const recipients = await prisma.user.findMany({
    where: { companyId, role: "manager", active: true },
    select: { id: true },
  });
  return recipients.map((r) => r.id);
}

export async function notifyNewRequest(opts: {
  companyId: string;
  locationId: string;
  requestId: string;
  priority: string;
  technicianName: string;
}) {
  const userIds = await findSupervisorsAndManagers(opts.companyId, opts.locationId);
  const isUrgent = opts.priority === "urgent";
  await dispatch({
    companyId: opts.companyId,
    userIds,
    type: isUrgent ? "request_urgent" : "request_new",
    title: isUrgent ? "URGENT request pending" : "New request pending",
    message: `${opts.technicianName} submitted a ${opts.priority} request awaiting approval.`,
    referenceId: opts.requestId,
    url: "/requests",
    channels: ["in_app", "push", "email"],
  });
}

export async function notifyRequestAutoAdjusted(opts: {
  companyId: string;
  locationId: string;
  requestId: string;
  technicianName: string;
}) {
  const userIds = await findSupervisorsAndManagers(opts.companyId, opts.locationId);
  await dispatch({
    companyId: opts.companyId,
    userIds,
    type: "request_auto_adjusted",
    title: "Request quantities auto-adjusted",
    message: `${opts.technicianName}'s request was reduced to match available stock.`,
    referenceId: opts.requestId,
    url: "/requests",
    channels: ["in_app", "push", "email"],
  });
}

export async function notifyRequestApproved(opts: {
  companyId: string;
  technicianId: string;
  requestId: string;
}) {
  await dispatch({
    companyId: opts.companyId,
    userIds: [opts.technicianId],
    type: "request_approved",
    title: "Your request was approved",
    message: "Pick up your items at your location.",
    referenceId: opts.requestId,
    url: "/requests",
    channels: ["in_app", "push", "email"],
  });
}

export async function notifyRequestRejected(opts: {
  companyId: string;
  technicianId: string;
  requestId: string;
  note: string;
}) {
  await dispatch({
    companyId: opts.companyId,
    userIds: [opts.technicianId],
    type: "request_rejected",
    title: "Your request was rejected",
    message: opts.note,
    referenceId: opts.requestId,
    url: "/requests",
    channels: ["in_app", "push", "email"],
  });
}

export async function notifyRequestCancelled(opts: {
  companyId: string;
  locationId: string;
  requestId: string;
  technicianName: string;
}) {
  const userIds = await findSupervisorsAndManagers(opts.companyId, opts.locationId);
  await dispatch({
    companyId: opts.companyId,
    userIds,
    type: "request_cancelled",
    title: "Request cancelled",
    message: `${opts.technicianName} cancelled their pending request.`,
    referenceId: opts.requestId,
    url: "/requests",
    channels: ["in_app", "email"], // email only per spec
  });
}

export async function notifyReception(opts: {
  companyId: string;
  receptionId: string;
  locationName: string;
}) {
  const userIds = await findManagers(opts.companyId);
  await dispatch({
    companyId: opts.companyId,
    userIds,
    type: "reception_registered",
    title: "New reception registered",
    message: `Stock was logged at ${opts.locationName}.`,
    referenceId: opts.receptionId,
    url: "/receptions",
    channels: ["in_app", "email"],
  });
}

export async function notifyTransferRequested(opts: {
  companyId: string;
  transferId: string;
  fromName: string;
  toName: string;
}) {
  const userIds = await findManagers(opts.companyId);
  await dispatch({
    companyId: opts.companyId,
    userIds,
    type: "transfer_requested",
    title: "Transfer awaiting approval",
    message: `Stock transfer from ${opts.fromName} to ${opts.toName} needs review.`,
    referenceId: opts.transferId,
    url: "/transfers",
    channels: ["in_app", "push", "email"],
  });
}

export async function notifyTransferDecision(opts: {
  companyId: string;
  transferId: string;
  requesterId: string;
  approved: boolean;
  note?: string;
}) {
  await dispatch({
    companyId: opts.companyId,
    userIds: [opts.requesterId],
    type: opts.approved ? "transfer_approved" : "transfer_rejected",
    title: opts.approved ? "Transfer approved" : "Transfer rejected",
    message: opts.approved ? "Stock has moved." : opts.note,
    referenceId: opts.transferId,
    url: "/transfers",
    channels: ["in_app", "push", "email"],
  });
}

export async function notifyLowStock(opts: {
  companyId: string;
  locationId: string;
  productName: string;
  productId: string;
  currentStock: number;
  minStock: number;
}) {
  const userIds = await findSupervisorsAndManagers(opts.companyId, opts.locationId);
  await dispatch({
    companyId: opts.companyId,
    userIds,
    type: "stock_low",
    title: `Low stock: ${opts.productName}`,
    message: `Current stock ${opts.currentStock} is at or below minimum (${opts.minStock}).`,
    referenceId: opts.productId,
    url: "/inventory",
    channels: ["in_app", "push", "email"],
  });
}

/**
 * Fire low-stock notifications for any items that just crossed below min.
 * Each entry: { productId, qtyBefore, qtyAfter }.
 */
export async function checkLowStockCrossings(opts: {
  companyId: string;
  locationId: string;
  changes: { productId: string; qtyBefore: number; qtyAfter: number }[];
}) {
  const crossing = opts.changes.filter((c) => c.qtyAfter < c.qtyBefore);
  if (crossing.length === 0) return;

  const productIds = crossing.map((c) => c.productId);
  const lps = await prisma.locationProduct.findMany({
    where: {
      locationId: opts.locationId,
      productId: { in: productIds },
      active: true,
    },
    include: { product: { select: { id: true, name: true } } },
  });

  for (const lp of lps) {
    const min = Number(lp.minStock);
    if (min <= 0) continue;
    const change = crossing.find((c) => c.productId === lp.productId);
    if (!change) continue;
    if (change.qtyBefore > min && change.qtyAfter <= min) {
      await notifyLowStock({
        companyId: opts.companyId,
        locationId: opts.locationId,
        productName: lp.product.name,
        productId: lp.product.id,
        currentStock: change.qtyAfter,
        minStock: min,
      });
    }
  }
}
