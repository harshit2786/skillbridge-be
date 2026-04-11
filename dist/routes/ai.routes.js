import { Router } from "express";
import { generateRubric } from "../controllers/ai.controller.js";
import { auth, trainerOnly } from "../middlewares/auth.js";
const router = Router({ mergeParams: true });
// POST /api/projects/:projectId/ai/rubric
router.post("/rubric", auth, trainerOnly, generateRubric);
export default router;
//# sourceMappingURL=ai.routes.js.map