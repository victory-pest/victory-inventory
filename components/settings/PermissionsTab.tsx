"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type SupervisorPermissionsRow = {
  canApproveRequests: boolean;
  canEditQuantities: boolean;
  canRejectRequests: boolean;
  canManageCatalog: boolean;
  canEditProducts: boolean;
  canAdjustStock: boolean;
  canReceiveStock: boolean;
  canViewReports: boolean;
  canManageTechnicians: boolean;
  canTransferStock: boolean;
};

const permissionLabels: { key: keyof SupervisorPermissionsRow; label: string; description: string }[] = [
  { key: "canApproveRequests", label: "Approve requests", description: "Approve pending technician requests" },
  { key: "canEditQuantities", label: "Edit approved quantities", description: "Adjust qty when approving" },
  { key: "canRejectRequests", label: "Reject requests", description: "Reject pending requests with a note" },
  { key: "canAdjustStock", label: "Adjust stock", description: "Manual stock corrections at their location" },
  { key: "canReceiveStock", label: "Receive stock", description: "Log incoming deliveries" },
  { key: "canTransferStock", label: "Transfer stock", description: "Request transfers to other locations" },
  { key: "canManageCatalog", label: "Manage catalog", description: "Edit categories, units, license types, suppliers" },
  { key: "canEditProducts", label: "Edit products", description: "Create/update product records" },
  { key: "canViewReports", label: "View reports", description: "Access supervisor-level reports" },
  { key: "canManageTechnicians", label: "Manage technicians", description: "Add/edit technician accounts" },
];

export function PermissionsTab({
  initial,
}: {
  initial: SupervisorPermissionsRow;
}) {
  const router = useRouter();
  const [perms, setPerms] = useState(initial);
  const [saving, setSaving] = useState(false);

  function toggle(key: keyof SupervisorPermissionsRow) {
    setPerms((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/settings/permissions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(perms),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Save failed");
      return;
    }
    toast.success("Permissions saved");
    router.refresh();
  }

  return (
    <Card className="max-w-3xl">
      <CardContent className="p-5 space-y-4">
        <div>
          <p className="font-medium text-brand-dark">Supervisor permissions</p>
          <p className="text-sm text-brand-dark/60">
            These apply to all supervisors in this company. Managers always have full access.
          </p>
        </div>

        <div className="divide-y border rounded-md bg-white">
          {permissionLabels.map((p) => (
            <label
              key={p.key}
              className="flex items-center justify-between p-3 cursor-pointer hover:bg-brand-bg"
            >
              <div>
                <p className="text-sm font-medium text-brand-dark">{p.label}</p>
                <p className="text-xs text-brand-dark/60">{p.description}</p>
              </div>
              <Toggle on={perms[p.key]} onChange={() => toggle(p.key)} />
            </label>
          ))}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={save}
            disabled={saving}
            className="bg-brand-primary hover:bg-brand-primary/90"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save permissions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      role="switch"
      aria-checked={on}
      className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${
        on ? "bg-brand-primary" : "bg-brand-dark/20"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          on ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}
