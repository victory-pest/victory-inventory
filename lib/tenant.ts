import { headers } from "next/headers";
import { prisma } from "./prisma";

export async function getTenant() {
  const headersList = await headers();
  const domain = headersList.get("x-tenant-domain") || "localhost";

  if (domain === "localhost" || domain === "127.0.0.1") {
    return prisma.company.findFirst({ where: { active: true } });
  }

  const parts = domain.split(".");
  const baseDomain = parts.length >= 2 ? parts.slice(-2).join(".") : domain;

  return prisma.company.findUnique({ where: { domain: baseDomain } });
}

export async function requireTenant() {
  const tenant = await getTenant();
  if (!tenant) {
    throw new Error("Tenant not resolved — no active company for this domain.");
  }
  return tenant;
}
