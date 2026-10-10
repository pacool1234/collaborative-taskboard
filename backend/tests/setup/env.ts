/**
 * Environment for the test run. It must be in place before any app module is
 * imported, because src/config/env.ts reads process.env once, at import time.
 *
 * Defaults target the docker-compose Postgres from the host (localhost:5433).
 * Override with TEST_DB_HOST / TEST_DB_PORT / TEST_DB_NAME (e.g. in CI).
 * DB_USER / DB_PASSWORD come from .env or the defaults in src/config/env.ts.
 */
export const TEST_ENV = {
  NODE_ENV: "test",
  DB_HOST: process.env.TEST_DB_HOST ?? "localhost",
  DB_PORT: process.env.TEST_DB_PORT ?? "5433",
  DB_NAME: process.env.TEST_DB_NAME ?? "taskboard_test",
};

/**
 * Safety net: tests drop and truncate data, so refuse to run against any
 * database whose name does not end in "_test" (e.g. the dev database).
 */
export function assertTestDatabase(name: string): void {
  if (!/^[a-z0-9_]+_test$/.test(name)) {
    throw new Error(
      `Refusing to run tests against database "${name}": the name must end in "_test" ` +
        `and contain only lowercase letters, digits and underscores.`,
    );
  }
}
