import { NextResponse } from "next/server";
import * as oidc from "openid-client";
import { db, usersTable } from "@/lib/db";
import {
  getOidcConfig,
  createSession,
  SESSION_COOKIE,
  SESSION_TTL,
  type SessionData,
} from "@/lib/auth";
import { headers, cookies } from "next/headers";

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

async function upsertUser(claims: Record<string, unknown>) {
  const userData = {
    id: claims.sub as string,
    email: (claims.email as string) || null,
    firstName: (claims.first_name as string) || null,
    lastName: (claims.last_name as string) || null,
    profileImageUrl: (claims.profile_image_url || claims.picture) as string | null,
  };

  const [user] = await db
    .insert(usersTable)
    .values(userData)
    .onConflictDoUpdate({
      target: usersTable.id,
      set: { ...userData, updatedAt: new Date() },
    })
    .returning();
  return user;
}

export async function GET(request: Request) {
  if (!process.env.REPL_ID) {
    return NextResponse.json(
      { error: "Replit auth is not configured for this deployment." },
      { status: 501 }
    );
  }

  const config = await getOidcConfig();
  const headersList = await headers();
  const proto = headersList.get("x-forwarded-proto") || "https";
  const host = headersList.get("x-forwarded-host") || headersList.get("host") || "localhost";
  const origin = `${proto}://${host}`;
  const callbackUrl = `${origin}/api/callback`;

  const cookieStore = await cookies();
  const codeVerifier = cookieStore.get("code_verifier")?.value;
  const nonce = cookieStore.get("nonce")?.value;
  const expectedState = cookieStore.get("state")?.value;

  if (!codeVerifier || !expectedState) {
    return NextResponse.redirect(`${origin}/api/login`);
  }

  const url = new URL(request.url);
  const currentUrl = new URL(`${callbackUrl}?${url.searchParams}`);

  let tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
  try {
    tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce,
      expectedState,
      idTokenExpected: true,
    });
  } catch {
    return NextResponse.redirect(`${origin}/api/login`);
  }

  const returnTo = getSafeReturnTo(cookieStore.get("return_to")?.value);

  const claims = tokens.claims();
  if (!claims) {
    return NextResponse.redirect(`${origin}/api/login`);
  }

  const dbUser = await upsertUser(claims as unknown as Record<string, unknown>);

  const now = Math.floor(Date.now() / 1000);
  const sessionData: SessionData = {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      profileImageUrl: dbUser.profileImageUrl,
    },
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
  };

  const sid = await createSession(sessionData);

  const response = NextResponse.redirect(`${origin}${returnTo}`);
  response.cookies.set(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL / 1000),
  });
  response.cookies.delete("code_verifier");
  response.cookies.delete("nonce");
  response.cookies.delete("state");
  response.cookies.delete("return_to");

  return response;
}
