# Backend Tracker

Work plan for the backend: what is done, what must be in place before the other
entities (boards, lists, cards, activity logs) are built, and what can wait.

**How to use it:** tick the checkbox when an item is merged into `main`, and add
the commit hash next to it. Work top to bottom. Phase 1 is ordered on purpose.

| Status | Meaning                          |
| ------ | -------------------------------- |
| `[x]`  | Done and merged into `main`      |
| `[ ]`  | To do                            |
| 🔒     | Blocks the work of a later phase |

---

## ✅ Done

- [x] **TypeScript migration.** Strict `tsconfig`, `src/` layout, multi-stage
      Dockerfile, central `config/env.ts`, JSON 404/500 handlers. `15ad2f1`
- [x] **App-generated UUIDs.** The DB no longer has `DEFAULT gen_random_uuid()`.
      IDs come from `utils/id.ts` (`generateUUID`). `10fad32`, `7787cda`
- [x] **Formatting.** Prettier, EditorConfig, LF line endings
      (`.gitattributes`), VS Code format on save. `3995d74`
- [x] **Schema validation.** Zod schemas in `schemas/`, generic
      `middleware/validate.ts`, per-field error `details`, field-specific 409 on
      duplicate email, 400 on malformed JSON. `e449585`
- [x] **Email availability endpoint.** `POST /users/email-availability`. This is
      a UX helper only; the `users_email_key` constraint is the real guarantee.
      `e449585`

---

## Phase 1: Foundations (must do before replicating to other entities) 🔒

Each item changes the shape of every controller/route. Do them while `users` is
the only resource, then copy the finished pattern.

### 1.1 Test harness ✅

- [x] Add **Vitest + Supertest** with integration tests against a dedicated
      **test database** (separate DB name or container, wiped between runs).
      `1f5ab83`
- [x] Cover the current `users` behaviour: create, duplicate (409), validation
      (400), get / update / delete, not found (404), email availability.
- [x] `npm test` script; tests must not touch the dev database. See
      `docs/testing.md`.

**Why first:** items 1.2–1.5 are refactors. Tests lock in the current behaviour
so regressions show up immediately (for example, malformed JSON used to return
500 and nobody noticed).

### 1.2 API conventions 🔒

- [ ] **camelCase in every response.** Requests already use `fullName`, but
      responses still return `full_name`, `avatar_url`, `created_at`. Convert at
      the data layer (SQL aliases or a row→DTO mapper). `PublicUser` should
      describe the API shape, not the table.
- [ ] **Single URL prefix.** Mount every router under `/api` (or `/api/v1`).
      Today health is at `/api/health` but users at `/users`.
- [ ] Decide the pagination contract: is `count` the page size or the total
      number of rows? Add `total` if the UI needs page numbers.

### 1.3 Error classes 🔒

- [ ] Create `AppError` subclasses (`NotFoundError`, `ConflictError`,
      `ForbiddenError`, `UnauthorizedError`, …) carrying their HTTP status.
- [ ] Code **throws** them; `errorHandler` is the only place that builds error
      responses.
- [ ] Remove the `try/catch { next(err) }` boilerplate. **Express 5 forwards
      rejected promises from async handlers automatically.**
- [ ] Remove the per-controller `notFound` helper.

### 1.4 Layering and transactions 🔒

- [ ] Split responsibilities:
  - `routes/`: URL plus middleware chain
  - `controllers/`: HTTP only (read the validated input, call a service, send
    the response)
  - `services/`: business rules, orchestration, transactions
  - `repositories/`: SQL only (absorbs `queries/`)
- [ ] Add a `withTransaction(fn)` helper in `db/` that runs `BEGIN` /
      `COMMIT` / `ROLLBACK` on one pooled client and passes it to repositories.
- [ ] Move ID generation and password hashing from the controller into the
      user service.

**Why:** creating a board must also insert the owner into `board_members`, and
moving a card should also write a `card_activity_logs` row. Both need a
transaction, which `pool.query` inside controllers cannot provide.

### 1.5 Authentication and authorization 🔒

- [ ] **Login** endpoint issuing a JWT (access + refresh) or a session cookie.
      Decide which, and record the decision below.
- [ ] Move signup under auth (for example `POST /api/auth/register`) and decide
      what stays public under `/users`.
