"use client";

import { useState } from "react";
import { Download, FileText, Printer, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ReportColumn, ReportRow } from "@/lib/reports";
import { formatCell } from "./formatters";

type Props = {
  reportTitle: string;
  reportSubtitle: string;
  companyName: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  filenameBase: string;
};

export function ExportButtons({
  reportTitle,
  reportSubtitle,
  companyName,
  columns,
  rows,
  filenameBase,
}: Props) {
  const [pdfBusy, setPdfBusy] = useState(false);
  const [xlsxBusy, setXlsxBusy] = useState(false);

  async function exportPdf() {
    setPdfBusy(true);
    try {
      const [{ pdf }, { ReportPdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./ReportPdfDocument"),
      ]);
      const logoUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/logos/Victory_logo.png`
          : "";
      const blob = await pdf(
        <ReportPdfDocument
          logoUrl={logoUrl}
          companyName={companyName}
          reportTitle={reportTitle}
          reportSubtitle={reportSubtitle}
          columns={columns}
          rows={rows}
          generatedAt={new Date().toLocaleString()}
        />,
      ).toBlob();
      triggerDownload(blob, `${filenameBase}.pdf`);
    } catch (err) {
      console.error("[pdf] export failed:", err);
      toast.error("PDF export failed");
    } finally {
      setPdfBusy(false);
    }
  }

  async function exportXlsx() {
    setXlsxBusy(true);
    try {
      const XLSX = await import("xlsx");
      const sheetRows = [
        columns.map((c) => c.label),
        ...rows.map((r) =>
          columns.map((c) => {
            const raw = r[c.key];
            if (c.format === "number" || c.format === "currency") return Number(raw ?? 0);
            if (c.format === "percent") return Number(raw ?? 0);
            if (c.format === "date" || c.format === "datetime") {
              if (raw === null || raw === undefined || raw === "") return "";
              try {
                return new Date(String(raw));
              } catch {
                return String(raw);
              }
            }
            return formatCell(raw, c.format);
          }),
        ),
      ];
      const ws = XLSX.utils.aoa_to_sheet(sheetRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, reportTitle.slice(0, 30));
      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      triggerDownload(blob, `${filenameBase}.xlsx`);
    } catch (err) {
      console.error("[xlsx] export failed:", err);
      toast.error("Excel export failed");
    } finally {
      setXlsxBusy(false);
    }
  }

  function print() {
    window.print();
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button
        variant="outline"
        size="sm"
        onClick={exportPdf}
        disabled={pdfBusy}
      >
        {pdfBusy ? (
          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
        ) : (
          <FileText className="mr-1 h-4 w-4" />
        )}
        PDF
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={exportXlsx}
        disabled={xlsxBusy}
      >
        {xlsxBusy ? (
          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-1 h-4 w-4" />
        )}
        Excel
      </Button>
      <Button variant="outline" size="sm" onClick={print}>
        <Printer className="mr-1 h-4 w-4" />
        Print
      </Button>
    </div>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 0);
}
