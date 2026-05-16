import { prisma } from "./prisma";
import type { Role } from "./nav";

export type SessionUser = {
  id: string;
  role: Role;
  companyId: string;
  locationId?: string | null;
};

export function isManagerLike(role: Role) {
  return role === "manager" || role === "super_admin";
}

export function canApprove(role: Role) {
  return role === "manager" || role === "super_admin" || role === "supervisor";
}

export async function loadSupervisorPermissions(companyId: string) {
  return prisma.supervisorPermissions.findUnique({ where: { companyId } });
}

export type SupervisorAction =
  | "canApproveRequests"
  | "canEditQuantities"
  | "canRejectRequests"
  | "canManageCatalog"
  | "canEditProducts"
  | "canAdjustStock"
  | "canReceiveStock"
  | "canViewReports"
  | "canManageTechnicians"
  | "canTransferStock";

export async function canSupervisorDo(action: SupervisorAction, companyId: string) {
  const perms = await loadSupervisorPermissions(companyId);
  if (!perms) return false;
  return Boolean(perms[action]);
}

export async function authorizeRequestAction(
  user: SessionUser,
  action: "approve" | "reject" | "edit_quantity",
): Promise<{ ok: boolean; reason?: string }> {
  if (isManagerLike(user.role)) return { ok: true };

  if (user.role !== "supervisor") {
    return { ok: false, reason: "Role not authorized" };
  }

  const perms = await loadSupervisorPermissions(user.companyId);
  if (!perms) return { ok: false, reason: "Supervisor permissions not configured" };

  if (action === "approve" && !perms.canApproveRequests)
    return { ok: false, reason: "Approval not permitted" };
  if (action === "reject" && !perms.canRejectRequests)
    return { ok: false, reason: "Rejection not permitted" };
  if (action === "edit_quantity" && !perms.canEditQuantities)
    return { ok: false, reason: "Quantity edit not permitted" };

  return { ok: true };
}
