import { Router } from "express";
import {
  createCourseQuestion,
  getCourseQuestions,
  getCourseQuestionById,
  updateCourseQuestion,
  deleteCourseQuestion,
  reorderCourseQuestions,
} from "../controllers/courseQuestion.controller.js";
import { auth, trainerOnly } from "../middlewares/auth.js";
import { isCourseCreator } from "../middlewares/isCourseCreator.js";

const router = Router({ mergeParams: true });

router.get("/", auth, trainerOnly, getCourseQuestions);
router.get("/:questionId", auth, trainerOnly, getCourseQuestionById);

router.post("/", auth, trainerOnly, isCourseCreator, createCourseQuestion);
router.patch("/:questionId", auth, trainerOnly, isCourseCreator, updateCourseQuestion);
router.delete("/:questionId", auth, trainerOnly, isCourseCreator, deleteCourseQuestion);
router.put("/reorder", auth, trainerOnly, isCourseCreator, reorderCourseQuestions);

export default router;