import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import {
  REPORT_DEFINITIONS,
  getReportDefinition,
  reportsForRole,
  resolveDateRange,
  runReport,
  formatDateRange,
  type DateRangePreset,
  type ReportType,
} from "@/lib/reports";
import { ReportSidebar } from "@/components/reports/ReportSidebar";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ReportViewer } from "@/components/reports/ReportViewer";

const REPORT_IDS = new Set<ReportType>(
  REPORT_DEFINITIONS.map((d) => d.id),
);
const RANGE_PRESETS: DateRangePreset[] = [
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "custom",
];

function safeReportType(value: string | undefined, allowed: ReportType[]): ReportType {
  if (value && (REPORT_IDS as Set<string>).has(value)) {
    const cast = value as ReportType;
    if (allowed.includes(cast)) return cast;
  }
  return allowed[0];
}

function safeRange(value: string | undefined): DateRangePreset {
  return (RANGE_PRESETS as string[]).includes(value ?? "")
    ? (value as DateRangePreset)
    : "monthly";
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    range?: string;
    from?: string;
    to?: string;
    location?: string;
  }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const user = session.user;
  if (user.role === "technician") redirect("/dashboard");

  const tenant = await requireTenant();
  const definitions = reportsForRole(user.role);
  if (definitions.length === 0) redirect("/dashboard");

  const sp = await searchParams;
  const allowedIds = definitions.map((d) => d.id);
  const type = safeReportType(sp.type, allowedIds);
  const rangePreset = safeRange(sp.range);
  const customFrom = sp.from ?? "";
  const customTo = sp.to ?? "";
  const locationParam = sp.location ?? "";

  const def = getReportDefinition(type);
  const { start, end } = resolveDateRange(rangePreset, customFrom, customTo);

  const locations = await prisma.location.findMany({
    where: { companyId: user.companyId, active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const effectiveLocationId =
    user.role === "supervisor"
      ? user.locationId ?? null
      : locationParam && locations.some((l) => l.id === locationParam)
        ? locationParam
        : null;

  const result = await runReport(type, {
    companyId: user.companyId,
    role: user.role,
    userLocationId: user.locationId ?? null,
    rangeStart: start,
    rangeEnd: end,
    locationId: effectiveLocationId,
  });

  const locationName = effectiveLocationId
    ? locations.find((l) => l.id === effectiveLocationId)?.name ?? "—"
    : user.role === "supervisor"
      ? "Your location"
      : "All locations";

  const subtitle = def.needsDateRange
    ? `${formatDateRange(start, end)} · ${locationName}`
    : locationName;

  const filenameSafeTitle = def.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const filenameBase = `${filenameSafeTitle}-${new Date()
    .toISOString()
    .slice(0, 10)}`;

  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <h1 className="font-heading text-2xl font-semibold text-brand-dark">
          Reports
        </h1>
        <p className="text-sm text-brand-dark/60">
          {definitions.length} report{definitions.length === 1 ? "" : "s"} available
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 print:block">
        <div className="print:hidden">
          <ReportSidebar definitions={definitions} activeType={type} />
        </div>

        <div className="space-y-4">
          <div className="print:hidden">
            <ReportFilters
              type={type}
              rangePreset={rangePreset}
              customFrom={customFrom}
              customTo={customTo}
              locationId={locationParam}
              locations={locations}
              showDate={def.needsDateRange}
              showLocation={user.role !== "supervisor"}
            />
          </div>

          <ReportViewer
            companyName={tenant.name}
            reportTitle={def.title}
            reportSubtitle={subtitle}
            columns={def.columns}
            rows={result.rows}
            filenameBase={filenameBase}
          />
        </div>
      </div>
    </div>
  );
}
