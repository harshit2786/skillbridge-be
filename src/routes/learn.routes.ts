import { Router } from "express";
import {
  getProgress,
  startLearning,
  getContentDetails,
  getCourseProgress,
  getCourseSectionQuestions,
  submitCourseAnswer,
  getQuizProgress,
  getQuizSectionQuestions,
  submitQuizResponse,
  completeQuiz,
  getQuizResult,
  completeCourseSection,
} from "../controllers/learn.controller.js";
import { auth, traineeOnly } from "../middlewares/auth.js";

const router = Router({ mergeParams: true });

router.use(auth, traineeOnly);

// Progress & content
router.get("/progress", getProgress);
router.post("/start", startLearning);
router.get("/content/:contentId", getContentDetails);

// Course flow
router.get("/courses/:courseId", getCourseProgress);
router.get(
  "/courses/:courseId/sections/:sectionId/questions",
  getCourseSectionQuestions
);
router.post(
  "/courses/:courseId/sections/:sectionId/questions/:questionId/submit",
  submitCourseAnswer
);
router.post(
  "/courses/:courseId/sections/:sectionId/complete",
  completeCourseSection
);

// Quiz flow
router.get("/quizzes/:quizId", getQuizProgress);
router.get(
  "/quizzes/:quizId/sections/:sectionId/questions",
  getQuizSectionQuestions
);
router.post(
  "/quizzes/:quizId/sections/:sectionId/questions/:questionId/submit",
  submitQuizResponse
);
router.post("/quizzes/:quizId/complete", completeQuiz);
router.get("/quizzes/:quizId/result", getQuizResult);

export default router;