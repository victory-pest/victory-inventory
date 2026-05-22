"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUpload } from "./ImageUpload";
import { ProductLocationsDialog } from "@/components/products/ProductLocationsDialog";

type Named = { id: string; name: string; active: boolean };
type Unit = { id: string; name: string; abbreviation: string | null; active: boolean };
type Supplier = {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
};
export type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  categoryId: string | null;
  unitId: string | null;
  purchaseUnitId: string | null;
  unitsPerPurchase: number;
  supplierId: string | null;
  unitCost: number;
  epaRegistration: string | null;
  activeIngredient: string | null;
  photoUrl: string | null;
  requiresLicense: boolean;
  active: boolean;
  licenseTypeIds: string[];
};

type Props = {
  categories: Named[];
  units: Unit[];
  licenseTypes: Named[];
  suppliers: Supplier[];
  products: ProductRow[];
  subTab: string;
};

const subTabs = [
  { id: "categories", label: "Categories" },
  { id: "units", label: "Units" },
  { id: "license-types", label: "License Types" },
  { id: "suppliers", label: "Suppliers" },
  { id: "products", label: "Products" },
];

export function CatalogTab({
  categories,
  units,
  licenseTypes,
  suppliers,
  products,
  subTab,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b">
        {subTabs.map((t) => (
          <a
            key={t.id}
            href={`/settings?tab=catalog&sub=${t.id}`}
            className={cn(
              "px-3 py-1.5 text-sm border-b-2 -mb-px transition-colors",
              subTab === t.id
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-brand-dark/60 hover:text-brand-dark",
            )}
          >
            {t.label}
          </a>
        ))}
      </div>

      {subTab === "categories" && (
        <NamedSection
          title="Categories"
          rows={categories}
          endpoint="categories"
          singular="category"
        />
      )}
      {subTab === "units" && <UnitsSection rows={units} />}
      {subTab === "license-types" && (
        <NamedSection
          title="License Types"
          rows={licenseTypes}
          endpoint="license-types"
          singular="license-type"
        />
      )}
      {subTab === "suppliers" && <SuppliersSection rows={suppliers} />}
      {subTab === "products" && (
        <ProductsSection
          rows={products}
          categories={categories}
          units={units}
          licenseTypes={licenseTypes}
          suppliers={suppliers}
        />
      )}
    </div>
  );
}

function NamedSection({
  title,
  rows,
  endpoint,
  singular,
}: {
  title: string;
  rows: Named[];
  endpoint: string;
  singular: string;
}) {
  const [editing, setEditing] = useState<Named | "new" | null>(null);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <p className="font-medium text-brand-dark">
            {title} ({rows.length})
          </p>
          <Button
            size="sm"
            onClick={() => setEditing("new")}
            className="bg-brand-primary hover:bg-brand-primary/90"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-6 text-sm text-brand-dark/60">
                  No {title.toLowerCase()} yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>
                    <StatusPill active={r.active} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(r)}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {editing && (
        <NamedDialog
          row={editing === "new" ? null : editing}
          endpoint={endpoint}
          singular={singular}
          onClose={() => setEditing(null)}
        />
      )}
    </Card>
  );
}

