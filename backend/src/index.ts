import { createServer } from "http";
import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { runMigrations } from "./db/migrate.js";
import { createSocketServer } from "./sockets/index.js";

async function startServer(): Promise<void> {
  try {
    await runMigrations();

    const server = createServer(createApp());
    createSocketServer(server);

    server.listen(env.port, () => {
      console.log(`Server running on port ${env.port}`);
    });
  } catch (err) {
    console.error("Failed to start server due to migration error:", err);
    process.exit(1);
  }
}

void startServer();
