import { Router } from "express";
import { db } from "@workspace/db";
import { workoutSessionsTable, setLogsTable, exercisesTable, workoutPlansTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  CreateSessionBody,
  UpdateSessionBody,
  UpdateSessionParams,
  GetSessionParams,
  LogSetBody,
  LogSetParams,
  UpdateSetLogBody,
  UpdateSetLogParams,
  GetSessionsQueryParams,
} from "@workspace/api-zod";

const router = Router();

// Get all sessions (with pagination)
router.get("/", async (req, res) => {
  const query = GetSessionsQueryParams.parse({
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    offset: req.query.offset ? Number(req.query.offset) : undefined,
  });
  const limit = query.limit ?? 20;
  const offset = query.offset ?? 0;
  const sessions = await db
    .select()
    .from(workoutSessionsTable)
    .orderBy(desc(workoutSessionsTable.startedAt))
    .limit(limit)
    .offset(offset);
  res.json(sessions);
});

// Get active session
router.get("/active", async (_req, res) => {
  const [session] = await db
    .select()
    .from(workoutSessionsTable)
    .where(eq(workoutSessionsTable.status, "active"))
    .orderBy(desc(workoutSessionsTable.startedAt))
    .limit(1);

  if (!session) {
    res.json({ session: null });
    return;
  }

  const setLogs = await db
    .select()
    .from(setLogsTable)
    .where(eq(setLogsTable.sessionId, session.id))
    .orderBy(setLogsTable.loggedAt);

  res.json({ session: { ...session, setLogs } });
});

// Create / Start a new session
router.post("/", async (req, res) => {
  const body = CreateSessionBody.parse(req.body);

  // Check if there's already an active session
  const [activeSession] = await db
    .select()
    .from(workoutSessionsTable)
    .where(eq(workoutSessionsTable.status, "active"))
    .limit(1);

  if (activeSession) {
    res.status(409).json({ error: "A workout session is already active. Complete it before starting another." });
    return;
  }

  // Check if this plan was already completed today
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
    res.status(409).json({ error: "You already completed this workout plan today. Rest up!" });
    return;
  }

  // Get plan name from plans table
  const [planRecord] = await db
    .select({ name: workoutPlansTable.name })
    .from(workoutPlansTable)
    .where(eq(workoutPlansTable.id, body.planId));

  const planName = planRecord?.name ?? "Workout";

  const [session] = await db
    .insert(workoutSessionsTable)
    .values({
      planId: body.planId,
      planName,
      status: "active",
    })
    .returning();

  res.status(201).json(session);
});

// Get session detail
router.get("/:id", async (req, res) => {
  const { id } = GetSessionParams.parse({ id: Number(req.params.id) });
  const [session] = await db
    .select()
    .from(workoutSessionsTable)
    .where(eq(workoutSessionsTable.id, id));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const setLogs = await db
    .select()
    .from(setLogsTable)
    .where(eq(setLogsTable.sessionId, id))
    .orderBy(setLogsTable.loggedAt);

  res.json({ ...session, setLogs });
});

// Update session (complete/abort)
router.put("/:id", async (req, res) => {
  const { id } = UpdateSessionParams.parse({ id: Number(req.params.id) });
  const body = UpdateSessionBody.parse(req.body);

  let totalVolume: number | null = null;

  if (body.status === "completed") {
    const logs = await db
      .select()
      .from(setLogsTable)
      .where(and(eq(setLogsTable.sessionId, id), eq(setLogsTable.completed, true)));

    totalVolume = logs.reduce((sum, log) => {
      return sum + (log.repsCompleted ?? 0) * (log.weightUsed ?? 0);
    }, 0);
  }

  const isFinished = body.status === "completed" || body.status === "aborted";

  const [updated] = await db
    .update(workoutSessionsTable)
    .set({
      status: body.status,
      notes: body.notes ?? null,
      ...(isFinished ? { completedAt: new Date() } : {}),
      ...(body.status === "completed" ? { totalVolume } : {}),
    })
    .where(eq(workoutSessionsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(updated);
});

// Log a set
router.post("/:id/sets", async (req, res) => {
  const { id } = LogSetParams.parse({ id: Number(req.params.id) });
  const body = LogSetBody.parse(req.body);

  // Get exercise name
  const [exercise] = await db
    .select({ name: exercisesTable.name })
    .from(exercisesTable)
    .where(eq(exercisesTable.id, body.exerciseId));

  const [setLog] = await db
    .insert(setLogsTable)
    .values({
      sessionId: id,
      exerciseId: body.exerciseId,
      exerciseName: exercise?.name ?? "Exercise",
      setNumber: body.setNumber,
      repsCompleted: body.repsCompleted ?? null,
      weightUsed: body.weightUsed ?? null,
      completed: body.completed,
    })
    .returning();

  res.status(201).json(setLog);
});

// Update a set log
router.put("/:id/sets/:setId", async (req, res) => {
  const { id, setId } = UpdateSetLogParams.parse({
    id: Number(req.params.id),
    setId: Number(req.params.setId),
  });
  const body = UpdateSetLogBody.parse(req.body);

  const [updated] = await db
    .update(setLogsTable)
    .set({
      repsCompleted: body.repsCompleted ?? null,
      weightUsed: body.weightUsed ?? null,
      completed: body.completed,
    })
    .where(and(eq(setLogsTable.id, setId), eq(setLogsTable.sessionId, id)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Set log not found" });
    return;
  }
  res.json(updated);
});

export default router;
