"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PriorityBadge, StatusBadge } from "./PriorityBadge";
import { ApprovalSheet } from "./ApprovalSheet";
import type { RequestListEntry } from "@/lib/requests";

type Props = {
  requests: RequestListEntry[];
  locations: { id: string; name: string }[];
  scope: "supervisor" | "manager";
};

const statusTabs = [
  { value: "pending", label: "Pending" },
  { value: "all", label: "All" },
  { value: "approved", label: "Approved" },
  { value: "picked_up", label: "Picked up" },
  { value: "rejected", label: "Rejected" },
];

export function StaffRequestsList({ requests, locations, scope }: Props) {
  const [tab, setTab] = useState("pending");
  const [priority, setPriority] = useState<string>("all");
  const [locationId, setLocationId] = useState<string>("all");
  const [selected, setSelected] = useState<RequestListEntry | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (tab !== "all" && r.status !== tab) return false;
      if (priority !== "all" && r.priority !== priority) return false;
      if (locationId !== "all" && r.location.id !== locationId) return false;
      return true;
    });
  }, [requests, tab, priority, locationId]);

  function openRequest(r: RequestListEntry) {
    setSelected(r);
    setSheetOpen(true);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-brand-dark">
          Requests
        </h1>
        <p className="text-sm text-brand-dark/60">
          {scope === "supervisor"
            ? "Pending approvals for your location"
            : "All requests across locations"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-[140px] bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any priority</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        {scope === "manager" && locations.length > 1 && (
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger className="w-[160px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              {locations.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full overflow-x-auto justify-start">
          {statusTabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {statusTabs.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-4 space-y-3">
            {filtered.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-sm text-brand-dark/60">
                  No requests match.
                </CardContent>
              </Card>
            ) : (
              filtered.map((r) => (
                <StaffRequestCard
                  key={r.id}
                  request={r}
                  onReview={() => openRequest(r)}
                />
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>

      <ApprovalSheet
        request={selected}
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}

function StaffRequestCard({
  request,
  onReview,
}: {
  request: RequestListEntry;
  onReview: () => void;
}) {
  const isPending = request.status === "pending";
  const isUrgent = request.priority === "urgent" && isPending;

  return (
    <Card className={isUrgent ? "border-l-4 border-l-brand-error" : undefined}>
      <CardHeader className="flex flex-row items-start justify-between pb-2 gap-2">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <PriorityBadge priority={request.priority} />
            <StatusBadge status={request.status} />
          </div>
          <p className="text-xs text-brand-dark/60">
            #{request.id.slice(0, 8)} · {request.technician.name} ·{" "}
            {request.location.name}
          </p>
          <p className="text-xs text-brand-dark/50">
            {new Date(request.createdAt).toLocaleString()}
          </p>
        </div>
        {isPending && (
          <Button
            size="sm"
            onClick={onReview}
            className="bg-brand-primary hover:bg-brand-primary/90 shrink-0"
          >
            Review
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {request.items.map((it) => (
            <li key={it.id} className="flex items-center justify-between py-1.5">
              <div className="min-w-0">
                <p className="text-sm text-brand-dark truncate">{it.productName}</p>
                <p className="text-xs text-brand-dark/50">
                  Stock {it.currentStock} {it.unitAbbr ?? ""}
                </p>
              </div>
              <div className="text-sm text-brand-dark tabular-nums">
                {request.status === "approved" || request.status === "picked_up" ? (
                  <span>
                    <span className="font-semibold text-brand-primary">
                      {it.quantityApproved ?? 0}
                    </span>
                    <span className="text-brand-dark/50"> / {it.quantityRequested}</span>
                  </span>
                ) : (
                  <span>{it.quantityRequested}</span>
                )}{" "}
                {it.unitAbbr ?? ""}
              </div>
            </li>
          ))}
        </ul>
        {request.note && (
          <p className="text-xs text-brand-dark/60 italic border-l-2 border-brand-primary/30 pl-2 mt-3">
            “{request.note}”
          </p>
        )}
        {request.rejectionNote && (
          <p className="text-sm text-brand-error rounded-md bg-red-50 px-3 py-2 mt-3">
            Rejected: {request.rejectionNote}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
