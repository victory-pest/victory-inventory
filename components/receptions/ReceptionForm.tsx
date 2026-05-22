"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, UserPlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Location = { id: string; name: string };
type Supplier = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  sku: string | null;
  unitCost: number;
  unit: { name: string; abbreviation: string | null } | null;
  purchaseUnit: { name: string; abbreviation: string | null } | null;
  unitsPerPurchase: number;
};

type Props = {
  locations: Location[];
  suppliers: Supplier[];
  products: Product[];
  defaultLocationId: string;
  lockLocation: boolean;
};

type Line = {
  productId: string;
  quantity: number;
  unitCost: number;
  unitType: "stock" | "purchase";
};

export function ReceptionForm({
  locations,
  suppliers: initialSuppliers,
  products,
  defaultLocationId,
  lockLocation,
}: Props) {
  const router = useRouter();
  const [locationId, setLocationId] = useState(defaultLocationId);
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [supplierId, setSupplierId] = useState<string>("none");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<Line[]>([
    { productId: "", quantity: 1, unitCost: 0, unitType: "stock" },
  ]);
  const [submitting, setSubmitting] = useState(false);

  function setLine(idx: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [
      ...prev,
      { productId: "", quantity: 1, unitCost: 0, unitType: "stock" },
    ]);
  }
  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }
  function onPickProduct(idx: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    const conv = p ? Number(p.unitsPerPurchase) : 1;
    const hasDual = !!(p?.purchaseUnit && conv > 1);
    const baseCost = p?.unitCost ?? 0;
    setLine(idx, {
      productId,
      // Show cost per purchase unit when dual-unit, else per stock unit
      unitCost: hasDual ? baseCost * conv : baseCost,
      unitType: hasDual ? "purchase" : "stock",
    });
  }

  function toggleUnit(idx: number, newType: "stock" | "purchase") {
    const line = lines[idx];
    if (line.unitType === newType) return;
    const p = products.find((x) => x.id === line.productId);
    const conv = p ? Number(p.unitsPerPurchase) : 1;
    if (conv <= 1) {
      setLine(idx, { unitType: newType });
      return;
    }
    // Convert qty + cost to the new unit
    setLine(idx, {
      unitType: newType,
      quantity:
        newType === "stock"
          ? Math.round(line.quantity * conv)
          : Math.round(line.quantity / conv),
      unitCost:
        newType === "stock" ? line.unitCost / conv : line.unitCost * conv,
    });
  }

  const total = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);

  async function onSubmit() {
    const valid = lines.every(
      (l) => l.productId && l.quantity > 0 && l.unitCost >= 0,
    );
    if (!valid) {
      toast.error("Fill product, quantity, and cost on every line");
      return;
    }
    setSubmitting(true);

    // Convert purchase-unit lines to stock-unit before sending
    const items = lines.map((l) => {
      const p = products.find((x) => x.id === l.productId);
      const conv = p ? Number(p.unitsPerPurchase) : 1;
      const isPurchase = l.unitType === "purchase" && conv > 1;
      return {
        productId: l.productId,
        quantity: isPurchase ? l.quantity * conv : l.quantity,
        unitCost: isPurchase ? l.unitCost / conv : l.unitCost,
      };
    });

    const res = await fetch("/api/receptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locationId,
        supplierId: supplierId === "none" ? null : supplierId,
        invoiceNumber: invoiceNumber.trim() || null,
        receptionDate: date,
        items,
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed to save");
      return;
    }
    toast.success("Reception logged");
    router.push("/receptions");
    router.refresh();
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <Card>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Select
              value={locationId}
              onValueChange={setLocationId}
              disabled={lockLocation}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Supplier</Label>
            <div className="flex gap-2">
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <AddSupplierDialog
                onCreated={(s) => {
                  setSuppliers((prev) => [...prev, s]);
                  setSupplierId(s.id);
                }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Invoice #</Label>
            <Input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm">Product lines</p>
            <Button variant="outline" size="sm" onClick={addLine}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add line
            </Button>
          </div>

          <ul className="space-y-2">
            {lines.map((line, idx) => (
              <li
                key={idx}
                className="grid grid-cols-12 gap-2 items-end border-b last:border-b-0 pb-2"
              >
                <div className="col-span-12 sm:col-span-6 space-y-1.5">
                  <Label className="text-xs">Product</Label>
                  <Select
                    value={line.productId}
                    onValueChange={(v) => onPickProduct(idx, v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                          {p.sku ? ` · ${p.sku}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-5 sm:col-span-2 space-y-1.5">
                  <Label className="text-xs">Qty</Label>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    value={line.quantity}
                    onChange={(e) =>
                      setLine(idx, {
                        quantity: Math.round(Number(e.target.value)) || 0,
                      })
                    }
                  />
                </div>
                <div className="col-span-5 sm:col-span-3 space-y-1.5">
                  <Label className="text-xs">Unit cost</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.unitCost}
                    onChange={(e) =>
                      setLine(idx, { unitCost: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="col-span-2 sm:col-span-1 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLine(idx)}
                    disabled={lines.length === 1}
                    aria-label="Remove line"
                  >
                    <Trash2 className="h-4 w-4 text-brand-error" />
                  </Button>
                </div>

                {(() => {
                  const p = products.find((x) => x.id === line.productId);
                  if (!p?.purchaseUnit || Number(p.unitsPerPurchase) <= 1)
                    return null;
                  const stockLabel =
                    p.unit?.abbreviation ?? p.unit?.name ?? "each";
                  const purchLabel =
                    p.purchaseUnit.abbreviation ?? p.purchaseUnit.name;
                  const conv = Number(p.unitsPerPurchase);
                  return (
                    <div className="col-span-12 ml-1 flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-brand-dark/60">Receiving in:</span>
                      <div className="inline-flex rounded-md border overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleUnit(idx, "purchase")}
                          className={cn(
                            "px-2 py-0.5 text-xs transition-colors",
                            line.unitType === "purchase"
                              ? "bg-brand-primary text-white"
                              : "bg-white text-brand-dark/70 hover:bg-brand-bg",
                          )}
                        >
                          {purchLabel}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleUnit(idx, "stock")}
                          className={cn(
                            "px-2 py-0.5 text-xs transition-colors",
                            line.unitType === "stock"
                              ? "bg-brand-primary text-white"
                              : "bg-white text-brand-dark/70 hover:bg-brand-bg",
                          )}
                        >
                          {stockLabel}
                        </button>
                      </div>
                      <span className="text-brand-dark/60">
                        {line.unitType === "purchase"
                          ? `→ ${(line.quantity * conv).toFixed(2)} ${stockLabel} into stock`
                          : `(= ${(line.quantity / conv).toFixed(2)} ${purchLabel})`}
                      </span>
                    </div>
                  );
                })()}
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-brand-dark/60">Total</span>
            <span className="text-lg font-semibold tabular-nums">
              ${total.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push("/receptions")}>
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          disabled={submitting}
          className="bg-brand-primary hover:bg-brand-primary/90"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save reception"
          )}
        </Button>
      </div>
    </div>
  );
}

function AddSupplierDialog({
  onCreated,
}: {
  onCreated: (s: Supplier) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    if (name.trim().length === 0) {
      toast.error("Supplier name required");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        contactName: contactName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed");
      return;
    }
    const data = await res.json();
    onCreated({ id: data.supplier.id, name: data.supplier.name });
    setOpen(false);
    setName("");
    setContactName("");
    setEmail("");
    setPhone("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Add supplier">
          <UserPlus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add supplier</DialogTitle>
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
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={submitting}
            className="bg-brand-primary hover:bg-brand-primary/90"
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
