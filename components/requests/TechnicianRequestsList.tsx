"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Plus, PackageCheck } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PriorityBadge, StatusBadge } from "./PriorityBadge";
import type { RequestListEntry } from "@/lib/requests";

const tabs = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "picked_up", label: "Picked up" },
  { value: "rejected", label: "Rejected" },
];

export function TechnicianRequestsList({
  requests,
}: {
  requests: RequestListEntry[];
}) {
  const [tab, setTab] = useState("all");
  const filtered =
    tab === "all" ? requests : requests.filter((r) => r.status === tab);

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-brand-dark">
            My requests
          </h1>
          <p className="text-sm text-brand-dark/60">
            Track approvals and pickups
          </p>
        </div>
        <Button asChild className="bg-brand-primary hover:bg-brand-primary/90">
          <Link href="/requests/new">
            <Plus className="mr-1 h-4 w-4" />
            New
          </Link>
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full overflow-x-auto justify-start">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-4 space-y-3">
            {filtered.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-sm text-brand-dark/60">
                  No requests here.
                </CardContent>
              </Card>
            ) : (
              filtered.map((r) => <TechnicianRequestCard key={r.id} request={r} />)
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function TechnicianRequestCard({ request }: { request: RequestListEntry }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const isApproved = request.status === "approved";
  const isPending = request.status === "pending";

  function call(path: string) {
    startTransition(async () => {
      const res = await fetch(path, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Action failed");
        return;
      }
      toast.success("Done");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-2 gap-2">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <PriorityBadge priority={request.priority} />
            <StatusBadge status={request.status} />
          </div>
          <p className="text-xs text-brand-dark/60">
            #{request.id.slice(0, 8)} ·{" "}
            {new Date(request.createdAt).toLocaleString()}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="divide-y">
          {request.items.map((it) => (
            <li key={it.id} className="flex items-center justify-between py-1.5">
              <div className="min-w-0">
                <p className="text-sm text-brand-dark truncate">{it.productName}</p>
                {it.productSku && (
                  <p className="text-xs text-brand-dark/50">{it.productSku}</p>
                )}
              </div>
              <div className="text-sm tabular-nums text-brand-dark">
                {isApproved || request.status === "picked_up" ? (
                  <span className="font-semibold text-brand-primary">
                    {it.quantityApproved ?? 0} {it.unitAbbr ?? ""}
                  </span>
                ) : (
                  <span>
                    {it.quantityRequested} {it.unitAbbr ?? ""}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>

        {request.note && (
          <p className="text-xs text-brand-dark/60 italic border-l-2 border-brand-primary/30 pl-2">
            “{request.note}”
          </p>
        )}

        {request.rejectionNote && (
          <p className="text-sm text-brand-error rounded-md bg-red-50 px-3 py-2">
            Rejected: {request.rejectionNote}
          </p>
        )}

        {(isApproved || isPending) && (
          <div className="flex gap-2 pt-1">
            {isApproved && (
              <Button
                disabled={pending}
                onClick={() => call(`/api/requests/${request.id}/pickup`)}
                className="bg-brand-primary hover:bg-brand-primary/90"
              >
                {pending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PackageCheck className="mr-2 h-4 w-4" />
                )}
                Mark as picked up
              </Button>
            )}
            {isPending && (
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => call(`/api/requests/${request.id}/cancel`)}
              >
                {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cancel
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
