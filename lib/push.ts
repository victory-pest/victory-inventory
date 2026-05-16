import webpush from "web-push";
import { prisma } from "./prisma";

let configured = false;
let available = false;

function configure() {
  if (configured) return available;
  configured = true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    console.warn("[push] VAPID keys missing — push disabled");
    available = false;
    return false;
  }
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    available = true;
  } catch (err) {
    console.warn("[push] VAPID configuration failed:", err);
    available = false;
  }
  return available;
}

export type PushPayload = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
};

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ ok: boolean; sent: number; skipped?: boolean }> {
  if (!configure()) return { ok: false, sent: 0, skipped: true };

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return { ok: true, sent: 0 };

  const data = JSON.stringify(payload);
  let sent = 0;
  const expired: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          data,
        );
        sent += 1;
      } catch (err: unknown) {
        const status =
          typeof err === "object" && err && "statusCode" in err
            ? (err as { statusCode: number }).statusCode
            : 0;
        if (status === 404 || status === 410) {
          expired.push(sub.id);
        } else {
          console.warn("[push] send failed:", err);
        }
      }
    }),
  );

  if (expired.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: expired } },
    });
  }

  return { ok: true, sent };
}
