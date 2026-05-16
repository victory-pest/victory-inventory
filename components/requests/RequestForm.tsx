"use client";

import { useMemo, useState } from "react";
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

export function RequestForm({ products, categories }: Props) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Map<string, number>>(new Map());
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

  function setQty(productId: string, qty: number) {
    const product = productMap.get(productId);
    if (!product) return;
    const next = new Map(cart);
    if (qty <= 0) {
      next.delete(productId);
    } else {
      next.set(productId, Math.min(qty, product.stock));
    }
    setCart(next);
  }

  const cartItems = useMemo(
    () =>
      Array.from(cart.entries()).map(([id, qty]) => ({
        product: productMap.get(id)!,
        qty,
      })),
    [cart, productMap],
  );

  const totalItems = cartItems.reduce((sum, c) => sum + c.qty, 0);
  const hasAdjustments = cartItems.some((c) => c.qty > c.product.stock);

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
          quantity: c.qty,
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
          {filtered.map((p) => (
            <ProductRow
              key={p.id}
              product={p}
              quantity={cart.get(p.id) ?? 0}
              onChange={(q) => setQty(p.id, q)}
            />
          ))}
        </div>
      )}

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <div className="fixed inset-x-0 bottom-16 md:bottom-0 z-30 md:left-64">
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
              {cartItems.map(({ product, qty }) => (
                <li key={product.id} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-brand-dark truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-brand-dark/60">
                      Stock: {product.stock}
                      {qty > product.stock ? ` · will reduce to ${product.stock}` : ""}
                    </p>
                  </div>
                  <QtyStepper
                    value={qty}
                    max={product.stock}
                    onChange={(q) => setQty(product.id, q)}
                  />
                </li>
              ))}
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
  quantity,
  onChange,
}: {
  product: CatalogProduct;
  quantity: number;
  onChange: (q: number) => void;
}) {
  const outOfStock = product.stock <= 0;

  return (
    <Card className={cn(outOfStock && "opacity-60")}>
      <CardContent className="p-4 space-y-2.5">
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

        <div className="flex items-center justify-between">
          <span
            className={cn(
              "text-xs font-semibold",
              outOfStock ? "text-brand-error" : "text-brand-dark/70",
            )}
          >
            {outOfStock ? "Out of stock" : `${product.stock} ${product.unit?.abbreviation ?? ""} in stock`}
          </span>
          {quantity === 0 ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onChange(1)}
              disabled={outOfStock}
              className="h-8 gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          ) : (
            <QtyStepper
              value={quantity}
              max={product.stock}
              onChange={onChange}
            />
          )}
        </div>
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
        onChange={(e) => onChange(Number(e.target.value) || 0)}
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
