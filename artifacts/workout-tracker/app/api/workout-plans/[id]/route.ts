import { NextResponse, type NextRequest } from "next/server";
import { db, workoutPlansTable, exercisesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateWorkoutPlanBody } from "@workspace/api-zod";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  const [plan] = await db.select().from(workoutPlansTable).where(eq(workoutPlansTable.id, id));
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }
  const exercises = await db
    .select()
    .from(exercisesTable)
    .where(eq(exercisesTable.planId, id))
    .orderBy(exercisesTable.sortOrder);
  return NextResponse.json({ ...plan, exercises });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  const body = UpdateWorkoutPlanBody.parse(await request.json());
  const [updated] = await db
    .update(workoutPlansTable)
    .set(body)
    .where(eq(workoutPlansTable.id, id))
    .returning();
  if (!updated) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  await db.delete(workoutPlansTable).where(eq(workoutPlansTable.id, id));
  return new NextResponse(null, { status: 204 });
}
