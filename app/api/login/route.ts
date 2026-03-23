import { NextResponse } from "next/server";
import * as oidc from "openid-client";
import { getOidcConfig } from "@/lib/auth";
import { headers } from "next/headers";

const OIDC_COOKIE_TTL = 10 * 60;

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

export async function GET(request: Request) {
  if (!process.env.REPL_ID) {
    return NextResponse.json(
      { error: "Replit auth is not configured for this deployment." },
      { status: 501 }
    );
  }

  const config = await getOidcConfig();
  const url = new URL(request.url);
  const headersList = await headers();
  const proto = headersList.get("x-forwarded-proto") || "https";
  const host = headersList.get("x-forwarded-host") || headersList.get("host") || "localhost";
  const origin = `${proto}://${host}`;
  const callbackUrl = `${origin}/api/callback`;
  const returnTo = getSafeReturnTo(url.searchParams.get("returnTo"));

  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

  const redirectTo = oidc.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl,
    scope: "openid email profile offline_access",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "login consent",
    state,
    nonce,
  });

  const response = NextResponse.redirect(redirectTo.href);

  const cookieOpts = {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: OIDC_COOKIE_TTL,
  };

  response.cookies.set("code_verifier", codeVerifier, cookieOpts);
  response.cookies.set("nonce", nonce, cookieOpts);
  response.cookies.set("state", state, cookieOpts);
  response.cookies.set("return_to", returnTo, cookieOpts);

  return response;
}
