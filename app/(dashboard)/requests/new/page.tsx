import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";
import { RequestForm } from "@/components/requests/RequestForm";
import { Card, CardContent } from "@/components/ui/card";

export default async function NewRequestPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "technician") redirect("/requests");

  if (!session.user.locationId) {
    return (
      <Card className="max-w-lg">
        <CardContent className="p-6 text-center space-y-2">
          <h1 className="font-heading text-lg font-semibold text-brand-dark">
            No location assigned
          </h1>
          <p className="text-sm text-brand-dark/60">
            Ask your manager to assign you to a location before creating a request.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { products, categories } = await getCatalog({
    companyId: session.user.companyId,
    role: session.user.role,
    locationId: session.user.locationId,
    licenseIds: session.user.licenseIds,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-brand-dark">
          New request
        </h1>
        <p className="text-sm text-brand-dark/60">
          Pick products, set a priority, and submit for approval
        </p>
      </div>

      <RequestForm products={products} categories={categories} />
    </div>
  );
}
