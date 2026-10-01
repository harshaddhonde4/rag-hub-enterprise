import 'dotenv/config';
import bcrypt from 'bcrypt';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import { z } from 'zod';
import { authenticate, canAccessDepartment, signSession, type Session } from './auth.js';
import { audit, inTenantTransaction, pool } from './db.js';
import { embed, estimateTokens, extractText, generateGroundedAnswer, generateDeepSummary, generateCustomSummary, compareDocuments, type SummaryStyle, localEmbedding, recursiveChunk, sha256, summarizeDocument } from './ingestion.js';

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024, files: 1 } });
type RateWindow = { count: number; resetAt: number };
const rateWindows = new Map<string, RateWindow>();
function rateLimit(namespace: string, limit: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const key = `${namespace}:${req.ip}`;
    const now = Date.now(); const current = rateWindows.get(key);
    const entry = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
    entry.count += 1; rateWindows.set(key, entry);
    res.setHeader('RateLimit-Limit', limit); res.setHeader('RateLimit-Remaining', Math.max(0, limit - entry.count));
    if (entry.count > limit) return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    next();
  };
}
app.disable('x-powered-by');
app.use((_req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Frame-Options', 'DENY'); res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin'); res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()'); next(); });
app.use(cors({ origin: process.env.WEB_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '2mb' }));
type UserRow = { id: string; tenant_id: string; email: string; display_name: string; role: Session['role']; password_hash: string | null };
const vector = (values: number[]) => `[${values.join(',')}]`;

async function sessionFor(user: UserRow): Promise<Session> {
  const memberships = await pool.query<{ department_id: string }>('SELECT department_id FROM department_memberships WHERE user_id = $1', [user.id]);
  return { userId: user.id, tenantId: user.tenant_id, email: user.email, role: user.role, departments: memberships.rows.map(row => row.department_id) };
}

app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', storage: 'postgresql+pgvector', isolation: 'tenant+department' }); }
  catch { res.status(503).json({ status: 'unavailable', detail: 'Run db:up, db:migrate, and db:seed.' }); }
});

app.post('/api/auth/login', rateLimit('login', 12, 15 * 60_000), async (req, res, next) => {
  try {
    const body = z.object({ email: z.string().email(), password: z.string().min(8), tenantSlug: z.string().default('acme') }).parse(req.body);
    const result = await pool.query<UserRow>(`SELECT u.id, u.tenant_id, u.email, u.display_name, u.role, u.password_hash FROM users u JOIN tenants t ON t.id = u.tenant_id WHERE lower(u.email) = lower($1) AND t.slug = $2 AND t.approval_status = 'approved' AND u.approval_status = 'approved'`, [body.email, body.tenantSlug]);
    const user = result.rows[0];
    if (!user?.password_hash || !(await bcrypt.compare(body.password, user.password_hash))) return res.status(401).json({ error: 'Invalid email, password, or tenant.' });
    const session = await sessionFor(user);
    await inTenantTransaction(session, client => audit(client, session, 'auth.login', 'user', user.id));
    res.json({ token: signSession(session), user: session });
  } catch (error) { next(error); }
});

app.post('/api/auth/platform/login', async (req, res, next) => {
  try {
    const body = z.object({ email: z.string().email(), password: z.string().min(8) }).parse(req.body);
    const result = await pool.query<{ id: string; email: string; password_hash: string }>('SELECT id, email, password_hash FROM platform_admins WHERE lower(email) = lower($1)', [body.email]);
    const admin = result.rows[0];
    if (!admin || !(await bcrypt.compare(body.password, admin.password_hash))) return res.status(401).json({ error: 'Invalid platform credentials.' });
    const session: Session = { userId: admin.id, tenantId: 'platform', email: admin.email, role: 'tenant_admin', departments: [], platformAdmin: true };
    res.json({ token: signSession(session), user: session });
  } catch (error) { next(error); }
});

app.post('/api/contact', rateLimit('contact', 10, 15 * 60_000), async (req, res, next) => {
  try {
    const body = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      company: z.string().min(2),
      companySize: z.string().optional(),
      department: z.string().optional(),
      message: z.string().min(10)
    }).parse(req.body);

    const inserted = await pool.query<{ id: string; created_at: string }>(
      `INSERT INTO contact_inquiries (name, email, company, company_size, department, message, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'new')
       RETURNING id, created_at`,
      [body.name, body.email, body.company, body.companySize || null, body.department || null, body.message]
    );

    console.log(`[Enterprise Contact Inquiry Stored] ID: ${inserted.rows[0].id} From: ${body.name} <${body.email}> at ${body.company} (Size: ${body.companySize || 'N/A'}, Dept: ${body.department || 'N/A'})`);

    res.json({
      success: true,
      inquiryId: inserted.rows[0].id,
      message: 'Thank you for reaching out to RAG Hub Enterprise. An Enterprise Solutions Architect will contact you within 4 business hours to schedule your tailored security briefing and sandbox access.'
    });
  } catch (error) { next(error); }
});

app.get('/api/platform/inquiries', authenticate, async (req, res, next) => {
  try {
    if (!req.session!.platformAdmin) return res.status(403).json({ error: 'Platform admin role required.' });
    const inquiries = await pool.query(`
      SELECT 
        id, 
        name, 
        email, 
        company, 
        company_size AS "companySize", 
        department, 
        message, 
        status, 
        admin_notes AS "adminNotes", 
        created_at AS "createdAt", 
        updated_at AS "updatedAt"
      FROM contact_inquiries 
      ORDER BY created_at DESC
    `);
    res.json(inquiries.rows);
  } catch (error) { next(error); }
});

app.patch('/api/platform/inquiries/:id', authenticate, async (req, res, next) => {
  try {
    if (!req.session!.platformAdmin) return res.status(403).json({ error: 'Platform admin role required.' });
    const id = z.string().uuid().parse(req.params.id);
    const body = z.object({
      status: z.enum(['new', 'in_review', 'contacted', 'archived']).optional(),
      adminNotes: z.string().optional()
    }).parse(req.body);

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (body.status !== undefined) {
      updates.push(`status = $${idx++}`);
      values.push(body.status);
    }
    if (body.adminNotes !== undefined) {
      updates.push(`admin_notes = $${idx++}`);
      values.push(body.adminNotes);
    }
    updates.push(`updated_at = now()`);
    values.push(id);

    const query = `
      UPDATE contact_inquiries 
      SET ${updates.join(', ')} 
      WHERE id = $${idx}
      RETURNING id, name, email, company, company_size AS "companySize", department, message, status, admin_notes AS "adminNotes", created_at AS "createdAt", updated_at AS "updatedAt"
    `;

    const result = await pool.query(query, values);
    if (!result.rowCount) return res.status(404).json({ error: 'Inquiry not found.' });

    res.json({ success: true, inquiry: result.rows[0] });
  } catch (error) { next(error); }
});

app.delete('/api/platform/inquiries/:id', authenticate, async (req, res, next) => {
  try {
    if (!req.session!.platformAdmin) return res.status(403).json({ error: 'Platform admin role required.' });
    const id = z.string().uuid().parse(req.params.id);
    await pool.query('DELETE FROM contact_inquiries WHERE id = $1', [id]);
    res.json({ success: true, message: 'Inquiry deleted.' });
  } catch (error) { next(error); }
});


