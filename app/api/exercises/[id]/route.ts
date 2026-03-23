import { NextResponse, type NextRequest } from "next/server";
import { db, exercisesTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { UpdateExerciseBody } from "@/lib/api-zod";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  const body = UpdateExerciseBody.parse(await request.json());
  const [updated] = await db
    .update(exercisesTable)
    .set(body)
    .where(eq(exercisesTable.id, id))
    .returning();
  if (!updated) {
    return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  await db.delete(exercisesTable).where(eq(exercisesTable.id, id));
  return new NextResponse(null, { status: 204 });
}
