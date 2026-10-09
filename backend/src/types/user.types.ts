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

export interface CreateUserBody {
  email: string;
  password: string;
  fullName: string;
}

export interface UpdateUserBody {
  email?: string;
  fullName?: string;
}

export interface UserIdParams {
  id: string;
}

export interface ListUsersQuery {
  limit?: string;
  offset?: string;
  filter?: string;
}
