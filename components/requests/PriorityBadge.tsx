import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Priority } from "@/lib/requests";

const styles: Record<Priority, string> = {
  urgent: "bg-brand-error text-white border-transparent",
  high: "bg-brand-warning text-white border-transparent",
  normal: "bg-brand-primary text-white border-transparent",
  low: "bg-brand-dark/60 text-white border-transparent",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge className={cn("uppercase text-[10px] tracking-wide", styles[priority])}>
      {priority}
    </Badge>
  );
}

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-700 border-gray-200",
  picked_up: "bg-blue-100 text-blue-800 border-blue-200",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("uppercase text-[10px] tracking-wide", statusStyles[status])}
    >
      {status.replace("_", " ")}
    </Badge>
  );
}
