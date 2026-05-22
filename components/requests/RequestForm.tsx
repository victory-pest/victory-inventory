"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  ShieldAlert,
  AlertTriangle,
  Loader2,
  Package,
  Check,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { CatalogProduct, CatalogCategory } from "@/lib/catalog";

type Priority = "urgent" | "high" | "normal" | "low";

const priorityOptions: { value: Priority; label: string; tone: string }[] = [
  { value: "urgent", label: "Urgent", tone: "bg-brand-error text-white" },
  { value: "high", label: "High", tone: "bg-brand-warning text-white" },
  { value: "normal", label: "Normal", tone: "bg-brand-primary text-white" },
  { value: "low", label: "Low", tone: "bg-brand-dark/60 text-white" },
];

type Props = {
  products: CatalogProduct[];
  categories: CatalogCategory[];
};

type UnitType = "stock" | "purchase";
type CartEntry = { qty: number; unitType: UnitType };

function isDualUnit(p: CatalogProduct): boolean {
  return !!(p.purchaseUnit && p.unitsPerPurchase > 1);
}

function getMaxForUnit(p: CatalogProduct, unitType: UnitType): number {
  if (unitType === "purchase" && isDualUnit(p)) {
    return Math.floor(p.stock / p.unitsPerPurchase);
  }
  return p.stock;
}

