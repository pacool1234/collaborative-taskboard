import { Router } from "express";
import { getAllUsers, createUser } from "../controllers/userController.js";

const usersRouter = Router();

usersRouter.get("/", getAllUsers);
usersRouter.post("/", createUser);

export default usersRouter;
