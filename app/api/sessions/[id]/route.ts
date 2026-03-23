import { NextResponse, type NextRequest } from "next/server";
import { db, workoutSessionsTable, setLogsTable, exercisesTable } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { UpdateSessionBody, LogSetBody } from "@/lib/api-zod";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = Number(idStr);

  const [session] = await db
    .select()
    .from(workoutSessionsTable)
    .where(eq(workoutSessionsTable.id, id));

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const setLogs = await db
    .select()
    .from(setLogsTable)
    .where(eq(setLogsTable.sessionId, id))
    .orderBy(setLogsTable.loggedAt);

  return NextResponse.json({ ...session, setLogs });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  const body = UpdateSessionBody.parse(await request.json());

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
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  const body = LogSetBody.parse(await request.json());

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

  return NextResponse.json(setLog, { status: 201 });
}
