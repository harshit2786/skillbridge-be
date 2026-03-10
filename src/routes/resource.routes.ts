import { Router } from "express";
import {
  uploadResource,
  getProjectResources,
  getResourceById,
  deleteResource,
} from "../controllers/resource.controller.js";
import { auth, trainerOnly } from "../middlewares/auth.js";
import { isAdmin } from "../middlewares/isAdmin.js";
import { upload } from "../lib/multer.js";

const router = Router({ mergeParams: true });

// Any member can view
router.get("/", auth, getProjectResources);
router.get("/:resourceId", auth, getResourceById);

// Only trainers in the project can upload
router.post("/", auth, trainerOnly, upload.single("file"), uploadResource);

// Only admin can delete
router.delete("/:resourceId", auth, trainerOnly, isAdmin, deleteResource);

export default router;