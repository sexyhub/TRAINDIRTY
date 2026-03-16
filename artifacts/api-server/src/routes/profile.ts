import { Router } from "express";
import { db } from "@workspace/db";
import { userProfileTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateProfileBody } from "@workspace/api-zod";

const router = Router();

router.get("/", async (_req, res) => {
  let [profile] = await db.select().from(userProfileTable).limit(1);
  if (!profile) {
    [profile] = await db.insert(userProfileTable).values({ name: "Athlete" }).returning();
  }
  res.json(profile);
});

router.put("/", async (req, res) => {
  const body = UpdateProfileBody.parse(req.body);
  let [profile] = await db.select().from(userProfileTable).limit(1);
  if (!profile) {
    [profile] = await db.insert(userProfileTable).values({ ...body }).returning();
  } else {
    [profile] = await db.update(userProfileTable).set(body).where(eq(userProfileTable.id, profile.id)).returning();
  }
  res.json(profile);
});

export default router;
