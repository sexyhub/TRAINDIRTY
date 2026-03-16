import { Router } from "express";
import { db } from "@workspace/db";
import { exercisesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateExerciseBody,
  UpdateExerciseBody,
  UpdateExerciseParams,
  DeleteExerciseParams,
  GetExercisesQueryParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const query = GetExercisesQueryParams.parse({ planId: req.query.planId ? Number(req.query.planId) : undefined });
  let exercises;
  if (query.planId !== undefined) {
    exercises = await db
      .select()
      .from(exercisesTable)
      .where(eq(exercisesTable.planId, query.planId))
      .orderBy(exercisesTable.sortOrder);
  } else {
    exercises = await db.select().from(exercisesTable).orderBy(exercisesTable.sortOrder);
  }
  res.json(exercises);
});

router.post("/", async (req, res) => {
  const body = CreateExerciseBody.parse(req.body);
  const [exercise] = await db.insert(exercisesTable).values(body).returning();
  res.status(201).json(exercise);
});

router.put("/:id", async (req, res) => {
  const { id } = UpdateExerciseParams.parse({ id: Number(req.params.id) });
  const body = UpdateExerciseBody.parse(req.body);
  const [updated] = await db
    .update(exercisesTable)
    .set(body)
    .where(eq(exercisesTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Exercise not found" });
    return;
  }
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteExerciseParams.parse({ id: Number(req.params.id) });
  await db.delete(exercisesTable).where(eq(exercisesTable.id, id));
  res.status(204).send();
});

export default router;
