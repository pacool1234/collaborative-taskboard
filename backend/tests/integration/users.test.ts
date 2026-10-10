import bcrypt from "bcrypt";
import { describe, expect, it } from "vitest";
import { pool } from "../../src/db/pool.js";
import { api } from "../helpers/api.js";
import { buildUserPayload, createUser, type UserJson } from "../helpers/users.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// Well-formed UUID that no test ever inserts.
const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";

describe("POST /users", () => {
  it("creates a user, normalizing email and name", async () => {
    const res = await api
      .post("/users")
      .send(buildUserPayload({ email: "  Ana.Garcia@Example.COM ", fullName: "  Ana García  " }));

    expect(res.status).toBe(201);
    // toEqual fails on extra keys, so this also proves password_hash is never exposed.
    expect(res.body.data).toEqual({
      id: expect.stringMatching(UUID_PATTERN),
      email: "ana.garcia@example.com",
      full_name: "Ana García",
      avatar_url: null,
      created_at: expect.any(String),
    });
    expect(res.headers.location).toBe(`/users/${res.body.data.id}`);
  });

  it("stores a bcrypt hash, never the plain password", async () => {
    const password = "my-secret-password";
    const user = await createUser({ password });

    const { rows } = await pool.query<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE id = $1",
      [user.id],
    );
    const storedHash = rows[0]!.password_hash;

    expect(storedHash).not.toBe(password);
    expect(await bcrypt.compare(password, storedHash)).toBe(true);
  });

  it("rejects a duplicate email regardless of case with 409", async () => {
    await createUser({ email: "taken@example.com" });

    const res = await api.post("/users").send(buildUserPayload({ email: "TAKEN@Example.com" }));

    expect(res.status).toBe(409);
    expect(res.body.error.details).toEqual([
      { location: "body", field: "email", message: "Email is already in use." },
    ]);
  });

  it.each([
    {
      case: "a missing email",
      overrides: { email: undefined },
      field: "email",
      message: "Required.",
    },
    {
      case: "an invalid email",
      overrides: { email: "not-an-email" },
      field: "email",
      message: "Must be a valid email address.",
    },
    {
      case: "a short password",
      overrides: { password: "short" },
      field: "password",
      message: "Must be at least 8 characters.",
    },
    {
      // 37 × "é" is only 37 characters but 74 bytes in UTF-8.
      case: "a password over 72 bytes",
      overrides: { password: "é".repeat(37) },
      field: "password",
      message: "Must be at most 72 bytes.",
    },
    {
      case: "a blank fullName",
      overrides: { fullName: "   " },
      field: "fullName",
      message: "Cannot be empty.",
    },
    {
      case: "a fullName over 100 characters",
      overrides: { fullName: "a".repeat(101) },
      field: "fullName",
      message: "Must be at most 100 characters.",
    },
    {
      case: "a non-string fullName",
      overrides: { fullName: 42 },
      field: "fullName",
      message: expect.any(String),
    },
  ])("rejects $case with 400", async ({ overrides, field, message }) => {
    const res = await api.post("/users").send(buildUserPayload(overrides));

    expect(res.status).toBe(400);
    expect(res.body.error.details).toContainEqual({ location: "body", field, message });
  });

  it("reports every invalid field at once", async () => {
    const res = await api.post("/users").send({ email: "nope", password: "short", fullName: "" });

    expect(res.status).toBe(400);
    expect(res.body.error.details.map((issue: { field: string }) => issue.field)).toEqual([
      "email",
      "password",
      "fullName",
    ]);
  });

  it("rejects a missing body with 400", async () => {
    const res = await api.post("/users");

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([{ location: "body", message: "Required." }]);
  });

  it("rejects malformed JSON with 400", async () => {
    const res = await api.post("/users").set("Content-Type", "application/json").send('{"email": ');

    expect(res.status).toBe(400);
    expect(res.body.error.status).toBe(400);
  });
});

