import { pool } from "../../src/db/pool.js";
import { assertTestDatabase } from "../setup/env.js";

/**
 * Empties every table in the public schema. Tables are discovered at runtime,
 * so new migrations are covered without touching this helper.
 */
export async function truncateAllTables(): Promise<void> {
  const { rows } = await pool.query<{ database: string; tables: string | null }>(`
    SELECT current_database() AS database,
           string_agg(format('%I', tablename), ', ') AS tables
    FROM pg_tables
    WHERE schemaname = 'public'
  `);
  const { database, tables } = rows[0]!;

  // Check the database we are *actually* connected to, not just the env var.
  assertTestDatabase(database);

  if (tables) {
    await pool.query(`TRUNCATE ${tables} CASCADE`);
  }
}
