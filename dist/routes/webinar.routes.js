import { Router } from "express";
import { getWebinars, createWebinar, deleteWebinar, registerForWebinar, } from "../controllers/webinar.controller.js";
import { auth, trainerOnly, traineeOnly } from "../middlewares/auth.js";
import { isAdmin } from "../middlewares/isAdmin.js";
const router = Router({ mergeParams: true });
// Both trainers and trainees can list webinars
router.get("/", auth, getWebinars);
// Admin trainer only — create / delete
router.post("/", auth, trainerOnly, isAdmin, createWebinar);
router.delete("/:webinarId", auth, trainerOnly, isAdmin, deleteWebinar);
// Trainee only — register
router.post("/:webinarId/register", auth, traineeOnly, registerForWebinar);
export default router;
//# sourceMappingURL=webinar.routes.js.map