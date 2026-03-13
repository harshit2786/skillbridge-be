import { Router } from "express";
import {
  createQuestion,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
} from "../controllers/quizQuestion.controller.js";
import { auth, trainerOnly } from "../middlewares/auth.js";
import { isQuizCreator } from "../middlewares/isQuizCreator.js";

const router = Router({ mergeParams: true });

// Any authenticated member can view
router.get("/", auth, trainerOnly, getQuestions);
router.get("/:questionId", auth, trainerOnly, getQuestionById);

// Quiz creators / admin only
router.post("/", auth, trainerOnly, isQuizCreator, createQuestion);
router.patch("/:questionId", auth, trainerOnly, isQuizCreator, updateQuestion);
router.delete("/:questionId", auth, trainerOnly, isQuizCreator, deleteQuestion);
router.put("/reorder", auth, trainerOnly, isQuizCreator, reorderQuestions);

export default router;