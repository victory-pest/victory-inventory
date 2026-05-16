import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const roleLabels = {
  super_admin: "Super Admin",
  manager: "Manager",
  supervisor: "Supervisor",
  technician: "Technician",
} as const;

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [location, licenses] = await Promise.all([
    session.user.locationId
      ? prisma.location.findUnique({
          where: { id: session.user.locationId },
          select: { name: true, city: true, state: true },
        })
      : null,
    session.user.licenseIds.length
      ? prisma.licenseType.findMany({
          where: { id: { in: session.user.licenseIds } },
          select: { name: true },
        })
      : [],
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-brand-dark">
          Profile
        </h1>
        <p className="text-sm text-brand-dark/60">Account details</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Field label="Name" value={session.user.name} />
            <Field label="Email" value={session.user.email ?? "—"} />
            <Field label="Role" value={roleLabels[session.user.role]} />
            <Field
              label="Location"
              value={
                location
                  ? `${location.name}${
                      location.city ? ` · ${location.city}` : ""
                    }${location.state ? `, ${location.state}` : ""}`
                  : "—"
              }
            />
          </dl>
        </CardContent>
      </Card>

      {licenses.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Licenses</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm">
              {licenses.map((l) => (
                <li key={l.name} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
                  {l.name}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-brand-dark/50">
        {label}
      </dt>
      <dd className="mt-0.5 text-brand-dark">{value}</dd>
    </div>
  );
}
