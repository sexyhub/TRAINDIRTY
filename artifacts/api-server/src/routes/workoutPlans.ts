import { Router } from "express";
import { db } from "@workspace/db";
import { workoutPlansTable, exercisesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateWorkoutPlanBody,
  UpdateWorkoutPlanBody,
  GetWorkoutPlanParams,
  UpdateWorkoutPlanParams,
  DeleteWorkoutPlanParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (_req, res) => {
  const plans = await db.select().from(workoutPlansTable).orderBy(workoutPlansTable.dayOfWeek);
  res.json(plans);
});

router.post("/", async (req, res) => {
  const body = CreateWorkoutPlanBody.parse(req.body);
  const [plan] = await db.insert(workoutPlansTable).values(body).returning();
  res.status(201).json(plan);
});

router.get("/:id", async (req, res) => {
  const { id } = GetWorkoutPlanParams.parse({ id: Number(req.params.id) });
  const [plan] = await db.select().from(workoutPlansTable).where(eq(workoutPlansTable.id, id));
  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }
  const exercises = await db
    .select()
    .from(exercisesTable)
    .where(eq(exercisesTable.planId, id))
    .orderBy(exercisesTable.sortOrder);
  res.json({ ...plan, exercises });
});

router.put("/:id", async (req, res) => {
  const { id } = UpdateWorkoutPlanParams.parse({ id: Number(req.params.id) });
  const body = UpdateWorkoutPlanBody.parse(req.body);
  const [updated] = await db
    .update(workoutPlansTable)
    .set(body)
    .where(eq(workoutPlansTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteWorkoutPlanParams.parse({ id: Number(req.params.id) });
  await db.delete(workoutPlansTable).where(eq(workoutPlansTable.id, id));
  res.status(204).send();
});

export default router;
