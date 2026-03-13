import { Router } from "express";
import { createCourse, getCoursesByProject, getCourseById, addCreatorsToCourse, removeCreatorFromCourse, toggleCoursePublish, } from "../controllers/course.controller.js";
import { auth, trainerOnly } from "../middlewares/auth.js";
import { isAdmin } from "../middlewares/isAdmin.js";
const router = Router({ mergeParams: true });
// Any authenticated member
router.get("/", auth, trainerOnly, getCoursesByProject);
router.get("/:courseId", auth, trainerOnly, getCourseById);
// Admin only
router.post("/", auth, trainerOnly, isAdmin, createCourse);
router.post("/:courseId/creators", auth, trainerOnly, isAdmin, addCreatorsToCourse);
router.delete("/:courseId/creators/:trainerId", auth, trainerOnly, isAdmin, removeCreatorFromCourse);
router.patch("/:courseId/publish", auth, trainerOnly, isAdmin, toggleCoursePublish);
export default router;
//# sourceMappingURL=course.routes.js.map