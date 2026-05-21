"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Props = {
  product: { id: string; name: string };
  onClose: () => void;
};

export function ProductLocationsDialog({ product, onClose }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [settings, setSettings] = useState<
    Record<string, { min: number; max: number; active: boolean }>
  >({});
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/products/${product.id}/locations`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const locs = d.locations || [];
        setLocations(locs);
        const map: Record<
          string,
          { min: number; max: number; active: boolean }
        > = {};
        for (const loc of locs) {
          map[loc.id] = { min: 0, max: 0, active: true };
        }
        for (const s of d.settings || []) {
          map[s.locationId] = {
            min: s.minStock,
            max: s.maxStock,
            active: s.active,
          };
        }
        setSettings(map);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
        setErrorMessage("Failed to load location settings");
      });
    return () => {
      cancelled = true;
    };
  }, [product.id]);

  function updateSetting(
    locationId: string,
    key: "min" | "max" | "active",
    value: number | boolean,
  ) {
    setSettings((prev) => ({
      ...prev,
      [locationId]: { ...prev[locationId], [key]: value },
    }));
  }

  const invalidRows = Object.entries(settings).filter(
    ([, s]) => s.max > 0 && s.max < s.min,
  );
  const hasInvalid = invalidRows.length > 0;

  async function save() {
    if (hasInvalid) {
      setErrorMessage(
        "Max must be >= Min at every location (or set Max to 0 for no limit)",
      );
      return;
    }
    setSaving(true);
    const payload = {
      settings: locations.map((loc) => ({
        locationId: loc.id,
        minStock: settings[loc.id]?.min ?? 0,
        maxStock: settings[loc.id]?.max ?? 0,
        active: settings[loc.id]?.active ?? true,
      })),
    };
    const res = await fetch(`/api/products/${product.id}/locations`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorMessage(data.error || "Save failed");
      return;
    }
    toast.success("Saved");
    onClose();
    router.refresh();
  }

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Per-location settings: {product.name}
            </DialogTitle>
          </DialogHeader>
          {loading ? (
            <div className="py-8 text-center text-sm text-brand-dark/60">
              Loading...
            </div>
          ) : locations.length === 0 ? (
            <div className="py-8 text-center text-sm text-brand-dark/60">
              No locations available for editing.
            </div>
          ) : (
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Min</TableHead>
                    <TableHead className="text-right">Max</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.map((loc) => {
                    const s = settings[loc.id] ?? {
                      min: 0,
                      max: 0,
                      active: true,
                    };
                    const invalid = s.max > 0 && s.max < s.min;
                    return (
                      <TableRow key={loc.id}>
                        <TableCell className="font-medium">
                          {loc.name}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            value={s.min}
                            onChange={(e) =>
                              updateSetting(
                                loc.id,
                                "min",
                                Number(e.target.value) || 0,
                              )
                            }
                            className="w-24 ml-auto text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            value={s.max}
                            onChange={(e) =>
                              updateSetting(
                                loc.id,
                                "max",
                                Number(e.target.value) || 0,
                              )
                            }
                            className={cn(
                              "w-24 ml-auto text-right",
                              invalid && "border-red-500",
                            )}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={s.active}
                            onChange={(e) =>
                              updateSetting(
                                loc.id,
                                "active",
                                e.target.checked,
                              )
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {hasInvalid && (
                <p className="mt-2 text-xs text-brand-error">
                  Max must be {">="} Min at each location (or set Max to 0 for
                  no limit).
                </p>
              )}
              <p className="mt-2 text-xs text-brand-dark/60">
                Set Max to 0 to disable the over-stock alert.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={saving || loading || hasInvalid}
              className="bg-brand-primary hover:bg-brand-primary/90"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {errorMessage && (
        <Dialog
          open
          onOpenChange={(o) => !o && setErrorMessage(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Could not save</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-brand-dark/80 py-2">{errorMessage}</p>
            <DialogFooter>
              <Button
                onClick={() => setErrorMessage(null)}
                className="bg-brand-primary hover:bg-brand-primary/90"
              >
                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
