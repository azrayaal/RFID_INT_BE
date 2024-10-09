// src/routes/rfidRoutes.ts
import { Router } from "express";
import {  createLoading, deleteLoading, editLoading, getDetailLoading, getLoading } from "./controller";

const router = Router();

// Rute untuk mendapatkan semua rfid_tags
router.get("/", getLoading);
router.get("/:id", getDetailLoading);
router.post("/", createLoading);
router.delete("/delete/:id", deleteLoading);
router.put("/edit/:id", editLoading);

export default router;
