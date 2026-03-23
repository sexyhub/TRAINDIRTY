import { NextResponse, type NextRequest } from "next/server";
import { db, setLogsTable } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { UpdateSetLogBody } from "@/lib/api-zod";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; setId: string }> }
) {
  const { id: idStr, setId: setIdStr } = await params;
  const id = Number(idStr);
  const setId = Number(setIdStr);
  const body = UpdateSetLogBody.parse(await request.json());

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
    return NextResponse.json({ error: "Set log not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}
