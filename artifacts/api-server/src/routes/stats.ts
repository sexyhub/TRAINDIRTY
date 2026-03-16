import { Router } from "express";
import { db } from "@workspace/db";
import { workoutSessionsTable, setLogsTable, exercisesTable } from "@workspace/db";
import { eq, and, desc, sql, gte, lt } from "drizzle-orm";
import { GetHeatmapQueryParams, GetExerciseProgressParams } from "@workspace/api-zod";

const router = Router();

// Stats overview
router.get("/overview", async (_req, res) => {
  const [totalResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(workoutSessionsTable)
    .where(eq(workoutSessionsTable.status, "completed"));

  const totalWorkouts = Number(totalResult?.count ?? 0);

  // Weekly volume (last 7 days)
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

  // Calculate avg workouts per week
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

  res.json({
    totalWorkouts,
    weeklyVolume: Math.round(weeklyVolume * 10) / 10,
    totalVolume: Math.round(totalVolume * 10) / 10,
    avgWorkoutsPerWeek,
    totalSets,
  });
});

// Streak data
router.get("/streaks", async (_req, res) => {
  const sessions = await db
    .select({ startedAt: workoutSessionsTable.startedAt })
    .from(workoutSessionsTable)
    .where(eq(workoutSessionsTable.status, "completed"))
    .orderBy(desc(workoutSessionsTable.startedAt));

  if (sessions.length === 0) {
    res.json({ currentStreak: 0, longestStreak: 0, lastWorkoutDate: null });
    return;
  }

  // Group sessions by date (day)
  const workoutDates = [...new Set(sessions.map(s => {
    const d = new Date(s.startedAt);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }))].sort().reverse();

  let currentStreak = 0;
  let longestStreak = 0;
  let streak = 1;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

  // Current streak: starts from today or yesterday
  if (workoutDates[0] === todayStr || workoutDates[0] === yesterdayStr) {
    currentStreak = 1;
    for (let i = 1; i < workoutDates.length; i++) {
      const prev = new Date(workoutDates[i - 1]);
      const curr = new Date(workoutDates[i]);
      const diff = Math.round((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Longest streak
  longestStreak = 1;
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

  res.json({
    currentStreak,
    longestStreak,
    lastWorkoutDate: workoutDates[0] ?? null,
  });
});

// Heatmap data
router.get("/heatmap", async (req, res) => {
  const query = GetHeatmapQueryParams.parse({ year: req.query.year ? Number(req.query.year) : undefined });
  const year = query.year ?? new Date().getFullYear();

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

  // Count per day
  const countByDate: Record<string, number> = {};
  for (const session of sessions) {
    const d = new Date(session.startedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    countByDate[key] = (countByDate[key] ?? 0) + 1;
  }

  const heatmapEntries = Object.entries(countByDate).map(([date, count]) => ({ date, count }));
  res.json(heatmapEntries);
});

// Personal records
router.get("/personal-records", async (_req, res) => {
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

  res.json(records.filter(r => r.maxWeight !== null || r.maxReps !== null));
});

// Exercise progress
router.get("/exercise-progress/:exerciseId", async (req, res) => {
  const { exerciseId } = GetExerciseProgressParams.parse({ exerciseId: Number(req.params.exerciseId) });

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

  // Group by date
  const byDate: Record<string, { weights: number[], reps: number[], sets: number }> = {};
  for (const log of logs) {
    const d = new Date(log.loggedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

  res.json(progress);
});

// Weekly summary
router.get("/weekly-summary", async (_req, res) => {
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

  // Category breakdown
  const exerciseIds = [...new Set(allLogs.map(l => l.exerciseId))];
  const exercises = exerciseIds.length > 0
    ? await db.select().from(exercisesTable).where(sql`${exercisesTable.id} = ANY(${sql.raw(`ARRAY[${exerciseIds.join(",")}]::int[]`)})`)
    : [];

  const exerciseMap = Object.fromEntries(exercises.map(e => [e.id, e]));
  const categoryMap: Record<string, { exerciseIds: Set<number>, sets: number, volume: number }> = {};

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

  res.json({
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    totalWorkouts: sessions.length,
    totalVolume: Math.round(totalVolume * 10) / 10,
    totalSets: allLogs.length,
    exerciseBreakdown,
  });
});

// Monthly summary
router.get("/monthly-summary", async (_req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const sessions = await db
    .select()
    .from(workoutSessionsTable)
    .where(
      and(
        eq(workoutSessionsTable.status, "completed"),
        gte(workoutSessionsTable.startedAt, monthStart),
        lt(workoutSessionsTable.startedAt, monthEnd)
      )
    )
    .orderBy(workoutSessionsTable.startedAt);

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

  const categoryMap: Record<string, { exerciseIds: Set<number>, sets: number, volume: number }> = {};
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

  // Weekly breakdown
  const weeklyMap: Record<string, { workouts: number, volume: number }> = {};
  for (const session of sessions) {
    const d = new Date(session.startedAt);
    const weekNum = Math.floor((d.getDate() - 1) / 7) + 1;
    const key = `Week ${weekNum}`;
    if (!weeklyMap[key]) weeklyMap[key] = { workouts: 0, volume: 0 };
    weeklyMap[key].workouts++;
    weeklyMap[key].volume += session.totalVolume ?? 0;
  }

  const weeklyBreakdown = Object.entries(weeklyMap).map(([week, data]) => ({
    week,
    workouts: data.workouts,
    volume: Math.round(data.volume * 10) / 10,
  }));

  res.json({
    month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    totalWorkouts: sessions.length,
    totalVolume: Math.round(totalVolume * 10) / 10,
    totalSets: allLogs.length,
    exerciseBreakdown,
    weeklyBreakdown,
  });
});

export default router;
