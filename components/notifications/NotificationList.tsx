"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bell,
  Check,
  AlertTriangle,
  PackageCheck,
  PackagePlus,
  Truck,
  ClipboardX,
  ClipboardCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  read: boolean;
  referenceId: string | null;
  createdAt: string;
};

const typeIcon: Record<string, typeof Bell> = {
  request_urgent: AlertTriangle,
  request_new: ClipboardCheck,
  request_auto_adjusted: AlertTriangle,
  request_approved: PackageCheck,
  request_rejected: ClipboardX,
  request_cancelled: ClipboardX,
  reception_registered: PackagePlus,
  transfer_requested: Truck,
  transfer_approved: Truck,
  transfer_rejected: Truck,
  stock_low: AlertTriangle,
};

const typeUrl: Record<string, string> = {
  request_urgent: "/requests",
  request_new: "/requests",
  request_auto_adjusted: "/requests",
  request_approved: "/requests",
  request_rejected: "/requests",
  request_cancelled: "/requests",
  reception_registered: "/receptions",
  transfer_requested: "/transfers",
  transfer_approved: "/transfers",
  transfer_rejected: "/transfers",
  stock_low: "/inventory",
};

export function NotificationList({
  initial,
}: {
  initial: NotificationRow[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [pending, startTransition] = useTransition();

  const unreadCount = rows.filter((r) => !r.read).length;

  function markRead(id: string) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, read: true } : r)),
    );
    fetch(`/api/notifications/${id}/read`, { method: "POST" }).catch(() => {});
  }

  function markAllRead() {
    startTransition(async () => {
      const res = await fetch("/api/notifications/read-all", { method: "POST" });
      if (!res.ok) {
        toast.error("Failed");
        return;
      }
      setRows((prev) => prev.map((r) => ({ ...r, read: true })));
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-brand-dark">
            Notifications
          </h1>
          <p className="text-sm text-brand-dark/60">
            {unreadCount > 0
              ? `${unreadCount} unread`
              : "You're all caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            disabled={pending}
          >
            <Check className="mr-1 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-2">
            <Bell className="h-8 w-8 text-brand-dark/40 mx-auto" />
            <p className="text-sm text-brand-dark/60">
              No notifications yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {rows.map((n) => {
            const Icon = typeIcon[n.type] ?? Bell;
            const url = typeUrl[n.type] ?? "/dashboard";
            return (
              <li key={n.id}>
                <Link
                  href={url}
                  onClick={() => !n.read && markRead(n.id)}
                  className={cn(
                    "block rounded-md border bg-white p-3 transition-colors hover:bg-brand-bg",
                    !n.read && "border-l-4 border-l-brand-primary",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "rounded-md p-2 shrink-0",
                        !n.read
                          ? "bg-brand-primary/10 text-brand-primary"
                          : "bg-brand-bg text-brand-dark/60",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 justify-between">
                        <p
                          className={cn(
                            "text-sm truncate",
                            !n.read
                              ? "font-semibold text-brand-dark"
                              : "text-brand-dark/70",
                          )}
                        >
                          {n.title}
                        </p>
                        {!n.read && (
                          <Badge
                            variant="secondary"
                            className="bg-brand-primary text-white text-[10px] shrink-0"
                          >
                            New
                          </Badge>
                        )}
                      </div>
                      {n.message && (
                        <p className="text-xs text-brand-dark/60 mt-0.5">
                          {n.message}
                        </p>
                      )}
                      <p className="text-[11px] text-brand-dark/40 mt-1">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
