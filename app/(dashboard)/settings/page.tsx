import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isManagerLike } from "@/lib/permissions";
import { SettingsTabs } from "@/components/settings/SettingsTabs";

const SETTINGS_TABS = [
  "company",
  "locations",
  "users",
  "permissions",
  "catalog",
  "notifications",
];
import { CompanyTab } from "@/components/settings/CompanyTab";
import {
  LocationsTab,
  type LocationRow,
} from "@/components/settings/LocationsTab";
import { UsersTab, type UserRow } from "@/components/settings/UsersTab";
import {
  PermissionsTab,
  type SupervisorPermissionsRow,
} from "@/components/settings/PermissionsTab";
import {
  CatalogTab,
  type ProductRow,
} from "@/components/settings/CatalogTab";
import { NotificationsTab } from "@/components/settings/NotificationsTab";
import type { NotificationSettings } from "@/lib/notification-events";

const CATALOG_SUBS = ["categories", "units", "license-types", "suppliers", "products"];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; sub?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (!isManagerLike(session.user.role)) redirect("/dashboard");

  const sp = await searchParams;
  const tab = SETTINGS_TABS.includes(sp.tab ?? "") ? sp.tab! : "company";
  const subTab = CATALOG_SUBS.includes(sp.sub ?? "") ? sp.sub! : "categories";

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
  });
  if (!company) redirect("/dashboard");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-brand-dark">
          Settings
        </h1>
        <p className="text-sm text-brand-dark/60">
          Manage company, locations, users, permissions, catalog, and notifications
        </p>
      </div>

      <SettingsTabs active={tab} />

      {tab === "company" && (
        <CompanyTab
          initial={{
            name: company.name,
            primaryColor: company.primaryColor,
            secondaryColor: company.secondaryColor,
            logoUrl: company.logoUrl,
          }}
        />
      )}

      {tab === "locations" && (await renderLocationsTab(company.id))}
      {tab === "users" && (await renderUsersTab(company.id))}
      {tab === "permissions" && (await renderPermissionsTab(company.id))}
      {tab === "catalog" && (await renderCatalogTab(company.id, subTab))}
      {tab === "notifications" && (
        <NotificationsTab
          initial={(company.notificationSettings as NotificationSettings) ?? null}
        />
      )}
    </div>
  );
}

async function renderLocationsTab(companyId: string) {
  const locations = await prisma.location.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });
  const rows: LocationRow[] = locations.map((l) => ({
    id: l.id,
    name: l.name,
    address: l.address,
    city: l.city,
    state: l.state,
    active: l.active,
  }));
  return <LocationsTab initial={rows} />;
}

async function renderUsersTab(companyId: string) {
  const [users, locations, licenseTypes] = await Promise.all([
    prisma.user.findMany({
      where: { companyId },
      include: {
        location: { select: { id: true, name: true } },
        licenses: { select: { licenseTypeId: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.location.findMany({
      where: { companyId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.licenseType.findMany({
      where: { companyId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const rows: UserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    username: u.username,
    role: u.role,
    locationId: u.locationId,
    locationName: u.location?.name ?? null,
    active: u.active,
    licenseIds: u.licenses.map((l) => l.licenseTypeId),
  }));
  return (
    <UsersTab users={rows} locations={locations} licenseTypes={licenseTypes} />
  );
}

async function renderPermissionsTab(companyId: string) {
  const perms = await prisma.supervisorPermissions.findUnique({
    where: { companyId },
  });
  const initial: SupervisorPermissionsRow = perms
    ? {
        canApproveRequests: perms.canApproveRequests,
        canEditQuantities: perms.canEditQuantities,
        canRejectRequests: perms.canRejectRequests,
        canManageCatalog: perms.canManageCatalog,
        canEditProducts: perms.canEditProducts,
        canAdjustStock: perms.canAdjustStock,
        canReceiveStock: perms.canReceiveStock,
        canViewReports: perms.canViewReports,
        canManageTechnicians: perms.canManageTechnicians,
        canTransferStock: perms.canTransferStock,
      }
    : {
        canApproveRequests: true,
        canEditQuantities: true,
        canRejectRequests: true,
        canManageCatalog: false,
        canEditProducts: false,
        canAdjustStock: true,
        canReceiveStock: true,
        canViewReports: true,
        canManageTechnicians: false,
        canTransferStock: false,
      };
  return <PermissionsTab initial={initial} />;
}

async function renderCatalogTab(companyId: string, subTab: string) {
  const [categories, units, licenseTypes, suppliers, products] =
    await Promise.all([
      prisma.productCategory.findMany({
        where: { companyId },
        orderBy: { name: "asc" },
      }),
      prisma.unitOfMeasure.findMany({
        where: { companyId },
        orderBy: { name: "asc" },
      }),
      prisma.licenseType.findMany({
        where: { companyId },
        orderBy: { name: "asc" },
      }),
      prisma.supplier.findMany({
        where: { companyId },
        orderBy: { name: "asc" },
      }),
      prisma.product.findMany({
        where: { companyId },
        include: { licenses: { select: { licenseTypeId: true } } },
        orderBy: { name: "asc" },
      }),
    ]);

  const productRows: ProductRow[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    categoryId: p.categoryId,
    unitId: p.unitId,
    supplierId: p.supplierId,
    unitCost: Number(p.unitCost),
    epaRegistration: p.epaRegistration,
    photoUrl: p.photoUrl,
    requiresLicense: p.requiresLicense,
    active: p.active,
    licenseTypeIds: p.licenses.map((l) => l.licenseTypeId),
  }));

  return (
    <CatalogTab
      categories={categories.map((c) => ({
        id: c.id,
        name: c.name,
        active: c.active,
      }))}
      units={units.map((u) => ({
        id: u.id,
        name: u.name,
        abbreviation: u.abbreviation,
        active: u.active,
      }))}
      licenseTypes={licenseTypes.map((l) => ({
        id: l.id,
        name: l.name,
        active: l.active,
      }))}
      suppliers={suppliers.map((s) => ({
        id: s.id,
        name: s.name,
        contactName: s.contactName,
        email: s.email,
        phone: s.phone,
        active: s.active,
      }))}
      products={productRows}
      subTab={subTab}
    />
  );
}
