import { Router } from "express";
import {
  createProject,
  getMyProjects,
  getProjectById,
  addTrainersToProject,
  addTraineesToProject,
  removeTrainerFromProject,
  removeTraineeFromProject,
} from "../controllers/project.controller.js";
import { auth, trainerOnly } from "../middlewares/auth.js";
import { isAdmin } from "../middlewares/isAdmin.js";

const router = Router();

// Any authenticated user
router.get("/", auth, getMyProjects);
router.get("/:projectId", auth, getProjectById);

// Trainer only
router.post("/", auth, trainerOnly, createProject);

// Admin only
router.post("/:projectId/trainers", auth, trainerOnly, isAdmin, addTrainersToProject);
router.post("/:projectId/trainees", auth, trainerOnly, isAdmin, addTraineesToProject);
router.delete("/:projectId/trainers/:trainerId", auth, trainerOnly, isAdmin, removeTrainerFromProject);
router.delete("/:projectId/trainees/:traineeId", auth, trainerOnly, isAdmin, removeTraineeFromProject);

export default router;