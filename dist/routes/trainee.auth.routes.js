import { Router } from "express";
import { sendOtp, verifyOtpAndLogin, getTraineeProfile, updateTraineeProfile, listAllTrainees, } from "../controllers/trainee.auth.controller.js";
import { auth, traineeOnly, trainerOnly } from "../middlewares/auth.js";
const router = Router();
// Public
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtpAndLogin);
// Protected
router.get("/me", auth, traineeOnly, getTraineeProfile);
router.patch("/me", auth, traineeOnly, updateTraineeProfile);
router.get("/list", auth, trainerOnly, listAllTrainees);
export default router;
//# sourceMappingURL=trainee.auth.routes.js.map