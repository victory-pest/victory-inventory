import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        identifier: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials.password) return null;

        const { identifier, password } = credentials;
        const user = identifier.includes("@")
          ? await prisma.user.findFirst({
              where: { email: identifier, active: true },
              include: { licenses: true },
            })
          : await prisma.user.findFirst({
              where: { username: identifier, active: true },
              include: { licenses: true },
            });

        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email ?? null,
          role: user.role,
          companyId: user.companyId,
          locationId: user.locationId ?? null,
          licenseIds: user.licenses.map((l) => l.licenseTypeId),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.companyId = user.companyId;
        token.locationId = user.locationId;
        token.licenseIds = user.licenseIds;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as
          | "super_admin"
          | "manager"
          | "supervisor"
          | "technician";
        session.user.companyId = token.companyId as string;
        session.user.locationId = (token.locationId as string | null) ?? null;
        session.user.licenseIds = (token.licenseIds as string[]) ?? [];
      }
      return session;
    },
  },
};
