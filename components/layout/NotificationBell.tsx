"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const POLL_INTERVAL = 20_000; // 20s
const SOUND_PREF_KEY = "vi.notif.sound";

function playNotificationSound() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtx();

    const playNote = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
      gain.gain.linearRampToValueAtTime(0, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playNote(880, now, 0.15); // A5
    playNote(1318.5, now + 0.1, 0.2); // E6

    setTimeout(() => ctx.close(), 500);
  } catch {
    // Audio unavailable (autoplay blocked, no AudioContext) — fail silently
  }
}

type NotificationItem = {
  id: string;
  title: string;
  message: string | null;
};

export function NotificationBell({
  initialUnreadCount,
}: {
  initialUnreadCount: number;
}) {
  const [count, setCount] = useState(initialUnreadCount);
  const [soundOn, setSoundOn] = useState(true);
  const prevCountRef = useRef(initialUnreadCount);
  const lastSeenIdRef = useRef<string | null>(null);
  const soundOnRef = useRef(soundOn);

  // Keep ref in sync with state so polling closure sees current value
  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  // Load sound preference from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const pref = window.localStorage.getItem(SOUND_PREF_KEY);
    setSoundOn(pref !== "off");
  }, []);

  // Poll for new notifications
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const res = await fetch("/api/notifications?unread=1", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        const notifications: NotificationItem[] = data.notifications ?? [];
        const newCount = notifications.length;
        const latest = notifications[0];

        if (
          newCount > prevCountRef.current &&
          latest &&
          latest.id !== lastSeenIdRef.current
        ) {
          if (soundOnRef.current) playNotificationSound();
          toast.info(latest.title, {
            description: latest.message ?? undefined,
            duration: 5000,
          });
          lastSeenIdRef.current = latest.id;
        }

        prevCountRef.current = newCount;
        setCount(newCount);
      } catch {
        // ignore network errors
      } finally {
        if (!cancelled) {
          timer = setTimeout(poll, POLL_INTERVAL);
        }
      }
    };

    timer = setTimeout(poll, POLL_INTERVAL);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  function toggleSound(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const newVal = !soundOn;
    setSoundOn(newVal);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SOUND_PREF_KEY, newVal ? "on" : "off");
    }
    // Play a test sound when enabling, to confirm it works
    if (newVal) playNotificationSound();
  }

  return (
    <div className="flex items-center">
      <Button
        asChild
        variant="ghost"
        size="icon"
        aria-label={
          count > 0
            ? `Notifications (${count} unread)`
            : "Notifications"
        }
        className="text-brand-dark/70 hover:text-brand-dark relative"
      >
        <Link href="/notifications">
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] rounded-full bg-brand-error text-white text-[10px] font-semibold flex items-center justify-center px-1 leading-none">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSound}
        aria-label={
          soundOn
            ? "Mute notification sound"
            : "Enable notification sound"
        }
        className="text-brand-dark/70 hover:text-brand-dark"
        title={soundOn ? "Notification sound on" : "Notification sound off"}
      >
        {soundOn ? (
          <Volume2 className="h-4 w-4" />
        ) : (
          <VolumeX className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
