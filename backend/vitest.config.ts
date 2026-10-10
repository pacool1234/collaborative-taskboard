import { defineConfig } from "vitest/config";
import { TEST_ENV } from "./tests/setup/env.js";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    env: TEST_ENV,
    globalSetup: ["tests/setup/global-setup.ts"],
    setupFiles: ["tests/setup/per-file.ts"],
    // All integration tests share one database. Running files in parallel
    // would let one file's cleanup wipe another file's data mid-test.
    fileParallelism: false,
  },
});