app.get('/api/platform/companies/pending', authenticate, async (req, res, next) => {
  try {
    if (!req.session!.platformAdmin) return res.status(403).json({ error: 'Platform approver role required.' });
    const companies = await pool.query(`SELECT id, name, slug, created_at AS "createdAt" FROM tenants WHERE approval_status = 'pending' ORDER BY created_at`);
    res.json(companies.rows);
  } catch (error) { next(error); }
});

app.get('/api/platform/companies', authenticate, async (req, res, next) => {
  try {
    if (!req.session!.platformAdmin) return res.status(403).json({ error: 'Platform approver role required.' });
    const companies = await pool.query(`
      SELECT t.id, t.name, t.slug, t.approval_status AS "approvalStatus", t.created_at AS "createdAt",
        (SELECT count(*) FROM users u WHERE u.tenant_id = t.id)::int AS "userCount",
        (SELECT count(*) FROM departments d WHERE d.tenant_id = t.id)::int AS "departmentCount",
        (SELECT count(*) FROM documents doc WHERE doc.tenant_id = t.id)::int AS "documentCount"
      FROM tenants t ORDER BY t.created_at DESC
    `);
    res.json(companies.rows);
  } catch (error) { next(error); }
});

app.post('/api/companies/register', rateLimit('company-register', 5, 60 * 60_000), async (req, res, next) => {
  try {
    const body = z.object({ companyName: z.string().min(2).max(120), companySlug: z.string().regex(/^[a-z0-9-]{3,50}$/), adminName: z.string().min(2).max(120), adminEmail: z.string().email(), password: z.string().min(8).max(128) }).parse(req.body);
    const passwordHash = await bcrypt.hash(body.password, 12);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const tenant = await client.query<{ id: string }>("INSERT INTO tenants (name, slug, approval_status, approved_at) VALUES ($1,$2,'approved',now()) RETURNING id", [body.companyName, body.companySlug]);
      const tenantId = tenant.rows[0].id;
      const user = await client.query<{ id: string }>(`INSERT INTO users (tenant_id,email,display_name,password_hash,role,approval_status,approved_at) VALUES ($1,$2,$3,$4,'tenant_admin','approved',now()) RETURNING id`, [tenantId, body.adminEmail, body.adminName, passwordHash]);
      const department = await client.query<{ id: string }>('INSERT INTO departments (tenant_id, name) VALUES ($1,$2) RETURNING id', [tenantId, 'General']);
      await client.query('INSERT INTO department_memberships (user_id, department_id) VALUES ($1,$2)', [user.rows[0].id, department.rows[0].id]);
      await client.query(`INSERT INTO audit_events (tenant_id, actor_id, action, entity_type, entity_id, metadata) VALUES ($1::uuid,$2::uuid,'company.registered','tenant',$1::text,$3::jsonb)`, [tenantId, user.rows[0].id, JSON.stringify({ companyName: body.companyName })]);
      await client.query('COMMIT');
      res.status(201).json({ companyId: tenantId, status: 'approved', message: 'Company created. The company administrator can now sign in and approve employee requests.' });
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  } catch (error) { next(error); }
});

app.post('/api/platform/companies/:companyId/approve', authenticate, async (req, res, next) => {
  try {
    if (!req.session!.platformAdmin) return res.status(403).json({ error: 'Platform approver role required.' });
    const companyId = z.string().uuid().parse(req.params.companyId);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const company = await client.query('UPDATE tenants SET approval_status = \'approved\', approved_at = now() WHERE id = $1 AND approval_status = \'pending\' RETURNING id, name, slug', [companyId]);
      if (!company.rowCount) throw Object.assign(new Error('Pending company not found.'), { status: 404 });
      await client.query("UPDATE users SET approval_status = 'approved', approved_at = now() WHERE tenant_id = $1 AND role = 'tenant_admin' AND approval_status = 'pending'", [companyId]);
      await client.query(`INSERT INTO audit_events (tenant_id, actor_id, action, entity_type, entity_id) VALUES ($1::uuid,$2::uuid,'company.approved','tenant',$1::text)`, [companyId, req.session!.userId]);
      await client.query('COMMIT'); res.json({ ...company.rows[0], status: 'approved' });
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  } catch (error) { next(error); }
});

app.post('/api/platform/companies/:companyId/reject', authenticate, async (req, res, next) => {
  try {
    if (!req.session!.platformAdmin) return res.status(403).json({ error: 'Platform approver role required.' });
    const companyId = z.string().uuid().parse(req.params.companyId);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const company = await client.query('UPDATE tenants SET approval_status = \'rejected\' WHERE id = $1 AND approval_status = \'pending\' RETURNING id, name', [companyId]);
      if (!company.rowCount) throw Object.assign(new Error('Pending company not found.'), { status: 404 });
      await client.query("UPDATE users SET approval_status = 'rejected' WHERE tenant_id = $1 AND approval_status = 'pending'", [companyId]);
      await client.query('COMMIT');
      res.json({ id: companyId, status: 'rejected' });
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  } catch (error) { next(error); }
});

app.get('/api/companies/:slug/departments', rateLimit('company-departments', 30, 60_000), async (req, res, next) => {
  try {
    const company = await pool.query<{ id: string; name: string }>("SELECT id, name FROM tenants WHERE slug = $1 AND approval_status = 'approved'", [req.params.slug]);
    if (!company.rows[0]) return res.status(404).json({ error: 'Approved company not found.' });
    const depts = await pool.query<{ id: string; name: string }>("SELECT id, name FROM departments WHERE tenant_id = $1 AND approval_status = 'approved' ORDER BY name", [company.rows[0].id]);
    res.json({ company: company.rows[0], departments: depts.rows });
  } catch (error) { next(error); }
});

app.post('/api/companies/:slug/users/register', rateLimit('user-register', 8, 60 * 60_000), async (req, res, next) => {
  try {
    const body = z.object({ displayName: z.string().min(2).max(120), email: z.string().email(), password: z.string().min(8).max(128), departmentId: z.string().uuid().optional() }).parse(req.body);
    const company = await pool.query<{ id: string }>("SELECT id FROM tenants WHERE slug = $1 AND approval_status = 'approved'", [req.params.slug]);
    if (!company.rows[0]) return res.status(404).json({ error: 'Approved company not found.' });
    
    // Check if email already registered for this company
    const existing = await pool.query('SELECT id FROM users WHERE tenant_id = $1 AND lower(email) = lower($2)', [company.rows[0].id, body.email]);
    if (existing.rows[0]) return res.status(409).json({ error: 'An account with this email already exists for this company.' });

    const passwordHash = await bcrypt.hash(body.password, 12);
    const created = await pool.query<{ id: string }>(`INSERT INTO users (tenant_id,email,display_name,password_hash,role) VALUES ($1,$2,$3,$4,'member') RETURNING id`, [company.rows[0].id, body.email, body.displayName, passwordHash]);
    await pool.query('INSERT INTO department_memberships (user_id, department_id) SELECT $1, id FROM departments WHERE tenant_id = $2 AND id = COALESCE($3::uuid, (SELECT id FROM departments WHERE tenant_id = $2 ORDER BY name LIMIT 1))', [created.rows[0].id, company.rows[0].id, body.departmentId ?? null]);
    res.status(201).json({ userId: created.rows[0].id, status: 'pending', message: 'Registration received. Your company administrator must approve access.' });
  } catch (error) { next(error); }
});

