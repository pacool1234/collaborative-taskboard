import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { Redis } from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";
import { env } from "../config/env.js";
import type { ClientToServerEvents, ServerToClientEvents } from "../types/socket.types.js";

export type IoServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function createSocketServer(httpServer: HttpServer): IoServer {
  const pubClient = new Redis({
    host: env.redis.host,
    port: env.redis.port,
  });
  const subClient = pubClient.duplicate();

  const io: IoServer = new Server(httpServer, {
    cors: { origin: "*" },
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

  return io;
}
