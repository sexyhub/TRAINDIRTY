import { NextResponse } from "next/server";
import { db, workoutSessionsTable, setLogsTable } from "@workspace/db";
import { eq, and, gte, sql } from "drizzle-orm";

export async function GET() {
  const [totalResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(workoutSessionsTable)
    .where(eq(workoutSessionsTable.status, "completed"));

  const totalWorkouts = Number(totalResult?.count ?? 0);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const weeklyLogs = await db
    .select({ reps: setLogsTable.repsCompleted, weight: setLogsTable.weightUsed })
    .from(setLogsTable)
    .innerJoin(workoutSessionsTable, eq(setLogsTable.sessionId, workoutSessionsTable.id))
    .where(
      and(
        eq(setLogsTable.completed, true),
        gte(workoutSessionsTable.startedAt, weekAgo)
      )
    );

  const weeklyVolume = weeklyLogs.reduce((sum, log) => {
    return sum + (log.reps ?? 0) * (log.weight ?? 0);
  }, 0);

  const allLogs = await db
    .select({ reps: setLogsTable.repsCompleted, weight: setLogsTable.weightUsed })
    .from(setLogsTable)
    .where(eq(setLogsTable.completed, true));

  const totalVolume = allLogs.reduce((sum, log) => {
    return sum + (log.reps ?? 0) * (log.weight ?? 0);
  }, 0);

  const [setCountResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(setLogsTable)
    .where(eq(setLogsTable.completed, true));

  const totalSets = Number(setCountResult?.count ?? 0);

  const [firstSession] = await db
    .select({ startedAt: workoutSessionsTable.startedAt })
    .from(workoutSessionsTable)
    .where(eq(workoutSessionsTable.status, "completed"))
    .orderBy(workoutSessionsTable.startedAt)
    .limit(1);

  let avgWorkoutsPerWeek = 0;
  if (firstSession && totalWorkouts > 0) {
    const daysSince = Math.max(1, Math.ceil((Date.now() - firstSession.startedAt.getTime()) / (1000 * 60 * 60 * 24)));
    const weeksSince = daysSince / 7;
    avgWorkoutsPerWeek = Math.round((totalWorkouts / weeksSince) * 10) / 10;
  }

  return NextResponse.json({
    totalWorkouts,
    weeklyVolume: Math.round(weeklyVolume * 10) / 10,
    totalVolume: Math.round(totalVolume * 10) / 10,
    avgWorkoutsPerWeek,
    totalSets,
  });
}
