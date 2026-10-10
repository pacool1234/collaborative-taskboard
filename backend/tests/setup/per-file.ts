import { afterAll, beforeEach } from "vitest";
import { pool } from "../../src/db/pool.js";
import { truncateAllTables } from "../helpers/db.js";

// Runs inside every test file (configured as `setupFiles` in vitest.config.ts).

// Every test starts from empty tables, so tests never depend on each other.
beforeEach(truncateAllTables);

// Close the pool, otherwise open connections keep the test process alive.
afterAll(() => pool.end());
