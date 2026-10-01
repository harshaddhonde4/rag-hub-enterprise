import 'dotenv/config';
import { pool } from './db.js';
import { localEmbedding, recursiveChunk, sha256, estimateTokens, summarizeDocument } from './ingestion.js';

const vector = (values: number[]) => `[${values.join(',')}]`;

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const ADMIN_ID = '00000000-0000-0000-0000-000000000101';

const OP_DEPT = '00000000-0000-0000-0000-000000000011';
const LEGAL_DEPT = '00000000-0000-0000-0000-000000000012';
const FINANCE_DEPT = '00000000-0000-0000-0000-000000000013';

const demoDocs = [
  {
    deptId: OP_DEPT,
    title: 'Acme-Incident-Response-Runbook-v3.md',
    mimeType: 'text/markdown',
    classification: 'internal',
    content: `# Acme Incident Response Runbook (Sev-1 & Sev-2)

## 1. Incident Severity Definitions
- **Sev-1 (Critical)**: Production outage, customer data risk, or complete service degradation affecting > 10% of users. SLA: Page On-Call Incident Commander within 5 minutes.
- **Sev-2 (Major)**: Partial degradation or redundancy failure with active workaround. SLA: Page within 15 minutes.
- **Sev-3 (Minor)**: Non-urgent system anomalies or minor internal tool disruptions. SLA: Next business day.

## 2. On-Call Incident Commander Duties
The designated Incident Commander (IC) owns end-to-end orchestration:
1. Open the dedicated Slack war room \`#incident-sev1-war-room\` and bridge audio.
2. Designate a Scribe to record real-time remediation actions and timestamps.
3. Communications Lead must review and approve all external status page bulletins before release.
4. Mitigation takes precedence over root-cause investigation. Failover to secondary multi-region replica before detailed debugging.

## 3. Post-Incident Review (PIR)
Within 48 hours of resolution, a blameless post-mortem must be drafted detailing root cause, timeline, customer impact, and action items with assigned owners.`
  },
  {
    deptId: OP_DEPT,
    title: 'Acme-Zero-Trust-Infrastructure-Security.md',
    mimeType: 'text/markdown',
    classification: 'restricted',
    content: `# Acme Infrastructure Security & Access Architecture

## 1. Zero Trust Principles
All internal microservices and databases require mutual TLS (mTLS) with short-lived X.509 certificates rotated every 24 hours.
No engineer has persistent production SSH or direct database credentials.

## 2. Just-In-Time (JIT) Elevation
Privileged access to production clusters requires automated JIT approval:
- Maximum duration: 2 hours.
- Two-person sign-off required from SRE leads.
- Full session audit logging enabled and streamed to immutable storage.

## 3. Database Isolation and pgvector
Tenant data stores utilize PostgreSQL Row-Level Security (RLS) policies conditioned on \`app.tenant_id\`.
Document vector embeddings are encrypted at rest with AES-256 and restricted to authorized department boundaries.`
  },
  {
    deptId: LEGAL_DEPT,
    title: 'Master-Services-Agreement-Enterprise-Terms.md',
    mimeType: 'text/markdown',
    classification: 'confidential',
    content: `# Acme Master Services Agreement (MSA) - Enterprise Standard Terms

## 1. Confidentiality & Non-Disclosure
Each party agrees that all code, customer datasets, architectural diagrams, and pricing disclosed constitute Confidential Information. Confidentiality obligations survive for 5 years following termination of agreement.

## 2. Data Protection & Compliance (GDPR & CCPA)
Acme acts as a Data Processor under GDPR Art. 28. Customer retains full ownership of tenant datasets and document embeddings.
Data subject deletion requests (Right to Erasure) must be fulfilled within 14 calendar days across all database tables, vector indexes, and backups.

## 3. Limitation of Liability
Except for breaches of Section 1 (Confidentiality) or gross negligence, neither party's aggregate liability shall exceed the total fees paid by Customer during the 12 months preceding the claim.`
  },
  {
    deptId: LEGAL_DEPT,
    title: 'Intellectual-Property-&-AI-Usage-Policy.md',
    mimeType: 'text/markdown',
    classification: 'internal',
    content: `# Acme Intellectual Property & AI Governance Policy

## 1. Proprietary Rights in Model Outputs
Customer retains sole ownership and intellectual property rights in all proprietary queries, uploaded knowledge documents, and grounded RAG answer outputs.
Acme warrants that no customer queries or private document embeddings are ever used to train public or foundational third-party LLMs.

## 2. Permitted AI Providers
Only SOC2 Type II and HIPAA-compliant AI inference providers (Groq and OpenAI Enterprise with zero-retention agreements) are authorized for LLM summarization and grounded answering.
Open-source local deterministic embeddings are provided as an offline privacy guarantee.`
  },
  {
    deptId: FINANCE_DEPT,
    title: 'Corporate-Travel-&-Expense-Reimbursement-Policy.md',
    mimeType: 'text/markdown',
    classification: 'internal',
    content: `# Acme Corporate Travel & Expense (T&E) Policy

## 1. Meal & Per Diem Allowances
- Domestic Travel: Maximum daily per diem is $85 per day ($20 breakfast, $25 lunch, $40 dinner).
- International Travel: Maximum daily per diem is $125 per day.
- Itemized receipts are mandatory for all single transactions exceeding $25.

## 2. Flight & Hotel Accommodations
- Flights under 6 hours: Economy class must be booked at least 14 days in advance.
- Flights exceeding 6 hours: Premium Economy is permitted with Department Head prior approval.
- Hotel cap: Up to $275 per night in standard cities; up to $350 per night in high-cost metro areas (NYC, SF, London, Tokyo).

## 3. Expense Submission Deadlines
All expense reports must be submitted via the finance portal within 30 days of expense incurrence. Expenses submitted after 60 days are subject to rejection.`
  },
  {
    deptId: FINANCE_DEPT,
    title: 'Procurement-&-Vendor-Spend-Thresholds.md',
    mimeType: 'text/markdown',
    classification: 'confidential',
    content: `# Acme Procurement & Purchasing Authority Matrix

## 1. Expenditure Authorization Limits
- **Level 1 (Under $5,000)**: Direct Manager approval required. No RFP needed.
- **Level 2 ($5,000 - $25,000)**: Department Head approval required. At least 2 competitive vendor quotes.
- **Level 3 ($25,000 - $100,000)**: VP of Department + Finance Director approval required.
- **Level 4 ($100,000+)**: Chief Financial Officer (CFO) and Chief Executive Officer (CEO) sign-off required along with Legal vendor contract review.

## 2. Annual SaaS License Renewals
All recurring software subscriptions must undergo annual cost-benefit review 60 days prior to contract auto-renewal date.`
  }
];

