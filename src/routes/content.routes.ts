import { Router } from "express";
import {
  getProjectContents,
  reorderContents,
} from "../controllers/content.controller.js";
import { auth, trainerOnly } from "../middlewares/auth.js";
import { isAdmin } from "../middlewares/isAdmin.js";

const router = Router({ mergeParams: true });

// Any authenticated member
router.get("/", auth, getProjectContents);

// Admin only
router.put("/reorder", auth, trainerOnly, isAdmin, reorderContents);

export default router;