import Image from "next/image";
import type { ReportColumn, ReportRow } from "@/lib/reports";
import { ReportTable } from "./ReportTable";
import { ExportButtons } from "./ExportButtons";

type Props = {
  companyName: string;
  reportTitle: string;
  reportSubtitle: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  filenameBase: string;
};

export function ReportViewer({
  companyName,
  reportTitle,
  reportSubtitle,
  columns,
  rows,
  filenameBase,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 print:hidden">
        <div>
          <p className="text-xs uppercase tracking-wide text-brand-dark/50">
            Report
          </p>
          <h2 className="font-heading text-xl font-semibold text-brand-dark">
            {reportTitle}
          </h2>
          <p className="text-sm text-brand-dark/60">{reportSubtitle}</p>
        </div>
        <ExportButtons
          companyName={companyName}
          reportTitle={reportTitle}
          reportSubtitle={reportSubtitle}
          columns={columns}
          rows={rows}
          filenameBase={filenameBase}
        />
      </div>

      <div className="printable space-y-3">
        <div className="hidden print:flex items-center justify-between border-b-2 border-brand-primary pb-3 mb-4">
          <div className="flex items-center gap-3">
            <Image
              src="/logos/Victory_logo.png"
              alt={companyName}
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />
            <p className="font-heading font-bold text-brand-primary text-lg">
              {companyName}
            </p>
          </div>
          <div className="text-right">
            <p className="font-heading font-bold text-base">{reportTitle}</p>
            <p className="text-xs text-brand-dark/60">{reportSubtitle}</p>
          </div>
        </div>

        <ReportTable columns={columns} rows={rows} />

        <p className="hidden print:block text-[10px] text-brand-dark/50 mt-2">
          Generated on {new Date().toLocaleString()} · {rows.length} rows
        </p>
      </div>
    </div>
  );
}
