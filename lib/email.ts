import { Resend } from "resend";

let cached: Resend | null | undefined;

function client(): Resend | null {
  if (cached !== undefined) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    cached = null;
    return null;
  }
  cached = new Resend(key);
  return cached;
}

export type EmailRecipient = { email: string; name?: string };

export async function sendEmail(opts: {
  to: EmailRecipient[];
  subject: string;
  html: string;
  text?: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const c = client();
  if (!c) {
    console.warn("[email] RESEND_API_KEY missing — skipping send");
    return { ok: false, skipped: true };
  }
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    console.warn("[email] RESEND_FROM_EMAIL missing — skipping send");
    return { ok: false, skipped: true };
  }
  const validRecipients = opts.to.filter((r) => r.email);
  if (validRecipients.length === 0) return { ok: true };

  try {
    const result = await c.emails.send({
      from,
      to: validRecipients.map((r) => (r.name ? `${r.name} <${r.email}>` : r.email)),
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    if (result.error) {
      console.warn("[email] send error:", result.error);
      return { ok: false, error: String(result.error) };
    }
    return { ok: true };
  } catch (err) {
    console.warn("[email] send threw:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function basicTemplate(opts: {
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): string {
  const cta =
    opts.ctaLabel && opts.ctaUrl
      ? `<p style="margin:24px 0;"><a href="${opts.ctaUrl}" style="background:#1565C0;color:white;padding:10px 16px;text-decoration:none;border-radius:6px;font-family:Arial,sans-serif;font-size:14px;font-weight:600;">${opts.ctaLabel}</a></p>`
      : "";
  return `<!doctype html>
<html><body style="font-family:Arial,sans-serif;color:#2D2D2D;background:#F4F4F4;padding:24px;margin:0;">
  <div style="max-width:560px;margin:0 auto;background:white;padding:32px;border-radius:8px;">
    <h2 style="color:#1565C0;font-family:Arial,sans-serif;margin-top:0;">${opts.heading}</h2>
    <div style="font-size:15px;line-height:1.5;">${opts.body}</div>
    ${cta}
    <p style="color:#666;font-size:12px;margin-top:32px;">Victory Pest Inventory</p>
  </div>
</body></html>`;
}
