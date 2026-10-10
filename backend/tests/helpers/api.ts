import request from "supertest";
import { createApp } from "../../src/app.js";

/**
 * HTTP client bound to an in-memory instance of the app (no port, no
 * Socket.IO, no Redis). Usage: `await api.post("/users").send(body)`.
 */
export const api = request(createApp());
