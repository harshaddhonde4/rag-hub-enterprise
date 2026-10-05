import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { pool } from './db.js';

export type Role = 'tenant_admin' | 'department_admin' | 'member' | 'auditor';
export type Session = {
  userId: string;
  tenantId: string;
  email: string;
  role: Role;
  departments: string[];
  platformAdmin?: boolean;
  apiKey?: boolean;
  scopes?: string[];
};

declare global { namespace Express { interface Request { session?: Session } } }

const secret = process.env.JWT_SECRET || 'development-only-secret-change-me';
export const signSession = (session: Session) => jwt.sign(session, secret, { expiresIn: '8h' });

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  // Handle Enterprise API Keys (rh_live_... / rh_test_...)
  if (token.startsWith('rh_live_') || token.startsWith('rh_test_')) {
    try {
      const hash = crypto.createHash('sha256').update(token).digest('hex');
      const keyRes = await pool.query(
        `SELECT k.id, k.tenant_id, k.name, k.scopes, k.created_by, u.email, u.role
         FROM api_keys k
         LEFT JOIN users u ON u.id = k.created_by
         WHERE k.key_hash = $1 AND k.revoked = false AND (k.expires_at IS NULL OR k.expires_at > now())`,
        [hash]
      );
      if (!keyRes.rowCount) {
        return res.status(401).json({ error: 'Invalid or revoked API key' });
      }
      const key = keyRes.rows[0];
      const deptsRes = await pool.query('SELECT id FROM departments WHERE tenant_id = $1', [key.tenant_id]);
      req.session = {
        userId: key.created_by || '00000000-0000-0000-0000-000000000101',
        tenantId: key.tenant_id,
        email: key.email || `api:${key.name}`,
        role: (key.role as Role) || 'tenant_admin',
        departments: deptsRes.rows.map(r => r.id),
        apiKey: true,
        scopes: key.scopes || ['rag:query', 'documents:read']
      };
      // Asynchronously update last_used_at
      pool.query('UPDATE api_keys SET last_used_at = now() WHERE id = $1', [key.id]).catch(() => {});
      return next();
    } catch {
      return res.status(500).json({ error: 'API key authentication failure' });
    }
  }

  // Standard JWT Bearer token authentication
  try {
    req.session = jwt.verify(token, secret) as Session;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

export function canAccessDepartment(session: Session, departmentId: string) {
  // Tenant administrators manage the company but do not automatically read every department's knowledge.
  // Document/chat access always requires an explicit department membership.
  return session.departments.includes(departmentId);
}

