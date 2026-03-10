import { Router } from "express";
import { createChat, getChats, getChatMessages, deleteChat, sendMessage, } from "../controllers/playground.controller.js";
import { auth, traineeOnly } from "../middlewares/auth.js";
const router = Router({ mergeParams: true });
// All routes are trainee only
router.post("/chats", auth, traineeOnly, createChat);
router.get("/chats", auth, traineeOnly, getChats);
router.get("/chats/:chatId", auth, traineeOnly, getChatMessages);
router.delete("/chats/:chatId", auth, traineeOnly, deleteChat);
router.post("/chats/:chatId/messages", auth, traineeOnly, sendMessage);
export default router;
//# sourceMappingURL=playground.routes.js.map