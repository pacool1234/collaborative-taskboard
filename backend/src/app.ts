import express, { type Express } from "express";
import usersRouter from "./routes/users.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

export function createApp(): Express {
  const app = express();

  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/users", usersRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