export function RequestForm({ products, categories }: Props) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Map<string, CartEntry>>(new Map());
  const [priority, setPriority] = useState<Priority>("normal");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

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

  function setQty(productId: string, qty: number, unitType?: UnitType) {
    const product = productMap.get(productId);
    if (!product) return;
    const next = new Map(cart);
    const current = cart.get(productId);
    const ut: UnitType =
      unitType ??
      current?.unitType ??
      (isDualUnit(product) ? "purchase" : "stock");
    if (qty <= 0) {
      next.delete(productId);
    } else {
      const max = getMaxForUnit(product, ut);
      next.set(productId, { qty: Math.min(qty, max), unitType: ut });
    }
    setCart(next);
  }

  const cartItems = useMemo(
    () =>
      Array.from(cart.entries()).map(([id, entry]) => ({
        product: productMap.get(id)!,
        qty: entry.qty,
        unitType: entry.unitType,
      })),
    [cart, productMap],
  );

  const totalItems = cartItems.reduce((sum, c) => sum + c.qty, 0);
  const hasAdjustments = cartItems.some((c) => {
    const stockQty =
      c.unitType === "purchase" ? c.qty * c.product.unitsPerPurchase : c.qty;
    return stockQty > c.product.stock;
  });

  async function onSubmit() {
    if (cartItems.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        priority,
        note: note.trim() || null,
        items: cartItems.map((c) => ({
          productId: c.product.id,
          quantity:
            c.unitType === "purchase"
              ? c.qty * c.product.unitsPerPurchase
              : c.qty,
        })),
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed to submit");
      return;
    }

    const data = await res.json();
    if (Array.isArray(data.adjustments) && data.adjustments.length > 0) {
      for (const a of data.adjustments) {
        toast.warning(
          `Adjusted: ${a.productName} reduced from ${a.requested} to ${a.approved} (max available)`,
          { duration: 6000 },
        );
      }
    } else {
      toast.success("Request submitted");
    }
    setCartOpen(false);
    router.push("/requests");
    router.refresh();
  }

  return (
    <div className="space-y-4 pb-24">
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
        <Chip active={categoryId === null} onClick={() => setCategoryId(null)}>
          All
        </Chip>
        {categories.map((c) => (
          <Chip
            key={c.id}
            active={categoryId === c.id}
            onClick={() => setCategoryId(c.id)}
          >
            {c.name}
          </Chip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-brand-dark/60">
            No products match.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => {
            const entry = cart.get(p.id);
            return (
              <ProductRow
                key={p.id}
                product={p}
                cartQty={entry?.qty ?? 0}
                cartUnitType={entry?.unitType ?? null}
                onCommit={(qty, ut) => setQty(p.id, qty, ut)}
              />
            );
          })}
        </div>
      )}

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0 z-30 md:left-64">
          <SheetTrigger asChild>
            <button
              type="button"
              disabled={totalItems === 0}
              className={cn(
                "w-full flex items-center justify-between gap-3 px-4 py-3 shadow-lg transition-colors",
                totalItems === 0
                  ? "bg-brand-dark/30 text-white cursor-not-allowed"
                  : "bg-brand-primary text-white hover:bg-brand-primary/90",
              )}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <ShoppingCart className="h-4 w-4" />
                {totalItems === 0
                  ? "Add products to start"
                  : `${cartItems.length} product${cartItems.length === 1 ? "" : "s"} · ${totalItems} unit${totalItems === 1 ? "" : "s"}`}
              </span>
              <span className="text-sm">Review →</span>
            </button>
          </SheetTrigger>
        </div>

        <SheetContent side="bottom" className="max-h-[90vh] md:max-w-2xl md:mx-auto overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Review request</SheetTitle>
          </SheetHeader>

          <div className="space-y-5 mt-4 px-4 pb-6">
            {hasAdjustments && (
              <div className="flex items-start gap-2 rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 text-sm text-yellow-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  Some items exceed stock. Quantities will be auto-adjusted to
                  max available on submit.
                </div>
              </div>
            )}

            <ul className="divide-y border rounded-md bg-white">
              {cartItems.map(({ product, qty, unitType }) => {
                const dual = !!(product.purchaseUnit && product.unitsPerPurchase > 1);
                const stockLbl = product.unit?.abbreviation ?? product.unit?.name ?? "ea";
                const purchLbl = product.purchaseUnit
                  ? product.purchaseUnit.abbreviation ?? product.purchaseUnit.name
                  : stockLbl;
                const stockEquivalent = unitType === "purchase" && dual
                  ? qty * product.unitsPerPurchase
                  : qty;
                const max = unitType === "purchase" && dual
                  ? Math.floor(product.stock / product.unitsPerPurchase)
                  : product.stock;
                return (
                  <li key={product.id} className="flex flex-col gap-2 p-3">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-brand-dark truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-brand-dark/60">
                          Stock: {product.stock} {stockLbl}
                          {dual ? ` (${Math.floor(product.stock / product.unitsPerPurchase)} ${purchLbl})` : ""}
                          {stockEquivalent > product.stock
                            ? ` · will reduce to max available`
                            : ""}
                    </p>
                      </div>
                      <QtyStepper
                        value={qty}
                        max={max}
                        onChange={(q) => setQty(product.id, q)}
                      />
                    </div>
                    {dual && (
                      <div className="flex items-center justify-end gap-2 text-xs">
                        <span className="text-brand-dark/60">in:</span>
                        <div className="inline-flex rounded-md border overflow-hidden">
                          <button
                            type="button"
                            onClick={() => {
                              const entry = cart.get(product.id);
                              if (!entry) return;
                              if (entry.unitType === "purchase") return;
                              const conv = product.unitsPerPurchase;
                              setQty(
                                product.id,
                                Math.floor((qty / conv) * 100) / 100,
                                "purchase",
                              );
                            }}
                            className={cn(
                              "px-2 py-0.5 transition-colors",
                              unitType === "purchase"
                                ? "bg-brand-primary text-white"
                                : "bg-white text-brand-dark/70 hover:bg-brand-bg",
                            )}
                          >
                            {purchLbl}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const entry = cart.get(product.id);
                              if (!entry) return;
                              if (entry.unitType === "stock") return;
                              const conv = product.unitsPerPurchase;
                              setQty(product.id, qty * conv, "stock");
                            }}
                            className={cn(
                              "px-2 py-0.5 transition-colors",
                              unitType === "stock"
                                ? "bg-brand-primary text-white"
                                : "bg-white text-brand-dark/70 hover:bg-brand-bg",
                            )}
                          >
                            {stockLbl}
                          </button>
                        </div>
                        <span className="text-brand-dark/50">
                          {unitType === "purchase"
                            ? `→ ${(qty * product.unitsPerPurchase).toFixed(2)} ${stockLbl} into stock`
                            : `(= ${(qty / product.unitsPerPurchase).toFixed(2)} ${purchLbl})`}
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
              {cartItems.length === 0 && (
                <li className="p-4 text-sm text-brand-dark/60 text-center">
                  No products selected.
                </li>
              )}
            </ul>

            <div className="space-y-2">
              <Label>Priority</Label>
              <div className="grid grid-cols-4 gap-2">
                {priorityOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPriority(opt.value)}
                    className={cn(
                      "rounded-md px-2 py-2 text-xs font-semibold transition-colors border",
                      priority === opt.value
                        ? opt.tone + " border-transparent"
                        : "bg-white text-brand-dark/70 border-border hover:bg-brand-bg",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Anything the supervisor should know"
                rows={3}
              />
            </div>

            <Button
              onClick={onSubmit}
              disabled={submitting || cartItems.length === 0}
              className="w-full bg-brand-primary hover:bg-brand-primary/90"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit request"
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Chip({
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

function ProductRow({
  product,
  cartQty,
  cartUnitType,
  onCommit,
}: {
  product: CatalogProduct;
  cartQty: number;
  cartUnitType: "stock" | "purchase" | null;
  onCommit: (qty: number, ut: "stock" | "purchase") => void;
}) {
  const outOfStock = product.stock <= 0;
  const dualUnit = !!(product.purchaseUnit && product.unitsPerPurchase > 1);
  const conv = product.unitsPerPurchase;
  const defaultUt: "stock" | "purchase" = dualUnit ? "purchase" : "stock";

  const [pending, setPending] = useState(cartQty);
  const [pendingUt, setPendingUt] = useState<"stock" | "purchase">(
    cartUnitType ?? defaultUt,
  );

  useEffect(() => {
    setPending(cartQty);
  }, [cartQty]);
  useEffect(() => {
    if (cartUnitType) setPendingUt(cartUnitType);
  }, [cartUnitType]);

  const dirty =
    pending !== cartQty ||
    (cartUnitType !== null && pendingUt !== cartUnitType);
  const inCart = cartQty > 0;
  const isActive = inCart || pending > 0;

  const stockUnitLabel = product.unit?.abbreviation ?? product.unit?.name ?? "ea";
  const purchUnitLabel = product.purchaseUnit
    ? product.purchaseUnit.abbreviation ?? product.purchaseUnit.name
    : stockUnitLabel;
  const stockInPurch = dualUnit ? Math.floor(product.stock / conv) : 0;
  const maxInUnit =
    pendingUt === "purchase" && dualUnit ? stockInPurch : product.stock;

  function togglePendingUt(newUt: "stock" | "purchase") {
    if (pendingUt === newUt) return;
    if (conv <= 1) {
      setPendingUt(newUt);
      return;
    }
    const newQty =
      newUt === "stock"
        ? pending * conv
        : Math.floor((pending / conv) * 100) / 100;
    setPendingUt(newUt);
    setPending(Math.min(Math.max(Math.round(newQty), 1), maxInUnit));
  }

  function handleSave() {
    onCommit(pending, pendingUt);
    if (pending === 0 && cartQty > 0) {
      toast.info(`${product.name} removed from cart`);
    } else if (cartQty === 0) {
      toast.success(`${product.name} added to cart`);
    } else {
      toast.success(`${product.name} updated`);
    }
  }

  return (
    <Card
      className={cn(
        "relative transition-colors",
        outOfStock && "opacity-60",
        inCart && "border-brand-primary border-2 bg-brand-primary/5",
      )}
    >
      <CardContent className="p-3 space-y-2.5">
        <div className="flex gap-3">
          <div className="shrink-0 w-16 h-16 rounded-md overflow-hidden bg-brand-bg flex items-center justify-center border border-border">
            {product.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.photoUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Package className="w-6 h-6 text-brand-dark/30" />
            )}
          </div>
          <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-0.5">
              <p className="font-medium text-brand-dark text-sm leading-tight line-clamp-2">
                {product.name}
              </p>
              <p className="text-xs text-brand-dark/60 truncate">
                {product.sku ?? "—"}
                {product.category ? ` · ${product.category.name}` : ""}
              </p>
              {product.activeIngredient && (
                <p className="text-xs text-brand-dark/50 italic truncate">
                  {product.activeIngredient}
                </p>
              )}
            </div>
            {product.requiresLicense && (
              <Badge variant="secondary" className="shrink-0 gap-1">
                <ShieldAlert className="h-3 w-3" />
                License
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-xs font-semibold",
              outOfStock ? "text-brand-error" : "text-brand-dark/70",
            )}
          >
            {outOfStock
              ? "Out of stock"
              : dualUnit
                ? `${product.stock} ${stockUnitLabel} / ${stockInPurch} ${purchUnitLabel} in stock`
                : `${product.stock} ${stockUnitLabel} in stock`}
          </span>
          {!isActive ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPending(1)}
              disabled={outOfStock}
              className="h-8 gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          ) : (
            <QtyStepper
              value={pending}
              max={maxInUnit}
              onChange={setPending}
            />
          )}
        </div>

        {isActive && (
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!dirty}
            className={cn(
              "w-full h-9 gap-1.5",
              dirty
                ? "bg-brand-primary text-white hover:bg-brand-primary/90 shadow-sm"
                : "bg-brand-primary/15 text-brand-primary/80 hover:bg-brand-primary/15 cursor-default shadow-none",
            )}
          >
            {dirty ? (
              cartQty === 0 ? (
                <>
                  <Plus className="h-4 w-4" />
                  Add to cart
                </>
              ) : pending === 0 ? (
                <>Remove from cart</>
              ) : (
                <>Update cart</>
              )
            ) : (
              <>
                <Check className="h-4 w-4" />
                In cart ({cartQty})
              </>
            )}
          </Button>
        )}

        {dualUnit && !outOfStock && isActive && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-brand-dark/60">Order in:</span>
            <div className="inline-flex rounded-md border overflow-hidden">
              <button
                type="button"
                onClick={() => togglePendingUt("purchase")}
                className={cn(
                  "px-2 py-0.5 transition-colors",
                  pendingUt === "purchase"
                    ? "bg-brand-primary text-white"
                    : "bg-white text-brand-dark/70 hover:bg-brand-bg",
                )}
              >
                {purchUnitLabel}
              </button>
              <button
                type="button"
                onClick={() => togglePendingUt("stock")}
                className={cn(
                  "px-2 py-0.5 transition-colors",
                  pendingUt === "stock"
                    ? "bg-brand-primary text-white"
                    : "bg-white text-brand-dark/70 hover:bg-brand-bg",
                )}
              >
                {stockUnitLabel}
              </button>
            </div>
            <span className="text-brand-dark/50">
              {pending > 0
                ? pendingUt === "purchase"
                  ? `= ${(pending * conv).toFixed(0)} ${stockUnitLabel}`
                  : `(${(pending / conv).toFixed(2)} ${purchUnitLabel})`
                : ""}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QtyStepper({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (q: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="h-8 w-8"
        onClick={() => onChange(value - 1)}
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <Input
        type="number"
        value={value}
        min={0}
        max={max}
        step="1"
        onChange={(e) =>
          onChange(Math.round(Number(e.target.value)) || 0)
        }
        className="h-8 w-14 text-center tabular-nums"
      />
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="h-8 w-8"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
