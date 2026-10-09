import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import Redis from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";
import { runMigrations } from './db/migrate.js';
import usersRouter from "../routes/users.routes.js";

const app = express();

app.use(express.json());

app.use('/users', usersRouter);

const server = createServer(app);

const pubClient = new Redis({ 
  host: process.env.REDIS_HOST || "redis", 
  port: Number(process.env.REDIS_PORT) || 6379 
});
const subClient = pubClient.duplicate();

const io = new Server(server, {
  cors: { origin: "*" }
});
io.adapter(createAdapter(pubClient, subClient));

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("join_board", (boardId) => {
    socket.join(boardId);
    console.log(`Socket ${socket.id} joined board: ${boardId}`);
  });

  socket.on("card_moved", ({ boardId, cardId, listId, position }) => {
    socket.to(boardId).emit("card_moved", { cardId, listId, position });
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await runMigrations();
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server due to migration error:", err);
    process.exit(1);
  }
}

startServer();