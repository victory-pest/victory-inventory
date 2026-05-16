import Link from "next/link";
import Image from "next/image";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./UserMenu";
import type { Role } from "@/lib/nav";

type Props = {
  role: Role;
  userName: string;
  userEmail: string | null;
  locationName: string | null;
  tenantName: string;
  unreadCount: number;
};

export function Header({
  role,
  userName,
  userEmail,
  locationName,
  tenantName,
  unreadCount,
}: Props) {
  return (
    <header className="sticky top-0 z-20 h-16 border-b bg-white">
      <div className="flex h-full items-center justify-between gap-3 px-4 md:pl-6 md:pr-8">
        <div className="flex items-center gap-3 md:hidden">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/logos/Victory_logo.png"
              alt={tenantName}
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
            <span className="font-heading font-semibold text-brand-dark text-sm">
              {tenantName}
            </span>
          </Link>
        </div>

        <div className="hidden md:block">
          <h2 className="font-heading text-base text-brand-dark/70">
            {tenantName}
          </h2>
        </div>

        <div className="flex items-center gap-1">
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label={
              unreadCount > 0
                ? `Notifications (${unreadCount} unread)`
                : "Notifications"
            }
            className="text-brand-dark/70 hover:text-brand-dark relative"
          >
            <Link href="/notifications">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] rounded-full bg-brand-error text-white text-[10px] font-semibold flex items-center justify-center px-1 leading-none">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          </Button>

          <div className="md:hidden">
            <UserMenu
              name={userName}
              email={userEmail}
              role={role}
              locationName={locationName}
              compact
            />
          </div>
        </div>
      </div>
    </header>
  );
}
