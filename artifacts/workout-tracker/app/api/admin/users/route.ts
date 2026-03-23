import { NextResponse } from "next/server";
import crypto from "crypto";
import { db, usersTable } from "@workspace/db";

const ADMIN_PASSWORD = "Malakar@22";

function adminAuth(request: Request): NextResponse | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 });
  }
  const password = authHeader.slice(7);
  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Invalid admin password" }, { status: 403 });
  }
  return null;
}

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

export async function GET(request: Request) {
  const authError = adminAuth(request);
  if (authError) return authError;

  const users = await db.select().from(usersTable);
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const authError = adminAuth(request);
  if (authError) return authError;

  const body = await request.json();
  const { name, masterPassword, masterPin } = body ?? {};

  if (!name || !masterPassword || !masterPin) {
    return NextResponse.json({ error: "Name, password, and PIN are required" }, { status: 400 });
  }

  if (!/^\d{4}$/.test(masterPin)) {
    return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });
  }

  const lookupHash = makeLookupHash(masterPassword, masterPin);
  const salt = crypto.randomBytes(16).toString("hex");
  const credentialHash = await scryptHash(`${masterPassword}::${masterPin}`, salt);

  try {
    const [user] = await db
      .insert(usersTable)
      .values({
        lookupHash,
        credentialHash,
        firstName: name.trim(),
      })
      .returning();

    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    if (error.message?.includes("duplicate key")) {
      return NextResponse.json({ error: "User with this password/PIN already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
