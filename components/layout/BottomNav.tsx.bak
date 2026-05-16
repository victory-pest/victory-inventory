"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getBottomNav, type Role } from "@/lib/nav";

type Props = {
  role: Role;
};

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

export function BottomNav({ role }: Props) {
  const pathname = usePathname();
  const items = getBottomNav(role);

  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                  active
                    ? "text-brand-primary"
                    : "text-brand-dark/60 hover:text-brand-dark",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
                <span className="leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
