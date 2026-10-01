CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE tenants (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, slug text UNIQUE NOT NULL, approval_status text NOT NULL DEFAULT 'pending' CHECK(approval_status IN ('pending','approved','rejected')), approved_at timestamptz, created_at timestamptz DEFAULT now());
CREATE TABLE departments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE, name text NOT NULL, UNIQUE(tenant_id, name));
CREATE TABLE users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE, email text NOT NULL, display_name text NOT NULL, password_hash text, oidc_subject text, role text NOT NULL CHECK(role IN ('tenant_admin','department_admin','member','auditor')), approval_status text NOT NULL DEFAULT 'pending' CHECK(approval_status IN ('pending','approved','rejected')), approved_at timestamptz, created_at timestamptz DEFAULT now(), UNIQUE(tenant_id,email), UNIQUE(tenant_id,oidc_subject));
CREATE TABLE platform_admins (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text UNIQUE NOT NULL, password_hash text NOT NULL, display_name text NOT NULL, created_at timestamptz DEFAULT now());
CREATE TABLE department_memberships (user_id uuid REFERENCES users(id) ON DELETE CASCADE, department_id uuid REFERENCES departments(id) ON DELETE CASCADE, PRIMARY KEY(user_id,department_id));
CREATE TABLE documents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE, department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE, title text NOT NULL, source_uri text, content_hash text NOT NULL, mime_type text NOT NULL, byte_size bigint NOT NULL, classification text NOT NULL DEFAULT 'internal', status text NOT NULL DEFAULT 'processing', created_by uuid REFERENCES users(id), created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), CHECK(classification IN ('public','internal','confidential','restricted')), UNIQUE(tenant_id, department_id, content_hash));
CREATE TABLE document_chunks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE, tenant_id uuid NOT NULL, department_id uuid NOT NULL, content text NOT NULL, token_count int NOT NULL, content_hash text NOT NULL, metadata jsonb NOT NULL DEFAULT '{}', embedding vector(1536), chunk_index int NOT NULL, UNIQUE(document_id, chunk_index));
CREATE INDEX chunks_scope_embedding ON document_chunks (tenant_id, department_id);
CREATE INDEX chunks_embedding_hnsw ON document_chunks USING hnsw (embedding vector_cosine_ops) WHERE embedding IS NOT NULL;
CREATE TABLE audit_events (id bigserial PRIMARY KEY, tenant_id uuid NOT NULL, actor_id uuid, action text NOT NULL, entity_type text NOT NULL, entity_id text, metadata jsonb DEFAULT '{}', created_at timestamptz DEFAULT now());

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY document_tenant_scope ON documents USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY chunk_tenant_scope ON document_chunks USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY audit_tenant_scope ON audit_events USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
