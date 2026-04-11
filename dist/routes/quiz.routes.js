import { Router } from "express";
import { createQuiz, getQuizzesByProject, getQuizById, addCreatorsToQuiz, removeCreatorFromQuiz, toggleQuizPublish, getQuizAttempts, resetQuizAttempt, } from "../controllers/quiz.controller.js";
import { auth, trainerOnly } from "../middlewares/auth.js";
import { isAdmin } from "../middlewares/isAdmin.js";
const router = Router({ mergeParams: true });
// Any authenticated trainer
router.get("/", auth, trainerOnly, getQuizzesByProject);
router.get("/:quizId", auth, trainerOnly, getQuizById);
// Quiz attempts — any trainer can view
router.get("/:quizId/attempts", auth, trainerOnly, getQuizAttempts);
// Admin only
router.post("/", auth, trainerOnly, isAdmin, createQuiz);
router.post("/:quizId/creators", auth, trainerOnly, isAdmin, addCreatorsToQuiz);
router.delete("/:quizId/creators/:trainerId", auth, trainerOnly, isAdmin, removeCreatorFromQuiz);
router.patch("/:quizId/publish", auth, trainerOnly, isAdmin, toggleQuizPublish);
router.post("/:quizId/attempts/:attemptId/reset", auth, trainerOnly, isAdmin, resetQuizAttempt);
export default router;
//# sourceMappingURL=quiz.routes.js.map