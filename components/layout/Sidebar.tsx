"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getSidebarNav, type Role } from "@/lib/nav";
import { UserMenu } from "./UserMenu";

type Props = {
  role: Role;
  userName: string;
  userEmail: string | null;
  locationName: string | null;
  logoUrl: string | null;
  tenantName: string;
};

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar({ role, userName, userEmail, locationName, logoUrl, tenantName }: Props) {
  const pathname = usePathname();
  const items = getSidebarNav(role);

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:left-0 md:border-r md:bg-white md:z-30">
      <div className="flex h-16 items-center px-6 border-b">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image
            src={logoUrl || "/logos/Victory_logo.png"}
            alt={tenantName}
            width={140}
            height={48}
            unoptimized
            className="h-12 w-auto max-w-[140px] object-contain"
          />
          <span className="font-heading font-semibold text-brand-dark text-base leading-tight">
            Victory<br />Inventory
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-primary text-white"
                  : "text-brand-dark/80 hover:bg-brand-bg hover:text-brand-dark",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <UserMenu
          name={userName}
          email={userEmail}
          role={role}
          locationName={locationName}
        />
      </div>
    </aside>
  );
}
