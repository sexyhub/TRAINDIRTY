import { NextResponse } from "next/server";
import { db, userProfileTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateProfileBody } from "@workspace/api-zod";

export async function GET() {
  let [profile] = await db.select().from(userProfileTable).limit(1);
  if (!profile) {
    [profile] = await db.insert(userProfileTable).values({ name: "Athlete" }).returning();
  }
  return NextResponse.json(profile);
}

export async function PUT(request: Request) {
  const body = UpdateProfileBody.parse(await request.json());
  let [profile] = await db.select().from(userProfileTable).limit(1);
  if (!profile) {
    [profile] = await db.insert(userProfileTable).values({ ...body }).returning();
  } else {
    [profile] = await db.update(userProfileTable).set(body).where(eq(userProfileTable.id, profile.id)).returning();
  }
  return NextResponse.json(profile);
}