app.get('/api/me', authenticate, async (req, res, next) => {
  try {
    if (req.session!.platformAdmin) {
      return res.json({ ...req.session, companyName: 'Platform Central Admin', companySlug: 'platform' });
    }
    const userRes = await pool.query<{ id: string; email: string; display_name: string; role: Session['role']; approval_status: string }>(
      'SELECT id, email, display_name, role, approval_status FROM users WHERE id = $1 AND tenant_id = $2',
      [req.session!.userId, req.session!.tenantId]
    );
    if (!userRes.rows[0] || userRes.rows[0].approval_status !== 'approved') {
      return res.status(401).json({ error: 'User account is inactive or access has been suspended.' });
    }
    const dbUser = userRes.rows[0];
    const memberships = await pool.query<{ department_id: string; department_name: string }>(
      'SELECT dm.department_id, d.name AS department_name FROM department_memberships dm JOIN departments d ON d.id = dm.department_id WHERE dm.user_id = $1 ORDER BY d.name',
      [req.session!.userId]
    );
    const tenant = await pool.query<{ name: string; slug: string }>('SELECT name, slug FROM tenants WHERE id = $1', [req.session!.tenantId]);
    res.json({
      userId: dbUser.id,
      tenantId: req.session!.tenantId,
      email: dbUser.email,
      displayName: dbUser.display_name,
      role: dbUser.role,
      departments: memberships.rows.map(m => m.department_id),
      departmentDetails: memberships.rows.map(m => ({ id: m.department_id, name: m.department_name })),
      companyName: tenant.rows[0]?.name || 'Unknown Company',
      companySlug: tenant.rows[0]?.slug || ''
    });
  } catch (error) { next(error); }
});

app.get('/api/dashboard', authenticate, async (req, res, next) => {
  try {
    if (req.session!.platformAdmin) {
      const tenants = await pool.query<{ count: string }>('SELECT count(*)::text AS count FROM tenants');
      const docs = await pool.query<{ count: string }>('SELECT count(*)::text AS count FROM documents');
      const users = await pool.query<{ count: string }>('SELECT count(*)::text AS count FROM users');
      return res.json({
        documentCount: Number(docs.rows[0]?.count || 0),
        chunkCount: 0,
        readyCount: Number(docs.rows[0]?.count || 0),
        tenantCount: Number(tenants.rows[0]?.count || 0),
        userCount: Number(users.rows[0]?.count || 0),
        recent: []
      });
    }
    const result = await inTenantTransaction(req.session!, async client => {
      const departments = req.session!.departments || [];
      if (!departments.length) {
        return { documentCount: 0, chunkCount: 0, readyCount: 0, recent: [] };
      }
      const counts = await client.query<{ documents: string; chunks: string; ready: string }>(`SELECT count(DISTINCT d.id)::text AS documents, count(c.id)::text AS chunks, count(DISTINCT d.id) FILTER (WHERE d.status = 'ready')::text AS ready FROM documents d LEFT JOIN document_chunks c ON c.document_id = d.id WHERE d.tenant_id = $1 AND d.department_id = ANY($2::uuid[])`, [req.session!.tenantId, departments]);
      const recent = await client.query(`SELECT title, updated_at AS "updatedAt" FROM documents WHERE tenant_id = $1 AND department_id = ANY($2::uuid[]) ORDER BY updated_at DESC LIMIT 3`, [req.session!.tenantId, departments]);
      return { documentCount: Number(counts.rows[0]?.documents || 0), chunkCount: Number(counts.rows[0]?.chunks || 0), readyCount: Number(counts.rows[0]?.ready || 0), recent: recent.rows };
    });
    res.json(result);
  } catch (error) { next(error); }
});

app.get('/api/admin/pending-users', authenticate, async (req, res, next) => {
  try {
    if (req.session!.role !== 'tenant_admin') return res.status(403).json({ error: 'Company administrator role required.' });
    const rows = await inTenantTransaction(req.session!, async client => (await client.query(`
      SELECT 
        u.id, 
        u.email, 
        u.display_name AS "displayName", 
        u.role, 
        u.created_at AS "createdAt",
        d.id AS "requestedDepartmentId",
        d.name AS "requestedDepartmentName"
      FROM users u
      LEFT JOIN department_memberships dm ON dm.user_id = u.id
      LEFT JOIN departments d ON d.id = dm.department_id
      WHERE u.tenant_id = $1 AND u.approval_status = 'pending'
      ORDER BY u.created_at
    `, [req.session!.tenantId])).rows);
    res.json(rows);
  } catch (error) { next(error); }
});

app.get('/api/admin/users', authenticate, async (req, res, next) => {
  try {
    if (req.session!.role !== 'tenant_admin') return res.status(403).json({ error: 'Company administrator role required.' });
    const rows = await inTenantTransaction(req.session!, async client => (await client.query(`
      SELECT 
        u.id, 
        u.email, 
        u.display_name AS "displayName", 
        u.role, 
        u.approval_status AS "approvalStatus", 
        u.approved_at AS "approvedAt", 
        u.created_at AS "createdAt",
        COALESCE(
          json_agg(
            json_build_object('id', d.id, 'name', d.name)
          ) FILTER (WHERE d.id IS NOT NULL),
          '[]'
        ) AS departments
      FROM users u
      LEFT JOIN department_memberships dm ON dm.user_id = u.id
      LEFT JOIN departments d ON d.id = dm.department_id AND d.approval_status = 'approved'
      WHERE u.tenant_id = $1
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `, [req.session!.tenantId])).rows);
    res.json(rows);
  } catch (error) { next(error); }
});