describe("GET /users", () => {
  it("lists users with default pagination", async () => {
    await createUser();
    await createUser();

    const res = await api.get("/users");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination).toEqual({ limit: 10, offset: 0, count: 2 });
  });

  it("filters by email or name, case-insensitively", async () => {
    await createUser({ fullName: "Alice Smith" });
    await createUser({ email: "bob@example.com", fullName: "Bob Jones" });

    const byName = await api.get("/users").query({ filter: "ALICE" });
    const byEmail = await api.get("/users").query({ filter: "bob@" });

    expect(byName.body.data.map((u: UserJson) => u.full_name)).toEqual(["Alice Smith"]);
    expect(byEmail.body.data.map((u: UserJson) => u.email)).toEqual(["bob@example.com"]);
  });

  it("applies limit and offset", async () => {
    await createUser();
    await createUser();
    await createUser();

    const firstPage = await api.get("/users").query({ limit: 2, offset: 0 });
    const secondPage = await api.get("/users").query({ limit: 2, offset: 2 });

    expect(firstPage.body.data).toHaveLength(2);
    expect(secondPage.body.data).toHaveLength(1);
    // Results are ordered by a random v4 UUID, so assert that the pages don't
    // overlap rather than which users land on which page.
    const firstPageIds = firstPage.body.data.map((u: UserJson) => u.id);
    expect(firstPageIds).not.toContain(secondPage.body.data[0].id);
  });

  it.each([
    { query: { limit: 0 }, field: "limit" },
    { query: { limit: 101 }, field: "limit" },
    { query: { limit: "abc" }, field: "limit" },
    { query: { limit: 1.5 }, field: "limit" },
    { query: { offset: -1 }, field: "offset" },
  ])("rejects invalid query $query with 400", async ({ query, field }) => {
    const res = await api.get("/users").query(query);

    expect(res.status).toBe(400);
    expect(res.body.error.details).toContainEqual(
      expect.objectContaining({ location: "query", field }),
    );
  });
});

describe("GET /users/:id", () => {
  it("returns the user", async () => {
    const user = await createUser();

    const res = await api.get(`/users/${user.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(user);
  });

  it("returns 404 for an unknown id", async () => {
    const res = await api.get(`/users/${UNKNOWN_ID}`);

    expect(res.status).toBe(404);
  });

  it("returns 400 for a malformed id", async () => {
    const res = await api.get("/users/not-a-uuid");

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([
      { location: "params", field: "id", message: "Must be a valid UUID." },
    ]);
  });
});

describe("PUT /users/:id", () => {
  it("updates only the provided fields", async () => {
    const user = await createUser({ fullName: "Old Name" });

    const res = await api.put(`/users/${user.id}`).send({ fullName: "  New Name " });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ ...user, full_name: "New Name" });
  });

  it("rejects a body without any updatable field with 400", async () => {
    const user = await createUser();

    // password is not updatable here, so it is stripped and nothing remains.
    const res = await api.put(`/users/${user.id}`).send({ password: "new-password" });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([
      { location: "body", message: "At least one of email or fullName must be provided." },
    ]);
  });

  it("rejects an email that belongs to another user with 409", async () => {
    await createUser({ email: "taken@example.com" });
    const user = await createUser();

    const res = await api.put(`/users/${user.id}`).send({ email: "Taken@Example.com" });

    expect(res.status).toBe(409);
  });

  it("returns 404 for an unknown id", async () => {
    const res = await api.put(`/users/${UNKNOWN_ID}`).send({ fullName: "Nobody" });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /users/:id", () => {
  it("deletes the user", async () => {
    const user = await createUser();

    const res = await api.delete(`/users/${user.id}`);

    expect(res.status).toBe(204);
    expect((await api.get(`/users/${user.id}`)).status).toBe(404);
  });

  it("returns 404 for an unknown id", async () => {
    const res = await api.delete(`/users/${UNKNOWN_ID}`);

    expect(res.status).toBe(404);
  });
});

describe("POST /users/email-availability", () => {
  it("reports an unused email as available, normalized", async () => {
    const res = await api.post("/users/email-availability").send({ email: " New@Example.com " });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ email: "new@example.com", available: true });
  });

  it("reports a registered email as unavailable, regardless of case", async () => {
    await createUser({ email: "taken@example.com" });

    const res = await api.post("/users/email-availability").send({ email: "TAKEN@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.data.available).toBe(false);
  });

  it("rejects an invalid email with 400", async () => {
    const res = await api.post("/users/email-availability").send({ email: "nope" });

    expect(res.status).toBe(400);
  });
});
