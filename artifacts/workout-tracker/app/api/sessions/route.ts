import { NextResponse, type NextRequest } from "next/server";
import { db, workoutSessionsTable, workoutPlansTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { CreateSessionBody } from "@workspace/api-zod";

export async function GET(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 20);
  const offset = Number(request.nextUrl.searchParams.get("offset") ?? 0);

  const sessions = await db
    .select()
    .from(workoutSessionsTable)
    .orderBy(desc(workoutSessionsTable.startedAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json(sessions);
}

export async function POST(request: Request) {
  const body = CreateSessionBody.parse(await request.json());

  const [activeSession] = await db
    .select()
    .from(workoutSessionsTable)
    .where(eq(workoutSessionsTable.status, "active"))
    .limit(1);

  if (activeSession) {
    return NextResponse.json(
      { error: "A workout session is already active. Complete it before starting another." },
      { status: 409 }
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [todaySession] = await db
    .select()
    .from(workoutSessionsTable)
    .where(
      and(
        eq(workoutSessionsTable.planId, body.planId),
        eq(workoutSessionsTable.status, "completed"),
        sql`${workoutSessionsTable.startedAt} >= ${today.toISOString()}`,
        sql`${workoutSessionsTable.startedAt} < ${tomorrow.toISOString()}`
      )
    )
    .limit(1);

  if (todaySession) {
    return NextResponse.json(
      { error: "You already completed this workout plan today. Rest up!" },
      { status: 409 }
    );
  }

  const [planRecord] = await db
    .select({ name: workoutPlansTable.name })
    .from(workoutPlansTable)
    .where(eq(workoutPlansTable.id, body.planId));

  const planName = planRecord?.name ?? "Workout";

  const [session] = await db
    .insert(workoutSessionsTable)
    .values({ planId: body.planId, planName, status: "active" })
    .returning();

  return NextResponse.json(session, { status: 201 });
}
