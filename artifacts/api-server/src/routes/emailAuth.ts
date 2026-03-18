import crypto from "crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  createSession,
  clearSession,
  getSessionId,
  SESSION_COOKIE,
  SESSION_TTL,
  type SessionData,
} from "../lib/auth";

const router: IRouter = Router();

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

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

router.post("/auth/login", async (req: Request, res: Response) => {
  const { masterPassword, masterPin } = req.body ?? {};

  if (
    !masterPassword ||
    !masterPin ||
    typeof masterPassword !== "string" ||
    typeof masterPin !== "string"
  ) {
    res
      .status(400)
      .json({ error: "Master password and PIN are required." });
    return;
  }

  const lookupHash = makeLookupHash(masterPassword, masterPin);

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.lookupHash, lookupHash));

  if (!user || !user.credentialHash) {
    res.status(401).json({ error: "Invalid master password or PIN." });
    return;
  }

  const valid = await verifyCredential(
    masterPassword,
    masterPin,
    user.credentialHash,
  );
  if (!valid) {
    res.status(401).json({ error: "Invalid master password or PIN." });
    return;
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
  setSessionCookie(res, sid);
  res.json({ user: sessionData.user });
});

router.post("/auth/logout", async (req: Request, res: Response) => {
  await clearSession(res, getSessionId(req));
  res.json({ success: true });
});

export default router;
