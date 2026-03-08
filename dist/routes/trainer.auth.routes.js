import { Router } from "express";
import { trainerLogin, getTrainerProfile } from "../controllers/trainer.auth.controller.js";
import { auth, trainerOnly } from "../middlewares/auth.js";
const router = Router();
router.post("/login", trainerLogin);
router.get("/me", auth, trainerOnly, getTrainerProfile);
export default router;
//# sourceMappingURL=trainer.auth.routes.js.map