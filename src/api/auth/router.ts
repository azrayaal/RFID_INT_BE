import { Router } from "express";
import { detailLogin, login } from "./controller";
import { isLoginUser } from "../../middleware/auth";
const router = Router();

// Rute untuk mendapatkan semua rfid_tags
router.post("/login", login);
router.get("/detail", isLoginUser, detailLogin);

export default router;
