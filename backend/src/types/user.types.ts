// Request input types (bodies, params, query) are inferred from the Zod
// schemas in ../schemas/user.schemas.ts. This file only holds output shapes.

/** Row shape of the `users` table. */
export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  avatar_url: string | null;
  created_at: Date;
}

/** User as exposed by the API — never includes the password hash. */
export type PublicUser = Omit<UserRow, "password_hash">;

export interface EmailAvailability {
  email: string;
  available: boolean;
}
