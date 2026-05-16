import { headers } from "next/headers";
import { prisma } from "./prisma";

export async function getTenant() {
  const headersList = await headers();
  const host = (headersList.get("host") || "localhost").toLowerCase().split(":")[0];

  // Single-tenant fallback: localhost (dev) or Vercel preview/prod (*.vercel.app)
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".vercel.app")
  ) {
    return prisma.company.findFirst({ where: { active: true } });
  }

  // Custom production domain: exact match on the company.domain field
  return prisma.company.findFirst({ where: { domain: host, active: true } });
}

export async function requireTenant() {
  const tenant = await getTenant();
  if (!tenant) {
    throw new Error("Tenant not resolved — no active company for this domain.");
  }
  return tenant;
}