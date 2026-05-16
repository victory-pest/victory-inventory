"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Location = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  sku: string | null;
  stockByLocation: Record<string, number>;
};

type Props = {
  locations: Location[];
  products: Product[];
  defaultFromId: string;
  lockFrom: boolean;
};

type Line = {
  productId: string;
  quantity: number;
};

export function TransferForm({
  locations,
  products,
  defaultFromId,
  lockFrom,
}: Props) {
  const router = useRouter();
  const [fromId, setFromId] = useState(defaultFromId);
  const [toId, setToId] = useState<string>(() => {
    const other = locations.find((l) => l.id !== defaultFromId);
    return other?.id ?? "";
  });
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([{ productId: "", quantity: 1 }]);
  const [submitting, setSubmitting] = useState(false);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  function setLine(idx: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, { productId: "", quantity: 1 }]);
  }
  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onSubmit() {
    if (fromId === toId) {
      toast.error("Source and destination must differ");
      return;
    }
    const valid = lines.every((l) => l.productId && l.quantity > 0);
    if (!valid) {
      toast.error("Fill product and quantity on every line");
      return;
    }
    const over = lines.find((l) => {
      const stock = productMap.get(l.productId)?.stockByLocation[fromId] ?? 0;
      return l.quantity > stock;
    });
    if (over) {
      toast.error("One or more quantities exceed available stock");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromLocationId: fromId,
        toLocationId: toId,
        note: note.trim() || null,
        items: lines,
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed to submit");
      return;
    }
    toast.success("Transfer submitted for approval");
    router.push("/transfers");
    router.refresh();
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Select
                value={fromId}
                onValueChange={setFromId}
                disabled={lockFrom}
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
            <ArrowRight className="hidden sm:block h-5 w-5 text-brand-dark/40 mb-2" />
            <div className="space-y-1.5">
              <Label>To</Label>
              <Select value={toId} onValueChange={setToId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locations
                    .filter((l) => l.id !== fromId)
                    .map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Note</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm">Products to transfer</p>
            <Button variant="outline" size="sm" onClick={addLine}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add line
            </Button>
          </div>

          <ul className="space-y-2">
            {lines.map((line, idx) => {
              const product = productMap.get(line.productId);
              const available = product?.stockByLocation[fromId] ?? 0;
              const over = line.quantity > available;
              return (
                <li
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-end border-b last:border-b-0 pb-2"
                >
                  <div className="col-span-12 sm:col-span-7 space-y-1.5">
                    <Label className="text-xs">Product</Label>
                    <Select
                      value={line.productId}
                      onValueChange={(v) => setLine(idx, { productId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                            {p.sku ? ` · ${p.sku}` : ""}
                            {" · stock "}
                            {p.stockByLocation[fromId] ?? 0}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-9 sm:col-span-4 space-y-1.5">
                    <Label className="text-xs">
                      Qty {product ? `(stock ${available})` : ""}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.quantity}
                      onChange={(e) =>
                        setLine(idx, { quantity: Number(e.target.value) || 0 })
                      }
                      className={over ? "border-brand-error" : ""}
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-1 flex justify-end">
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
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push("/transfers")}>
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
              Submitting...
            </>
          ) : (
            "Submit transfer"
          )}
        </Button>
      </div>
    </div>
  );
}
