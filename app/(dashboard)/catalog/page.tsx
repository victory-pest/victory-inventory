import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";

export default async function CatalogPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { products, categories } = await getCatalog({
    companyId: session.user.companyId,
    role: session.user.role,
    locationId: session.user.locationId ?? null,
    licenseIds: session.user.licenseIds,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-brand-dark">
          Catalog
        </h1>
        <p className="text-sm text-brand-dark/60">
          {session.user.role === "technician"
            ? "Products available at your location and authorized by your licenses"
            : "All products in this company"}
        </p>
      </div>

      <CatalogBrowser
        products={products}
        categories={categories}
        showStartRequestCta={session.user.role === "technician"}
      />
    </div>
  );
}
