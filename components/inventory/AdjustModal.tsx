"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const reasons = [
  "Damaged",
  "Expired",
  "Found additional",
  "Counted discrepancy",
  "Loss / theft",
  "Other",
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  locationId: string;
  productName: string;
  currentStock: number;
};

export function AdjustModal({
  open,
  onOpenChange,
  productId,
  locationId,
  productName,
  currentStock,
}: Props) {
  const router = useRouter();
  const [delta, setDelta] = useState<number>(0);
  const [reason, setReason] = useState(reasons[0]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const after = currentStock + delta;
  const invalid = delta === 0 || after < 0;

  async function onSubmit() {
    if (invalid) return;
    setSubmitting(true);
    const res = await fetch("/api/stock/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locationId,
        productId,
        delta,
        reason,
        note: note.trim() || null,
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed to adjust");
      return;
    }
    toast.success("Stock adjusted");
    onOpenChange(false);
    setDelta(0);
    setNote("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md bg-brand-bg px-3 py-2 text-sm">
            <p className="font-medium text-brand-dark">{productName}</p>
            <p className="text-xs text-brand-dark/60">
              Current stock: {currentStock}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Delta (+/-)</Label>
            <Input
              type="number"
              step="1"
              value={delta}
              onChange={(e) => setDelta(Math.round(Number(e.target.value)) || 0)}
            />
            <p
              className={
                after < 0
                  ? "text-xs text-brand-error"
                  : "text-xs text-brand-dark/60"
              }
            >
              Result: {after}
              {after < 0 ? " (cannot go negative)" : ""}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Note (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Additional context"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={submitting || invalid}
            className="bg-brand-primary hover:bg-brand-primary/90"
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
