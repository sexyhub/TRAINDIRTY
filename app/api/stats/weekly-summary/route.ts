import { NextResponse } from "next/server";
import { db, workoutSessionsTable, setLogsTable, exercisesTable } from "@/lib/db";
import { eq, and, gte, lt, sql } from "drizzle-orm";

export async function GET() {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const sessions = await db
    .select()
    .from(workoutSessionsTable)
    .where(
      and(
        eq(workoutSessionsTable.status, "completed"),
        gte(workoutSessionsTable.startedAt, weekStart),
        lt(workoutSessionsTable.startedAt, weekEnd)
      )
    );

  const sessionIds = sessions.map(s => s.id);
  const allLogs = sessionIds.length > 0
    ? await db.select().from(setLogsTable).where(
        and(
          eq(setLogsTable.completed, true),
          sql`${setLogsTable.sessionId} = ANY(${sql.raw(`ARRAY[${sessionIds.join(",")}]::int[]`)})`
        )
      )
    : [];

  const totalVolume = allLogs.reduce((sum, log) => sum + (log.repsCompleted ?? 0) * (log.weightUsed ?? 0), 0);

  const exerciseIds = [...new Set(allLogs.map(l => l.exerciseId))];
  const exercises = exerciseIds.length > 0
    ? await db.select().from(exercisesTable).where(sql`${exercisesTable.id} = ANY(${sql.raw(`ARRAY[${exerciseIds.join(",")}]::int[]`)})`)
    : [];

  const exerciseMap = Object.fromEntries(exercises.map(e => [e.id, e]));
  const categoryMap: Record<string, { exerciseIds: Set<number>; sets: number; volume: number }> = {};

  for (const log of allLogs) {
    const exercise = exerciseMap[log.exerciseId];
    if (!exercise) continue;
    const cat = exercise.category;
    if (!categoryMap[cat]) categoryMap[cat] = { exerciseIds: new Set(), sets: 0, volume: 0 };
    categoryMap[cat].exerciseIds.add(log.exerciseId);
    categoryMap[cat].sets++;
    categoryMap[cat].volume += (log.repsCompleted ?? 0) * (log.weightUsed ?? 0);
  }

  const exerciseBreakdown = Object.entries(categoryMap).map(([category, data]) => ({
    category,
    exerciseCount: data.exerciseIds.size,
    totalSets: data.sets,
    totalVolume: Math.round(data.volume * 10) / 10,
  }));

  return NextResponse.json({
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    totalWorkouts: sessions.length,
    totalVolume: Math.round(totalVolume * 10) / 10,
    totalSets: allLogs.length,
    exerciseBreakdown,
  });
}
