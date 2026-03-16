import { Router, type IRouter } from "express";
import healthRouter from "./health";
import workoutPlansRouter from "./workoutPlans";
import exercisesRouter from "./exercises";
import sessionsRouter from "./sessions";
import statsRouter from "./stats";
import profileRouter from "./profile";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/workout-plans", workoutPlansRouter);
router.use("/exercises", exercisesRouter);
router.use("/sessions", sessionsRouter);
router.use("/stats", statsRouter);
router.use("/profile", profileRouter);

export default router;
