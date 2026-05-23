"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Plus, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CatalogProduct, CatalogCategory } from "@/lib/catalog";

type Props = {
  products: CatalogProduct[];
  categories: CatalogCategory[];
  showStartRequestCta?: boolean;
};

export function CatalogBrowser({
  products,
  categories,
  showStartRequestCta,
}: Props) {
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryId && p.category?.id !== categoryId) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.sku?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [products, categoryId, query]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-dark/40" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search product or SKU"
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip
          active={categoryId === null}
          onClick={() => setCategoryId(null)}
        >
          All
        </FilterChip>
        {categories.map((c) => (
          <FilterChip
            key={c.id}
            active={categoryId === c.id}
            onClick={() => setCategoryId(c.id)}
          >
            {c.name}
          </FilterChip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-brand-dark/60">No products match.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => (
            <ProductTile key={p.id} product={p} />
          ))}
        </div>
      )}

      {showStartRequestCta && (
        <Button
          asChild
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 md:bottom-8 md:right-8 h-14 w-14 rounded-full bg-brand-primary hover:bg-brand-primary/90 shadow-lg p-0 z-20"
          aria-label="Start a new request"
        >
          <Link href="/requests/new">
            <Plus className="h-6 w-6" />
          </Link>
        </Button>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-brand-primary text-white"
          : "bg-white text-brand-dark/70 border border-border hover:bg-brand-bg",
      )}
    >
      {children}
    </button>
  );
}

function ProductTile({ product }: { product: CatalogProduct }) {
  const stockTone =
    product.stock <= 0
      ? "destructive"
      : product.minStock > 0 && product.stock <= product.minStock
        ? "warning"
        : "ok";

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-brand-dark text-sm leading-tight truncate">
              {product.name}
            </p>
            <p className="text-xs text-brand-dark/60 truncate">
              {product.sku ?? "—"}
              {product.category ? ` · ${product.category.name}` : ""}
            </p>
          </div>
          {product.requiresLicense && (
            <Badge variant="secondary" className="shrink-0 gap-1">
              <ShieldAlert className="h-3 w-3" />
              License
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between text-xs">
          <span
            className={cn(
              "font-semibold",
              stockTone === "destructive" && "text-brand-error",
              stockTone === "warning" && "text-brand-warning",
              stockTone === "ok" && "text-brand-dark/70",
            )}
          >
            {product.stock} {product.unit?.abbreviation ?? ""} in stock
          </span>
          <span className="text-brand-dark/60 tabular-nums">
            ${product.unitCost.toFixed(2)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