- [ ] `requireAuth` middleware that sets the current user on the request (extend
      Express's `Request` type via declaration merging).
- [ ] **Authorization helpers**: "is a member of board X", "is the owner of board
      X", using `board_members.role`.
- [ ] Lock down existing endpoints: users may only update or delete themselves;
      decide whether listing all users (with emails) is allowed at all.
- [ ] **Socket.IO auth**: authenticate the handshake, allow `join_board` only for
      members, and validate event payloads (for example `card_moved`) with Zod,
      reusing the same schemas.

---

## Phase 2: Should do soon (early in the boards work)

- [ ] **Migration tracking.** Add a `schema_migrations` table so each `.sql`
      file runs exactly once. Never edit an applied migration; add `0002_…`
      instead.
- [ ] **`updated_at` is never updated** on `boards` and `cards`. Add a Postgres
      trigger (in a migration) or set it in every `UPDATE`. Pick one approach
      and use it everywhere.
- [ ] **Sorting.** `ORDER BY id` on random v4 UUIDs is effectively a random
      order. Order by `created_at`, or switch `generateUUID` to **UUID v7**
      before real data piles up.
- [ ] **ESLint** with `typescript-eslint` (type-aware), including the
      `no-floating-promises` rule.
- [ ] **Validate env at startup** with a Zod schema in `config/env.ts`, so the
      app crashes immediately with a clear message when a variable is missing or
      malformed.
- [ ] **Hot reload in Docker.** The dev container has no source volume mount, so
      `tsx watch` never sees changes and every edit needs `--build`. Bind-mount
      `src/` (keeping the container's `node_modules`).
- [ ] **Enforce case-insensitive email uniqueness in the DB.** Unique index on
      `lower(email)` or a `citext` column (new migration). The API already
      lowercases emails.
- [ ] **Escape `%` and `_` in the `filter` query param.** They currently act as
      `ILIKE` wildcards.
- [ ] Remove the obsolete `version: '3.8'` line from `docker-compose.yml`.

---

## Phase 3: Before production

- [ ] Structured logging with **pino** plus a request ID per request (replace
      `console.log`).
- [ ] **helmet** for security headers.
- [ ] **CORS allowlist** for Express and Socket.IO (Socket.IO currently allows
      `origin: "*"`).
- [ ] **Rate limiting** (`express-rate-limit`), especially on login, register
      and `email-availability` (user enumeration).
- [ ] **Graceful shutdown**: on `SIGTERM`, stop accepting connections, then close
      the HTTP server, the PG pool and the Redis clients.
- [ ] Production compose / deployment using the Dockerfile `production` target.
- [ ] CI pipeline: `typecheck`, `format:check`, lint, tests on every push.

---

## Phase 4: Entities (start after Phase 1)

Per-entity checklist. Each one copies the `users` pattern:

> schema → repository → service → controller → routes (with `validate` and auth)
> → tests

- [ ] **Boards** (with the owner auto-added to `board_members`, in one
      transaction)
- [ ] **Board members** (invite / remove / change role; owner-only actions)
- [ ] **Lists** (ordering by `position`)
- [ ] **Cards** (ordering, moving between lists, assignment, due date)
- [ ] **Card activity logs** (written by the card service, inside the same
      transaction as the change)
- [ ] **Realtime events** for board/list/card changes over Socket.IO
      (authenticated rooms, validated payloads)

---

## Decision log

| Date       | Decision                                                            | Reason                                                                               |
| ---------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 2026-10-09 | UUIDs are generated by the app, not the DB (no column defaults)     | Single source of truth; ID known before insert; easy switch to v7 via `generateUUID` |
| 2026-10-09 | Prettier (100 cols, double quotes) + LF line endings everywhere     | Deterministic formatting; no CRLF noise on Windows                                   |
| 2026-10-10 | Zod for validation; request types are inferred from schemas         | One source of truth for rules and types                                              |
| 2026-10-10 | Emails are trimmed and lowercased before storage                    | Prevents `Ana@x.com` / `ana@x.com` duplicates                                        |
| 2026-10-10 | Email availability is `POST` with a JSON body                       | Keeps emails out of URLs and access logs                                             |
| 2026-10-10 | Out-of-range `limit` / `offset` return 400 instead of being clamped | Explicit errors over silent correction                                               |
| 2026-10-10 | Password limits: 8 characters minimum, 72 **bytes** maximum         | bcrypt ignores input beyond 72 bytes                                                 |
| —          | _Pending:_ JWT vs session cookies (1.5)                             |                                                                                      |
| —          | _Pending:_ UUID v4 vs v7 (Phase 2)                                  |                                                                                      |
