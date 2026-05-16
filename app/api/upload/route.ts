import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireApiSession, badRequest, forbidden } from "@/lib/api";
import { isManagerLike, canSupervisorDo } from "@/lib/permissions";

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const user = auth.session.user;

  // Only manager OR supervisor with canManageCatalog/editProducts can upload
  let allowed = isManagerLike(user.role);
  if (!allowed && user.role === "supervisor") {
    allowed =
      (await canSupervisorDo("canManageCatalog", user.companyId)) ||
      (await canSupervisorDo("canEditProducts", user.companyId));
  }
  if (!allowed) return forbidden("Not permitted");

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return badRequest("Blob storage not configured");
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const purpose = String(form?.get("purpose") ?? "asset");
  if (!(file instanceof Blob)) return badRequest("file missing");
  if (file.size > MAX_BYTES) return badRequest("file too large (max 5MB)");
  if (!ALLOWED.includes(file.type)) return badRequest("unsupported file type");

  const ext = file.type.split("/")[1].replace("svg+xml", "svg");
  const name = (file as File).name ?? "asset";
  const safe = name.replace(/[^a-z0-9-_]+/gi, "-").slice(0, 40);
  const key = `${user.companyId}/${purpose}/${Date.now()}-${safe}.${ext}`;

  const blob = await put(key, file, {
    access: "public",
    contentType: file.type,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return NextResponse.json({ url: blob.url });
}
