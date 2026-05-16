"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  TransferApprovalSheet,
  type TransferForApproval,
} from "./TransferApprovalSheet";

export type TransferRow = {
  id: string;
  status: "pending" | "approved" | "rejected" | "completed";
  createdAt: string;
  note: string | null;
  fromLocation: { id: string; name: string };
  toLocation: { id: string; name: string };
  requester: { id: string; name: string };
  approver: { id: string; name: string } | null;
  items: {
    id: string;
    productId: string;
    productName: string;
    productSku: string | null;
    quantityRequested: number;
    quantityApproved: number | null;
    sourceStock: number;
  }[];
};

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  completed: "bg-blue-100 text-blue-800 border-blue-200",
};

type Props = {
  transfers: TransferRow[];
  canCreate: boolean;
  isManager: boolean;
};

export function TransfersList({ transfers, canCreate, isManager }: Props) {
  const [selected, setSelected] = useState<TransferForApproval | null>(null);
  const [open, setOpen] = useState(false);

  function review(t: TransferRow) {
    setSelected({
      id: t.id,
      fromLocation: { name: t.fromLocation.name },
      toLocation: { name: t.toLocation.name },
      requester: { name: t.requester.name },
      createdAt: t.createdAt,
      note: t.note,
      items: t.items.map((it) => ({
        id: it.id,
        productId: it.productId,
        productName: it.productName,
        productSku: it.productSku,
        quantityRequested: it.quantityRequested,
        sourceStock: it.sourceStock,
      })),
    });
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-brand-dark">
            Transfers
          </h1>
          <p className="text-sm text-brand-dark/60">
            Stock movement between locations
          </p>
        </div>
        {canCreate && (
          <Button asChild className="bg-brand-primary hover:bg-brand-primary/90">
            <Link href="/transfers/new">
              <Plus className="mr-1 h-4 w-4" />
              New transfer
            </Link>
          </Button>
        )}
      </div>

      {transfers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-brand-dark/60">
            No transfers yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {transfers.map((t) => (
            <Card key={t.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <Badge
                      variant="outline"
                      className={cn(
                        "uppercase text-[10px] tracking-wide",
                        statusStyles[t.status],
                      )}
                    >
                      {t.status}
                    </Badge>
                    <div className="flex items-center gap-2 font-medium text-sm text-brand-dark">
                      {t.fromLocation.name}
                      <ArrowRight className="h-4 w-4 text-brand-dark/50" />
                      {t.toLocation.name}
                    </div>
                    <p className="text-xs text-brand-dark/60">
                      Requested by {t.requester.name} ·{" "}
                      {new Date(t.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {isManager && t.status === "pending" && (
                    <Button
                      size="sm"
                      onClick={() => review(t)}
                      className="bg-brand-primary hover:bg-brand-primary/90 shrink-0"
                    >
                      Review
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="divide-y text-sm">
                  {t.items.map((it) => (
                    <li
                      key={it.id}
                      className="flex items-center justify-between py-1.5"
                    >
                      <div className="min-w-0">
                        <p className="text-brand-dark truncate">
                          {it.productName}
                        </p>
                        {it.productSku && (
                          <p className="text-xs text-brand-dark/50">
                            {it.productSku}
                          </p>
                        )}
                      </div>
                      <div className="text-right tabular-nums">
                        {t.status === "approved" ? (
                          <span className="font-semibold text-brand-primary">
                            {it.quantityApproved ?? 0}
                          </span>
                        ) : (
                          <span>{it.quantityRequested}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                {t.note && (
                  <p className="text-xs text-brand-dark/60 italic border-l-2 border-brand-primary/30 pl-2 mt-3">
                    “{t.note}”
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TransferApprovalSheet
        transfer={selected}
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setSelected(null);
        }}
      />
    </div>
  );
}
