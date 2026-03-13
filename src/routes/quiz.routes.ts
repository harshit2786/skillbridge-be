import { Router } from "express";
import {
  createQuiz,
  getQuizzesByProject,
  getQuizById,
  addCreatorsToQuiz,
  removeCreatorFromQuiz,
  toggleQuizPublish,
} from "../controllers/quiz.controller.js";
import { auth, trainerOnly } from "../middlewares/auth.js";
import { isAdmin } from "../middlewares/isAdmin.js";

// mergeParams: true allows access to :projectId from parent router
const router = Router({ mergeParams: true });

// Any authenticated member
router.get("/", auth, trainerOnly, getQuizzesByProject);
router.get("/:quizId", auth, trainerOnly, getQuizById);

// Admin only
router.post("/", auth, trainerOnly, isAdmin, createQuiz);
router.post("/:quizId/creators", auth, trainerOnly, isAdmin, addCreatorsToQuiz);
router.delete("/:quizId/creators/:trainerId", auth, trainerOnly, isAdmin, removeCreatorFromQuiz);
router.patch("/:quizId/publish", auth, trainerOnly, isAdmin, toggleQuizPublish);

export default router;