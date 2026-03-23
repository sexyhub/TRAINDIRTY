import { NextResponse, type NextRequest } from "next/server";
import { db, setLogsTable } from "@/lib/db";
import { eq, and } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  const { exerciseId: exIdStr } = await params;
  const exerciseId = Number(exIdStr);

  const logs = await db
    .select({
      loggedAt: setLogsTable.loggedAt,
      reps: setLogsTable.repsCompleted,
      weight: setLogsTable.weightUsed,
      sessionId: setLogsTable.sessionId,
    })
    .from(setLogsTable)
    .where(and(eq(setLogsTable.exerciseId, exerciseId), eq(setLogsTable.completed, true)))
    .orderBy(setLogsTable.loggedAt);

  const pad2 = (n: number) => String(n).padStart(2, "0");
  const byDate: Record<string, { weights: number[]; reps: number[]; sets: number }> = {};
  for (const log of logs) {
    const d = new Date(log.loggedAt);
    const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    if (!byDate[key]) byDate[key] = { weights: [], reps: [], sets: 0 };
    if (log.weight !== null) byDate[key].weights.push(log.weight);
    if (log.reps !== null) byDate[key].reps.push(log.reps);
    byDate[key].sets++;
  }

  const progress = Object.entries(byDate).map(([date, data]) => ({
    date,
    avgWeight: data.weights.length > 0 ? Math.round((data.weights.reduce((a, b) => a + b, 0) / data.weights.length) * 10) / 10 : null,
    maxWeight: data.weights.length > 0 ? Math.max(...data.weights) : null,
    avgReps: data.reps.length > 0 ? Math.round((data.reps.reduce((a, b) => a + b, 0) / data.reps.length) * 10) / 10 : null,
    totalSets: data.sets,
  }));

  return NextResponse.json(progress);
}
