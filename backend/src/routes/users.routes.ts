import { Router } from "express";
import {
  checkEmailAvailability,
  createUser,
  deleteUserById,
  getAllUsers,
  getUserById,
  updateUserById,
} from "../controllers/users.controller.js";
import { validate } from "../middleware/validate.js";
import {
  createUserBodySchema,
  emailAvailabilityBodySchema,
  listUsersQuerySchema,
  updateUserBodySchema,
  userIdParamsSchema,
} from "../schemas/user.schemas.js";

const usersRouter = Router();

// Static paths are declared before "/:id" so they are never captured as an id.
// POST (not GET) keeps the email out of URLs, and therefore out of access logs.
usersRouter.post(
  "/email-availability",
  validate({ body: emailAvailabilityBodySchema }),
  checkEmailAvailability,
);

usersRouter.get("/", validate({ query: listUsersQuerySchema }), getAllUsers);
usersRouter.post("/", validate({ body: createUserBodySchema }), createUser);

usersRouter.get("/:id", validate({ params: userIdParamsSchema }), getUserById);
usersRouter.put(
  "/:id",
  validate({ params: userIdParamsSchema, body: updateUserBodySchema }),
  updateUserById,
);
usersRouter.delete("/:id", validate({ params: userIdParamsSchema }), deleteUserById);

export default usersRouter;