async function seed() {
  console.log('Starting rich demo data seeding and vector backfill...');

  // 1. Backfill any existing document chunks that have NULL embeddings
  const nullChunks = await pool.query<{ id: string; content: string }>('SELECT id, content FROM document_chunks WHERE embedding IS NULL');
  if (nullChunks.rowCount && nullChunks.rowCount > 0) {
    console.log(`Backfilling ${nullChunks.rowCount} chunks with NULL embeddings...`);
    for (const chunk of nullChunks.rows) {
      const emb = localEmbedding(chunk.content);
      await pool.query('UPDATE document_chunks SET embedding = $1::vector WHERE id = $2', [vector(emb), chunk.id]);
    }
  }

  // 2. Insert rich demo documents for each department
  for (const doc of demoDocs) {
    const text = doc.content;
    const hash = sha256(text);
    const chunks = recursiveChunk(text);
    const summary = await summarizeDocument(doc.title, text, chunks.length);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Set RLS variables
      await client.query("SELECT set_config('app.tenant_id', $1, true), set_config('app.user_id', $2, true)", [TENANT_ID, ADMIN_ID]);

      const docRes = await client.query<{ id: string }>(
        `INSERT INTO documents (tenant_id, department_id, title, summary, content_hash, mime_type, byte_size, classification, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ready', $9)
         ON CONFLICT (tenant_id, department_id, content_hash)
         DO UPDATE SET title = EXCLUDED.title, summary = EXCLUDED.summary, updated_at = now()
         RETURNING id`,
        [TENANT_ID, doc.deptId, doc.title, summary, hash, doc.mimeType, Buffer.byteLength(text), doc.classification, ADMIN_ID]
      );
      const docId = docRes.rows[0].id;

      // Delete old chunks if updating
      await client.query('DELETE FROM document_chunks WHERE document_id = $1', [docId]);

      for (let i = 0; i < chunks.length; i++) {
        const chunkText = chunks[i];
        const emb = localEmbedding(chunkText);
        await client.query(
          `INSERT INTO document_chunks (document_id, tenant_id, department_id, content, token_count, content_hash, metadata, embedding, chunk_index)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector, $9)`,
          [
            docId,
            TENANT_ID,
            doc.deptId,
            chunkText,
            estimateTokens(chunkText),
            sha256(chunkText),
            JSON.stringify({ filename: doc.title, ingestion: 'recursive-v2', vectorMode: 'local-hash-fallback' }),
            vector(emb),
            i
          ]
        );
      }

      await client.query('COMMIT');
      console.log(`✓ Seeded ${doc.title} (${chunks.length} chunks) in department ${doc.deptId}`);
    } catch (e) {
      await client.query('ROLLBACK');
      console.error(`Failed to seed ${doc.title}:`, e);
    } finally {
      client.release();
    }
  }

  console.log('Seeding finished successfully.');
  await pool.end();
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
