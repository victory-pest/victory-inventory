import type { ColumnFormat } from "@/lib/reports";

export function formatCell(value: unknown, format?: ColumnFormat): string {
  if (value === null || value === undefined || value === "") return "—";

  switch (format) {
    case "number":
      return Number(value).toLocaleString();
    case "currency":
      return `$${Number(value).toFixed(2)}`;
    case "percent":
      return `${Number(value).toFixed(1)}%`;
    case "date":
      try {
        return new Date(String(value)).toLocaleDateString();
      } catch {
        return String(value);
      }
    case "datetime":
      try {
        return new Date(String(value)).toLocaleString();
      } catch {
        return String(value);
      }
    case "status":
    case "priority":
      return String(value).replace("_", " ");
    default:
      return String(value);
  }
}
