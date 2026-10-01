import { Pool, type PoolClient } from 'pg';
import type { Session } from './auth.js';

export const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 12 });

/** Applies a request's tenant context before any RLS-protected statements. */
export async function inTenantTransaction<T>(session: Session, work: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.tenant_id', $1, true), set_config('app.user_id', $2, true)", [session.tenantId, session.userId]);
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

export async function audit(client: PoolClient, session: Session, action: string, entityType: string, entityId?: string, metadata: Record<string, unknown> = {}) {
  await client.query('INSERT INTO audit_events (tenant_id, actor_id, action, entity_type, entity_id, metadata) VALUES ($1,$2,$3,$4,$5,$6)', [session.tenantId, session.userId, action, entityType, entityId ?? null, metadata]);
}
