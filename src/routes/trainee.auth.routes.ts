import { Router } from "express";
import {
  sendOtp,
  verifyOtpAndLogin,
  getTraineeProfile,
  updateTraineeProfile,
} from "../controllers/trainee.auth.controller.js";
import { auth, traineeOnly } from "../middlewares/auth.js";

const router = Router();

// Public
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtpAndLogin);

// Protected
router.get("/me", auth, traineeOnly, getTraineeProfile);
router.patch("/me", auth, traineeOnly, updateTraineeProfile);

export default router;