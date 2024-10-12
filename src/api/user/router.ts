import express from "express";
import {
  getAllUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
} from "./controller";

const router = express.Router();

router.get("/", getAllUsers);
router.post("/", createUser);
router.get("/detail/:id", getUserById);
router.put("/edit/:id", updateUser);
router.delete("/delete/:id", deleteUser);

export default router;
