import crypto from "crypto";
import { db, usersTable } from "@workspace/db";

const name = process.argv[2];
const masterPassword = process.argv[3];
const masterPin = process.argv[4];

if (!name || !masterPassword || !masterPin) {
  console.error('Usage: pnpm --filter @workspace/scripts run add-user "<name>" "<masterPassword>" "<masterPin>"');
  process.exit(1);
}

if (masterPassword.length < 6) {
  console.error("Master password must be at least 6 characters.");
  process.exit(1);
}

if (!/^\d{4}$/.test(masterPin)) {
  console.error("PIN must be exactly 4 digits.");
  process.exit(1);
}

const lookupHash = crypto
  .createHash("sha256")
  .update(`${masterPassword}::${masterPin}`)
  .digest("hex");

const salt = crypto.randomBytes(16).toString("hex");
const credentialHash: string = await new Promise((resolve, reject) => {
  crypto.scrypt(`${masterPassword}::${masterPin}`, salt, 64, (err, key) => {
    if (err) reject(err);
    else resolve(`${salt}:${key.toString("hex")}`);
  });
});

const [user] = await db
  .insert(usersTable)
  .values({
    lookupHash,
    credentialHash,
    firstName: name.trim(),
  })
  .onConflictDoUpdate({
    target: usersTable.lookupHash,
    set: {
      credentialHash,
      firstName: name.trim(),
      updatedAt: new Date(),
    },
  })
  .returning();

console.log(`User created/updated: ${user.firstName} (id: ${user.id})`);
process.exit(0);
