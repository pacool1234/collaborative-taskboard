// Columns safe to return to API clients (never the password hash).
const PUBLIC_COLUMNS = "id, email, full_name, avatar_url, created_at";

export const USERS_QUERIES = {
  selectAll: `
    SELECT ${PUBLIC_COLUMNS}
    FROM users
    WHERE ($1::text IS NULL OR email ILIKE $1 OR full_name ILIKE $1)
    ORDER BY id ASC
    LIMIT $2 OFFSET $3;
  `,
  selectById: `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1;`,
  selectByName: `SELECT ${PUBLIC_COLUMNS} FROM users WHERE full_name = $1;`,
  insert: `
    INSERT INTO users (email, password_hash, full_name, avatar_url)
    VALUES ($1, $2, $3, $4)
    RETURNING ${PUBLIC_COLUMNS};
  `,
  deleteById: `DELETE FROM users WHERE id = $1 RETURNING id;`,
  updateById: `
    UPDATE users
    SET email = COALESCE($2, email),
        full_name = COALESCE($3, full_name)
    WHERE id = $1
    RETURNING ${PUBLIC_COLUMNS};
  `,
} as const;
