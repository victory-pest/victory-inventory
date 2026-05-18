import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email?: string | null;
      role: "super_admin" | "manager" | "supervisor" | "technician";
      companyId: string;
      locationId?: string | null;
      supervisedLocationIds: string[];
      licenseIds: string[];
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    name: string;
    email?: string | null;
    role: "super_admin" | "manager" | "supervisor" | "technician";
    companyId: string;
    locationId?: string | null;
    supervisedLocationIds: string[];
    licenseIds: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "super_admin" | "manager" | "supervisor" | "technician";
    companyId: string;
    locationId?: string | null;
    supervisedLocationIds: string[];
    licenseIds: string[];
  }
}
