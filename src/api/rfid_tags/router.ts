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
router.get("/rfid-tags", getAllRfidTags);
router.get("/rfid-tags/inuse", getAllInuseRfidTags);
router.get("/rfid-tags/idle", getAllIdleRfidTags);
router.post("/rfid-tags", writeRfidTag);
router.post("/rfid-tags/read", readTag);
router.post("/rfid-tags/clear", clearRfidTag);

export default router;
