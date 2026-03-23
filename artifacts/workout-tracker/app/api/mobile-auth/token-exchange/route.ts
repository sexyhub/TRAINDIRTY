import { NextResponse } from "next/server";
import * as oidc from "openid-client";
import { db, usersTable } from "@workspace/db";
import {
  getOidcConfig,
  createSession,
  ISSUER_URL,
  type SessionData,
} from "@/lib/auth";

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

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { code, code_verifier, redirect_uri, state, nonce } = body;

  if (!code || !code_verifier || !redirect_uri || !state) {
    return NextResponse.json(
      { error: "Missing or invalid required parameters" },
      { status: 400 }
    );
  }

  try {
    const config = await getOidcConfig();

    const callbackUrl = new URL(redirect_uri);
    callbackUrl.searchParams.set("code", code);
    callbackUrl.searchParams.set("state", state);
    callbackUrl.searchParams.set("iss", ISSUER_URL);

    const tokens = await oidc.authorizationCodeGrant(config, callbackUrl, {
      pkceCodeVerifier: code_verifier,
      expectedNonce: nonce ?? undefined,
      expectedState: state,
      idTokenExpected: true,
    });

    const claims = tokens.claims();
    if (!claims) {
      return NextResponse.json({ error: "No claims in ID token" }, { status: 401 });
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
    return NextResponse.json({ token: sid });
  } catch (err) {
    console.error("Mobile token exchange error:", err);
    return NextResponse.json({ error: "Token exchange failed" }, { status: 500 });
  }
}
