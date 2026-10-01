# RAG Hub Enterprise 🛡️⚡

> **Multi-Tenant, Department-Isolated Sovereign Knowledge Intelligence Platform**  
> *Kernel-Enforced PostgreSQL Row-Level Security (RLS) · pgvector HNSW Vector Search · Hardware-Accelerated Groq Inference · Enterprise RBAC & SOC 2 Telemetry*

[![Database: PostgreSQL 16](https://img.shields.io/badge/Database-PostgreSQL_16_pgvector-336791.svg?style=flat&logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![Inference: Groq](https://img.shields.io/badge/Inference-Groq_Llama3.3_Qwen2.5-F55036.svg?style=flat)](https://groq.com)
[![Docker: Containerized](https://img.shields.io/badge/Deploy-Docker_Compose-2496ED.svg?style=flat&logo=docker&logoColor=white)](https://docker.com)
[![Security: Row-Level Security](https://img.shields.io/badge/Security-Double--Gated_RLS-10b981.svg?style=flat)](docs/ENTERPRISE_PLATFORM_DOCUMENTATION.md)
[![License: Enterprise Proprietary](https://img.shields.io/badge/License-Enterprise_Proprietary-blue.svg?style=flat)](#)

---

## 🏛️ Executive Architecture

Unlike conventional RAG applications that rely solely on application-layer filtering (`WHERE tenant_id = '...'`), **RAG Hub Enterprise** enforces **double-gated kernel-level cryptographic isolation** through PostgreSQL Row-Level Security (RLS) coupled with transaction-scoped session contexts (`SET LOCAL app.tenant_id = '...'`).

```
+----------------------------------------------------------------------------------------------------+
|                                      CLIENT INTERACTION LAYER                                      |
|  +--------------------------------------------+    +--------------------------------------------+  |
|  |       Public Enterprise Portal             |    |         Private Multi-Tenant Workspace     |  |
|  |  - Marketing, Solutions & Pricing          |    |  - Knowledge Chat with Verified Citations  |  |
|  |  - Interactive RLS Sandbox Simulator       |    |  - Document Library & Abstract Ingestion   |  |
|  |  - Security Trust Center & Architecture    |    |  - Department Isolation Boundaries         |  |
|  |  - Developer Documentation & API Specs     |    |  - Audit Trail & SOC 2 Compliance Export  |  |
|  +--------------------------------------------+    +--------------------------------------------+  |
+--------------------------------------------------+-------------------------------------------------+
                                                   | HTTPS (TLS 1.3)
                                                   v
+----------------------------------------------------------------------------------------------------+
|                                    GATEWAY & APPLICATION SERVER                                    |
|  +----------------------------------------------------------------------------------------------+  |
|  |  Express.js API Engine (Node.js LTS / TypeScript Workspace)                                  |  |
|  |  - JWT Middleware (Tenant Slug, User ID, Role, Department Claims)                             |  |
|  |  - Multi-Part File Parser: PDF, DOCX, Markdown, TXT, CSV, JSON                                |  |
|  |  - Intelligent Text Extraction & Semantic Chunking (800 token target, 100 token overlap)      |  |
|  |  - SHA-256 Content Deduplication Hash Registry                                               |  |
|  |  - Groq High-Speed Inference Gateway (qwen-2.5-32b / llama-3.3-70b-versatile)                |  |
|  +----------------------------------------------------------------------------------------------+  |
+--------------------------------------------------+-------------------------------------------------+
                                                   | Pooled PostgreSQL Connection (with RLS Transaction)
                                                   v
+----------------------------------------------------------------------------------------------------+
|                              STORAGE & KERNEL SECURITY LAYER (PostgreSQL 16)                       |
|  +----------------------------------------------------------------------------------------------+  |
|  |  1. Transaction Boundary:                                                                     |  |
|  |     BEGIN; SET LOCAL app.tenant_id = '<uuid>'; SET LOCAL app.user_id = '<uuid>';              |  |
|  |  2. Vector Indexing:                                                                          |  |
|  |     pgvector HNSW (Hierarchical Navigable Small World) with Cosine Distance (<=>)             |  |
|  |  3. Lexical Indexing:                                                                         |  |
|  |     English tsvector GIN index for keyword hybrid matching                                    |  |
|  |  4. Immutable Compliance Telemetry:                                                           |  |
|  |     audit_logs table capturing actor, action, entity, metadata, and timestamps                |  |
|  |     COMMIT;                                                                                  |  |
|  +----------------------------------------------------------------------------------------------+  |
+----------------------------------------------------------------------------------------------------+
```

---

## 🔒 Department Isolation & Zero-Trust Defense

Every enterprise employee belongs to verified department scopes (`Operations`, `Finance`, `Legal`, etc.):
* **Single-Department Users** (e.g. `ops@acme.demo`) are locked to an **Isolated Scope** (`🔒 Isolated Scope: Operations`).
* **Kernel Enforcement:** Even if an attacker manipulates API parameters, cross-department queries trigger HTTP `403 Forbidden` and PostgreSQL RLS drops foreign vector records at the storage layer.
* **Security Kernel Simulator:** The built-in Penetration Probe executes real-time cross-department vector attacks against PostgreSQL, demonstrating **0 Records Leaked**.

---

## 👥 Enterprise RBAC Matrix

| Capability / Resource | Member (`member`) | Department Admin (`department_admin`) | Compliance Auditor (`auditor`) | Company Admin (`tenant_admin`) | Platform Admin (`platform_admin`) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Knowledge Chat & Hybrid Search** | Own Dept Only | Own Dept Only | Read-Only Audit | All Depts | Full System |
| **Document Ingestion & Indexing** | Query Only | Ingest in Own Dept | Denied | All Depts | System Level |
| **Document Deletion** | Authored Only | Own Dept Docs | Denied | All Tenant Docs | System Level |
| **Cross-Dept Access** | 403 Forbidden | 403 Forbidden | Assigned Depts | Full Access | Cross-Tenant |
| **Team Roster & Access Scopes** | Hidden | Hidden | Read-Only | Full CRUD | System Roster |
| **Access Request Approvals** | Denied | Denied | Denied | Approve / Reject | Superuser |
| **SOC 2 Audit Trail Export** | Denied | Denied | Full Access | Full Access | Cross-Tenant |
| **Platform Sales Inquiries** | Denied | Denied | Denied | Denied | Full CRUD |

---

## 🚀 Instant Quickstart (Docker Compose)

### 1. Clone & Configure

```bash
git clone https://github.com/harshaddhonde4/rag-hub-enterprise.git
cd rag-hub-enterprise

# Copy environment variables
cp .env.example .env
```

### 2. Launch with Docker Compose

```bash
docker compose up --build -d
```

Services initialized:
* **Web UI (Nginx + React 18):** [http://localhost:5173](http://localhost:5173)
* **API Engine (Express + TypeScript):** [http://localhost:4000](http://localhost:4000)
* **Database (PostgreSQL 16 + pgvector):** `localhost:5432` (`raghub`/`raghub-secure-password`)

---

## 🔑 Pre-Seeded Enterprise Demo Credentials

| Role Persona | Email | Password | Tenant Slug | Scoped Departments |
| :--- | :--- | :--- | :--- | :--- |
| 🏢 **Acme Company Admin** | `admin@acme.demo` | `demo-password` | `acme` | Full Tenant Scope (All Depts) |
| ⚙️ **Operations Lead (Isolated)** | `ops@acme.demo` | `demo-password` | `acme` | `Operations` (Strictly Isolated) |
| 💰 **Finance Analyst (Isolated)** | `finance@acme.demo` | `demo-password` | `acme` | `Finance` (Strictly Isolated) |
| ⚖️ **Legal Counsel** | `legal@acme.demo` | `demo-password` | `acme` | `Legal` (Department Admin) |
| 🛡️ **Compliance Auditor** | `auditor@acme.demo` | `demo-password` | `acme` | `Finance` & `Legal` (Read-Only) |
| ⚡ **Platform Superadmin** | `platform@raghub.demo` | `platform-password` | *N/A* | Central Multi-Tenant Governance |

---

## 📁 Repository Structure

```
├── apps/
│   ├── api/                         # Node.js + TypeScript Express Gateway
│   │   ├── sql/                     # PostgreSQL Migrations & pgvector RLS Schemas
│   │   │   ├── 001_init.sql         # Base tables, pgvector extension, RLS policies
│   │   │   ├── 006_contact_inquiries.sql # Enterprise sales inquiry triage
│   │   │   └── 007_department_users_seed.sql # Multi-department user seeding
│   │   └── src/
│   │       ├── index.ts             # REST API, JWT auth, document ingestion, Groq RAG
│   │       └── seed-rich-demo.ts    # Rich enterprise demo documents & vector chunks
│   └── web/                         # React 18 + Vite + Vanilla CSS Web Application
│       └── src/
│           ├── main.tsx             # Private Multi-Tenant Workspace & Team RBAC Console
│           ├── public-pages.tsx     # Public Enterprise Portal (Platform, Trust, Docs, Pricing)
│           ├── styles.css           # Core Enterprise Design System & Tokens
│           ├── public.css           # Public Portal Aesthetics & Responsive Layouts
│           └── extra.css            # Dark/Light Mode Tokens, Badges, RLS Probe Styles
├── docker/                          # Dockerfiles & Nginx Reverse Proxy Configs
├── docs/                            # Deep Technical & Compliance Architecture Documentation
│   └── ENTERPRISE_PLATFORM_DOCUMENTATION.md # Full 500+ line technical architecture & audit report
├── docker-compose.yml               # Multi-container orchestration
└── README.md                        # Platform overview & deployment manual
```

---

## 📑 In-Depth Documentation

For the comprehensive 500+ line technical specification, security vulnerability assessment, mathematical vector similarity models, and operational runbooks, refer to:
👉 **[docs/ENTERPRISE_PLATFORM_DOCUMENTATION.md](docs/ENTERPRISE_PLATFORM_DOCUMENTATION.md)**

---

## 📬 Enterprise Support & Inquiries

For enterprise deployments, SOC 2 Type II audit report packages, or private VPC architectures:
* **Enterprise Desk:** `enterprise.raghub@gmail.com`
* **Official Website:** [https://raghub.enterprise.demo](http://localhost:5173)
