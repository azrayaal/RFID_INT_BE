// src/routes/rfidRoutes.ts
import { Router } from "express";
import { createReceiving, deleteReceiving, editReceiving, getDetailReceiving, getReceiving } from "./controller";

const router = Router();

// Rute untuk mendapatkan semua rfid_tags
router.get("/", getReceiving);
router.post("/", createReceiving);
router.get("/:id", getDetailReceiving);
router.delete("/delete/:id", deleteReceiving);
router.put("/edit/:id", editReceiving);

export default router;
