"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State =
  | "loading"
  | "unsupported"
  | "denied"
  | "missing-key"
  | "unsubscribed"
  | "subscribed";

export function PushManager() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (typeof window === "undefined") return;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setState("unsupported");
        return;
      }
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        setState("missing-key");
        return;
      }
      try {
        const reg =
          (await navigator.serviceWorker.getRegistration("/sw.js")) ??
          (await navigator.serviceWorker.register("/sw.js"));
        await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (cancelled) return;
        if (Notification.permission === "denied") {
          setState("denied");
        } else if (existing) {
          setState("subscribed");
        } else {
          setState("unsubscribed");
        }
      } catch (err) {
        console.warn("[push] init failed:", err);
        setState("unsupported");
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  async function subscribe() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "unsubscribed");
        return;
      }
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        toast.error("Push not configured");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      if (!res.ok) {
        await sub.unsubscribe();
        toast.error("Failed to save subscription");
        return;
      }
      setState("subscribed");
      toast.success("Notifications enabled");
    } catch (err) {
      console.warn("[push] subscribe failed:", err);
      toast.error("Could not enable notifications");
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(
          `/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`,
          { method: "DELETE" },
        );
        await sub.unsubscribe();
      }
      setState("unsubscribed");
      toast.success("Notifications disabled");
    } catch (err) {
      console.warn("[push] unsubscribe failed:", err);
      toast.error("Failed to unsubscribe");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Checking...
      </Button>
    );
  }
  if (state === "unsupported") {
    return (
      <Button variant="outline" size="sm" disabled>
        <BellOff className="mr-2 h-4 w-4" />
        Not supported
      </Button>
    );
  }
  if (state === "missing-key") {
    return (
      <Button variant="outline" size="sm" disabled>
        <BellOff className="mr-2 h-4 w-4" />
        Push not configured
      </Button>
    );
  }
  if (state === "denied") {
    return (
      <Button variant="outline" size="sm" disabled>
        <BellOff className="mr-2 h-4 w-4" />
        Blocked in browser
      </Button>
    );
  }
  if (state === "subscribed") {
    return (
      <Button variant="outline" size="sm" onClick={unsubscribe} disabled={busy}>
        {busy ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Bell className="mr-2 h-4 w-4 text-brand-primary" />
        )}
        Disable push
      </Button>
    );
  }
  return (
    <Button variant="outline" size="sm" onClick={subscribe} disabled={busy}>
      {busy ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Bell className="mr-2 h-4 w-4" />
      )}
      Enable push
    </Button>
  );
}
