import "dotenv/config";

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && value !== undefined && value !== "" ? parsed : fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: toNumber(process.env.PORT, 3000),
  db: {
    host: process.env.DB_HOST ?? "postgres",
    port: toNumber(process.env.DB_PORT, 5432),
    user: process.env.DB_USER ?? "postgres",
    password: process.env.DB_PASSWORD ?? "postgrespassword",
    database: process.env.DB_NAME ?? "taskboard_db",
  },
  redis: {
    host: process.env.REDIS_HOST ?? "redis",
    port: toNumber(process.env.REDIS_PORT, 6379),
  },
} as const;
