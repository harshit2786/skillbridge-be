import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { errorHandler } from "./middlewares/errorHandler.js";
import trainerAuthRoutes from "./routes/trainer.auth.routes.js";
import traineeAuthRoutes from "./routes/trainee.auth.routes.js";
import projectRoutes from "./routes/project.routes.js";
import quizRoutes from "./routes/quiz.routes.js";
import courseRoutes from "./routes/course.routes.js";
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
// Global middlewares
app.use(cors());
app.use(express.json());
// Health check
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});
// Routes
app.use("/api/trainer", trainerAuthRoutes);
app.use("/api/trainee", traineeAuthRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/projects/:projectId/quizzes", quizRoutes);
app.use("/api/projects/:projectId/courses", courseRoutes);
// Error handler
app.use(errorHandler);
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map