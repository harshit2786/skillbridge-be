import { Router } from "express";
import {
  createCourseSection,
  getCourseSections,
  getCourseSectionById,
  updateCourseSection,
  deleteCourseSection,
  reorderCourseSections,
} from "../controllers/courseSection.controller.js";
import { auth, trainerOnly } from "../middlewares/auth.js";
import { isCourseCreator } from "../middlewares/isCourseCreator.js";

const router = Router({ mergeParams: true });

router.get("/", auth, trainerOnly, getCourseSections);
router.get("/:sectionId", auth, trainerOnly, getCourseSectionById);

router.post("/", auth, trainerOnly, isCourseCreator, createCourseSection);
router.patch("/:sectionId", auth, trainerOnly, isCourseCreator, updateCourseSection);
router.delete("/:sectionId", auth, trainerOnly, isCourseCreator, deleteCourseSection);
router.put("/reorder", auth, trainerOnly, isCourseCreator, reorderCourseSections);

export default router;