import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

type Props = {
  title: string;
  phase: string;
  description?: string;
  icon?: LucideIcon;
};

export function Placeholder({ title, phase, description, icon: Icon }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-brand-dark">
          {title}
        </h1>
        <p className="text-sm text-brand-dark/60">Coming in {phase}</p>
      </div>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          {Icon && <Icon className="h-10 w-10 text-brand-dark/40" />}
          <p className="text-sm text-brand-dark/70 max-w-md">
            {description ?? "This screen will be built in a later phase."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
