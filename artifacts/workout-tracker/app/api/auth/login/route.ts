import { NextResponse } from "next/server";
import crypto from "crypto";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  createSession,
  SESSION_COOKIE,
  SESSION_TTL,
  type SessionData,
} from "@/lib/auth";

function makeLookupHash(masterPassword: string, masterPin: string): string {
  return crypto
    .createHash("sha256")
    .update(`${masterPassword}::${masterPin}`)
    .digest("hex");
}

function scryptHash(value: string, salt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(value, salt, 64, (err, key) => {
      if (err) reject(err);
      else resolve(`${salt}:${key.toString("hex")}`);
    });
  });
}

async function verifyCredential(
  masterPassword: string,
  masterPin: string,
  storedHash: string,
): Promise<boolean> {
  const [salt] = storedHash.split(":");
  const hash = await scryptHash(`${masterPassword}::${masterPin}`, salt);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { masterPassword, masterPin } = body;

  if (
    !masterPassword ||
    !masterPin ||
    typeof masterPassword !== "string" ||
    typeof masterPin !== "string"
  ) {
    return NextResponse.json(
      { error: "Master password and PIN are required." },
      { status: 400 }
    );
  }

  const lookupHash = makeLookupHash(masterPassword, masterPin);

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.lookupHash, lookupHash));

  if (!user || !user.credentialHash) {
    return NextResponse.json(
      { error: "Invalid master password or PIN." },
      { status: 401 }
    );
  }

  const valid = await verifyCredential(
    masterPassword,
    masterPin,
    user.credentialHash,
  );
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid master password or PIN." },
      { status: 401 }
    );
  }

  const sessionData: SessionData = {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
    },
  };

  const sid = await createSession(sessionData);

  const response = NextResponse.json({ user: sessionData.user });
  response.cookies.set(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL / 1000),
  });
  return response;
}
