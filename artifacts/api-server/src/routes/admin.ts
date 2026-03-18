import crypto from "crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const ADMIN_PASSWORD = "Malakar@22";

const router: IRouter = Router();

function adminAuth(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }
  const password = authHeader.slice(7);
  if (password !== ADMIN_PASSWORD) {
    res.status(403).json({ error: "Invalid admin password" });
    return;
  }
  next();
}

router.use(adminAuth);

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

router.get("/admin/users", async (req: Request, res: Response) => {
  const users = await db.select().from(usersTable);
  res.json(users);
});

router.post("/admin/users", async (req: Request, res: Response) => {
  const { name, masterPassword, masterPin } = req.body ?? {};

  if (!name || !masterPassword || !masterPin) {
    res.status(400).json({ error: "Name, password, and PIN are required" });
    return;
  }

  if (!/^\d{4}$/.test(masterPin)) {
    res.status(400).json({ error: "PIN must be exactly 4 digits" });
    return;
  }

  const lookupHash = makeLookupHash(masterPassword, masterPin);
  const salt = crypto.randomBytes(16).toString("hex");
  const credentialHash = await scryptHash(
    `${masterPassword}::${masterPin}`,
    salt,
  );

  try {
    const [user] = await db
      .insert(usersTable)
      .values({
        lookupHash,
        credentialHash,
        firstName: name.trim(),
      })
      .returning();

    res.status(201).json(user);
  } catch (error: any) {
    if (error.message?.includes("duplicate key")) {
      res.status(409).json({ error: "User with this password/PIN already exists" });
    } else {
      res.status(500).json({ error: "Failed to create user" });
    }
  }
});

router.put("/admin/users/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, masterPassword, masterPin } = req.body ?? {};

  if (!name && !masterPassword && !masterPin) {
    res.status(400).json({ error: "At least one field is required to update" });
    return;
  }

  const updateData: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (name) updateData.firstName = name.trim();

  if (masterPassword && masterPin) {
    if (!/^\d{4}$/.test(masterPin)) {
      res.status(400).json({ error: "PIN must be exactly 4 digits" });
      return;
    }
    const lookupHash = makeLookupHash(masterPassword, masterPin);
    const salt = crypto.randomBytes(16).toString("hex");
    const credentialHash = await scryptHash(
      `${masterPassword}::${masterPin}`,
      salt,
    );
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
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(user);
  } catch (error: any) {
    if (error.message?.includes("duplicate key")) {
      res.status(409).json({ error: "User with this password/PIN already exists" });
    } else {
      res.status(500).json({ error: "Failed to update user" });
    }
  }
});

router.delete("/admin/users/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  const [user] = await db
    .delete(usersTable)
    .where(eq(usersTable.id, id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ success: true, deletedUser: user });
});

export default router;
