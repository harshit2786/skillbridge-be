import { Router } from "express";
import { guestLogin } from "../controllers/guest.controller.js";

const router = Router();

// POST /api/guest/login — no auth required
router.post("/login", guestLogin);

export default router;
