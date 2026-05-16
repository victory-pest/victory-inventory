import Link from "next/link";
import { Plus, PackageCheck, ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = {
  userName: string;
  locationName: string | null;
};

export function TechnicianDashboard({ userName, locationName }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-brand-dark">
          Hi, {userName.split(" ")[0]}
        </h1>
        <p className="text-sm text-brand-dark/60">
          {locationName ? `${locationName} location` : "No location assigned"}
        </p>
      </div>

      <Card className="border-dashed bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <PackageCheck className="h-5 w-5 text-brand-primary" />
            Ready to pick up
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-brand-dark/60">
            Nothing waiting for pickup right now. Approved requests will appear here.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-5 w-5 text-brand-secondary" />
            My active requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-brand-dark/60">
            You have no open requests. Tap “New Request” to start one.
          </p>
        </CardContent>
      </Card>

      <Button
        asChild
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 h-14 w-14 rounded-full bg-brand-primary hover:bg-brand-primary/90 shadow-lg p-0 z-20"
        aria-label="New request"
      >
        <Link href="/requests/new">
          <Plus className="h-6 w-6" />
        </Link>
      </Button>
    </div>
  );
}
