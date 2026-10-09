export const USERS_QUERIES = {
  selectAll: `
    SELECT id, email, full_name, avatar_url, created_at
    FROM users
    WHERE ($1::text IS NULL OR email ILIKE $1 OR full_name ILIKE $1)
    ORDER BY id ASC
    LIMIT $2 OFFSET $3;
  `,
  selectById: `SELECT * FROM users WHERE id = $1;`,
  selectByName: `SELECT * FROM users WHERE full_name = $1;`,
  insert: `
    INSERT INTO users (email, password_hash, full_name, avatar_url)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `,
  deleteById: `DELETE FROM users WHERE id = $1 RETURNING id;`
};