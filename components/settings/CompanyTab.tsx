"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "./ImageUpload";

type Props = {
  initial: {
    name: string;
    primaryColor: string;
    secondaryColor: string;
    logoUrl: string | null;
  };
};

export function CompanyTab({ initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [primaryColor, setPrimaryColor] = useState(initial.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(initial.secondaryColor);
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoUrl);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/settings/company", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, primaryColor, secondaryColor, logoUrl }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Save failed");
      return;
    }
    toast.success("Company saved");
    router.refresh();
  }

  return (
    <Card className="max-w-2xl">
      <CardContent className="p-5 space-y-5">
        <div className="space-y-1.5">
          <Label>Company name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ColorField
            label="Primary color"
            value={primaryColor}
            onChange={setPrimaryColor}
          />
          <ColorField
            label="Secondary color"
            value={secondaryColor}
            onChange={setSecondaryColor}
          />
        </div>

        <ImageUpload
          label="Logo"
          value={logoUrl}
          onChange={setLogoUrl}
          purpose="logo"
        />

        <div className="flex justify-end">
          <Button
            onClick={save}
            disabled={saving || name.trim().length === 0}
            className="bg-brand-primary hover:bg-brand-primary/90"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-14 h-10 p-1"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono"
        />
      </div>
    </div>
  );
}
