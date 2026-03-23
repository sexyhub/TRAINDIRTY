import { NextResponse } from "next/server";
import * as oidc from "openid-client";
import {
  getOidcConfig,
  getSessionIdFromRequest,
  deleteSession,
  SESSION_COOKIE,
} from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(request: Request) {
  const headersList = await headers();
  const proto = headersList.get("x-forwarded-proto") || "https";
  const host = headersList.get("x-forwarded-host") || headersList.get("host") || "localhost";
  const origin = `${proto}://${host}`;

  const sid = getSessionIdFromRequest(request);
  if (sid) {
    await deleteSession(sid);
  }

  if (!process.env.REPL_ID) {
    const response = NextResponse.redirect(`${origin}/`);
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  const config = await getOidcConfig();
  const endSessionUrl = oidc.buildEndSessionUrl(config, {
    client_id: process.env.REPL_ID!,
    post_logout_redirect_uri: origin,
  });

  const response = NextResponse.redirect(endSessionUrl.href);
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
