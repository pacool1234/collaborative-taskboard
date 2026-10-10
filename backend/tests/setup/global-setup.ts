import pg from "pg";
import { assertTestDatabase, TEST_ENV } from "./env.js";

/**
 * Runs once per `vitest` invocation, before any test file: recreates the test
 * database from scratch and applies all migrations. Starting from an empty
 * database keeps the schema in sync with migrations/ on every run.
 */
export default async function setup(): Promise<void> {
  Object.assign(process.env, TEST_ENV);

  // Imported dynamically: static imports are hoisted above the assignment
  // above, so they would read process.env before the test values are set.
  const { env } = await import("../../src/config/env.js");
  assertTestDatabase(env.db.database);

  await recreateDatabase(env.db);

  const { runMigrations } = await import("../../src/db/migrate.js");
  const { pool } = await import("../../src/db/pool.js");
  try {
    await runMigrations();
  } finally {
    await pool.end();
  }
}

async function recreateDatabase(db: {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}): Promise<void> {
  // CREATE/DROP DATABASE cannot run against the database being dropped, so
  // connect to the built-in "postgres" maintenance database instead.
  const client = new pg.Client({ ...db, database: "postgres" });
  await client.connect();
  try {
    // Identifiers cannot be query parameters; the name was validated by
    // assertTestDatabase, and pg's escapeIdentifier quotes it safely.
    const name = client.escapeIdentifier(db.database);
    await client.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await client.query(`CREATE DATABASE ${name}`);
  } finally {
    await client.end();
  }
}
