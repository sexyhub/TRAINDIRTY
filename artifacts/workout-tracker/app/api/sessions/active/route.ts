import { NextResponse } from "next/server";
import { db, workoutSessionsTable, setLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const [session] = await db
    .select()
    .from(workoutSessionsTable)
    .where(eq(workoutSessionsTable.status, "active"))
    .orderBy(desc(workoutSessionsTable.startedAt))
    .limit(1);

  if (!session) {
    return NextResponse.json({ session: null });
  }

  const setLogs = await db
    .select()
    .from(setLogsTable)
    .where(eq(setLogsTable.sessionId, session.id))
    .orderBy(setLogsTable.loggedAt);

  return NextResponse.json({ session: { ...session, setLogs } });
}
