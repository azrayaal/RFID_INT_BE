import express from "express";
import {
  getAllUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
} from "./controller";

const router = express.Router();

router.get("/users", getAllUsers);
router.post("/users", createUser);
router.get("/users/:id", getUserById);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

export default router;
