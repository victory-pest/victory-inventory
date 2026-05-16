"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Calendar } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { DateRangePreset } from "@/lib/reports";

type Props = {
  type: string;
  rangePreset: DateRangePreset;
  customFrom: string;
  customTo: string;
  locationId: string;
  locations: { id: string; name: string }[];
  showDate: boolean;
  showLocation: boolean;
};

const presets: { value: DateRangePreset; label: string }[] = [
  { value: "weekly", label: "Last 7 days" },
  { value: "biweekly", label: "Last 14 days" },
  { value: "monthly", label: "This month" },
  { value: "quarterly", label: "This quarter" },
  { value: "custom", label: "Custom range" },
];

export function ReportFilters({
  type,
  rangePreset,
  customFrom,
  customTo,
  locationId,
  locations,
  showDate,
  showLocation,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [from, setFrom] = useState(customFrom);
  const [to, setTo] = useState(customTo);

  function navigate(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    next.set("type", type);
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3 items-end">
      {showDate && (
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-brand-dark/60">
            Range
          </Label>
          <Select
            value={rangePreset}
            onValueChange={(v) => navigate({ range: v })}
          >
            <SelectTrigger className="w-[160px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {presets.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showDate && rangePreset === "custom" && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-brand-dark/60">
              From
            </Label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-dark/40 pointer-events-none" />
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                onBlur={() => navigate({ from })}
                className={cn("pl-8 bg-white", "w-[160px]")}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-brand-dark/60">
              To
            </Label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-dark/40 pointer-events-none" />
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                onBlur={() => navigate({ to })}
                className={cn("pl-8 bg-white", "w-[160px]")}
              />
            </div>
          </div>
        </>
      )}

      {showLocation && locations.length > 1 && (
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-brand-dark/60">
            Location
          </Label>
          <Select
            value={locationId || "all"}
            onValueChange={(v) =>
              navigate({ location: v === "all" ? null : v })
            }
          >
            <SelectTrigger className="w-[180px] bg-white">
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
        </div>
      )}
    </div>
  );
}
