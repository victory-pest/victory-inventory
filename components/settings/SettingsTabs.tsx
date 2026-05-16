"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "company", label: "Company" },
  { id: "locations", label: "Locations" },
  { id: "users", label: "Users" },
  { id: "permissions", label: "Permissions" },
  { id: "catalog", label: "Catalog" },
  { id: "notifications", label: "Notifications" },
];

export function SettingsTabs({ active }: { active: string }) {
  const params = useSearchParams();

  function hrefFor(id: string) {
    const next = new URLSearchParams(params.toString());
    next.set("tab", id);
    return `/settings?${next.toString()}`;
  }

  return (
    <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <div className="flex gap-1 border-b min-w-max">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={hrefFor(t.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
              active === t.id
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-brand-dark/60 hover:text-brand-dark",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

