import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { PackagePlus, Truck, Bell, Settings, User } from "lucide-react";

const items = [
  { label: "Receptions", href: "/receptions", icon: PackagePlus },
  { label: "Transfers", href: "/transfers", icon: Truck },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Profile", href: "/profile", icon: User },
];

export default async function MorePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-brand-dark">
          More
        </h1>
        <p className="text-sm text-brand-dark/60">Additional tools</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
                  <Icon className="h-6 w-6 text-brand-primary" />
                  <span className="text-sm font-medium text-brand-dark">
                    {item.label}
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