function NamedDialog({
  row,
  endpoint,
  singular,
  onClose,
}: {
  row: Named | null;
  endpoint: string;
  singular: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(row?.name ?? "");
  const [active, setActive] = useState(row?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function save() {
    if (name.trim().length === 0) {
      toast.error("Name required");
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = { name: name.trim() };
    if (row) payload.active = active;
    const res = row
      ? await fetch(`/api/${endpoint}/${row.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch(`/api/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorMessage(data.error || "Save failed");
      return;
    }
    toast.success("Saved");
    onClose();
    router.refresh();
  }

  return (
    <>
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {row ? `Edit ${singular}` : `Add ${singular}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {row && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Active
            </label>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            className="bg-brand-primary hover:bg-brand-primary/90"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {errorMessage && (
      <Dialog
        open
        onOpenChange={(o) => !o && setErrorMessage(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Could not save</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-brand-dark/80 py-2">{errorMessage}</p>
          <DialogFooter>
            <Button
              onClick={() => setErrorMessage(null)}
              className="bg-brand-primary hover:bg-brand-primary/90"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
}

function UnitsSection({ rows }: { rows: Unit[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Unit | "new" | null>(null);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <p className="font-medium text-brand-dark">Units ({rows.length})</p>
          <Button
            size="sm"
            onClick={() => setEditing("new")}
            className="bg-brand-primary hover:bg-brand-primary/90"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add unit
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Abbreviation</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-sm text-brand-dark/60">
                  No units yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.abbreviation ?? "—"}</TableCell>
                  <TableCell>
                    <StatusPill active={r.active} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(r)}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {editing && (
        <UnitDialog
          row={editing === "new" ? null : editing}
          onClose={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </Card>
  );
}

function UnitDialog({
  row,
  onClose,
}: {
  row: Unit | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(row?.name ?? "");
  const [abbr, setAbbr] = useState(row?.abbreviation ?? "");
  const [active, setActive] = useState(row?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function save() {
    if (name.trim().length === 0) {
      toast.error("Name required");
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      name: name.trim(),
      abbreviation: abbr.trim() || null,
    };
    if (row) payload.active = active;
    const res = row
      ? await fetch(`/api/units/${row.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/units", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorMessage(data.error || "Save failed");
      return;
    }
    toast.success("Saved");
    onClose();
  }

  return (
    <>
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{row ? "Edit unit" : "Add unit"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Abbreviation</Label>
            <Input
              value={abbr}
              onChange={(e) => setAbbr(e.target.value)}
              placeholder="ea, kg, ml..."
            />
          </div>
          {row && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Active
            </label>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            className="bg-brand-primary hover:bg-brand-primary/90"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {errorMessage && (
      <Dialog
        open
        onOpenChange={(o) => !o && setErrorMessage(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Could not save</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-brand-dark/80 py-2">{errorMessage}</p>
          <DialogFooter>
            <Button
              onClick={() => setErrorMessage(null)}
              className="bg-brand-primary hover:bg-brand-primary/90"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
}

function SuppliersSection({ rows }: { rows: Supplier[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Supplier | "new" | null>(null);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <p className="font-medium text-brand-dark">
            Suppliers ({rows.length})
          </p>
          <Button
            size="sm"
            onClick={() => setEditing("new")}
            className="bg-brand-primary hover:bg-brand-primary/90"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add supplier
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-sm text-brand-dark/60">
                    No suppliers yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.contactName ?? "—"}</TableCell>
                    <TableCell className="text-xs">{s.email ?? "—"}</TableCell>
                    <TableCell className="text-xs">{s.phone ?? "—"}</TableCell>
                    <TableCell>
                      <StatusPill active={s.active} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(s)}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {editing && (
        <SupplierDialog
          row={editing === "new" ? null : editing}
          onClose={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </Card>
  );
}

function SupplierDialog({
  row,
  onClose,
}: {
  row: Supplier | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(row?.name ?? "");
  const [contactName, setContactName] = useState(row?.contactName ?? "");
  const [email, setEmail] = useState(row?.email ?? "");
  const [phone, setPhone] = useState(row?.phone ?? "");
  const [active, setActive] = useState(row?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function save() {
    if (name.trim().length === 0) {
      toast.error("Name required");
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      name: name.trim(),
      contactName: contactName.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
    };
    if (row) payload.active = active;
    const res = row
      ? await fetch(`/api/suppliers/${row.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorMessage(data.error || "Save failed");
      return;
    }
    toast.success("Saved");
    onClose();
  }

  return (
    <>
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{row ? "Edit supplier" : "Add supplier"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Contact name</Label>
            <Input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          {row && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Active
            </label>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            className="bg-brand-primary hover:bg-brand-primary/90"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {errorMessage && (
      <Dialog
        open
        onOpenChange={(o) => !o && setErrorMessage(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Could not save</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-brand-dark/80 py-2">{errorMessage}</p>
          <DialogFooter>
            <Button
              onClick={() => setErrorMessage(null)}
              className="bg-brand-primary hover:bg-brand-primary/90"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
}

function ProductsSection({
  rows,
  categories,
  units,
  licenseTypes,
  suppliers,
}: {
  rows: ProductRow[];
  categories: Named[];
  units: Unit[];
  licenseTypes: Named[];
  suppliers: Supplier[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<ProductRow | "new" | null>(null);
  const [locationsEditing, setLocationsEditing] = useState<ProductRow | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(p: ProductRow) {
    if (!window.confirm(`Delete "${p.name}"?\n\nThis cannot be undone.`)) return;
    setDeletingId(p.id);

    let res = await fetch(`/api/products/${p.id}`, { method: "DELETE" });

    // If blocked by transactions, offer force delete to admins
    if (res.status === 409) {
      const data = await res.json().catch(() => ({}));
      const forceConfirm = window.confirm(
        `${data.error || "Delete blocked"}\n\nFORCE DELETE anyway?\n\nThis will permanently remove the product AND all related transaction history (request items, receptions, transfers, physical counts).\n\nThis cannot be undone.`,
      );
      if (!forceConfirm) {
        setDeletingId(null);
        toast.error("Delete cancelled");
        return;
      }
      res = await fetch(`/api/products/${p.id}?force=true`, {
        method: "DELETE",
      });
    }

    setDeletingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Delete failed");
      return;
    }
    toast.success("Deleted");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <p className="font-medium text-brand-dark">Products ({rows.length})</p>
          <Button
            size="sm"
            onClick={() => setEditing("new")}
            className="bg-brand-primary hover:bg-brand-primary/90"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add product
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead>Licensed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-sm text-brand-dark/60">
                    No products yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-xs">{p.sku ?? "—"}</TableCell>
                    <TableCell>
                      {categories.find((c) => c.id === p.categoryId)?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      ${p.unitCost.toFixed(2)}
                    </TableCell>
                    <TableCell>{p.requiresLicense ? "Yes" : "No"}</TableCell>
                    <TableCell>
                      <StatusPill active={p.active} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditing(p)}
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLocationsEditing(p)}
                        >
                          <MapPin className="mr-1 h-3.5 w-3.5" />
                          Locations
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(p)}
                          disabled={deletingId === p.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        >
                          {deletingId === p.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {editing && (
        <ProductDialog
          row={editing === "new" ? null : editing}
          categories={categories}
          units={units}
          licenseTypes={licenseTypes}
          suppliers={suppliers}
          onClose={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      {locationsEditing && (
        <ProductLocationsDialog
          product={locationsEditing}
          onClose={() => {
            setLocationsEditing(null);
            router.refresh();
          }}
        />
      )}
    </Card>
  );
}

function ProductDialog({
  row,
  categories,
  units,
  licenseTypes,
  suppliers,
  onClose,
}: {
  row: ProductRow | null;
  categories: Named[];
  units: Unit[];
  licenseTypes: Named[];
  suppliers: Supplier[];
  onClose: () => void;
}) {
  const [name, setName] = useState(row?.name ?? "");
  const [sku, setSku] = useState(row?.sku ?? "");
  const [categoryId, setCategoryId] = useState(row?.categoryId ?? "");
  const [unitId, setUnitId] = useState(row?.unitId ?? "");
  const [purchaseUnitId, setPurchaseUnitId] = useState(
    row?.purchaseUnitId ?? "",
  );
  const [unitsPerPurchase, setUnitsPerPurchase] = useState(
    row?.unitsPerPurchase ?? 1,
  );
  const [supplierId, setSupplierId] = useState(row?.supplierId ?? "");
  const [unitCost, setUnitCost] = useState(row?.unitCost ?? 0);
  const [epa, setEpa] = useState(row?.epaRegistration ?? "");
  const [activeIngredient, setActiveIngredient] = useState(
    row?.activeIngredient ?? "",
  );
  const [photoUrl, setPhotoUrl] = useState<string | null>(row?.photoUrl ?? null);
  const [requiresLicense, setRequiresLicense] = useState(
    row?.requiresLicense ?? false,
  );
  const [licenseIds, setLicenseIds] = useState<string[]>(
    row?.licenseTypeIds ?? [],
  );
  const [active, setActive] = useState(row?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function toggleLicense(id: string) {
    setLicenseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function save() {
    if (name.trim().length === 0) {
      toast.error("Name required");
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      name: name.trim(),
      sku: sku.trim() || null,
      categoryId: categoryId || null,
      unitId: unitId || null,
      purchaseUnitId: purchaseUnitId || null,
      unitsPerPurchase: Number(unitsPerPurchase) || 1,
      supplierId: supplierId || null,
      unitCost: Number(unitCost) || 0,
      epaRegistration: epa.trim() || null,
      activeIngredient: activeIngredient.trim() || null,
      photoUrl,
      requiresLicense,
      licenseTypeIds: requiresLicense ? licenseIds : [],
    };
    if (row) payload.active = active;
    const res = row
      ? await fetch(`/api/products/${row.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorMessage(data.error || "Save failed");
      return;
    }
    toast.success("Saved");
    onClose();
  }

  return (
    <>
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{row ? "Edit product" : "Add product"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>SKU</Label>
              <Input value={sku} onChange={(e) => setSku(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={categoryId || "none"}
                onValueChange={(v) => setCategoryId(v === "none" ? "" : v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {categories.filter((c) => c.active).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Select
                value={unitId || "none"}
                onValueChange={(v) => setUnitId(v === "none" ? "" : v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {units.filter((u) => u.active).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                      {u.abbreviation ? ` (${u.abbreviation})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dual-unit packaging (optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Purchase unit (optional)</Label>
              <Select
                value={purchaseUnitId || "none"}
                onValueChange={(v) =>
                  setPurchaseUnitId(v === "none" ? "" : v)
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {units.filter((u) => u.active).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                      {u.abbreviation ? ` (${u.abbreviation})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-brand-dark/60">
                e.g., box, roll, pail. Leave blank for indivisible products.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Units per purchase</Label>
              <Input
                type="number"
                step="1"
                min={1}
                value={unitsPerPurchase}
                onChange={(e) =>
                  setUnitsPerPurchase(Math.round(Number(e.target.value)) || 1)
                }
              />
              <p className="text-xs text-brand-dark/60">
                e.g., 72 (box of 72 traps), 100 (100 ft roll), 18 (18 kg pail). Leave 1 if not applicable.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Supplier</Label>
              <Select
                value={supplierId || "none"}
                onValueChange={(v) => setSupplierId(v === "none" ? "" : v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {suppliers.filter((s) => s.active).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Unit cost</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={unitCost}
                onChange={(e) => setUnitCost(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>EPA registration</Label>
              <Input value={epa} onChange={(e) => setEpa(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Active ingredient</Label>
              <Input
                value={activeIngredient}
                onChange={(e) => setActiveIngredient(e.target.value)}
                placeholder="e.g. Fipronil 9.1%"
              />
            </div>
          </div>

          <ImageUpload
            value={photoUrl}
            onChange={setPhotoUrl}
            purpose="product"
            label="Photo"
            square
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={requiresLicense}
              onChange={(e) => setRequiresLicense(e.target.checked)}
            />
            Requires license
          </label>

          {requiresLicense && licenseTypes.length > 0 && (
            <div className="space-y-2 border rounded-md p-3 bg-brand-bg/50">
              <Label>Required licenses</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {licenseTypes.filter((lt) => lt.active).map((lt) => (
                  <label
                    key={lt.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={licenseIds.includes(lt.id)}
                      onChange={() => toggleLicense(lt.id)}
                    />
                    {lt.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {row && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Active
            </label>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            className="bg-brand-primary hover:bg-brand-primary/90"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {errorMessage && (
      <Dialog
        open
        onOpenChange={(o) => !o && setErrorMessage(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Could not save</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-brand-dark/80 py-2">{errorMessage}</p>
          <DialogFooter>
            <Button
              onClick={() => setErrorMessage(null)}
              className="bg-brand-primary hover:bg-brand-primary/90"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        active
          ? "bg-green-100 text-green-800 border-green-200"
          : "bg-gray-100 text-gray-700 border-gray-200"
      }
    >
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}