app.patch('/api/admin/users/:userId', authenticate, async (req, res, next) => {
  try {
    if (req.session!.role !== 'tenant_admin') return res.status(403).json({ error: 'Company administrator role required.' });
    const userId = z.string().uuid().parse(req.params.userId);
    const body = z.object({
      role: z.enum(['tenant_admin', 'department_admin', 'member', 'auditor']).optional(),
      approvalStatus: z.enum(['approved', 'rejected', 'pending']).optional(),
      departmentIds: z.array(z.string().uuid()).optional()
    }).parse(req.body);

    await inTenantTransaction(req.session!, async client => {
      const check = await client.query('SELECT id, email, role FROM users WHERE id = $1 AND tenant_id = $2', [userId, req.session!.tenantId]);
      if (!check.rowCount) throw Object.assign(new Error('User not found in this company.'), { status: 404 });

      if (body.role !== undefined || body.approvalStatus !== undefined) {
        const updates: string[] = [];
        const vals: any[] = [];
        let idx = 1;
        if (body.role !== undefined) {
          updates.push(`role = $${idx++}`);
          vals.push(body.role);
        }
        if (body.approvalStatus !== undefined) {
          updates.push(`approval_status = $${idx++}`);
          vals.push(body.approvalStatus);
          if (body.approvalStatus === 'approved') {
            updates.push(`approved_at = now()`);
          }
        }
        vals.push(userId, req.session!.tenantId);
        await client.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${idx++} AND tenant_id = $${idx++}`, vals);
      }

      if (body.departmentIds !== undefined) {
        if (body.departmentIds.length > 0) {
          const deptCheck = await client.query('SELECT id FROM departments WHERE tenant_id = $1 AND id = ANY($2::uuid[])', [req.session!.tenantId, body.departmentIds]);
          if (deptCheck.rowCount !== body.departmentIds.length) {
            throw Object.assign(new Error('One or more department IDs do not belong to this company.'), { status: 400 });
          }
        }
        await client.query('DELETE FROM department_memberships WHERE user_id = $1', [userId]);
        for (const deptId of body.departmentIds) {
          await client.query('INSERT INTO department_memberships (user_id, department_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, deptId]);
        }
      }

      await audit(client, req.session!, 'user.updated', 'user', userId, {
        role: body.role,
        approvalStatus: body.approvalStatus,
        departmentIds: body.departmentIds
      });
    });

    res.json({ success: true, message: 'User settings and department assignments updated.' });
  } catch (error) { next(error); }
});

app.delete('/api/admin/users/:userId', authenticate, async (req, res, next) => {
  try {
    if (req.session!.role !== 'tenant_admin') return res.status(403).json({ error: 'Company administrator role required.' });
    const userId = z.string().uuid().parse(req.params.userId);
    if (userId === req.session!.userId) return res.status(400).json({ error: 'Cannot remove your own administrator account.' });
    await inTenantTransaction(req.session!, async client => {
      const deleted = await client.query('DELETE FROM users WHERE id = $1 AND tenant_id = $2 RETURNING id, email', [userId, req.session!.tenantId]);
      if (!deleted.rowCount) throw Object.assign(new Error('User not found.'), { status: 404 });
      await audit(client, req.session!, 'user.deleted', 'user', userId, { email: deleted.rows[0].email });
    });
    res.json({ success: true, message: 'User removed from company workspace.' });
  } catch (error) { next(error); }
});

app.post('/api/admin/users/:userId/approve', authenticate, async (req, res, next) => {
  try {
    if (req.session!.role !== 'tenant_admin') return res.status(403).json({ error: 'Company administrator role required.' });
    const userId = z.string().uuid().parse(req.params.userId);
    const body = z.object({
      departmentIds: z.array(z.string().uuid()).optional(),
      role: z.enum(['tenant_admin', 'department_admin', 'member', 'auditor']).optional()
    }).optional().parse(req.body);

    const user = await inTenantTransaction(req.session!, async client => {
      const roleClause = body?.role ? `, role = '${body.role}'` : '';
      const updated = await client.query(`UPDATE users SET approval_status = 'approved', approved_at = now()${roleClause} WHERE id = $1 AND tenant_id = $2 AND approval_status = 'pending' RETURNING id, email, role`, [userId, req.session!.tenantId]);
      if (!updated.rowCount) throw Object.assign(new Error('Pending user not found.'), { status: 404 });
      
      if (body?.departmentIds && body.departmentIds.length > 0) {
        await client.query('DELETE FROM department_memberships WHERE user_id = $1', [userId]);
        for (const deptId of body.departmentIds) {
          await client.query('INSERT INTO department_memberships (user_id, department_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [userId, deptId]);
        }
      }
      await audit(client, req.session!, 'user.approved', 'user', userId, { role: body?.role, departmentIds: body?.departmentIds });
      return updated.rows[0];
    });
    res.json({ ...user, status: 'approved' });
  } catch (error) { next(error); }
});

app.post('/api/admin/users/:userId/reject', authenticate, async (req, res, next) => {
  try {
    if (req.session!.role !== 'tenant_admin') return res.status(403).json({ error: 'Company administrator role required.' });
    const userId = z.string().uuid().parse(req.params.userId);
    await inTenantTransaction(req.session!, async client => {
      const updated = await client.query(`UPDATE users SET approval_status = 'rejected' WHERE id = $1 AND tenant_id = $2 AND approval_status = 'pending' RETURNING id`, [userId, req.session!.tenantId]);
      if (!updated.rowCount) throw Object.assign(new Error('Pending user not found.'), { status: 404 });
      await audit(client, req.session!, 'user.rejected', 'user', userId);
    });
    res.json({ id: userId, status: 'rejected' });
  } catch (error) { next(error); }
});

app.post('/api/departments/requests', authenticate, async (req, res, next) => {
  try {
    const body = z.object({ name: z.string().min(2).max(80) }).parse(req.body);
    const department = await inTenantTransaction(req.session!, async client => {
      const created = await client.query<{ id: string; name: string }>(`INSERT INTO departments (tenant_id, name, approval_status, requested_by) VALUES ($1,$2,'pending',$3) RETURNING id, name`, [req.session!.tenantId, body.name.trim(), req.session!.userId]);
      await audit(client, req.session!, 'department.requested', 'department', created.rows[0].id, { name: body.name.trim() });
      return created.rows[0];
    });
    res.status(201).json({ ...department, status: 'pending', message: 'Department request sent to your company administrator.' });
  } catch (error) { next(error); }
});

app.post('/api/admin/departments', authenticate, async (req, res, next) => {
  try {
    if (req.session!.role !== 'tenant_admin') return res.status(403).json({ error: 'Company administrator role required.' });
    const body = z.object({ name: z.string().min(2).max(80) }).parse(req.body);
    const department = await inTenantTransaction(req.session!, async client => {
      const created = await client.query<{ id: string; name: string }>(`INSERT INTO departments (tenant_id, name, approval_status, requested_by, approved_at) VALUES ($1,$2,'approved',$3,now()) RETURNING id, name`, [req.session!.tenantId, body.name.trim(), req.session!.userId]);
      const deptId = created.rows[0].id;
      await client.query('INSERT INTO department_memberships (user_id, department_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.session!.userId, deptId]);
      await audit(client, req.session!, 'department.created', 'department', deptId, { name: body.name.trim() });
      return created.rows[0];
    });
    res.status(201).json({ ...department, status: 'approved', message: `Department "${department.name}" created and assigned.` });
  } catch (error) { next(error); }
});

app.get('/api/admin/pending-departments', authenticate, async (req, res, next) => {
  try {
    if (req.session!.role !== 'tenant_admin') return res.status(403).json({ error: 'Company administrator role required.' });
    const rows = await inTenantTransaction(req.session!, async client => (await client.query(`SELECT d.id, d.name, d.requested_by AS "requestedBy", u.display_name AS "requestedByName", u.email AS "requestedByEmail", d.created_at AS "createdAt" FROM departments d JOIN users u ON u.id = d.requested_by WHERE d.tenant_id = $1 AND d.approval_status = 'pending' ORDER BY d.created_at`, [req.session!.tenantId])).rows);
    res.json(rows);
  } catch (error) { next(error); }
});

app.post('/api/admin/departments/:departmentId/approve', authenticate, async (req, res, next) => {
  try {
    if (req.session!.role !== 'tenant_admin') return res.status(403).json({ error: 'Company administrator role required.' });
    const departmentId = z.string().uuid().parse(req.params.departmentId);
    const department = await inTenantTransaction(req.session!, async client => {
      const updated = await client.query<{ id: string; name: string; requested_by: string }>(`UPDATE departments SET approval_status = 'approved', approved_at = now() WHERE id = $1 AND tenant_id = $2 AND approval_status = 'pending' RETURNING id, name, requested_by`, [departmentId, req.session!.tenantId]);
      if (!updated.rowCount) throw Object.assign(new Error('Pending department request not found.'), { status: 404 });
      await client.query('INSERT INTO department_memberships (user_id, department_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [updated.rows[0].requested_by, departmentId]);
      await audit(client, req.session!, 'department.approved', 'department', departmentId, { name: updated.rows[0].name });
      return updated.rows[0];
    });
    res.json({ id: department.id, name: department.name, status: 'approved' });
  } catch (error) { next(error); }
});

app.post('/api/admin/departments/:departmentId/reject', authenticate, async (req, res, next) => {
  try {
    if (req.session!.role !== 'tenant_admin') return res.status(403).json({ error: 'Company administrator role required.' });
    const departmentId = z.string().uuid().parse(req.params.departmentId);
    await inTenantTransaction(req.session!, async client => {
      const updated = await client.query(`UPDATE departments SET approval_status = 'rejected' WHERE id = $1 AND tenant_id = $2 AND approval_status = 'pending' RETURNING id`, [departmentId, req.session!.tenantId]);
      if (!updated.rowCount) throw Object.assign(new Error('Pending department request not found.'), { status: 404 });
      await audit(client, req.session!, 'department.rejected', 'department', departmentId);
    });
    res.json({ id: departmentId, status: 'rejected' });
  } catch (error) { next(error); }
});
app.get('/api/departments', authenticate, async (req, res, next) => {
  try {
    const rows = await inTenantTransaction(req.session!, async client => (await client.query<{ id: string; name: string }>("SELECT id, name FROM departments WHERE tenant_id = $1 AND approval_status = 'approved' ORDER BY name", [req.session!.tenantId])).rows);
    res.json(rows.filter(row => canAccessDepartment(req.session!, row.id)));
  } catch (error) { next(error); }
});

app.get('/api/departments/catalog', authenticate, async (req, res, next) => {
  try {
    const rows = await inTenantTransaction(req.session!, async client => {
      const result = await client.query<{ id: string; name: string }>(
        "SELECT id, name FROM departments WHERE tenant_id = $1 AND approval_status = 'approved' ORDER BY name",
        [req.session!.tenantId]
      );
      return result.rows;
    });
    const catalog = rows.map(r => ({
      ...r,
      authorized: canAccessDepartment(req.session!, r.id)
    }));
    res.json(catalog);
  } catch (error) { next(error); }
});
app.get('/api/admin/upload-departments', authenticate, async (req, res, next) => {
  try {
    if (req.session!.role !== 'tenant_admin') return res.status(403).json({ error: 'Company administrator role required.' });
    const rows = await inTenantTransaction(req.session!, async client => (await client.query<{ id: string; name: string }>("SELECT id, name FROM departments WHERE tenant_id = $1 AND approval_status = 'approved' ORDER BY name", [req.session!.tenantId])).rows);
    res.json(rows);
  } catch (error) { next(error); }
});

app.get('/api/documents', authenticate, async (req, res, next) => {
  try {
    const departmentId = z.string().uuid().optional().parse(req.query.department);
    if (departmentId && !canAccessDepartment(req.session!, departmentId)) return res.status(403).json({ error: 'Department boundary denied' });
    const rows = await inTenantTransaction(req.session!, async client => {
      const isTenantAdmin = req.session!.role === 'tenant_admin';
      const userDepts = req.session!.departments || [];
      if (!isTenantAdmin && !userDepts.length) return [];

      if (!isTenantAdmin) {
        if (departmentId) {
          return (await client.query(`SELECT id, title, summary, mime_type AS "mimeType", department_id AS "departmentId", classification, status, updated_at AS "updatedAt", byte_size AS "byteSize" FROM documents WHERE tenant_id = $1 AND department_id = $2 ORDER BY updated_at DESC`, [req.session!.tenantId, departmentId])).rows;
        } else {
          return (await client.query(`SELECT id, title, summary, mime_type AS "mimeType", department_id AS "departmentId", classification, status, updated_at AS "updatedAt", byte_size AS "byteSize" FROM documents WHERE tenant_id = $1 AND department_id = ANY($2::uuid[]) ORDER BY updated_at DESC`, [req.session!.tenantId, userDepts])).rows;
        }
      } else {
        return (await client.query(`SELECT id, title, summary, mime_type AS "mimeType", department_id AS "departmentId", classification, status, updated_at AS "updatedAt", byte_size AS "byteSize" FROM documents WHERE tenant_id = $1 AND ($2::uuid IS NULL OR department_id = $2) ORDER BY updated_at DESC`, [req.session!.tenantId, departmentId ?? null])).rows;
      }
    });
    res.json(rows);
  } catch (error) { next(error); }
});

app.get('/api/documents/:documentId/references', authenticate, async (req, res, next) => {
  try {
    const documentId = z.string().uuid().parse(req.params.documentId);
    const references = await inTenantTransaction(req.session!, async client => {
      const document = await client.query<{ department_id: string; title: string }>('SELECT department_id, title FROM documents WHERE id = $1 AND tenant_id = $2', [documentId, req.session!.tenantId]);
      if (!document.rowCount) throw Object.assign(new Error('Document not found.'), { status: 404 });
      if (!canAccessDepartment(req.session!, document.rows[0].department_id)) throw Object.assign(new Error('Department boundary denied'), { status: 403 });
      const chunks = await client.query('SELECT chunk_index AS "chunk", content AS text, token_count AS "tokenCount" FROM document_chunks WHERE document_id = $1 AND tenant_id = $2 ORDER BY chunk_index', [documentId, req.session!.tenantId]);
      return { title: document.rows[0].title, chunks: chunks.rows };
    });
    res.json(references);
  } catch (error) { next(error); }
});

app.post('/api/documents/:documentId/summary', authenticate, async (req, res, next) => {
  try {
    const documentId = z.string().uuid().parse(req.params.documentId);
    const document = await inTenantTransaction(req.session!, async client => {
      const result = await client.query<{ title: string; department_id: string }>('SELECT title, department_id FROM documents WHERE id = $1 AND tenant_id = $2', [documentId, req.session!.tenantId]);
      if (!result.rowCount) throw Object.assign(new Error('Document not found.'), { status: 404 });
      if (!canAccessDepartment(req.session!, result.rows[0].department_id)) throw Object.assign(new Error('Department boundary denied'), { status: 403 });
      const chunks = await client.query<{ content: string }>('SELECT content FROM document_chunks WHERE document_id = $1 AND tenant_id = $2 ORDER BY chunk_index', [documentId, req.session!.tenantId]);
      return { ...result.rows[0], text: chunks.rows.map(chunk => chunk.content).join('\n\n'), count: chunks.rowCount ?? 0 };
    });
    const summary = await summarizeDocument(document.title, document.text, document.count);
    await inTenantTransaction(req.session!, async client => {
      await client.query('UPDATE documents SET summary = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3', [summary, documentId, req.session!.tenantId]);
      await audit(client, req.session!, 'document.summarized', 'document', documentId);
    });
    res.json({ documentId, summary });
  } catch (error) { next(error); }
});

app.post('/api/documents/:documentId/deep-summary', authenticate, async (req, res, next) => {
  try {
    const documentId = z.string().uuid().parse(req.params.documentId);
    const document = await inTenantTransaction(req.session!, async client => {
      const result = await client.query<{ title: string; department_id: string }>('SELECT title, department_id FROM documents WHERE id = $1 AND tenant_id = $2', [documentId, req.session!.tenantId]);
      if (!result.rowCount) throw Object.assign(new Error('Document not found.'), { status: 404 });
      if (!canAccessDepartment(req.session!, result.rows[0].department_id)) throw Object.assign(new Error('Department boundary denied'), { status: 403 });
      const chunks = await client.query<{ content: string }>('SELECT content FROM document_chunks WHERE document_id = $1 AND tenant_id = $2 ORDER BY chunk_index', [documentId, req.session!.tenantId]);
      return { ...result.rows[0], text: chunks.rows.map(chunk => chunk.content).join('\n\n') };
    });
    const deepSummary = await generateDeepSummary(document.title, document.text);
    await inTenantTransaction(req.session!, async client => {
      await client.query('UPDATE documents SET summary = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3', [deepSummary, documentId, req.session!.tenantId]);
      await audit(client, req.session!, 'document.deep_summarized', 'document', documentId);
    });
    res.json({ documentId, summary: deepSummary });
  } catch (error) { next(error); }
});

app.post('/api/documents/:documentId/summarize-custom', authenticate, async (req, res, next) => {
  try {
    const documentId = z.string().uuid().parse(req.params.documentId);
    const body = z.object({
      style: z.enum(['executive', 'checklist', 'risks', 'takeaways']).default('executive')
    }).parse(req.body);

    const document = await inTenantTransaction(req.session!, async client => {
      const result = await client.query<{ title: string; department_id: string }>('SELECT title, department_id FROM documents WHERE id = $1 AND tenant_id = $2', [documentId, req.session!.tenantId]);
      if (!result.rowCount) throw Object.assign(new Error('Document not found.'), { status: 404 });
      if (!canAccessDepartment(req.session!, result.rows[0].department_id)) throw Object.assign(new Error('Department boundary denied'), { status: 403 });
      const chunks = await client.query<{ content: string }>('SELECT content FROM document_chunks WHERE document_id = $1 AND tenant_id = $2 ORDER BY chunk_index', [documentId, req.session!.tenantId]);
      return { ...result.rows[0], text: chunks.rows.map(chunk => chunk.content).join('\n\n') };
    });

    const summary = await generateCustomSummary(document.title, document.text, body.style as SummaryStyle);
    await inTenantTransaction(req.session!, async client => {
      await audit(client, req.session!, 'document.custom_summarized', 'document', documentId, { style: body.style });
    });
    res.json({ documentId, title: document.title, style: body.style, summary });
  } catch (error) { next(error); }
});

app.post('/api/documents/summarize-text', authenticate, rateLimit('summarize-text', 20, 60 * 1000), async (req, res, next) => {
  try {
    const body = z.object({
      text: z.string().min(20).max(50_000),
      title: z.string().min(2).max(160).optional(),
      style: z.enum(['executive', 'checklist', 'risks', 'takeaways']).default('executive')
    }).parse(req.body);

    const title = body.title || 'Ad-Hoc Knowledge Resource';
    const summary = await generateCustomSummary(title, body.text, body.style as SummaryStyle);
    await inTenantTransaction(req.session!, async client => {
      await audit(client, req.session!, 'resource.summarized', 'resource', 'ad-hoc', { style: body.style, title });
    });
    res.json({ title, style: body.style, summary });
  } catch (error) { next(error); }
});

app.post('/api/documents/compare', authenticate, async (req, res, next) => {
  try {
    const body = z.object({
      documentId1: z.string().uuid(),
      documentId2: z.string().uuid()
    }).parse(req.body);

    const docs = await inTenantTransaction(req.session!, async client => {
      const fetchDoc = async (id: string) => {
        const result = await client.query<{ id: string; title: string; department_id: string }>('SELECT id, title, department_id FROM documents WHERE id = $1 AND tenant_id = $2', [id, req.session!.tenantId]);
        if (!result.rowCount) throw Object.assign(new Error(`Document ${id} not found.`), { status: 404 });
        if (!canAccessDepartment(req.session!, result.rows[0].department_id)) throw Object.assign(new Error('Department boundary denied'), { status: 403 });
        const chunks = await client.query<{ content: string }>('SELECT content FROM document_chunks WHERE document_id = $1 AND tenant_id = $2 ORDER BY chunk_index', [id, req.session!.tenantId]);
        return { id: result.rows[0].id, title: result.rows[0].title, text: chunks.rows.map(c => c.content).join('\n\n') };
      };
      const d1 = await fetchDoc(body.documentId1);
      const d2 = await fetchDoc(body.documentId2);
      return { d1, d2 };
    });

    const synthesis = await compareDocuments(docs.d1, docs.d2);
    await inTenantTransaction(req.session!, async client => {
      await audit(client, req.session!, 'documents.compared', 'documents', body.documentId1, { documentId2: body.documentId2 });
    });
    res.json({
      doc1: { id: docs.d1.id, title: docs.d1.title },
      doc2: { id: docs.d2.id, title: docs.d2.title },
      synthesis
    });
  } catch (error) { next(error); }
});

app.post('/api/documents/upload', authenticate, rateLimit('upload', 30, 60 * 60_000), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'A document file is required.' });
    const fields = z.object({ departmentId: z.string().uuid(), classification: z.enum(['public', 'internal', 'confidential', 'restricted']).default('internal') }).parse(req.body);
    if (req.session!.role !== 'tenant_admin' && !canAccessDepartment(req.session!, fields.departmentId)) return res.status(403).json({ error: 'Department boundary denied' });
    const text = await extractText(req.file), contentHash = sha256(req.file.buffer), chunks = recursiveChunk(text);
    if (!chunks.length) return res.status(422).json({ error: 'No usable chunks were generated.' });
    const embeddings = await embed(chunks);
    const summary = await summarizeDocument(req.file.originalname, text, chunks.length);
    const doc = await inTenantTransaction(req.session!, async client => {
      const inserted = await client.query<{ id: string }>(`INSERT INTO documents (tenant_id, department_id, title, summary, content_hash, mime_type, byte_size, classification, status, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'processing',$9) ON CONFLICT (tenant_id, department_id, content_hash) DO NOTHING RETURNING id`, [req.session!.tenantId, fields.departmentId, req.file!.originalname, summary, contentHash, req.file!.mimetype, req.file!.size, fields.classification, req.session!.userId]);
      const id = inserted.rows[0]?.id;
      if (!id) throw Object.assign(new Error('This exact document already exists in the selected department.'), { status: 409 });
      for (let index = 0; index < chunks.length; index++) await client.query(`INSERT INTO document_chunks (document_id, tenant_id, department_id, content, token_count, content_hash, metadata, embedding, chunk_index) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::vector,$9)`, [id, req.session!.tenantId, fields.departmentId, chunks[index], estimateTokens(chunks[index]), sha256(chunks[index]), JSON.stringify({ filename: req.file!.originalname, ingestion: 'recursive-overlap-v1', vectorMode: embeddings ? 'provider-embedding' : 'local-hash-fallback' }), vector(embeddings ? embeddings[index] : localEmbedding(chunks[index])), index]);
      await client.query("UPDATE documents SET status = 'ready', updated_at = now() WHERE id = $1", [id]);
      await audit(client, req.session!, 'document.ingested', 'document', id, { chunks: chunks.length, embeddingProvider: embeddings ? 'openai' : 'local-hash-fallback' });
      return { id, chunks: chunks.length, embeddings: Boolean(embeddings) };
    });
    res.status(201).json({ ...doc, message: `Ingested ${doc.chunks} boundary-aware chunks.` });
  } catch (error) { next(error); }
});

app.delete('/api/documents/:documentId', authenticate, async (req, res, next) => {
  try {
    const documentId = z.string().uuid().parse(req.params.documentId);
    await inTenantTransaction(req.session!, async client => {
      const doc = await client.query<{ id: string; title: string; department_id: string; created_by: string | null }>(
        'SELECT id, title, department_id, created_by FROM documents WHERE id = $1 AND tenant_id = $2',
        [documentId, req.session!.tenantId]
      );
      if (!doc.rowCount) throw Object.assign(new Error('Document not found.'), { status: 404 });
      if (!canAccessDepartment(req.session!, doc.rows[0].department_id)) {
        throw Object.assign(new Error('Department boundary denied'), { status: 403 });
      }

      const isTenantAdmin = req.session!.role === 'tenant_admin';
      const isDeptAdmin = req.session!.role === 'department_admin';
      const isAuthor = Boolean(doc.rows[0].created_by && doc.rows[0].created_by === req.session!.userId);

      if (!isTenantAdmin && !isDeptAdmin && !isAuthor) {
        throw Object.assign(new Error('Document deletion requires Administrator or author privileges.'), { status: 403 });
      }

      await client.query('DELETE FROM documents WHERE id = $1 AND tenant_id = $2', [documentId, req.session!.tenantId]);
      await audit(client, req.session!, 'document.deleted', 'document', documentId, { title: doc.rows[0].title, departmentId: doc.rows[0].department_id });
    });
    res.json({ success: true, message: 'Document and vectorized chunks removed from knowledge base.' });
  } catch (error) { next(error); }
});

app.post('/api/rag/query', authenticate, async (req, res, next) => {
  try {
    const body = z.object({
      question: z.string().min(3).max(4_000),
      departmentId: z.string().uuid(),
      searchMode: z.enum(['hybrid', 'vector', 'keyword']).default('hybrid')
    }).parse(req.body);

    if (!canAccessDepartment(req.session!, body.departmentId)) return res.status(403).json({ error: 'Department boundary denied' });
    const providerEmbedding = await embed([body.question]);
    const questionEmbedding = providerEmbedding?.[0] ?? localEmbedding(body.question);

    const citations = await inTenantTransaction(req.session!, async client => {
      let rows: Array<{
        text: string;
        chunk: number;
        documentId: string;
        title: string;
        score: number;
        vectorScore: number;
        textScore: number;
        matchType: string;
      }> = [];

      if (body.searchMode === 'vector') {
        const sql = `
          SELECT c.content AS text, c.chunk_index AS chunk, d.id AS "documentId", d.title,
                 ROUND(GREATEST(0, LEAST(1, 1 - (c.embedding <=> $3::vector)))::numeric, 4)::float AS score,
                 ROUND(GREATEST(0, LEAST(1, 1 - (c.embedding <=> $3::vector)))::numeric, 4)::float AS "vectorScore",
                 0.0::float AS "textScore",
                 'vector' AS "matchType"
          FROM document_chunks c
          JOIN documents d ON d.id = c.document_id
          WHERE c.tenant_id = $1 AND c.department_id = $2 AND d.status = 'ready' AND c.embedding IS NOT NULL
          ORDER BY c.embedding <=> $3::vector
          LIMIT 5
        `;
        rows = (await client.query(sql, [req.session!.tenantId, body.departmentId, vector(questionEmbedding)])).rows;
      } else if (body.searchMode === 'keyword') {
        const sql = `
          SELECT c.content AS text, c.chunk_index AS chunk, d.id AS "documentId", d.title,
                 ROUND(ts_rank_cd(to_tsvector('english', regexp_replace(c.content || ' ' || d.title, '[-_.]', ' ', 'g')), websearch_to_tsquery('english', $3))::numeric, 4)::float AS score,
                 0.0::float AS "vectorScore",
                 ROUND(ts_rank_cd(to_tsvector('english', regexp_replace(c.content || ' ' || d.title, '[-_.]', ' ', 'g')), websearch_to_tsquery('english', $3))::numeric, 4)::float AS "textScore",
                 'keyword' AS "matchType"
          FROM document_chunks c
          JOIN documents d ON d.id = c.document_id
          WHERE c.tenant_id = $1 AND c.department_id = $2 AND d.status = 'ready'
            AND to_tsvector('english', regexp_replace(c.content || ' ' || d.title, '[-_.]', ' ', 'g')) @@ websearch_to_tsquery('english', $3)
          ORDER BY score DESC
          LIMIT 5
        `;
        rows = (await client.query(sql, [req.session!.tenantId, body.departmentId, body.question])).rows;
      } else {
        // Hybrid Search (Dense pgvector + PostgreSQL Lexical Text-Search via Reciprocal Rank Fusion / RRF)
        const sql = `
          WITH vector_search AS (
            SELECT c.id, c.content AS text, c.chunk_index AS chunk, d.id AS "documentId", d.title,
                   GREATEST(0, LEAST(1, 1 - (c.embedding <=> $3::vector))) AS vec_score,
                   ROW_NUMBER() OVER (ORDER BY c.embedding <=> $3::vector) AS vec_rank
            FROM document_chunks c
            JOIN documents d ON d.id = c.document_id
            WHERE c.tenant_id = $1 AND c.department_id = $2 AND d.status = 'ready' AND c.embedding IS NOT NULL
            LIMIT 25
          ),
          text_search AS (
            SELECT c.id, c.content AS text, c.chunk_index AS chunk, d.id AS "documentId", d.title,
                   ts_rank_cd(to_tsvector('english', regexp_replace(c.content || ' ' || d.title, '[-_.]', ' ', 'g')), websearch_to_tsquery('english', $4)) AS text_score,
                   ROW_NUMBER() OVER (ORDER BY ts_rank_cd(to_tsvector('english', regexp_replace(c.content || ' ' || d.title, '[-_.]', ' ', 'g')), websearch_to_tsquery('english', $4)) DESC) AS text_rank
            FROM document_chunks c
            JOIN documents d ON d.id = c.document_id
            WHERE c.tenant_id = $1 AND c.department_id = $2 AND d.status = 'ready'
              AND to_tsvector('english', regexp_replace(c.content || ' ' || d.title, '[-_.]', ' ', 'g')) @@ websearch_to_tsquery('english', $4)
            LIMIT 25
          )
          SELECT 
            COALESCE(v.id, t.id) as id,
            COALESCE(v.text, t.text) as text,
            COALESCE(v.chunk, t.chunk) as chunk,
            COALESCE(v."documentId", t."documentId") as "documentId",
            COALESCE(v.title, t.title) as title,
            ROUND(COALESCE(v.vec_score, 0)::numeric, 4)::float as "vectorScore",
            ROUND(COALESCE(t.text_score, 0)::numeric, 4)::float as "textScore",
            ROUND((COALESCE(1.0 / (60 + v.vec_rank), 0.0) + COALESCE(1.0 / (60 + t.text_rank), 0.0))::numeric, 6)::float as score,
            CASE
              WHEN v.id IS NOT NULL AND t.id IS NOT NULL THEN 'hybrid'
              WHEN v.id IS NOT NULL THEN 'vector'
              ELSE 'keyword'
            END as "matchType"
          FROM vector_search v
          FULL OUTER JOIN text_search t ON v.id = t.id
          ORDER BY score DESC
          LIMIT 5
        `;
        rows = (await client.query(sql, [req.session!.tenantId, body.departmentId, vector(questionEmbedding), body.question])).rows;
      }

      await audit(client, req.session!, 'rag.query', 'department', body.departmentId, {
        searchMode: body.searchMode,
        retrieval: providerEmbedding ? 'provider-pgvector' : 'local-pgvector',
        results: rows.length
      });
      return rows;
    });

    const generated = await generateGroundedAnswer(body.question, citations);
    const model = process.env.GROQ_API_KEY ? (process.env.GROQ_LLM_MODEL || 'qwen/qwen3.8-27b') : (process.env.OPENAI_LLM_MODEL || 'gpt-4o-mini');
    const retrievalDescription = body.searchMode === 'hybrid'
      ? (providerEmbedding ? 'Hybrid RRF (OpenAI pgvector dense + PostgreSQL lexical text-search)' : 'Hybrid RRF (pgvector cosine + PostgreSQL tsvector lexical)')
      : body.searchMode === 'vector'
        ? (providerEmbedding ? 'Dense pgvector cosine similarity (OpenAI)' : 'Dense pgvector cosine similarity')
        : 'PostgreSQL full-text lexical ranking (tsvector / websearch_to_tsquery)';

    res.json({
      answer: generated ?? (citations.length ? `Authorized evidence (LLM unavailable):\n\n${citations.map(c => c.text).join('\n\n')}` : 'No authorized material was found in this department.'),
      citations,
      generation: generated ? `${process.env.GROQ_API_KEY ? 'Groq' : 'OpenAI'} (${model}) grounded generation` : (citations.length ? 'Authorized retrieval fallback' : 'No matching department knowledge'),
      retrieval: retrievalDescription,
      searchMode: body.searchMode
    });
  } catch (error) { next(error); }
});

app.post('/api/rag/feedback', authenticate, async (req, res, next) => {
  try {
    const body = z.object({
      question: z.string(),
      rating: z.enum(['positive', 'negative']),
      departmentId: z.string().uuid(),
      comment: z.string().optional()
    }).parse(req.body);
    await inTenantTransaction(req.session!, async client => {
      await audit(client, req.session!, 'rag.feedback', 'department', body.departmentId, {
        rating: body.rating,
        question: body.question.slice(0, 200),
        comment: body.comment || null
      });
    });
    res.json({ success: true, message: 'Thank you for your feedback!' });
  } catch (error) { next(error); }
});

app.get('/api/analytics', authenticate, async (req, res, next) => {
  try {
    const result = await inTenantTransaction(req.session!, async client => {
      const depts = req.session!.departments || [];
      const stats = await client.query(`
        SELECT 
          count(DISTINCT d.id)::int as "totalDocs",
          count(c.id)::int as "totalChunks",
          COALESCE(sum(c.token_count), 0)::int as "totalTokens",
          COALESCE(sum(d.byte_size), 0)::bigint as "totalBytes",
          count(DISTINCT d.id) FILTER (WHERE d.classification = 'internal')::int as "internalDocs",
          count(DISTINCT d.id) FILTER (WHERE d.classification = 'confidential')::int as "confidentialDocs",
          count(DISTINCT d.id) FILTER (WHERE d.classification = 'restricted')::int as "restrictedDocs",
          count(DISTINCT d.id) FILTER (WHERE d.classification = 'public')::int as "publicDocs"
        FROM documents d
        LEFT JOIN document_chunks c ON c.document_id = d.id
        WHERE d.tenant_id = $1 AND d.department_id = ANY($2::uuid[])
      `, [req.session!.tenantId, depts]);
      const queries = await client.query<{ count: string }>(`
        SELECT count(*)::text as count FROM audit_events WHERE tenant_id = $1 AND action = 'rag.query' AND created_at > now() - interval '7 days'
      `, [req.session!.tenantId]);
      return {
        metrics: stats.rows[0],
        queries7d: Number(queries.rows[0]?.count || 0)
      };
    });
    res.json(result);
  } catch (error) { next(error); }
});

app.get('/api/audit', authenticate, async (req, res, next) => {
  try {
    if (req.session!.role === 'member') return res.status(403).json({ error: 'Auditor or administrator role required.' });
    const rows = await inTenantTransaction(req.session!, async client => (await client.query(`SELECT action, entity_type AS "entityType", entity_id AS "entityId", metadata, created_at AS "createdAt" FROM audit_events WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50`, [req.session!.tenantId])).rows);
    res.json(rows);
  } catch (error) { next(error); }
});

app.get('/api/audit/export', authenticate, async (req, res, next) => {
  try {
    if (req.session!.role === 'member') return res.status(403).json({ error: 'Auditor or administrator role required.' });
    const rows = await inTenantTransaction(req.session!, async client => (await client.query(`SELECT id, action, entity_type AS "entityType", entity_id AS "entityId", metadata, created_at AS "createdAt" FROM audit_events WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 500`, [req.session!.tenantId])).rows);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="raghub-audit-trail.json"');
    res.json(rows);
  } catch (error) { next(error); }
});
app.get('/api/auth/oidc/start', (_req, res) => res.status(501).json({ error: 'OIDC provider integration must be configured for your issuer. Database authentication is active.' }));
app.use((error: Error & { status?: number; issues?: { path: (string | number)[]; message: string }[] }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  const validation = error.issues?.[0];
  const message = validation ? `${validation.path.join(' ') || 'Input'}: ${validation.message}` : (error.message || 'Unexpected server error');
  res.status(error.status ?? (validation ? 400 : 500)).json({ error: message });
});
app.listen(4000, () => console.log('RAG Hub API listening on http://localhost:4000'));
