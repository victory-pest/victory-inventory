"use client";

import { useMemo, useState } from "react";
import { Search, Sliders } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { InventoryRow } from "@/lib/inventory";
import { AdjustModal } from "./AdjustModal";

type Props = {
  rows: InventoryRow[];
  locations: { id: string; name: string }[];
  canAdjust: boolean;
  scopedLocationId: string | null;
};

const statusStyles: Record<string, string> = {
  ok: "bg-green-100 text-green-800 border-green-200",
  low: "bg-yellow-100 text-yellow-800 border-yellow-200",
  critical: "bg-red-100 text-red-800 border-red-200",
  over: "bg-blue-100 text-blue-800 border-blue-200",
};

export function InventoryTable({
  rows,
  locations,
  canAdjust,
  scopedLocationId,
}: Props) {
  const [tab, setTab] = useState<string>(
    scopedLocationId ?? (locations[0]?.id ?? "all"),
  );
  const [query, setQuery] = useState("");
  const [adjustRow, setAdjustRow] = useState<InventoryRow | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab !== "all" && r.locationId !== tab) return false;
      if (!q) return true;
      return (
        r.productName.toLowerCase().includes(q) ||
        (r.sku?.toLowerCase().includes(q) ?? false) ||
        (r.categoryName?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [rows, tab, query]);

  const showLocationTabs = !scopedLocationId && locations.length > 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-dark/40" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search product, SKU, or category"
            className="pl-9 bg-white"
          />
        </div>
      </div>

      {showLocationTabs && (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full overflow-x-auto justify-start">
            <TabsTrigger value="all">All locations</TabsTrigger>
            {locations.map((l) => (
              <TabsTrigger key={l.id} value={l.id}>
                {l.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="hidden md:table-cell">SKU</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                {!scopedLocationId && tab === "all" && (
                  <TableHead className="hidden lg:table-cell">Location</TableHead>
                )}
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="hidden md:table-cell text-right">
                  Min
                </TableHead>
                <TableHead className="hidden md:table-cell text-right">
                  Max
                </TableHead>
                <TableHead>Status</TableHead>
                {canAdjust && <TableHead className="text-right">Adjust</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canAdjust ? 9 : 8}
                    className="text-center py-8 text-sm text-brand-dark/60"
                  >
                    No products match.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={`${r.locationId}:${r.productId}`}>
                    <TableCell className="font-medium">{r.productName}</TableCell>
                    <TableCell className="hidden md:table-cell text-brand-dark/70">
                      {r.sku ?? "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-brand-dark/70">
                      {r.categoryName ?? "—"}
                    </TableCell>
                    {!scopedLocationId && tab === "all" && (
                      <TableCell className="hidden lg:table-cell text-brand-dark/70">
                        {r.locationName}
                      </TableCell>
                    )}
                    <TableCell className="text-right tabular-nums font-semibold">
                      {r.stock} {r.unitAbbr ?? ""}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-right tabular-nums text-brand-dark/70">
                      {r.minStock}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-right tabular-nums text-brand-dark/70">
                      {r.maxStock}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "uppercase text-[10px] tracking-wide",
                          statusStyles[r.status],
                        )}
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    {canAdjust && (
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAdjustRow(r)}
                        >
                          <Sliders className="h-3.5 w-3.5 mr-1" />
                          Adjust
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {adjustRow && (
        <AdjustModal
          open={!!adjustRow}
          onOpenChange={(o) => !o && setAdjustRow(null)}
          productId={adjustRow.productId}
          locationId={adjustRow.locationId}
          productName={adjustRow.productName}
          currentStock={adjustRow.stock}
        />
      )}
    </div>
  );
}
