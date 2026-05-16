import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const hostname = req.headers.get("host") || "";
  const domain = hostname.replace("www.", "").split(":")[0];
  const res = NextResponse.next();
  res.headers.set("x-tenant-domain", domain);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
