import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Write GCS key from env if provided (for cloud deployments)                                                                                                                                                
if (process.env.GCS_KEY_BASE64) {                                                                                                                                                                            
  const fs = await import("fs");                                                                                                                                                                             
  fs.writeFileSync("./gcs-key.json", Buffer.from(process.env.GCS_KEY_BASE64, "base64"));                                                                                                                     
}
import { errorHandler } from "./middlewares/errorHandler.js";
import trainerAuthRoutes from "./routes/trainer.auth.routes.js";
import traineeAuthRoutes from "./routes/trainee.auth.routes.js";
import projectRoutes from "./routes/project.routes.js";
import quizRoutes from "./routes/quiz.routes.js";
import courseRoutes from "./routes/course.routes.js";
import contentRoutes from "./routes/content.routes.js";
import resourceRoutes from "./routes/resource.routes.js";
import playgroundRoutes from "./routes/playground.routes.js";
import sectionRoutes from "./routes/quizSection.routes.js";
import questionRoutes from "./routes/quizQuestion.routes.js";
import courseSectionRoutes from "./routes/courseSection.routes.js";
import courseQuestionRoutes from "./routes/courseQuestion.routes.js";
import learnRoutes from "./routes/learn.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import webinarRoutes from "./routes/webinar.routes.js";
import guestRoutes from "./routes/guest.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Routes
app.use("/api/trainer", trainerAuthRoutes);
app.use("/api/trainee", traineeAuthRoutes);
app.use("/api/guest", guestRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/projects/:projectId/quizzes", quizRoutes);
app.use("/api/projects/:projectId/courses", courseRoutes);
app.use("/api/projects/:projectId/contents", contentRoutes);
app.use("/api/projects/:projectId/resources", resourceRoutes);
app.use("/api/projects/:projectId/playground", playgroundRoutes);
app.use("/api/projects/:projectId/quizzes/:quizId/sections", sectionRoutes);
app.use(
  "/api/projects/:projectId/quizzes/:quizId/sections/:sectionId/questions",
  questionRoutes,
);
app.use(
  "/api/projects/:projectId/courses/:courseId/sections",
  courseSectionRoutes,
);
app.use(
  "/api/projects/:projectId/courses/:courseId/sections/:sectionId/questions",
  courseQuestionRoutes,
);
app.use("/api/projects/:projectId/learn", learnRoutes);
app.use("/api/projects/:projectId/ai", aiRoutes);
app.use("/api/projects/:projectId/webinars", webinarRoutes);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
