import { Router } from "express";
import { createQuestion, getQuestions, getQuestionById, updateQuestion, deleteQuestion, reorderQuestions, } from "../controllers/question.controller.js";
import { auth, trainerOnly } from "../middlewares/auth.js";
import { isQuizCreator } from "../middlewares/isQuizCreator.js";
const router = Router({ mergeParams: true });
// Any authenticated member can view
router.get("/", auth, getQuestions);
router.get("/:questionId", auth, getQuestionById);
// Quiz creators / admin only
router.post("/", auth, trainerOnly, isQuizCreator, createQuestion);
router.patch("/:questionId", auth, trainerOnly, isQuizCreator, updateQuestion);
router.delete("/:questionId", auth, trainerOnly, isQuizCreator, deleteQuestion);
router.put("/reorder", auth, trainerOnly, isQuizCreator, reorderQuestions);
export default router;
//# sourceMappingURL=question.routes.js.map