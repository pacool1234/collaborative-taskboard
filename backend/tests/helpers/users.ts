import { randomUUID } from "node:crypto";
import type { CreateUserBody } from "../../src/schemas/user.schemas.js";
import { api } from "./api.js";

/** User as serialized in API responses (dates become strings in JSON). */
export interface UserJson {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
}

/** A valid create-user payload with a unique email. Override any field. */
export function buildUserPayload(
  overrides: Partial<Record<keyof CreateUserBody, unknown>> = {},
): Record<string, unknown> {
  return {
    email: `user-${randomUUID()}@example.com`,
    password: "correct-horse-battery",
    fullName: "Test User",
    ...overrides,
  };
}

/** Creates a user through the API (arrange step for tests that need one). */
export async function createUser(
  overrides: Partial<Record<keyof CreateUserBody, unknown>> = {},
): Promise<UserJson> {
  const res = await api.post("/users").send(buildUserPayload(overrides)).expect(201);
  return res.body.data as UserJson;
}
