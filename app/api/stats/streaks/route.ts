import { NextResponse } from "next/server";
import { db, workoutSessionsTable } from "@/lib/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const sessions = await db
    .select({ startedAt: workoutSessionsTable.startedAt })
    .from(workoutSessionsTable)
    .where(eq(workoutSessionsTable.status, "completed"))
    .orderBy(desc(workoutSessionsTable.startedAt));

  if (sessions.length === 0) {
    return NextResponse.json({ currentStreak: 0, longestStreak: 0, lastWorkoutDate: null });
  }

  const pad2 = (n: number) => String(n).padStart(2, "0");

  const workoutDates = [...new Set(sessions.map(s => {
    const d = new Date(s.startedAt);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }))].sort().reverse();

  let currentStreak = 0;
  let longestStreak = 1;
  let streak = 1;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${pad2(yesterday.getMonth() + 1)}-${pad2(yesterday.getDate())}`;

  if (workoutDates[0] === todayStr || workoutDates[0] === yesterdayStr) {
    currentStreak = 1;
    for (let i = 1; i < workoutDates.length; i++) {
      const prev = new Date(workoutDates[i - 1]);
      const curr = new Date(workoutDates[i]);
      const diff = Math.round((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 1) currentStreak++;
      else break;
    }
  }

  streak = 1;
  for (let i = 1; i < workoutDates.length; i++) {
    const prev = new Date(workoutDates[i - 1]);
    const curr = new Date(workoutDates[i]);
    const diff = Math.round((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      streak++;
      longestStreak = Math.max(longestStreak, streak);
    } else {
      streak = 1;
    }
  }

  return NextResponse.json({
    currentStreak,
    longestStreak,
    lastWorkoutDate: workoutDates[0] ?? null,
  });
}
