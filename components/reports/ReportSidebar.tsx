"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ReportDefinition } from "@/lib/reports";

export function ReportSidebar({
  definitions,
  activeType,
}: {
  definitions: ReportDefinition[];
  activeType: string;
}) {
  const params = useSearchParams();

  const sortedDefinitions = [...definitions].sort((a, b) =>
    a.title.localeCompare(b.title),
  );
  function hrefFor(id: string) {
    const next = new URLSearchParams(params.toString());
    next.set("type", id);
    return `/reports?${next.toString()}`;
  }

  return (
    <>
      <nav className="hidden md:block sticky top-20 self-start space-y-1 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
        {sortedDefinitions.map((d) => (
          <Link
            key={d.id}
            href={hrefFor(d.id)}
            className={cn(
              "block rounded-md px-3 py-2 text-sm transition-colors",
              activeType === d.id
                ? "bg-brand-primary text-white"
                : "text-brand-dark/80 hover:bg-brand-bg",
            )}
          >
            <p className="font-medium">{d.title}</p>
            <p
              className={cn(
                "text-xs",
                activeType === d.id ? "text-white/70" : "text-brand-dark/50",
              )}
            >
              {d.description}
            </p>
          </Link>
        ))}
      </nav>
      <div className="md:hidden flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        {sortedDefinitions.map((d) => (
          <Link
            key={d.id}
            href={hrefFor(d.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              activeType === d.id
                ? "bg-brand-primary text-white"
                : "bg-white text-brand-dark/70 border border-border",
            )}
          >
            {d.title}
          </Link>
        ))}
      </div>
    </>
  );
}
