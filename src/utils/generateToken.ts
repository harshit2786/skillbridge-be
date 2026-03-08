import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

export const generateToken = (
  id: string,
  role: "trainer" | "trainee"
): string => {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: "7d" });
};

export const verifyToken = (token: string): { id: string; role: "trainer" | "trainee" } => {
  return jwt.verify(token, JWT_SECRET) as { id: string; role: "trainer" | "trainee" };
};