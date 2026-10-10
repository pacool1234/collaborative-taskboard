# Testing

Integration tests exercise the API over HTTP against a real Postgres database.
They use **Vitest** (test runner) and **Supertest** (in-memory HTTP client).

## Running

Postgres from docker-compose must be running (`docker compose up -d postgres`).
Redis is not needed: tests use `createApp()`, which has no Socket.IO.

```sh
npm test            # run once (use this in CI)
npm run test:watch  # re-run on file changes
```

By default, tests connect to `localhost:5433`, database `taskboard_test`.
Override this with `TEST_DB_HOST`, `TEST_DB_PORT` and `TEST_DB_NAME`.

## How it works

| File                          | Runs               | Does                                                                   |
| ----------------------------- | ------------------ | ---------------------------------------------------------------------- |
| `vitest.config.ts`            | —                  | Sets the test env, wires the setup files, disables file parallelism    |
| `tests/setup/env.ts`          | —                  | Test env values, plus the `_test` database-name safety check           |
| `tests/setup/global-setup.ts` | once per run       | Drops and recreates `taskboard_test`, then runs all migrations         |
| `tests/setup/per-file.ts`     | in every test file | Truncates all tables before each test; closes the pool after the file  |
| `tests/helpers/api.ts`        | —                  | `api`: Supertest client bound to the app                               |
| `tests/helpers/db.ts`         | —                  | `truncateAllTables()`, which re-checks the database it is connected to |
| `tests/helpers/users.ts`      | —                  | `buildUserPayload()` and `createUser()` factories                      |

### Rules the setup relies on

- **Safety:** tests refuse to run unless the database name ends in `_test`.
  This is checked against the env before anything runs, and again against
  `current_database()` before every truncate.
- **Isolation:** every test starts with empty tables. Never rely on data
  created by another test; create what you need in the test itself.
- **No file parallelism:** all files share one database. Running them in
  parallel would let one file's cleanup wipe another file's data.
- **Fresh schema:** the test database is rebuilt from `migrations/` on every
  run, so it never drifts from the migration files.

## Writing tests

Structure each test as **Arrange, Act, Assert**, separated by blank lines:

```ts
it("returns the user", async () => {
  const user = await createUser(); // Arrange

  const res = await api.get(`/users/${user.id}`); // Act

  expect(res.status).toBe(200); // Assert
  expect(res.body.data).toEqual(user);
});
```

- **Test through HTTP.** Assert on status codes, response bodies and headers.
  Then refactors of controllers, services and repositories need no test
  changes.
- **Query the database directly** only for things the API cannot show, for
  example that passwords are stored hashed.
- **Prefer `toEqual` on whole objects** when the exact shape matters. It fails
  on extra keys, which catches leaks like `password_hash`.
- **Use `it.each` tables** for many inputs that share one expectation, for
  example validation rules.
- **Don't assert an order the API doesn't guarantee.** `GET /users` is ordered
  by a random v4 UUID (see the tracker, Phase 2 "Sorting").

## Adding tests for a new entity (e.g. boards)

1. Add factories in `tests/helpers/boards.ts`: `buildBoardPayload()` and
   `createBoard()`. Reuse `createUser()` for owners.
2. Create `tests/integration/boards.test.ts` with one `describe` per endpoint.
3. For each endpoint, cover: the happy path, every validation rule (400),
   not found (404), conflicts (409) and, once auth exists, 401 and 403.
4. New tables need no setup changes: they are created by migrations and
   emptied automatically by `truncateAllTables()`.
