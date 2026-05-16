"use client";

import { signOut } from "next-auth/react";
import { LogOut, User as UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Role } from "@/lib/nav";

const roleLabels: Record<Role, string> = {
  super_admin: "Super Admin",
  manager: "Manager",
  supervisor: "Supervisor",
  technician: "Technician",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

type Props = {
  name: string;
  email: string | null;
  role: Role;
  locationName: string | null;
  compact?: boolean;
};

export function UserMenu({ name, email, role, locationName, compact }: Props) {
  const initials = getInitials(name);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="User menu"
          className={
            compact
              ? "flex items-center"
              : "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-brand-bg transition-colors"
          }
        >
          <Avatar className="h-9 w-9 border">
            <AvatarFallback className="bg-brand-primary text-white text-xs font-semibold">
              {initials || <UserIcon className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          {!compact && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-brand-dark leading-tight">
                {name}
              </p>
              <p className="truncate text-xs text-brand-dark/60 leading-tight">
                {roleLabels[role]}
                {locationName ? ` · ${locationName}` : ""}
              </p>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-brand-dark">{name}</p>
            <p className="text-xs text-brand-dark/60">{email ?? roleLabels[role]}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => signOut({ callbackUrl: "/login" })}
          className="text-brand-error focus:text-brand-error"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
