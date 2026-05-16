"use client";

import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { ReportColumn, ReportRow } from "@/lib/reports";
import { formatCell } from "./formatters";

const statusStyles: Record<string, string> = {
  ok: "bg-green-100 text-green-800 border-green-200",
  low: "bg-yellow-100 text-yellow-800 border-yellow-200",
  critical: "bg-red-100 text-red-800 border-red-200",
  over: "bg-blue-100 text-blue-800 border-blue-200",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-700 border-gray-200",
  picked_up: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-blue-100 text-blue-800 border-blue-200",
  urgent: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  normal: "bg-blue-100 text-blue-800 border-blue-200",
  low_priority: "bg-gray-100 text-gray-700 border-gray-200",
};

export function ReportTable({
  columns,
  rows,
}: {
  columns: ReportColumn[];
  rows: ReportRow[];
}) {
  if (rows.length === 0) {
    return (
      <div className="border rounded-md bg-white py-12 text-center text-sm text-brand-dark/60">
        No data for this report and filter.
      </div>
    );
  }
  return (
    <div className="rounded-md border bg-white overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead
                key={c.key}
                className={cn(
                  c.align === "right" && "text-right",
                  c.align === "center" && "text-center",
                )}
              >
                {c.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, idx) => (
            <TableRow key={idx}>
              {columns.map((c) => {
                const value = r[c.key];
                if (c.format === "status" || c.format === "priority") {
                  const raw = String(value ?? "");
                  const key = raw === "low" && c.format === "priority" ? "low_priority" : raw;
                  return (
                    <TableCell key={c.key}>
                      {raw ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            "uppercase text-[10px] tracking-wide",
                            statusStyles[key],
                          )}
                        >
                          {raw.replace("_", " ")}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  );
                }
                return (
                  <TableCell
                    key={c.key}
                    className={cn(
                      "align-top",
                      c.align === "right" && "text-right tabular-nums",
                      c.align === "center" && "text-center",
                      c.format === "currency" && "tabular-nums",
                      c.format === "number" && "tabular-nums",
                    )}
                  >
                    {formatCell(value, c.format)}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
