import { verifyToken } from "../utils/generateToken.js";
export const auth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ message: "No token provided" });
            return;
        }
        const token = authHeader.split(" ")[1];
        if (!token) {
            res.status(401).json({ message: "Token not found" });
            return;
        }
        const decoded = verifyToken(token);
        req.userId = decoded.id;
        req.role = decoded.role;
        next();
    }
    catch (error) {
        res.status(401).json({ message: "Invalid or expired token" });
        return;
    }
};
// Only allows trainers
export const trainerOnly = (req, res, next) => {
    if (req.role !== "trainer") {
        res.status(403).json({ message: "Only trainers can access this" });
        return;
    }
    next();
};
// Only allows trainees
export const traineeOnly = (req, res, next) => {
    if (req.role !== "trainee") {
        res.status(403).json({ message: "Only trainees can access this" });
        return;
    }
    next();
};
//# sourceMappingURL=auth.js.map