import { Router } from "express";
import {
  createUser,
  deleteUserById,
  getAllUsers,
  getUserById,
  updateUserById,
} from "../controllers/users.controller.js";
import { validateUser } from "../middleware/validateUser.js";

const usersRouter = Router();

usersRouter.get("/", getAllUsers);
usersRouter.get("/:id", getUserById);
usersRouter.post("/", validateUser(), createUser);
usersRouter.put("/:id", validateUser(true), updateUserById);
usersRouter.delete("/:id", deleteUserById);

export default usersRouter;
