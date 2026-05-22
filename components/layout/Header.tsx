import Link from "next/link";
import Image from "next/image";
import { UserMenu } from "./UserMenu";
import { NotificationBell } from "./NotificationBell";
import type { Role } from "@/lib/nav";

type Props = {
  role: Role;
  userName: string;
  userEmail: string | null;
  locationName: string | null;
  tenantName: string;
  logoUrl: string | null;
  unreadCount: number;
};

export function Header({
  role,
  userName,
  userEmail,
  locationName,
  tenantName,
  logoUrl,
  unreadCount,
}: Props) {
  return (
    <header className="sticky top-0 z-20 h-16 border-b bg-white">
      <div className="flex h-full items-center justify-between gap-3 px-4 md:pl-6 md:pr-8">
        <div className="flex items-center gap-3 md:hidden">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src={logoUrl || "/logos/Victory_logo.png"}
              alt={tenantName}
              width={100}
              height={32}
              unoptimized
              className="h-8 w-auto max-w-[100px] object-contain"
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
          <NotificationBell initialUnreadCount={unreadCount} />

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
