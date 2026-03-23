import { NextResponse, type NextRequest } from "next/server";
import { db, workoutSessionsTable } from "@/lib/db";
import { eq, and, gte, lt } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const year = Number(request.nextUrl.searchParams.get("year") ?? new Date().getFullYear());

  const start = new Date(`${year}-01-01T00:00:00.000Z`);
  const end = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const sessions = await db
    .select({ startedAt: workoutSessionsTable.startedAt })
    .from(workoutSessionsTable)
    .where(
      and(
        eq(workoutSessionsTable.status, "completed"),
        gte(workoutSessionsTable.startedAt, start),
        lt(workoutSessionsTable.startedAt, end)
      )
    );

  const pad2 = (n: number) => String(n).padStart(2, "0");
  const countByDate: Record<string, number> = {};
  for (const session of sessions) {
    const d = new Date(session.startedAt);
    const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    countByDate[key] = (countByDate[key] ?? 0) + 1;
  }

  const heatmapEntries = Object.entries(countByDate).map(([date, count]) => ({ date, count }));
  return NextResponse.json(heatmapEntries);
}
