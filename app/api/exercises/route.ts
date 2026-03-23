import { NextResponse, type NextRequest } from "next/server";
import { db, exercisesTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { CreateExerciseBody } from "@/lib/api-zod";

export async function GET(request: NextRequest) {
  const planId = request.nextUrl.searchParams.get("planId");
  let exercises;
  if (planId) {
    exercises = await db
      .select()
      .from(exercisesTable)
      .where(eq(exercisesTable.planId, Number(planId)))
      .orderBy(exercisesTable.sortOrder);
  } else {
    exercises = await db.select().from(exercisesTable).orderBy(exercisesTable.sortOrder);
  }
  return NextResponse.json(exercises);
}

export async function POST(request: Request) {
  const body = CreateExerciseBody.parse(await request.json());
  const [exercise] = await db.insert(exercisesTable).values(body as any).returning();
  return NextResponse.json(exercise, { status: 201 });
}
