import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';

export type Role = 'tenant_admin' | 'department_admin' | 'member' | 'auditor';
export type Session = { userId: string; tenantId: string; email: string; role: Role; departments: string[]; platformAdmin?: boolean };
declare global { namespace Express { interface Request { session?: Session } } }

const secret = process.env.JWT_SECRET || 'development-only-secret-change-me';
export const signSession = (session: Session) => jwt.sign(session, secret, { expiresIn: '8h' });
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try { req.session = jwt.verify(token, secret) as Session; next(); }
  catch { return res.status(401).json({ error: 'Invalid or expired session' }); }
}
export function canAccessDepartment(session: Session, departmentId: string) {
  // Tenant administrators manage the company but do not automatically read every department's knowledge.
  // Document/chat access always requires an explicit department membership.
  return session.departments.includes(departmentId);
}
