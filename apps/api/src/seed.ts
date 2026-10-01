import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pool } from './db.js';

const sql = await readFile(resolve('sql/002_demo_seed.sql'), 'utf8');
await pool.query(sql);
await pool.end();
console.log('Demo tenant, departments, and database-backed admin account seeded.');
