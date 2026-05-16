"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  NOTIFICATION_EVENTS,
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationSettings,
  type EventChannels,
} from "@/lib/notification-events";

export function NotificationsTab({
  initial,
}: {
  initial: NotificationSettings | null;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    const base = { ...DEFAULT_NOTIFICATION_SETTINGS };
    if (initial) {
      for (const [k, v] of Object.entries(initial)) {
        if (base[k]) base[k] = { ...base[k], ...v };
      }
    }
    return base;
  });
  const [saving, setSaving] = useState(false);

  function toggle(eventKey: string, channel: keyof EventChannels) {
    setSettings((prev) => ({
      ...prev,
      [eventKey]: {
        ...prev[eventKey],
        [channel]: !prev[eventKey][channel],
      },
    }));
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/settings/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: settings }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Save failed");
      return;
    }
    toast.success("Notification settings saved");
    router.refresh();
  }

  return (
    <Card className="max-w-4xl">
      <CardContent className="p-0">
        <div className="p-4 border-b">
          <p className="font-medium text-brand-dark">Notification channels</p>
          <p className="text-sm text-brand-dark/60">
            Per-event toggle for in-app, push, and email. Channels honor the
            spec&apos;s recipient matrix.
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead className="text-center">In-app</TableHead>
                <TableHead className="text-center">Push</TableHead>
                <TableHead className="text-center">Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {NOTIFICATION_EVENTS.map((event) => {
                const channels = settings[event.key];
                return (
                  <TableRow key={event.key}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-brand-dark">{event.label}</p>
                        <p className="text-xs text-brand-dark/50">
                          {event.recipientHint}
                        </p>
                      </div>
                    </TableCell>
                    {(["inApp", "push", "email"] as const).map((ch) => {
                      const supported = event.supportedChannels.includes(ch);
                      return (
                        <TableCell key={ch} className="text-center">
                          {supported ? (
                            <Toggle
                              on={channels?.[ch] ?? false}
                              onChange={() => toggle(event.key, ch)}
                            />
                          ) : (
                            <span className="text-xs text-brand-dark/30">—</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="p-4 border-t flex justify-end">
          <Button
            onClick={save}
            disabled={saving}
            className="bg-brand-primary hover:bg-brand-primary/90"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save settings
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
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        on ? "bg-brand-primary" : "bg-brand-dark/20"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          on ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}
