import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { requireTenant } from "./tenant";
import type { Role } from "./nav";

export type ApiSession = {
  user: {
    id: string;
    name: string;
    role: Role;
    companyId: string;
    locationId: string | null;
    licenseIds: string[];
  };
};

export async function requireApiSession() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return {
      error: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }
  const tenant = await requireTenant();
  if (session.user.companyId !== tenant.id) {
    return {
      error: NextResponse.json({ error: "tenant_mismatch" }, { status: 403 }),
    };
  }
  return {
    session: session as ApiSession,
    tenant,
  };
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json(
    { error: message, ...(details ? { details } : {}) },
    { status: 400 },
  );
}

export function notFound(message = "not_found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function forbidden(reason?: string) {
  return NextResponse.json(
    { error: "forbidden", ...(reason ? { reason } : {}) },
    { status: 403 },
  );
}
