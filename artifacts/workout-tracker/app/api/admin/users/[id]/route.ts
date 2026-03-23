import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = adminAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json();
  const { name, masterPassword, masterPin } = body ?? {};

  if (!name && !masterPassword && !masterPin) {
    return NextResponse.json({ error: "At least one field is required to update" }, { status: 400 });
  }

  const updateData: Record<string, any> = { updatedAt: new Date() };
  if (name) updateData.firstName = name.trim();

  if (masterPassword && masterPin) {
    if (!/^\d{4}$/.test(masterPin)) {
      return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });
    }
    const lookupHash = makeLookupHash(masterPassword, masterPin);
    const salt = crypto.randomBytes(16).toString("hex");
    const credentialHash = await scryptHash(`${masterPassword}::${masterPin}`, salt);
    updateData.lookupHash = lookupHash;
    updateData.credentialHash = credentialHash;
  }

  try {
    const [user] = await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, id))
      .returning();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error: any) {
    if (error.message?.includes("duplicate key")) {
      return NextResponse.json({ error: "User with this password/PIN already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = adminAuth(request);
  if (authError) return authError;

  const { id } = await params;

  const [user] = await db
    .delete(usersTable)
    .where(eq(usersTable.id, id))
    .returning();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, deletedUser: user });
}
