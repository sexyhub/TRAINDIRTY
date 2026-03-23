import { NextResponse } from "next/server";
import { db, workoutPlansTable } from "@/lib/db";
import { CreateWorkoutPlanBody } from "@/lib/api-zod";

export async function GET() {
  const plans = await db.select().from(workoutPlansTable).orderBy(workoutPlansTable.dayOfWeek);
  return NextResponse.json(plans);
}

export async function POST(request: Request) {
  const body = CreateWorkoutPlanBody.parse(await request.json());
  const [plan] = await db.insert(workoutPlansTable).values(body as any).returning();
  return NextResponse.json(plan, { status: 201 });
}
