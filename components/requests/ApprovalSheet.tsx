"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Check, X, AlertTriangle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { PriorityBadge } from "./PriorityBadge";
import type { RequestListEntry } from "@/lib/requests";

type Props = {
  request: RequestListEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ApprovalSheet({ request, open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md overflow-y-auto"
      >
        {request && (
          <ApprovalForm
            key={request.id}
            request={request}
            onDone={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function ApprovalForm({
  request,
  onDone,
}: {
  request: RequestListEntry;
  onDone: () => void;
}) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const next: Record<string, number> = {};
    for (const it of request.items) {
      next[it.id] = Math.min(it.quantityRequested, it.currentStock);
    }
    return next;
  });
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const hasShortage = request.items.some(
    (it) => it.currentStock < it.quantityRequested,
  );
  const overStock = request.items.some(
    (it) => (quantities[it.id] ?? 0) > it.currentStock,
  );

  async function onApprove() {
    if (overStock) {
      toast.error("Quantities exceed available stock");
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/requests/${request.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: request.items.map((it) => ({
          itemId: it.id,
          quantityApproved: quantities[it.id] ?? 0,
        })),
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed to approve");
      return;
    }
    toast.success("Request approved");
    onDone();
    router.refresh();
  }

  async function onReject() {
    if (rejectNote.trim().length === 0) {
      toast.error("Rejection note required");
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/requests/${request.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: rejectNote.trim() }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed to reject");
      return;
    }
    toast.success("Request rejected");
    onDone();
    router.refresh();
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          Review request
          <PriorityBadge priority={request.priority} />
        </SheetTitle>
      </SheetHeader>

      <div className="px-4 pb-6 space-y-5 mt-4">
        <div className="text-sm space-y-1">
          <p>
            <span className="text-brand-dark/60">Technician:</span>{" "}
            {request.technician.name}
          </p>
          <p>
            <span className="text-brand-dark/60">Location:</span>{" "}
            {request.location.name}
          </p>
          <p className="text-xs text-brand-dark/50">
            #{request.id.slice(0, 8)} ·{" "}
            {new Date(request.createdAt).toLocaleString()}
          </p>
          {request.note && (
            <p className="text-sm italic border-l-2 border-brand-primary/30 pl-2 mt-2">
              “{request.note}”
            </p>
          )}
        </div>

        <Separator />

        {hasShortage && !rejectMode && (
          <div className="flex items-start gap-2 rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 text-xs text-yellow-800">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Some items have lower stock than requested. Approved quantities
              were pre-filled to the available stock.
            </span>
          </div>
        )}

        {!rejectMode ? (
          <div className="space-y-3">
            {request.items.map((it) => {
              const value = quantities[it.id] ?? 0;
              const over = value > it.currentStock;
              return (
                <div key={it.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-brand-dark truncate">
                        {it.productName}
                      </p>
                      <p className="text-xs text-brand-dark/60">
                        Requested {it.quantityRequested} · Stock{" "}
                        {it.currentStock} {it.unitAbbr ?? ""}
                      </p>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      max={it.currentStock}
                      value={value}
                      onChange={(e) =>
                        setQuantities((q) => ({
                          ...q,
                          [it.id]: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      className={over ? "w-20 border-brand-error" : "w-20"}
                    />
                  </div>
                  {over && (
                    <p className="text-xs text-brand-error">
                      Exceeds available stock
                    </p>
                  )}
                </div>
              );
            })}

            <Separator />

            <div className="flex gap-2">
              <Button
                onClick={onApprove}
                disabled={submitting || overStock}
                className="flex-1 bg-brand-success hover:bg-brand-success/90 text-white"
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Approve
              </Button>
              <Button
                variant="outline"
                onClick={() => setRejectMode(true)}
                disabled={submitting}
                className="flex-1"
              >
                <X className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="rejectNote">Rejection note</Label>
              <Textarea
                id="rejectNote"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Explain why this request was rejected"
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={onReject}
                disabled={submitting || rejectNote.trim().length === 0}
                className="flex-1 bg-brand-error hover:bg-brand-error/90 text-white"
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <X className="mr-2 h-4 w-4" />
                )}
                Confirm rejection
              </Button>
              <Button
                variant="outline"
                onClick={() => setRejectMode(false)}
                disabled={submitting}
                className="flex-1"
              >
                Back
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
