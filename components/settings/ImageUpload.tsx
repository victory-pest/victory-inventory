"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  value: string | null;
  onChange: (url: string | null) => void;
  purpose: string;
  label?: string;
  square?: boolean;
};

export function ImageUpload({
  value,
  onChange,
  purpose,
  label = "Image",
  square,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("purpose", purpose);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Upload failed");
        return;
      }
      const data = await res.json();
      onChange(data.url);
      toast.success("Uploaded");
    } catch (err) {
      console.error(err);
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wide text-brand-dark/60">
        {label}
      </p>
      <div className="flex items-center gap-3">
        <div
          className={`relative shrink-0 ${
            square ? "h-20 w-20" : "h-20 w-28"
          } rounded-md border bg-white overflow-hidden`}
        >
          {value ? (
            <Image
              src={value}
              alt={label}
              fill
              className="object-contain p-2"
              unoptimized
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-brand-dark/30 text-xs">
              No image
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onSelect}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-1 h-4 w-4" />
            )}
            Upload
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(null)}
              className="text-brand-error"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
