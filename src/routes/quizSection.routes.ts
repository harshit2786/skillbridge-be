import { Router } from "express";
import {
  createSection,
  getSections,
  getSectionById,
  updateSection,
  deleteSection,
  reorderSections,
} from "../controllers/quizSection.controller.js";
import { auth, trainerOnly } from "../middlewares/auth.js";
import { isQuizCreator } from "../middlewares/isQuizCreator.js";

const router = Router({ mergeParams: true });

// Any authenticated member can view
router.get("/", auth, trainerOnly, getSections);
router.get("/:sectionId", auth, trainerOnly, isQuizCreator, getSectionById);

// Quiz creators / admin only
router.post("/", auth, trainerOnly, isQuizCreator, createSection);
router.patch("/:sectionId", auth, trainerOnly, isQuizCreator, updateSection);
router.delete("/:sectionId", auth, trainerOnly, isQuizCreator, deleteSection);
router.put("/reorder", auth, trainerOnly, isQuizCreator, reorderSections);

export default router;
