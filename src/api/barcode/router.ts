// src/routes/rfidRoutes.ts
import { Router } from "express";
import {
  getAllInuseRfidTags,
  getAllIdleRfidTags,
  getAllRfidTags,
  writeRfidTag,
  readTag,
  clearRfidTag,
} from "./controller";

const router = Router();

// Rute untuk mendapatkan semua rfid_tags
router.get("/", getAllRfidTags);
router.get("/inuse", getAllInuseRfidTags);
router.get("/idle", getAllIdleRfidTags);
router.post("/", writeRfidTag);
router.post("/read", readTag);
router.post("/clear", clearRfidTag);

export default router;
