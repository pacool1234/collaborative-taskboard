import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../../db/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, '../../db/migrations');

export async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log('Scanning for SQL migration files...');

    const files = await fs.readdir(MIGRATIONS_DIR);

    const sqlFiles = files
      .filter((file) => file.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b));

    if (sqlFiles.length === 0) {
      console.log('No migration files found.');
      return;
    }

    await client.query('BEGIN');

    for (const file of sqlFiles) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      console.log(`Executing migration: ${file}`);

      const sqlContent = await fs.readFile(filePath, 'utf-8');
      await client.query(sqlContent);
    }

    await client.query('COMMIT');
    console.log('All database migrations executed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration execution failed. Rolling back changes:', err);
    throw err;
  } finally {
    client.release();
  }
}