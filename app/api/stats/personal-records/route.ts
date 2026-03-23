import { NextResponse } from "next/server";
import { db, exercisesTable, setLogsTable } from "@/lib/db";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const exercises = await db.select().from(exercisesTable);

  const records = await Promise.all(exercises.map(async (exercise) => {
    const logs = await db
      .select()
      .from(setLogsTable)
      .where(and(eq(setLogsTable.exerciseId, exercise.id), eq(setLogsTable.completed, true)));

    const maxWeight = logs.reduce((max, log) => {
      return log.weightUsed !== null ? Math.max(max, log.weightUsed) : max;
    }, 0) || null;

    const maxReps = logs.reduce((max, log) => {
      return log.repsCompleted !== null ? Math.max(max, log.repsCompleted) : max;
    }, 0) || null;

    const maxSets = logs.length > 0 ? Math.max(...Object.values(
      logs.reduce((acc, log) => {
        if (!acc[log.sessionId]) acc[log.sessionId] = 0;
        acc[log.sessionId]++;
        return acc;
      }, {} as Record<number, number>)
    )) : null;

    const achievedLog = logs.sort((a, b) => {
      const aVal = (a.weightUsed ?? 0) * (a.repsCompleted ?? 0);
      const bVal = (b.weightUsed ?? 0) * (b.repsCompleted ?? 0);
      return bVal - aVal;
    })[0];

    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      category: exercise.category,
      maxWeight: maxWeight ? Math.round(maxWeight * 10) / 10 : null,
      maxReps,
      maxSets,
      achievedAt: achievedLog?.loggedAt?.toISOString() ?? null,
    };
  }));

  return NextResponse.json(records.filter(r => r.maxWeight !== null || r.maxReps !== null));
}
