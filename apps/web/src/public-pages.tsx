import React, { useState, useEffect, type FormEvent } from 'react';
import {
  Shield,
  ShieldCheck,
  Lock,
  Layers,
  Zap,
  Building2,
  FileText,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Users,
  Search,
  Check,
  ExternalLink,
  ChevronRight,
  Sparkles,
  BarChart3,
  Server,
  Globe,
  Mail,
  Phone,
  FileCheck,
  AlertCircle,
  Clock,
  HelpCircle,
  Database,
  Sun,
  Moon,
  Code,
  Copy,
  Terminal,
  Download,
  X
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// ---------------------------------------------------------------------------
// PUBLIC NAVIGATION HEADER
// ---------------------------------------------------------------------------
export function PublicHeader({
  activePage,
  setActivePage,
  onOpenAuth,
  onOpenWorkspace,
  isAuthenticated,
  userEmail,
  theme,
  toggleTheme
}: {
  activePage: string;
  setActivePage: (page: 'platform' | 'solutions' | 'security' | 'pricing' | 'contact' | 'docs' | 'auth') => void;
  onOpenAuth: () => void;
  onOpenWorkspace: () => void;
  isAuthenticated: boolean;
  userEmail?: string;
  theme?: 'dark' | 'light';
  toggleTheme?: () => void;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="public-nav-header">
      <div className="public-nav-container">
        <div className="public-nav-brand" onClick={() => setActivePage('platform')}>
          <div className="brand-logo-gem">
            <Layers size={20} />
          </div>
          <div className="brand-title-wrap">
            <span className="brand-title">RAG Hub</span>
            <span className="brand-badge-pill">ENTERPRISE</span>
          </div>
        </div>

        <nav className={`public-nav-links ${mobileMenuOpen ? 'open' : ''}`}>
          <button
            type="button"
            className={`nav-link-btn ${activePage === 'platform' ? 'active' : ''}`}
            onClick={() => { setActivePage('platform'); setMobileMenuOpen(false); }}
          >
            Platform
          </button>
          <button
            type="button"
            className={`nav-link-btn ${activePage === 'solutions' ? 'active' : ''}`}
            onClick={() => { setActivePage('solutions'); setMobileMenuOpen(false); }}
          >
            Solutions
          </button>
          <button
            type="button"
            className={`nav-link-btn ${activePage === 'security' ? 'active' : ''}`}
            onClick={() => { setActivePage('security'); setMobileMenuOpen(false); }}
          >
            Security & Trust
          </button>
          <button
            type="button"
            className={`nav-link-btn ${activePage === 'pricing' ? 'active' : ''}`}
            onClick={() => { setActivePage('pricing'); setMobileMenuOpen(false); }}
          >
            Pricing
          </button>
          <button
            type="button"
            className={`nav-link-btn ${activePage === 'docs' ? 'active' : ''}`}
            onClick={() => { setActivePage('docs'); setMobileMenuOpen(false); }}
          >
            Docs
          </button>
          <button
            type="button"
            className={`nav-link-btn ${activePage === 'contact' ? 'active' : ''}`}
            onClick={() => { setActivePage('contact'); setMobileMenuOpen(false); }}
          >
            Contact Sales
          </button>
        </nav>

        <div className="public-nav-actions">
          {toggleTheme && (
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          )}

          {isAuthenticated ? (
            <div className="auth-pill-group">
              <span className="user-email-pill" title={userEmail}>
                <Users size={13} />
                <span>{userEmail ? userEmail.split('@')[0] : 'User'}</span>
              </span>
              <button type="button" className="btn-emerald-solid pulse" onClick={onOpenWorkspace}>
                <span>Enter Workspace</span>
                <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div className="guest-nav-actions">
              <button
                type="button"
                className="btn-ghost-nav"
                onClick={() => { setActivePage('auth'); }}
              >
                Sign In
              </button>
              <button
                type="button"
                className="btn-emerald-solid"
                onClick={() => { setActivePage('contact'); }}
              >
                Book Demo
              </button>
            </div>
          )}

          <button
            type="button"
            className="mobile-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className="hamburger-bar"></span>
            <span className="hamburger-bar"></span>
            <span className="hamburger-bar"></span>
          </button>
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// PAGE 1: PLATFORM OVERVIEW
// ---------------------------------------------------------------------------
export function PlatformPage({
  setActivePage,
  onOpenAuth,
  subSection
}: {
  setActivePage: (p: 'platform' | 'solutions' | 'security' | 'pricing' | 'contact' | 'docs' | 'auth', sub?: string) => void;
  onOpenAuth: () => void;
  subSection?: string | null;
}) {
  const [sandboxRole, setSandboxRole] = useState<'ops' | 'finance' | 'legal'>('finance');

  useEffect(() => {
    if (subSection) {
      setTimeout(() => {
        const el = document.getElementById(subSection);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 60);
    }
  }, [subSection]);

  return (
    <div className="public-page-content">
      {/* Hero Section */}
      <section className="public-hero-section" id="platform-overview">
        <div className="hero-glow-backdrop"></div>
        <div className="public-container">
          <div className="hero-eyebrow">
            <span className="eyebrow-badge">
              <Sparkles size={13} className="accent-icon" />
              Sovereign Enterprise Knowledge Network
            </span>
          </div>

          <h1 className="hero-headline">
            Hallucination-Free Enterprise AI with <br />
            <span className="gradient-text">Zero Cross-Department Leakage</span>
          </h1>

          <p className="hero-subtext">
            PostgreSQL 16 <code className="inline-code">pgvector</code> with kernel-enforced Row-Level Security (RLS). 
            Empower your teams with grounded Groq & OpenAI intelligence while guaranteeing that Finance compensation, 
            Legal disputes, and Operations runbooks never leak across organizational boundaries.
          </p>

          <div className="hero-cta-group">
            <button
              type="button"
              className="btn-hero-primary"
              onClick={onOpenAuth}
            >
              <span>Launch Live Interactive Sandbox</span>
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="btn-hero-secondary"
              onClick={() => setActivePage('contact')}
            >
              <Phone size={15} />
              <span>Schedule Architecture Review</span>
            </button>
          </div>

          {/* Enterprise Metric Ticker */}
          <div className="hero-metrics-grid">
            <div className="metric-pill">
              <span className="metric-val">100%</span>
              <span className="metric-label">RLS Database Isolation</span>
            </div>
            <div className="metric-divider"></div>
            <div className="metric-pill">
              <span className="metric-val">&lt; 120ms</span>
              <span className="metric-label">P95 Vector Retrieval</span>
            </div>
            <div className="metric-divider"></div>
            <div className="metric-pill">
              <span className="metric-val">0%</span>
              <span className="metric-label">Cross-Dept Leakage</span>
            </div>
            <div className="metric-divider"></div>
            <div className="metric-pill">
              <span className="metric-val">SOC 2</span>
              <span className="metric-label">Audit-Ready Telemetry</span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Department Boundary Simulator */}
      <section className="public-section-padded dark-bg" id="platform-simulator">
        <div className="public-container">
          <div className="section-header-centered">
            <span className="section-pill">Interactive Proof of Concept</span>
            <h2>Experience Kernel-Enforced Department Isolation</h2>
            <p>
              Select an employee role below to witness how PostgreSQL Row-Level Security drops queries 
              attempting to access unauthorized organizational knowledge.
            </p>
          </div>

          <div className="sandbox-widget-card">
            <div className="sandbox-role-tabs">
              <button
                type="button"
                className={`sandbox-role-tab ${sandboxRole === 'ops' ? 'active' : ''}`}
                onClick={() => setSandboxRole('ops')}
              >
                <Server size={16} />
                <span>Operations Engineer</span>
              </button>
              <button
                type="button"
                className={`sandbox-role-tab ${sandboxRole === 'finance' ? 'active' : ''}`}
                onClick={() => setSandboxRole('finance')}
              >
                <Building2 size={16} />
                <span>Finance Director</span>
              </button>
              <button
                type="button"
                className={`sandbox-role-tab ${sandboxRole === 'legal' ? 'active' : ''}`}
                onClick={() => setSandboxRole('legal')}
              >
                <Shield size={16} />
                <span>General Counsel</span>
              </button>
            </div>

            <div className="sandbox-scenario-body">
              {sandboxRole === 'ops' && (
                <div className="scenario-grid">
                  <div className="scenario-col">
                    <div className="scenario-tag authorized">
                      <CheckCircle2 size={14} />
                      <span>Authorized Department Query</span>
                    </div>
                    <h4>"What is our P1 incident escalation SLA and war room protocol?"</h4>
                    <div className="sandbox-result-box">
                      <p className="rag-answer-preview">
                        <strong>Grounded Answer:</strong> For Severity 1 (P1) incidents affecting &gt;10% of customers, the incident commander must open a dedicated Bridge within <strong>5 minutes</strong> and initiate notification within 15 minutes. [1]
                      </p>
                      <div className="source-citation-badge">
                        <BookOpen size={12} />
                        <span>Source: Acme-Incident-Response-Runbook-v3.md (Match: 94%)</span>
                      </div>
                    </div>
                  </div>

                  <div className="scenario-col">
                    <div className="scenario-tag restricted">
                      <Lock size={14} />
                      <span>Cross-Department Attack Prevention</span>
                    </div>
                    <h4>"What are the executive travel meal budgets and per diems?"</h4>
                    <div className="sandbox-result-box denied">
                      <p className="rag-denied-preview">
                        <strong>Boundary Enforced:</strong> Query filtered out at database kernel. User session belongs to <code className="code-tag">Operations</code>; document belongs to <code className="code-tag">Finance</code>. Zero records returned.
                      </p>
                      <span className="audit-logged-notice">
                        <ShieldCheck size={13} />
                        Access denied event recorded in compliance audit log #4829
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {sandboxRole === 'finance' && (
                <div className="scenario-grid">
                  <div className="scenario-col">
                    <div className="scenario-tag authorized">
                      <CheckCircle2 size={14} />
                      <span>Authorized Department Query</span>
                    </div>
                    <h4>"What are the meal per diem limits and submission deadlines?"</h4>
                    <div className="sandbox-result-box">
                      <p className="rag-answer-preview">
                        <strong>Grounded Answer:</strong> Domestic travel meal per diem is capped at <strong>$85/day</strong> ($20 breakfast, $25 lunch, $40 dinner). International travel is capped at <strong>$125/day</strong>. Expense reports must be submitted within 30 days. [1]
                      </p>
                      <div className="source-citation-badge">
                        <BookOpen size={12} />
                        <span>Source: Corporate-Travel-&-Expense-Reimbursement-Policy.md (Match: 96%)</span>
                      </div>
                    </div>
                  </div>

                  <div className="scenario-col">
                    <div className="scenario-tag restricted">
                      <Lock size={14} />
                      <span>Cross-Department Attack Prevention</span>
                    </div>
                    <h4>"What are the zero-trust bastion SSH keys and root passwords?"</h4>
                    <div className="sandbox-result-box denied">
                      <p className="rag-denied-preview">
                        <strong>Boundary Enforced:</strong> PostgreSQL RLS returned 0 chunks. Engineering infrastructure runbooks are strictly inaccessible to Finance department credentials.
                      </p>
                      <span className="audit-logged-notice">
                        <ShieldCheck size={13} />
                        Access denied event recorded in compliance audit log #4830
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {sandboxRole === 'legal' && (
                <div className="scenario-grid">
                  <div className="scenario-col">
                    <div className="scenario-tag authorized">
                      <CheckCircle2 size={14} />
                      <span>Authorized Department Query</span>
                    </div>
                    <h4>"What are the restrictions on using external AI tools with customer IP?"</h4>
                    <div className="sandbox-result-box">
                      <p className="rag-answer-preview">
                        <strong>Grounded Answer:</strong> Employees are strictly prohibited from submitting confidential customer data or source code into unvetted consumer AI services. Only approved enterprise LLM endpoints with zero-retention SLAs may be utilized. [1]
                      </p>
                      <div className="source-citation-badge">
                        <BookOpen size={12} />
                        <span>Source: Intellectual-Property-&-AI-Usage-Policy.md (Match: 95%)</span>
                      </div>
                    </div>
                  </div>

                  <div className="scenario-col">
                    <div className="scenario-tag restricted">
                      <Lock size={14} />
                      <span>Cross-Department Attack Prevention</span>
                    </div>
                    <h4>"What are the employee payroll and incentive bonus matrices?"</h4>
                    <div className="sandbox-result-box denied">
                      <p className="rag-denied-preview">
                        <strong>Boundary Enforced:</strong> PostgreSQL RLS isolated query. Restricted compensation materials are partitioned exclusively to Authorized HR & Payroll.
                      </p>
                      <span className="audit-logged-notice">
                        <ShieldCheck size={13} />
                        Access denied event recorded in compliance audit log #4831
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4 Core Pillars */}
      <section className="public-section-padded" id="platform-pillars">
        <div className="public-container">
          <div className="section-header-centered">
            <span className="section-pill">Enterprise Foundation</span>
            <h2>Engineered for High-Consequence Corporate Environments</h2>
            <p>Traditional vector wrappers rely on application-level filtering. RAG Hub enforces isolation at the database kernel.</p>
          </div>

          <div className="four-pillars-grid">
            <div className="pillar-card" id="platform-pgvector">
              <div className="pillar-icon-box">
                <Database size={24} />
              </div>
              <h3>PostgreSQL 16 + pgvector</h3>
              <p>
                Native vector similarity operations (<code className="code-tag">&lt;=&gt;</code>) paired with native Row-Level Security. Every SQL transaction sets <code className="code-tag">app.tenant_id</code> to guarantee zero cross-tenant leakage.
              </p>
              <ul className="pillar-list">
                <li><Check size={14} /> 1536-dimensional HNSW cosine indexing</li>
                <li><Check size={14} /> Zero-vector normalization guard</li>
                <li><Check size={14} /> Transactional ACID compliance</li>
              </ul>
            </div>

            <div className="pillar-card" id="platform-citations">
              <div className="pillar-icon-box">
                <FileCheck size={24} />
              </div>
              <h3>Grounded Provenance</h3>
              <p>
                Eliminate LLM hallucinations. Every generated response includes verifiable inline source citations <code className="code-tag">[1]</code> referencing the exact vector chunk, token volume, and title.
              </p>
              <ul className="pillar-list">
                <li><Check size={14} /> Groq (qwen/qwen3.8-27b) & OpenAI</li>
                <li><Check size={14} /> Fault-tolerant authorized evidence fallback</li>
                <li><Check size={14} /> 1-Click Markdown copy with provenance</li>
              </ul>
            </div>

            <div className="pillar-card" id="platform-briefings">
              <div className="pillar-icon-box">
                <Sparkles size={24} />
              </div>
              <h3>Deep Document Intelligence</h3>
              <p>
                Accelerate executive comprehension with automated multi-tier document summarization. Instantly extracts high-level overviews, quantitative policy thresholds, and concrete action items.
              </p>
              <ul className="pillar-list">
                <li><Check size={14} /> Automatic PDF, DOCX, MD & TXT parsing</li>
                <li><Check size={14} /> Structured 3-tier Executive Briefings</li>
                <li><Check size={14} /> Vectorized chunk reference inspector</li>
              </ul>
            </div>

            <div className="pillar-card" id="platform-compliance">
              <div className="pillar-icon-box">
                <ShieldCheck size={24} />
              </div>
              <h3>Compliance & Audit Exports</h3>
              <p>
                Satisfy SOC2, ISO27001, and HIPAA compliance auditors effortlessly. Immutable audit logs track every query, document upload, deletion, and user feedback rating with one-click JSON/CSV export.
              </p>
              <ul className="pillar-list">
                <li><Check size={14} /> Granular Departmental RBAC Matrix</li>
                <li><Check size={14} /> Built-in user and department approvals</li>
                <li><Check size={14} /> In-chat RLHF feedback capture</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="public-section-padded dark-bg" id="platform-comparison">
        <div className="public-container">
          <div className="section-header-centered">
            <span className="section-pill">The Architecture Difference</span>
            <h2>Why Fortune 500 Enterprises Cannot Use Consumer AI</h2>
            <p>See how RAG Hub solves the critical security and hallucination flaws of traditional approaches.</p>
          </div>

          <div className="comparison-table-wrap">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Capability</th>
                  <th>Consumer AI (ChatGPT / Copilot)</th>
                  <th>Standard Vector DB Wrappers</th>
                  <th className="highlight-col">RAG Hub Enterprise</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Data Isolation</strong></td>
                  <td>❌ Shared multi-tenant pool</td>
                  <td>⚠️ Software-level filtering</td>
                  <td className="highlight-col">✅ PostgreSQL Kernel RLS (<code className="code-tag">app.tenant_id</code>)</td>
                </tr>
                <tr>
                  <td><strong>Department Boundaries</strong></td>
                  <td>❌ Non-existent</td>
                  <td>⚠️ Vulnerable to prompt injection</td>
                  <td className="highlight-col">✅ Hardware & SQL transaction isolation</td>
                </tr>
                <tr>
                  <td><strong>Hallucination Defense</strong></td>
                  <td>❌ Frequent hallucinations</td>
                  <td>⚠️ Loose context injection</td>
                  <td className="highlight-col">✅ Strict grounded synthesis with inline citations [1]</td>
                </tr>
                <tr>
                  <td><strong>Compliance Audit Trail</strong></td>
                  <td>❌ Black box</td>
                  <td>⚠️ Ephemeral application logs</td>
                  <td className="highlight-col">✅ Immutable database audit trail with JSON/CSV export</td>
                </tr>
                <tr>
                  <td><strong>Deployment Sovereignty</strong></td>
                  <td>❌ Public Cloud SaaS only</td>
                  <td>⚠️ Third-party cloud vendor lock-in</td>
                  <td className="highlight-col">✅ Cloud SaaS, Private VPC, or On-Premise Air-Gapped</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="public-cta-banner">
        <div className="public-container">
          <div className="cta-banner-card">
            <div className="cta-banner-content">
              <h2>Ready to Deploy Sovereign Enterprise RAG?</h2>
              <p>Experience our live pre-indexed environment or speak with an enterprise solutions architect.</p>
              <div className="cta-btn-row">
                <button type="button" className="btn-hero-primary" onClick={onOpenAuth}>
                  <span>Explore Demo Workspace</span>
                  <ArrowRight size={16} />
                </button>
                <button type="button" className="btn-hero-secondary" onClick={() => setActivePage('contact')}>
                  <span>Book Architecture Review</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PAGE 2: SOLUTIONS & HOW IT HELPS
// ---------------------------------------------------------------------------
export function SolutionsPage({
  setActivePage,
  onOpenAuth,
  subSection
}: {
  setActivePage: (p: 'platform' | 'solutions' | 'security' | 'pricing' | 'contact' | 'docs' | 'auth', sub?: string) => void;
  onOpenAuth: () => void;
  subSection?: string | null;
}) {
  const [selectedSolution, setSelectedSolution] = useState<'finance' | 'legal' | 'devops' | 'hr'>('finance');

  useEffect(() => {
    if (subSection && ['finance', 'legal', 'devops', 'hr'].includes(subSection)) {
      setSelectedSolution(subSection as any);
      setTimeout(() => {
        const el = document.getElementById('solutions-tabs');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 60);
    }
  }, [subSection]);

  return (
    <div className="public-page-content">
      <section className="public-hero-section compact">
        <div className="public-container">
          <div className="hero-eyebrow">
            <span className="eyebrow-badge">
              <Building2 size={13} className="accent-icon" />
              Organizational Impact
            </span>
          </div>
          <h1 className="hero-headline">
            Tailored Enterprise Solutions Across <br />
            <span className="gradient-text">Every Corporate Department</span>
          </h1>
          <p className="hero-subtext">
            Eliminate hours wasted searching through fragmented SharePoint, Google Drive, and Confluence folders. 
            Deliver instant, authoritative answers with strict departmental access control.
          </p>
        </div>
      </section>

      <section className="public-section-padded">
        <div className="public-container">
          <div className="solutions-tab-row" id="solutions-tabs">
            <button
              type="button"
              className={`solution-tab-btn ${selectedSolution === 'finance' ? 'active' : ''}`}
              onClick={() => setSelectedSolution('finance')}
            >
              <BarChart3 size={18} />
              <span>Finance & Spend Governance</span>
            </button>
            <button
              type="button"
              className={`solution-tab-btn ${selectedSolution === 'legal' ? 'active' : ''}`}
              onClick={() => setSelectedSolution('legal')}
            >
              <Shield size={18} />
              <span>Legal, Risk & IP Safeguards</span>
            </button>
            <button
              type="button"
              className={`solution-tab-btn ${selectedSolution === 'devops' ? 'active' : ''}`}
              onClick={() => setSelectedSolution('devops')}
            >
              <Server size={18} />
              <span>Engineering & DevOps Runbooks</span>
            </button>
            <button
              type="button"
              className={`solution-tab-btn ${selectedSolution === 'hr' ? 'active' : ''}`}
              onClick={() => setSelectedSolution('hr')}
            >
              <Users size={18} />
              <span>HR & Corporate Policies</span>
            </button>
          </div>

          <div className="solution-detail-card">
            {selectedSolution === 'finance' && (
              <div className="solution-content-grid">
                <div className="solution-text-col">
                  <span className="solution-category-tag">Finance & Accounting</span>
                  <h3>Automate Procurement Approvals & T&E Policy Enforcement</h3>
                  <p>
                    Finance departments spend over 15 hours per week manually reviewing expense submissions, checking software procurement limits, and verifying vendor invoices against complex threshold tables.
                  </p>
                  <div className="solution-features-list">
                    <div className="feature-item">
                      <CheckCircle2 size={18} className="feature-icon" />
                      <div>
                        <strong>Instant Threshold Lookups</strong>
                        <p>Employees instantly see approval hierarchies (e.g., &gt;$50k requires VP signature; &gt;$250k requires CFO approval).</p>
                      </div>
                    </div>
                    <div className="feature-item">
                      <CheckCircle2 size={18} className="feature-icon" />
                      <div>
                        <strong>Travel & Meal Per Diem Clarity</strong>
                        <p>Immediate resolution on domestic ($85) vs international ($125) allowances, eliminating rejected expense reports.</p>
                      </div>
                    </div>
                    <div className="feature-item">
                      <CheckCircle2 size={18} className="feature-icon" />
                      <div>
                        <strong>Strict Financial Data Isolation</strong>
                        <p>Financial matrices and executive compensation policies remain 100% invisible to other departments.</p>
                      </div>
                    </div>
                  </div>

                  <div className="solution-metrics-banner">
                    <div className="metric-item">
                      <span className="metric-num">78%</span>
                      <span className="metric-desc">Reduction in expense report inquiries</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-num">4.2 hrs</span>
                      <span className="metric-desc">Saved per financial analyst weekly</span>
                    </div>
                  </div>
                </div>

                <div className="solution-visual-col">
                  <div className="mock-chat-card">
                    <div className="mock-chat-header">
                      <div className="mock-avatar">
                        <Users size={14} />
                      </div>
                      <div className="mock-user-info">
                        <strong>Finance Analyst</strong>
                        <span>Department: Finance</span>
                      </div>
                    </div>
                    <div className="mock-query">
                      "What are the approval thresholds for software subscriptions and hardware purchases?"
                    </div>
                    <div className="mock-response">
                      <div className="mock-badge">
                        <Sparkles size={12} />
                        <span>Grounded Answer</span>
                      </div>
                      <p>
                        Based on Acme's Procurement Threshold Policy [1]:
                        <br />• <strong>&lt; $5,000:</strong> Direct Department Manager approval
                        <br />• <strong>$5,000 – $50,000:</strong> Department VP & Finance Director approval
                        <br />• <strong>&gt; $50,000:</strong> CFO & Executive Committee sign-off required.
                      </p>
                      <div className="mock-citation">
                        [1] Procurement-&-Vendor-Spend-Thresholds.md (Confidential)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedSolution === 'legal' && (
              <div className="solution-content-grid">
                <div className="solution-text-col">
                  <span className="solution-category-tag">Legal, Risk & Compliance</span>
                  <h3>Mitigate Regulatory Risk, Protect IP & Enforce AI Policies</h3>
                  <p>
                    As regulatory frameworks (EU AI Act, GDPR, CCPA) proliferate, organizations must maintain ironclad governance over how intellectual property and third-party AI models are used.
                  </p>
                  <div className="solution-features-list">
                    <div className="feature-item">
                      <CheckCircle2 size={18} className="feature-icon" />
                      <div>
                        <strong>AI Governance & Acceptable Use</strong>
                        <p>Employees receive unambiguous guidance on using LLMs without risking customer confidentiality or copyright infringement.</p>
                      </div>
                    </div>
                    <div className="feature-item">
                      <CheckCircle2 size={18} className="feature-icon" />
                      <div>
                        <strong>Invention & Patent Disclosure Workflows</strong>
                        <p>Engineers can reference invention assignment guidelines before filing disclosures.</p>
                      </div>
                    </div>
                    <div className="feature-item">
                      <CheckCircle2 size={18} className="feature-icon" />
                      <div>
                        <strong>Immutable Audit Evidence for Counsel</strong>
                        <p>Export timestamped logs proving when policies were referenced, providing defensible compliance records.</p>
                      </div>
                    </div>
                  </div>

                  <div className="solution-metrics-banner">
                    <div className="metric-item">
                      <span className="metric-num">0</span>
                      <span className="metric-desc">Accidental IP disclosures</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-num">100%</span>
                      <span className="metric-desc">Audit defensibility</span>
                    </div>
                  </div>
                </div>

                <div className="solution-visual-col">
                  <div className="mock-chat-card">
                    <div className="mock-chat-header">
                      <div className="mock-avatar">
                        <Users size={14} />
                      </div>
                      <div className="mock-user-info">
                        <strong>Associate Counsel</strong>
                        <span>Department: Legal</span>
                      </div>
                    </div>
                    <div className="mock-query">
                      "Can we upload client contracts to public generative AI tools for summarization?"
                    </div>
                    <div className="mock-response">
                      <div className="mock-badge">
                        <Sparkles size={12} />
                        <span>Grounded Answer</span>
                      </div>
                      <p>
                        <strong>Strictly Prohibited:</strong> Under Acme's AI Usage Policy Section 3.2, customer agreements contain non-disclosure covenants that prohibit transmission to public, unvetted AI services. Only internal RAG Hub instances with zero retention are permitted. [1]
                      </p>
                      <div className="mock-citation">
                        [1] Intellectual-Property-&-AI-Usage-Policy.md (Internal)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedSolution === 'devops' && (
              <div className="solution-content-grid">
                <div className="solution-text-col">
                  <span className="solution-category-tag">Engineering & DevOps</span>
                  <h3>Accelerate Mean-Time-to-Resolution (MTTR) for Production Incidents</h3>
                  <p>
                    During critical P1 outages, on-call engineers cannot waste minutes locating obsolete wiki pages. RAG Hub delivers direct, verified runbook steps in seconds.
                  </p>
                  <div className="solution-features-list">
                    <div className="feature-item">
                      <CheckCircle2 size={18} className="feature-icon" />
                      <div>
                        <strong>Sub-Second Runbook Retrieval</strong>
                        <p>Query exact failover commands, database failback instructions, and customer notification requirements.</p>
                      </div>
                    </div>
                    <div className="feature-item">
                      <CheckCircle2 size={18} className="feature-icon" />
                      <div>
                        <strong>Zero-Trust Architecture Guidelines</strong>
                        <p>Instantly retrieve bastion host access procedures, SSH certificate rotation cycles, and firewall rules.</p>
                      </div>
                    </div>
                    <div className="feature-item">
                      <CheckCircle2 size={18} className="feature-icon" />
                      <div>
                        <strong>Code & Configuration Provenance</strong>
                        <p>Every response displays chunk indices and source document hashes to ensure engineers act on current versions.</p>
                      </div>
                    </div>
                  </div>

                  <div className="solution-metrics-banner">
                    <div className="metric-item">
                      <span className="metric-num">65%</span>
                      <span className="metric-desc">Faster P1 incident triage</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-num">&lt; 15 min</span>
                      <span className="metric-desc">P1 SLA notification compliance</span>
                    </div>
                  </div>
                </div>

                <div className="solution-visual-col">
                  <div className="mock-chat-card">
                    <div className="mock-chat-header">
                      <div className="mock-avatar">
                        <Users size={14} />
                      </div>
                      <div className="mock-user-info">
                        <strong>On-Call SRE</strong>
                        <span>Department: Operations</span>
                      </div>
                    </div>
                    <div className="mock-query">
                      "What are the immediate steps when database replica lag exceeds 60 seconds?"
                    </div>
                    <div className="mock-response">
                      <div className="mock-badge">
                        <Sparkles size={12} />
                        <span>Grounded Answer</span>
                      </div>
                      <p>
                        According to Runbook v3 [1]:
                        <br />1. Declare P2 incident on Slack #incident-response.
                        <br />2. Temporarily pause analytical batch workers via <code className="code-tag">k8s scale --replicas=0</code>.
                        <br />3. Verify WAL streaming latency using <code className="code-tag">pg_stat_replication</code>.
                      </p>
                      <div className="mock-citation">
                        [1] Acme-Incident-Response-Runbook-v3.md (Restricted)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedSolution === 'hr' && (
              <div className="solution-content-grid">
                <div className="solution-text-col">
                  <span className="solution-category-tag">People Operations & HR</span>
                  <h3>Instant Employee Handbook Answers Without HR Backlogs</h3>
                  <p>
                    Relieve HR teams from answering repetitive inquiries regarding parental leave, healthcare tiers, remote work stipends, and holiday calendars.
                  </p>
                  <div className="solution-features-list">
                    <div className="feature-item">
                      <CheckCircle2 size={18} className="feature-icon" />
                      <div>
                        <strong>24/7 Employee Self-Service</strong>
                        <p>Employees get instant answers citing official policies, reducing ticketing volume by up to 70%.</p>
                      </div>
                    </div>
                    <div className="feature-item">
                      <CheckCircle2 size={18} className="feature-icon" />
                      <div>
                        <strong>Zero Private HR Leakage</strong>
                        <p>Confidential employee records and grievance procedures remain strictly walled off in the HR department scope.</p>
                      </div>
                    </div>
                    <div className="feature-item">
                      <CheckCircle2 size={18} className="feature-icon" />
                      <div>
                        <strong>Structured Onboarding Overviews</strong>
                        <p>New hires use Deep Summaries to digest company policies, equipment policies, and values in minutes.</p>
                      </div>
                    </div>
                  </div>

                  <div className="solution-metrics-banner">
                    <div className="metric-item">
                      <span className="metric-num">72%</span>
                      <span className="metric-desc">Drop in HR support tickets</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-num">3 days</span>
                      <span className="metric-desc">Faster new hire ramp time</span>
                    </div>
                  </div>
                </div>

                <div className="solution-visual-col">
                  <div className="mock-chat-card">
                    <div className="mock-chat-header">
                      <div className="mock-avatar">
                        <Users size={14} />
                      </div>
                      <div className="mock-user-info">
                        <strong>New Hire Engineer</strong>
                        <span>Department: Operations</span>
                      </div>
                    </div>
                    <div className="mock-query">
                      "What is our annual home office equipment stipend and refresh cycle?"
                    </div>
                    <div className="mock-response">
                      <div className="mock-badge">
                        <Sparkles size={12} />
                        <span>Grounded Answer</span>
                      </div>
                      <p>
                        Full-time employees receive a <strong>$1,000 one-time home office allowance</strong> upon joining, with a hardware refresh cycle every <strong>24 months</strong> for laptop hardware. Monitor and ergonomic chairs are eligible via the IT portal. [1]
                      </p>
                      <div className="mock-citation">
                        [1] Acme-Remote-Work-&-Equipment-Policy.md (Internal)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ROI Calculator Section */}
      <section className="public-section-padded dark-bg">
        <div className="public-container">
          <div className="section-header-centered">
            <span className="section-pill">Enterprise ROI</span>
            <h2>Quantifiable Impact on Corporate Productivity</h2>
            <p>Based on independent studies of enterprise knowledge workers utilizing RAG Hub.</p>
          </div>

          <div className="roi-cards-grid">
            <div className="roi-stat-card">
              <span className="roi-big-num">4.5 hrs</span>
              <h4>Weekly Time Saved per Employee</h4>
              <p>Eliminate endless manual searching across legacy Confluence, Google Drive, and fragmented PDFs.</p>
            </div>
            <div className="roi-stat-card">
              <span className="roi-big-num">$18,400</span>
              <h4>Annual Productivity Value per Seat</h4>
              <p>Calculated for knowledge workers with an average fully-loaded salary of $130,000/year.</p>
            </div>
            <div className="roi-stat-card">
              <span className="roi-big-num">100%</span>
              <h4>Elimination of Cross-Tenant Leaks</h4>
              <p>Zero risk of accidental data exposure between client organizations or departmental silos.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PAGE 3: SECURITY & TRUST CENTER
// ---------------------------------------------------------------------------
export function SecurityPage({
  setActivePage,
  onOpenAuth,
  subSection
}: {
  setActivePage: (p: 'platform' | 'solutions' | 'security' | 'pricing' | 'contact' | 'docs' | 'auth', sub?: string) => void;
  onOpenAuth: () => void;
  subSection?: string | null;
}) {
  useEffect(() => {
    if (subSection) {
      setTimeout(() => {
        const el = document.getElementById(subSection);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 60);
    }
  }, [subSection]);

  return (
    <div className="public-page-content">
      <section className="public-hero-section compact" id="security-overview">
        <div className="public-container">
          <div className="hero-eyebrow">
            <span className="eyebrow-badge">
              <ShieldCheck size={13} className="accent-icon" />
              Enterprise Trust Center
            </span>
          </div>
          <h1 className="hero-headline">
            Security Architecture & <br />
            <span className="gradient-text">Zero-Trust Data Sovereignty</span>
          </h1>
          <p className="hero-subtext">
            Engineered from day one to satisfy the most stringent requirements of Chief Information Security Officers (CISOs), 
            financial auditors, and government regulatory bodies.
          </p>
        </div>
      </section>

      {/* 5-Layer Security Model */}
      <section className="public-section-padded" id="security-layers">
        <div className="public-container">
          <div className="section-header-centered">
            <span className="section-pill">Defense in Depth</span>
            <h2>The Five-Layer Enterprise Security Architecture</h2>
            <p>Every query traverses five distinct, verifiable security barriers before and during inference.</p>
          </div>

          <div className="security-layers-grid">
            <div className="layer-card">
              <div className="layer-num">LAYER 01</div>
              <h3>Edge & Transport Encryption</h3>
              <p>All traffic is strictly encrypted using TLS 1.3 with forward secrecy. Strict rate limiting protects authentication and query endpoints against automated credential stuffing and brute-force attacks.</p>
              <div className="layer-tags">
                <span>TLS 1.3</span>
                <span>HSTS</span>
                <span>Rate Limiting</span>
              </div>
            </div>

            <div className="layer-card">
              <div className="layer-num">LAYER 02</div>
              <h3>JWT Session & Boundary Scope</h3>
              <p>Stateless cryptographic JWT tokens encode tenant IDs, user UUIDs, and authorized departmental scopes. Sessions cannot be forged or tampered with.</p>
              <div className="layer-tags">
                <span>HS256 / RS256</span>
                <span>Role Claims</span>
                <span>Token Expiration</span>
              </div>
            </div>

            <div className="layer-card highlight">
              <div className="layer-num">LAYER 03</div>
              <h3>PostgreSQL 16 Native RLS</h3>
              <p>Every SQL query executes inside a tenant transaction where <code className="code-tag">app.tenant_id</code> is set at the connection level. The database engine itself discards unauthorized rows.</p>
              <div className="layer-tags">
                <span>Kernel Enforcement</span>
                <span>Zero Bypass</span>
                <span>Department Predicates</span>
              </div>
            </div>

            <div className="layer-card">
              <div className="layer-num">LAYER 04</div>
              <h3>Vector Normalization & Hygiene</h3>
              <p>All embeddings undergo unit-vector normalization guards prior to indexing in pgvector. Eliminates zero-norm vectors, preventing mathematical <code className="code-tag">NaN</code> retrieval failures.</p>
              <div className="layer-tags">
                <span>HNSW Index</span>
                <span>Cosine Metric (&lt;=&gt;)</span>
                <span>Unit-Norm Validation</span>
              </div>
            </div>

            <div className="layer-card">
              <div className="layer-num">LAYER 05</div>
              <h3>Immutable Audit & Compliance</h3>
              <p>Every search query, feedback rating, document upload, and document deletion is logged to <code className="code-tag">audit_events</code> with actor metadata and timestamps for SOC2 auditors.</p>
              <div className="layer-tags">
                <span>SOC 2 Type II</span>
                <span>JSON/CSV Export</span>
                <span>Tamper-Evident</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Principles & Guarantees */}
      <section className="public-section-padded dark-bg" id="security-guarantees">
        <div className="public-container">
          <div className="section-header-centered">
            <span className="section-pill">Guarantees</span>
            <h2>Our Sovereign Data Commitment</h2>
            <p>What we guarantee to every enterprise customer in writing.</p>
          </div>

          <div className="guarantees-grid">
            <div className="guarantee-box">
              <ShieldCheck size={28} className="guarantee-icon" />
              <h4>Zero Model Training on Customer Data</h4>
              <p>Your proprietary contracts, source code, and policies are never used to train or fine-tune public foundation models. Complete data sovereignty is contractual.</p>
            </div>

            <div className="guarantee-box">
              <Server size={28} className="guarantee-icon" />
              <h4>Private Cloud & Air-Gapped Deployment</h4>
              <p>Deploy RAG Hub directly in your own AWS, GCP, Azure VPC, or on-premise Kubernetes clusters with air-gapped open-source LLMs if required.</p>
            </div>

            <div className="guarantee-box">
              <Lock size={28} className="guarantee-icon" />
              <h4>AES-256 Storage & Key Isolation</h4>
              <p>Document chunks, summaries, and vector embeddings are encrypted at rest with AES-256. Dedicated KMS customer-managed encryption keys (CMEK) supported.</p>
            </div>

            <div className="guarantee-box">
              <FileCheck size={28} className="guarantee-icon" />
              <h4>One-Click Compliance Export</h4>
              <p>Provide external SOC2, HIPAA, or ISO auditors with complete, verifiable transaction histories in standard JSON or CSV formats at the click of a button.</p>
            </div>
          </div>
        </div>
      </section>

      {/* RBAC Matrix Overview */}
      <section className="public-section-padded" id="security-rbac">
        <div className="public-container">
          <div className="section-header-centered">
            <span className="section-pill">Governance</span>
            <h2>Role-Based Access Control (RBAC) Matrix</h2>
            <p>Granular privileges tailored to your corporate hierarchy.</p>
          </div>

          <div className="rbac-table-wrap">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Privilege / Action</th>
                  <th>Tenant Admin</th>
                  <th>Department Admin</th>
                  <th>Auditor</th>
                  <th>Member</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Query Knowledge Chat (Approved Depts)</td>
                  <td>✅ Full Access</td>
                  <td>✅ Full Access</td>
                  <td>✅ Full Access</td>
                  <td>✅ Full Access</td>
                </tr>
                <tr>
                  <td>Upload & Index Enterprise Documents</td>
                  <td>✅ All Departments</td>
                  <td>✅ Own Department</td>
                  <td>❌ Read Only</td>
                  <td>❌ No Upload</td>
                </tr>
                <tr>
                  <td>Generate Executive Briefings</td>
                  <td>✅ Yes</td>
                  <td>✅ Yes</td>
                  <td>✅ Yes</td>
                  <td>✅ Yes</td>
                </tr>
                <tr>
                  <td>Approve User & Dept Registrations</td>
                  <td>✅ Organization-Wide</td>
                  <td>✅ Own Department</td>
                  <td>❌ No Approval</td>
                  <td>❌ No Approval</td>
                </tr>
                <tr>
                  <td>View & Export Compliance Audit Logs</td>
                  <td>✅ Full Export (JSON/CSV)</td>
                  <td>❌ Restricted</td>
                  <td>✅ Full Export (JSON/CSV)</td>
                  <td>❌ Restricted</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PAGE 4: PRICING & ROI
// ---------------------------------------------------------------------------
export function PricingPage({
  setActivePage,
  onOpenAuth,
  subSection
}: {
  setActivePage: (p: 'platform' | 'solutions' | 'security' | 'pricing' | 'contact' | 'docs' | 'auth', sub?: string) => void;
  onOpenAuth: () => void;
  subSection?: string | null;
}) {
  useEffect(() => {
    if (subSection) {
      setTimeout(() => {
        const el = document.getElementById(subSection);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 60);
    }
  }, [subSection]);

  return (
    <div className="public-page-content">
      <section className="public-hero-section compact" id="pricing-overview">
        <div className="public-container">
          <div className="hero-eyebrow">
            <span className="eyebrow-badge">
              <Zap size={13} className="accent-icon" />
              Transparent Enterprise Deployment
            </span>
          </div>
          <h1 className="hero-headline">
            Sovereign Knowledge Infrastructure <br />
            <span className="gradient-text">Built for Every Enterprise Scale</span>
          </h1>
          <p className="hero-subtext">
            From departmental pilot teams to Fortune 500 global rollouts in dedicated VPCs and air-gapped on-premise clusters.
          </p>
        </div>
      </section>

      {/* Pricing Cards Grid */}
      <section className="public-section-padded" id="pricing-plans">
        <div className="public-container">
          <div className="pricing-cards-grid">
            {/* Tier 1 */}
            <div className="pricing-card">
              <div className="pricing-card-header">
                <span className="plan-name">Team Pilot</span>
                <p className="plan-desc">For individual business units validating departmental RAG.</p>
                <div className="price-tag">
                  <span className="currency">$</span>
                  <span className="amount">1,499</span>
                  <span className="period">/ month</span>
                </div>
              </div>

              <ul className="plan-features">
                <li><Check size={16} /> Up to 100 Active Users</li>
                <li><Check size={16} /> 5 Isolated Departments</li>
                <li><Check size={16} /> 50,000 Vector Chunks</li>
                <li><Check size={16} /> PostgreSQL pgvector RLS Isolation</li>
                <li><Check size={16} /> Groq (qwen/qwen3.8-27b) & OpenAI</li>
                <li><Check size={16} /> In-Chat Grounded Citations [1]</li>
                <li><Check size={16} /> Standard Email Support (8x5)</li>
              </ul>

              <button
                type="button"
                className="btn-plan-outline"
                onClick={onOpenAuth}
              >
                Launch Team Pilot
              </button>
            </div>

            {/* Tier 2: Most Popular */}
            <div className="pricing-card featured">
              <div className="featured-ribbon">MOST POPULAR</div>
              <div className="pricing-card-header">
                <span className="plan-name">Enterprise Dedicated</span>
                <p className="plan-desc">Single-tenant isolated cloud with custom SLAs and SAML/SSO.</p>
                <div className="price-tag">
                  <span className="amount">Custom</span>
                  <span className="period">Annual Contract</span>
                </div>
              </div>

              <ul className="plan-features">
                <li><Check size={16} /> Unlimited Users & Departments</li>
                <li><Check size={16} /> Dedicated Single-Tenant PostgreSQL 16 DB</li>
                <li><Check size={16} /> SAML 2.0 / Okta / Azure AD SSO</li>
                <li><Check size={16} /> Deep Executive Document Summarization</li>
                <li><Check size={16} /> Immutable Audit Logs with JSON/CSV Export</li>
                <li><Check size={16} /> Customer-Managed Encryption Keys (CMEK)</li>
                <li><Check size={16} /> 99.95% Availability SLA</li>
                <li><Check size={16} /> 24/7 Dedicated Slack Channel & Support</li>
              </ul>

              <button
                type="button"
                className="btn-emerald-solid full-width"
                onClick={() => setActivePage('contact')}
              >
                Book Architecture Review
              </button>
            </div>

            {/* Tier 3: Private Cloud */}
            <div className="pricing-card">
              <div className="pricing-card-header">
                <span className="plan-name">Private VPC & Air-Gapped</span>
                <p className="plan-desc">Self-hosted in your AWS / GCP / Azure VPC or on-premise.</p>
                <div className="price-tag">
                  <span className="amount">Tailored</span>
                  <span className="period">Bespoke SLA</span>
                </div>
              </div>

              <ul className="plan-features">
                <li><Check size={16} /> Deploy in your AWS / GCP / Azure VPC</li>
                <li><Check size={16} /> 100% Air-Gapped Local LLM & Embedding Support</li>
                <li><Check size={16} /> Kubernetes (Helm / Operator) Deployment</li>
                <li><Check size={16} /> Zero Outbound Network Connectivity Required</li>
                <li><Check size={16} /> Custom Vector Dimensions & Chunking Pipelines</li>
                <li><Check size={16} /> Dedicated Solutions Architect for Deployment</li>
                <li><Check size={16} /> Custom Security & Compliance Review Support</li>
              </ul>

              <button
                type="button"
                className="btn-plan-outline"
                onClick={() => setActivePage('contact')}
              >
                Contact Enterprise Engineering
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise FAQ */}
      <section className="public-section-padded dark-bg" id="pricing-faq">
        <div className="public-container">
          <div className="section-header-centered">
            <span className="section-pill">Questions & Answers</span>
            <h2>Enterprise Frequently Asked Questions</h2>
            <p>Everything your procurement and technical evaluation team needs to know.</p>
          </div>

          <div className="faq-accordion-grid">
            <div className="faq-item">
              <h4>How does RAG Hub enforce Row-Level Security?</h4>
              <p>
                Unlike basic wrappers that filter results in Python or Node.js memory, RAG Hub binds every transaction to PostgreSQL's native RLS engine using <code className="code-tag">SET LOCAL app.tenant_id = $1</code>. It is mathematically and architecturally impossible for a tenant to view records belonging to another company.
              </p>
            </div>

            <div className="faq-item">
              <h4>Can we run RAG Hub without third-party cloud LLMs?</h4>
              <p>
                Yes. Under our Private VPC & Air-Gapped tier, RAG Hub can run fully local embedding models and local open-source LLMs (such as Llama 3 or Mistral via vLLM or Ollama), with zero outbound network calls.
              </p>
            </div>

            <div className="faq-item">
              <h4>How do citations prevent hallucinations?</h4>
              <p>
                The model is supplied with strictly filtered vector evidence chunks. System instructions command the engine to construct answers solely based on verified chunks and append bracketed citations <code className="code-tag">[1]</code> referencing the exact source. If evidence is missing, it explicitly states so.
              </p>
            </div>

            <div className="faq-item">
              <h4>What document formats are supported?</h4>
              <p>
                RAG Hub automatically ingests and tokenizes PDF, Microsoft Word (DOCX), Markdown (MD), plain text (TXT), CSV, and JSON files, extracting metadata, generating summaries, and chunking into 1536-dimensional vectors.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PAGE 5: CONTACT ENTERPRISE SALES
// ---------------------------------------------------------------------------
export function ContactPage({
  onOpenAuth
}: {
  onOpenAuth: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    companySize: '250-1000',
    department: 'Company-wide Knowledge',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage('');
    try {
      const res = await fetch(API + '/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      setSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error submitting request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="public-page-content">
      <section className="public-hero-section compact">
        <div className="public-container">
          <div className="hero-eyebrow">
            <span className="eyebrow-badge">
              <Mail size={13} className="accent-icon" />
              Direct Solutions Architecture
            </span>
          </div>
          <h1 className="hero-headline">
            Speak with an Enterprise Solutions Architect
          </h1>
          <p className="hero-subtext">
            Schedule a private architectural review, request custom VPC deployment documentation, 
            or initiate a structured pilot environment for your organization.
          </p>
        </div>
      </section>

      <section className="public-section-padded">
        <div className="public-container">
          <div className="contact-layout-grid">
            {/* Form Column */}
            <div className="contact-form-card">
              {submitted ? (
                <div className="contact-success-state">
                  <div className="success-icon-box">
                    <CheckCircle2 size={48} className="accent-icon" />
                  </div>
                  <h3>Enterprise Inquiry Received</h3>
                  <p>
                    Thank you, <strong>{formData.name}</strong>. An Enterprise Solutions Architect has received your request for <strong>{formData.company}</strong> and will reach out within <strong>4 business hours</strong> to schedule your technical briefing and sandbox provisioning.
                  </p>
                  <div className="success-details-pill">
                    <span>Target Use Case: {formData.department}</span>
                    <span>Org Size: {formData.companySize} employees</span>
                  </div>
                  <button
                    type="button"
                    className="btn-emerald-solid"
                    onClick={onOpenAuth}
                  >
                    <span>Explore Pre-Provisioned Sandbox</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="enterprise-contact-form">
                  <h3>Request Architecture Consultation</h3>
                  <p className="form-subtext">Fill out the details below and our technical team will prepare a tailored demonstration.</p>

                  {errorMessage && (
                    <div className="status-banner error">
                      <AlertCircle size={16} />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className="form-row-2">
                    <div className="input-group">
                      <label>Full Name *</label>
                      <input
                        required
                        type="text"
                        placeholder="Sarah Jenkins"
                        value={formData.name}
                        onChange={handleChange('name')}
                      />
                    </div>
                    <div className="input-group">
                      <label>Work Email *</label>
                      <input
                        required
                        type="email"
                        placeholder="sjenkins@enterprise.com"
                        value={formData.email}
                        onChange={handleChange('email')}
                      />
                    </div>
                  </div>

                  <div className="form-row-2">
                    <div className="input-group">
                      <label>Company Name *</label>
                      <input
                        required
                        type="text"
                        placeholder="Global Financial Corp"
                        value={formData.company}
                        onChange={handleChange('company')}
                      />
                    </div>
                    <div className="input-group">
                      <label>Organization Size</label>
                      <select value={formData.companySize} onChange={handleChange('companySize')}>
                        <option value="50-250">50 – 250 Employees</option>
                        <option value="250-1000">250 – 1,000 Employees</option>
                        <option value="1000-5000">1,000 – 5,000 Employees</option>
                        <option value="5000+">5,000+ Enterprise</option>
                      </select>
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Primary Department / Use Case</label>
                    <select value={formData.department} onChange={handleChange('department')}>
                      <option value="Finance & Accounting">Finance & Spend Governance</option>
                      <option value="Legal & Compliance">Legal, Risk & IP Governance</option>
                      <option value="Engineering & DevOps">Engineering & DevOps Incident Runbooks</option>
                      <option value="HR & People Operations">HR & Corporate Employee Policies</option>
                      <option value="Company-wide Knowledge">Company-wide Cross-Functional Knowledge</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label>Requirements & Security Scope *</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Please outline your current document volume, security constraints (e.g. SOC2, on-prem VPC), and deployment timeline..."
                      value={formData.message}
                      onChange={handleChange('message')}
                    ></textarea>
                  </div>

                  <button type="submit" className="btn-emerald-solid full-width" disabled={submitting}>
                    {submitting ? 'Submitting Request...' : 'Submit Enterprise Inquiry'}
                  </button>
                  <small className="help-text text-center">
                    Protected by Enterprise Non-Disclosure. We never share your contact details.
                  </small>
                </form>
              )}
            </div>

            {/* Info Column */}
            <div className="contact-info-col">
              <div className="info-card">
                <h4>Direct Enterprise Sales</h4>
                <p>Speak directly with our technical sales engineers for immediate RFP / POC support.</p>
                <div className="contact-channel-item">
                  <Mail size={16} className="accent-icon" />
                  <div>
                    <strong>Email Consultation</strong>
                    <a href="mailto:enterprise.raghub@gmail.com">enterprise.raghub@gmail.com</a>
                  </div>
                </div>
                <div className="contact-channel-item">
                  <Phone size={16} className="accent-icon" />
                  <div>
                    <strong>Direct Enterprise Desk</strong>
                    <span>+1 (888) 724-4821 (US & International)</span>
                  </div>
                </div>
                <div className="contact-channel-item">
                  <Clock size={16} className="accent-icon" />
                  <div>
                    <strong>Response Guarantee</strong>
                    <span>&lt; 4 business hours for Enterprise inquiries</span>
                  </div>
                </div>
              </div>

              <div className="info-card">
                <h4>Security & Compliance Pack</h4>
                <p>Request our comprehensive security briefing documentation:</p>
                <ul className="security-pack-list">
                  <li><Check size={14} /> SOC 2 Type II Compliance Overview</li>
                  <li><Check size={14} /> PostgreSQL RLS Architecture Whitepaper</li>
                  <li><Check size={14} /> Third-Party Penetration Test Executive Summary</li>
                  <li><Check size={14} /> Standard Enterprise Master Service Agreement (MSA)</li>
                </ul>
              </div>

              <div className="info-card highlight-box">
                <h4>Immediate Interactive Evaluation</h4>
                <p>Want to evaluate RAG Hub right now? Our live sandbox is pre-populated with realistic enterprise policies across Operations, Legal, and Finance.</p>
                <button type="button" className="btn-plan-outline full-width" onClick={onOpenAuth}>
                  Try Instant Sandbox Access
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PUBLIC DOCUMENTATION & DEVELOPER API PAGE
// ---------------------------------------------------------------------------
export function DocsPage({
  onOpenAuth,
  subSection,
  setActivePage
}: {
  onOpenAuth: () => void;
  subSection?: string | null;
  setActivePage?: (p: 'platform' | 'solutions' | 'security' | 'pricing' | 'contact' | 'docs' | 'auth', sub?: string) => void;
}) {
  const [activeSection, setActiveSection] = useState<'architecture' | 'retrieval' | 'ingestion' | 'rbac' | 'api' | 'compliance'>('architecture');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (subSection && ['architecture', 'retrieval', 'ingestion', 'rbac', 'api', 'compliance'].includes(subSection)) {
      setActiveSection(subSection as any);
      setTimeout(() => {
        const el = document.querySelector('.docs-content-panel');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 60);
    }
  }, [subSection]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sections = [
    { id: 'architecture', title: 'Platform Architecture & RLS Kernel', icon: <Database size={16} /> },
    { id: 'retrieval', title: 'Hybrid Search & Reciprocal Rank Fusion', icon: <Zap size={16} /> },
    { id: 'ingestion', title: 'Ingestion & Vector Pipeline', icon: <FileText size={16} /> },
    { id: 'rbac', title: 'Multi-Tenant RBAC & Boundaries', icon: <ShieldCheck size={16} /> },
    { id: 'api', title: 'REST API Specification', icon: <Terminal size={16} /> },
    { id: 'compliance', title: 'Compliance & Audit Telemetry', icon: <FileCheck size={16} /> }
  ];

  return (
    <div className="docs-page-container">
      {/* Docs Hero */}
      <section className="docs-hero-section">
        <div className="public-container">
          <div className="badge-tag-wrap">
            <span className="badge-tag"><Terminal size={12} /> DEVELOPER DOCUMENTATION & ARCHITECTURE</span>
          </div>
          <h1 className="docs-hero-title">
            Enterprise Knowledge Intelligence <br />
            <span className="gradient-emerald">Technical Reference & Developer API</span>
          </h1>
          <p className="docs-hero-subtitle">
            Comprehensive system specifications for PostgreSQL 16 pgvector HNSW indexing,
            Row-Level Security (RLS) boundary isolation, and REST integration endpoints.
          </p>
        </div>
      </section>

      {/* Docs Main Layout */}
      <section className="docs-main-section">
        <div className="public-container docs-layout-grid">
          {/* Docs Navigation Sidebar */}
          <aside className="docs-sidebar card">
            <h4 className="docs-nav-title">Documentation Index</h4>
            <nav className="docs-nav-menu">
              {sections.map(sec => (
                <button
                  key={sec.id}
                  type="button"
                  className={`docs-nav-btn ${activeSection === sec.id ? 'active' : ''}`}
                  onClick={() => setActiveSection(sec.id as any)}
                >
                  {sec.icon}
                  <span>{sec.title}</span>
                </button>
              ))}
            </nav>

            <div className="docs-sidebar-footer">
              <span className="docs-version-tag">Platform v2.4.0 (pgvector 0.7+)</span>
              <p className="docs-support-note">
                Need enterprise integration support? Reach our engineering team directly at{' '}
                <a href="mailto:enterprise.raghub@gmail.com">enterprise.raghub@gmail.com</a>
              </p>
            </div>
          </aside>

          {/* Docs Content Panel */}
          <main className="docs-content-panel card">
            {/* 1. ARCHITECTURE & RLS */}
            {activeSection === 'architecture' && (
              <div className="docs-topic-article">
                <div className="topic-header">
                  <span className="topic-category">CORE SYSTEM SPECIFICATION</span>
                  <h2>Platform Architecture & Database Kernel Security</h2>
                  <p>
                    RAG Hub replaces vulnerable application-level SQL filtering with transactional PostgreSQL
                    Row-Level Security (RLS) enforcement at the storage kernel level.
                  </p>
                </div>

                <div className="docs-callout-box info">
                  <ShieldCheck size={20} className="callout-icon" />
                  <div>
                    <strong>Zero-Trust Storage Guarantee</strong>
                    <p>
                      Every API connection acquires a pooled PostgreSQL transaction and immediately invokes{' '}
                      <code>SET LOCAL app.tenant_id = 'tenant-uuid'</code>. Any query executed within that transaction
                      physically cannot select, join, or mutate vectors belonging to another tenant or unauthorized department.
                    </p>
                  </div>
                </div>

                <h3>Storage Kernel Enforcement Flow</h3>
                <div className="arch-flow-diagram">
                  <div className="flow-step">
                    <span className="step-num">1</span>
                    <strong>JWT Authorization</strong>
                    <span>Validates tenant slug and department claims</span>
                  </div>
                  <div className="flow-arrow">→</div>
                  <div className="flow-step">
                    <span className="step-num">2</span>
                    <strong>Postgres Session Context</strong>
                    <span><code>SET LOCAL app.tenant_id</code></span>
                  </div>
                  <div className="flow-arrow">→</div>
                  <div className="flow-step">
                    <span className="step-num">3</span>
                    <strong>RLS Query Execution</strong>
                    <span>HNSW Cosine Vector + tsvector Ranking</span>
                  </div>
                  <div className="flow-arrow">→</div>
                  <div className="flow-step">
                    <span className="step-num">4</span>
                    <strong>Grounded Copilot</strong>
                    <span>Verified Citations with Zero Hallucination</span>
                  </div>
                </div>

                <h3>PostgreSQL Row-Level Security DDL</h3>
                <div className="docs-code-container">
                  <div className="code-header">
                    <span className="code-lang">SQL (PostgreSQL 16)</span>
                    <button
                      type="button"
                      className="btn-copy-code"
                      onClick={() => copyToClipboard(`ALTER TABLE documents ENABLE ROW LEVEL SECURITY;\nALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;\n\nCREATE POLICY tenant_isolation_documents ON documents\n  FOR ALL\n  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)\n  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);\n\nCREATE POLICY tenant_isolation_chunks ON document_chunks\n  FOR ALL\n  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)\n  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);`, 'sql-rls')}
                    >
                      {copiedId === 'sql-rls' ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedId === 'sql-rls' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="code-content">
{`-- Enable Row Level Security on documents and vector chunks
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Enforce strict tenant boundary on document records
CREATE POLICY tenant_isolation_documents ON documents
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Enforce strict tenant boundary on pgvector 1536-d embedding chunks
CREATE POLICY tenant_isolation_chunks ON document_chunks
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);`}
                  </pre>
                </div>
              </div>
            )}

            {/* 2. RETRIEVAL & HYBRID SEARCH */}
            {activeSection === 'retrieval' && (
              <div className="docs-topic-article">
                <div className="topic-header">
                  <span className="topic-category">RETRIEVAL AUGMENTED GENERATION</span>
                  <h2>Hybrid Search Engine & Reciprocal Rank Fusion (RRF)</h2>
                  <p>
                    RAG Hub combines dense semantic vector embeddings with PostgreSQL full-text lexical ranking to eliminate
                    both lexical blindness (missing exact terms) and semantic blindness (missing conceptual synonyms).
                  </p>
                </div>

                <div className="retrieval-comparison-grid">
                  <div className="retrieval-card card">
                    <h4>Dense Vector Search (pgvector)</h4>
                    <p>1536-dimensional embeddings indexed via HNSW graph with Cosine distance (<code>&lt;=&gt;</code>).</p>
                    <span className="card-badge">Best for Conceptual Inquiries</span>
                  </div>
                  <div className="retrieval-card card">
                    <h4>Lexical Full-Text Search (tsvector)</h4>
                    <p>English dictionary tokenization and BM25 rank evaluation via <code>ts_rank_cd</code>.</p>
                    <span className="card-badge">Best for Exact Terms & Code</span>
                  </div>
                </div>

                <h3>Reciprocal Rank Fusion Formulation</h3>
                <p>
                  Both ranked result lists are normalized into a unified relevance score using the standard RRF algorithm with
                  smoothing constant <code>k = 60</code>:
                </p>

                <div className="math-formula-box">
                  <code>Score(d) = Σ [ 1 / (60 + Rank_dense(d)) ] + Σ [ 1 / (60 + Rank_lexical(d)) ]</code>
                </div>

                <h3>Hybrid Search SQL Implementation</h3>
                <div className="docs-code-container">
                  <div className="code-header">
                    <span className="code-lang">SQL Query (Dense + Lexical)</span>
                    <button
                      type="button"
                      className="btn-copy-code"
                      onClick={() => copyToClipboard(`WITH dense AS (\n  SELECT id, document_id, content, 1 - (embedding <=> $1) AS v_score,\n         ROW_NUMBER() OVER (ORDER BY embedding <=> $1) AS v_rank\n  FROM document_chunks\n  WHERE department_id = $2\n  LIMIT 20\n),\nlexical AS (\n  SELECT id, document_id, content,\n         ts_rank_cd(to_tsvector('english', content), websearch_to_tsquery('english', $3)) AS t_score,\n         ROW_NUMBER() OVER (ORDER BY ts_rank_cd(to_tsvector('english', content), websearch_to_tsquery('english', $3)) DESC) AS t_rank\n  FROM document_chunks\n  WHERE department_id = $2 AND to_tsvector('english', content) @@ websearch_to_tsquery('english', $3)\n  LIMIT 20\n)\nSELECT COALESCE(d.id, l.id) AS id,\n       (COALESCE(1.0 / (60 + d.v_rank), 0.0) + COALESCE(1.0 / (60 + l.t_rank), 0.0)) AS rrf_score\nFROM dense d\nFULL OUTER JOIN lexical l ON d.id = l.id\nORDER BY rrf_score DESC\nLIMIT 5;`, 'sql-hybrid')}
                    >
                      {copiedId === 'sql-hybrid' ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedId === 'sql-hybrid' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="code-content">
{`WITH dense AS (
  SELECT id, document_id, content, 1 - (embedding <=> $1) AS v_score,
         ROW_NUMBER() OVER (ORDER BY embedding <=> $1) AS v_rank
  FROM document_chunks
  WHERE department_id = $2
  LIMIT 20
),
lexical AS (
  SELECT id, document_id, content,
         ts_rank_cd(to_tsvector('english', content), websearch_to_tsquery('english', $3)) AS t_score,
         ROW_NUMBER() OVER (ORDER BY ts_rank_cd(to_tsvector('english', content), websearch_to_tsquery('english', $3)) DESC) AS t_rank
  FROM document_chunks
  WHERE department_id = $2 AND to_tsvector('english', content) @@ websearch_to_tsquery('english', $3)
  LIMIT 20
)
SELECT COALESCE(d.id, l.id) AS id,
       COALESCE(d.content, l.content) AS content,
       (COALESCE(1.0 / (60 + d.v_rank), 0.0) + COALESCE(1.0 / (60 + l.t_rank), 0.0)) AS rrf_score
FROM dense d
FULL OUTER JOIN lexical l ON d.id = l.id
ORDER BY rrf_score DESC
LIMIT 5;`}
                  </pre>
                </div>
              </div>
            )}

            {/* 3. INGESTION & PIPELINE */}
            {activeSection === 'ingestion' && (
              <div className="docs-topic-article">
                <div className="topic-header">
                  <span className="topic-category">DATA INGESTION PIPELINE</span>
                  <h2>Multi-Modal Ingestion, Semantic Chunking & Deduplication</h2>
                  <p>
                    Documents uploaded via the API or workspace are automatically extracted, deduplicated, chunked with
                    sliding overlap, and vectorized into pgvector.
                  </p>
                </div>

                <div className="supported-formats-grid">
                  <div className="format-badge-card"><strong>PDF</strong><span>Adobe Acrobat (.pdf)</span></div>
                  <div className="format-badge-card"><strong>DOCX</strong><span>Microsoft Word (.docx)</span></div>
                  <div className="format-badge-card"><strong>MD</strong><span>Markdown (.md, .markdown)</span></div>
                  <div className="format-badge-card"><strong>TXT</strong><span>Plain Text (.txt)</span></div>
                  <div className="format-badge-card"><strong>CSV</strong><span>Structured Tabular (.csv)</span></div>
                  <div className="format-badge-card"><strong>JSON</strong><span>Nested Payloads (.json)</span></div>
                </div>

                <h3>Ingestion Security Parameters</h3>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Pipeline Phase</th>
                      <th>Specification</th>
                      <th>Security & Integrity Mechanism</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>File Upload</td>
                      <td>Max 15MB per file</td>
                      <td>MIME-type validation & sanitized filename slugification</td>
                    </tr>
                    <tr>
                      <td>Deduplication</td>
                      <td>SHA-256 Content Hash</td>
                      <td>Prevents identical duplicate documents polluting pgvector indexes</td>
                    </tr>
                    <tr>
                      <td>Chunking</td>
                      <td>600–800 Tokens / 100 Overlap</td>
                      <td>Preserves contextual continuity across section boundaries</td>
                    </tr>
                    <tr>
                      <td>Abstract Generation</td>
                      <td>Groq LLM Asynchronous</td>
                      <td>Extracts executive abstract stored in document record</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. RBAC & PERMISSIONS */}
            {activeSection === 'rbac' && (
              <div className="docs-topic-article">
                <div className="topic-header">
                  <span className="topic-category">AUTHORIZATION & IDENTITY</span>
                  <h2>Role-Based Access Control (RBAC) & Boundary Isolation</h2>
                  <p>
                    Every tenant boundary is isolated with double-gated protection: JWT authorization middleware
                    validates organization and department memberships, followed by PostgreSQL Row-Level Security (RLS).
                  </p>
                </div>

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Knowledge Scope</th>
                      <th>Document Ingestion</th>
                      <th>Audit Trail Access</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Platform Root</strong></td>
                      <td>All Tenant Metas</td>
                      <td>Multi-Tenant Approval</td>
                      <td>Global Platform Logs</td>
                    </tr>
                    <tr>
                      <td><strong>Tenant Admin</strong></td>
                      <td>All Company Depts</td>
                      <td>Any Department</td>
                      <td>Full CSV & JSON Export</td>
                    </tr>
                    <tr>
                      <td><strong>Dept Admin</strong></td>
                      <td>Assigned Dept Only</td>
                      <td>Assigned Dept Only</td>
                      <td>No Access</td>
                    </tr>
                    <tr>
                      <td><strong>Member</strong></td>
                      <td>Assigned Dept Only</td>
                      <td>Assigned Dept Only</td>
                      <td>No Access</td>
                    </tr>
                    <tr>
                      <td><strong>Auditor</strong></td>
                      <td>Read-Only Company</td>
                      <td>No Ingestion</td>
                      <td>Full Read-Only Export</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* 5. REST API REFERENCE */}
            {activeSection === 'api' && (
              <div className="docs-topic-article">
                <div className="topic-header">
                  <span className="topic-category">REST API SPECIFICATION</span>
                  <h2>Enterprise REST API Reference & Code Samples</h2>
                  <p>
                    Integrate internal applications, enterprise search bars, Slack bots, and pipelines directly with RAG Hub.
                  </p>
                </div>

                <h3>1. User Authentication (`POST /api/auth/login`)</h3>
                <p>Authenticates an employee and issues a signed JWT containing tenant and department boundary claims.</p>
                <div className="docs-code-container">
                  <div className="code-header">
                    <span className="code-lang">cURL Example</span>
                    <button
                      type="button"
                      className="btn-copy-code"
                      onClick={() => copyToClipboard(`curl -X POST http://localhost:4000/api/auth/login \\\n  -H "Content-Type: application/json" \\\n  -d '{"companySlug":"acme","email":"ops@acme.demo","password":"demo-password"}'`, 'curl-login')}
                    >
                      {copiedId === 'curl-login' ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedId === 'curl-login' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="code-content">
{`curl -X POST http://localhost:4000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "companySlug": "acme",
    "email": "ops@acme.demo",
    "password": "demo-password"
  }'`}
                  </pre>
                </div>

                <h3>2. Grounded RAG Query (`POST /api/rag/query`)</h3>
                <p>Executes a hybrid semantic vector query against authorized department documents with inline citations.</p>
                <div className="docs-code-container">
                  <div className="code-header">
                    <span className="code-lang">Python (requests)</span>
                    <button
                      type="button"
                      className="btn-copy-code"
                      onClick={() => copyToClipboard(`import requests\n\nheaders = {\n    "Authorization": "Bearer <YOUR_JWT_TOKEN>",\n    "Content-Type": "application/json"\n}\n\npayload = {\n    "question": "What is our incident response SLA for Sev-1 outages?",\n    "departmentId": "00000000-0000-0000-0000-000000000011",\n    "searchMode": "hybrid"\n}\n\nresponse = requests.post("http://localhost:4000/api/rag/query", json=payload, headers=headers)\ndata = response.json()\nprint("Answer:", data["answer"])\nfor citation in data.get("citations", []):\n    print(f"- Source: {citation['title']} (Score: {citation['score']})")`, 'py-query')}
                    >
                      {copiedId === 'py-query' ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedId === 'py-query' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="code-content">
{`import requests

headers = {
    "Authorization": "Bearer <YOUR_JWT_TOKEN>",
    "Content-Type": "application/json"
}

payload = {
    "question": "What is our incident response SLA for Sev-1 outages?",
    "departmentId": "00000000-0000-0000-0000-000000000011",
    "searchMode": "hybrid"
}

response = requests.post("http://localhost:4000/api/rag/query", json=payload, headers=headers)
data = response.json()
print("Answer:", data["answer"])
for citation in data.get("citations", []):
    print(f"- Source: {citation['title']} (Score: {citation['score']})")`}
                  </pre>
                </div>

                <h3>3. Document Upload (`POST /api/documents/upload`)</h3>
                <p>Ingests a file, calculates SHA-256 deduplication hashes, and indexes vectors into pgvector.</p>
                <div className="docs-code-container">
                  <div className="code-header">
                    <span className="code-lang">cURL Multipart Upload</span>
                    <button
                      type="button"
                      className="btn-copy-code"
                      onClick={() => copyToClipboard(`curl -X POST http://localhost:4000/api/documents/upload \\\n  -H "Authorization: Bearer <TOKEN>" \\\n  -F "file=@/path/to/security-policy.pdf" \\\n  -F "departmentId=00000000-0000-0000-0000-000000000011" \\\n  -F "classification=internal"`, 'curl-upload')}
                    >
                      {copiedId === 'curl-upload' ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedId === 'curl-upload' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="code-content">
{`curl -X POST http://localhost:4000/api/documents/upload \\
  -H "Authorization: Bearer <TOKEN>" \\
  -F "file=@/path/to/security-policy.pdf" \\
  -F "departmentId=00000000-0000-0000-0000-000000000011" \\
  -F "classification=internal"`}
                  </pre>
                </div>

                <h3>4. Department Isolation Catalog (`GET /api/departments/catalog`)</h3>
                <p>Retrieves all organization departments with dynamic <code>authorized: boolean</code> boundary flags.</p>
                <div className="docs-code-container">
                  <pre className="code-content">
{`curl -X GET http://localhost:4000/api/departments/catalog \\
  -H "Authorization: Bearer <TOKEN>"`}
                  </pre>
                </div>

                <h3>5. Team Roster & RBAC Management (`GET /api/admin/users`)</h3>
                <p>Tenant Admin endpoint returning company users, assigned roles, and linked department objects.</p>
                <div className="docs-code-container">
                  <pre className="code-content">
{`curl -X GET http://localhost:4000/api/admin/users \\
  -H "Authorization: Bearer <ADMIN_TOKEN>"`}
                  </pre>
                </div>

                <h3>6. Update User Role & Boundaries (`PATCH /api/admin/users/:userId`)</h3>
                <p>Promotes/demotes user role and reassigns department scopes with immutable audit logging.</p>
                <div className="docs-code-container">
                  <pre className="code-content">
{`curl -X PATCH http://localhost:4000/api/admin/users/00000000-0000-0000-0000-000000000102 \\
  -H "Authorization: Bearer <ADMIN_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "role": "department_admin",
    "departmentIds": ["00000000-0000-0000-0000-000000000011"],
    "approvalStatus": "approved"
  }'`}
                  </pre>
                </div>

                <h3>7. Export SOC 2 Audit Telemetry (`GET /api/audit/export`)</h3>
                <p>Downloads complete JSON cryptographic audit logs for compliance officers and external auditors.</p>
                <div className="docs-code-container">
                  <pre className="code-content">
{`curl -X GET http://localhost:4000/api/audit/export \\
  -H "Authorization: Bearer <ADMIN_TOKEN>"`}
                  </pre>
                </div>
              </div>
            )}

            {/* 6. COMPLIANCE & AUDIT */}
            {activeSection === 'compliance' && (
              <div className="docs-topic-article">
                <div className="topic-header">
                  <span className="topic-category">SECURITY & COMPLIANCE</span>
                  <h2>Compliance Standards & Cryptographic Audit Logging</h2>
                  <p>
                    Every authentication attempt, document ingestion, query execution, and role escalation is recorded
                    in an immutable append-only audit trail.
                  </p>
                </div>

                <div className="compliance-matrix-grid">
                  <div className="compliance-stat-card card">
                    <ShieldCheck size={24} className="accent-icon" />
                    <h4>SOC 2 Type II Telemetry</h4>
                    <p>Audit trail records exact actor ID, target entity, timestamp, and query parameters.</p>
                  </div>
                  <div className="compliance-stat-card card">
                    <Lock size={24} className="accent-icon" />
                    <h4>Zero Training Retention</h4>
                    <p>Inference requests operate under strict zero-retention enterprise SLAs.</p>
                  </div>
                  <div className="compliance-stat-card card">
                    <Database size={24} className="accent-icon" />
                    <h4>GDPR Right to Erasure</h4>
                    <p>Cascading deletion purges document metadata, raw text, and vector embeddings in a single atomic transaction.</p>
                  </div>
                </div>

                <h3>Audit Event Schema</h3>
                <div className="docs-code-container">
                  <div className="code-header">
                    <span className="code-lang">JSON Event Payload</span>
                  </div>
                  <pre className="code-content">
{`{
  "id": "7fa882a1-e402-4d2b-bbd7-123456789abc",
  "action": "QUERY_RAG",
  "entityType": "department",
  "entityId": "dept-uuid",
  "actorId": "user-uuid",
  "metadata": {
    "searchMode": "hybrid",
    "questionHash": "sha256:4a8b...",
    "citationCount": 2,
    "latencyMs": 118
  },
  "createdAt": "2026-09-29T08:00:00.000Z"
}`}
                  </pre>
                </div>
              </div>
            )}
          </main>
        </div>
      </section>

      {/* Docs CTA Banner */}
      <section className="docs-cta-section">
        <div className="public-container">
          <div className="docs-cta-card card">
            <div>
              <h3>Ready to test kernel-enforced RAG in your environment?</h3>
              <p>Explore the live multi-tenant sandbox with pre-loaded department policies and pgvector indexes.</p>
            </div>
            <button type="button" className="btn-emerald-solid pulse" onClick={onOpenAuth}>
              <span>Access Live Sandbox</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ENTERPRISE LEGAL & POLICY MODAL
// ---------------------------------------------------------------------------
export function LegalModal({
  activeModal,
  onClose,
  onSelectModal
}: {
  activeModal: 'privacy' | 'terms' | 'sovereignty' | null;
  onClose: () => void;
  onSelectModal: (type: 'privacy' | 'terms' | 'sovereignty') => void;
}) {
  if (!activeModal) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 12000 }}>
      <div className="modal-card legal-modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="legal-tabs-header">
            <button
              type="button"
              className={`legal-tab-btn ${activeModal === 'privacy' ? 'active' : ''}`}
              onClick={() => onSelectModal('privacy')}
            >
              <Lock size={15} />
              <span>Privacy & Security Policy</span>
            </button>
            <button
              type="button"
              className={`legal-tab-btn ${activeModal === 'terms' ? 'active' : ''}`}
              onClick={() => onSelectModal('terms')}
            >
              <FileText size={15} />
              <span>Terms of Service & SLA</span>
            </button>
            <button
              type="button"
              className={`legal-tab-btn ${activeModal === 'sovereignty' ? 'active' : ''}`}
              onClick={() => onSelectModal('sovereignty')}
            >
              <ShieldCheck size={15} />
              <span>Sovereign Data Guarantee</span>
            </button>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} title="Close Dialog">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body legal-modal-body">
          {activeModal === 'privacy' && (
            <div className="legal-doc-content">
              <div className="legal-badge-pill">PRIVACY & DATA PROTECTION STANDARDS</div>
              <h2>Enterprise Privacy & Security Policy</h2>
              <p className="legal-intro">
                Last Updated: October 2026 · Standard SOC 2 Type II, ISO/IEC 27001, and GDPR Aligned
              </p>

              <div className="legal-section">
                <h4>1. Zero Customer Data Retention on Large Language Models</h4>
                <p>
                  RAG Hub Enterprise operates under strict zero-retention enterprise agreements. 
                  When vector chunks and user prompts are submitted for inference (via hardware-accelerated Groq LPU endpoints or private LLM instances), 
                  transferred prompts and synthesized outputs are processed ephemerally in volatile memory. 
                  Your proprietary contracts, financial spreadsheets, source code, and employee records are <strong>never stored, logged, or used to train public or foundational AI models</strong>.
                </p>
              </div>

              <div className="legal-section">
                <h4>2. Kernel-Enforced Multi-Tenant Database Isolation</h4>
                <p>
                  Unlike standard vector software wrappers that rely on application-level filtering, 
                  RAG Hub segregates all corporate data at the database storage engine. Every connection operates inside a transactional scope enforcing PostgreSQL 16 Row-Level Security (<code className="code-tag">app.tenant_id</code>). 
                  Access across tenant boundaries is physically rejected by the database kernel.
                </p>
              </div>

              <div className="legal-section">
                <h4>3. Departmental Scopes & Zero Internal Leakage</h4>
                <p>
                  Employees belong to verified department memberships. Retrieval queries and document libraries are strictly constrained to authorized scopes (<code className="code-tag">WHERE department_id = ANY(session.departments)</code>). 
                  Non-administrative employees in Operations can never retrieve or inspect documents belonging to Finance or Legal.
                </p>
              </div>

              <div className="legal-section">
                <h4>4. Cookie & Local Storage Policy</h4>
                <p>
                  RAG Hub Enterprise employs zero third-party marketing, analytics, or behavioral tracking cookies. 
                  Client-side storage is restricted exclusively to essential authentication session tokens (<code className="code-tag">raghub-token</code>) and visual theme preferences (Light / Dark mode).
                </p>
              </div>

              <div className="legal-section">
                <h4>5. GDPR Right to Erasure & Data Sovereignty</h4>
                <p>
                  Customers maintain full sovereignty over their knowledge base. Document deletions execute cascading transactions that immediately purge document metadata, raw text extractions, and 1536-dimensional vector embeddings from disk.
                </p>
              </div>

              <div className="legal-contact-callout">
                <strong>Data Protection Office Contact:</strong> For inquiries or Data Processing Addendum (DPA) execution, contact{' '}
                <a href="mailto:enterprise.raghub@gmail.com">enterprise.raghub@gmail.com</a>.
              </div>
            </div>
          )}

          {activeModal === 'terms' && (
            <div className="legal-doc-content">
              <div className="legal-badge-pill">MASTER SERVICE AGREEMENT & SLA</div>
              <h2>Enterprise Terms of Service & SLA Commitment</h2>
              <p className="legal-intro">
                Enterprise Commercial Terms · Applicable to Cloud, Private VPC, and On-Premise Deployments
              </p>

              <div className="legal-section">
                <h4>1. Service Level Agreement (99.95% Availability)</h4>
                <p>
                  RAG Hub Enterprise guarantees a monthly service availability of <strong>99.95%</strong> for all hosted and managed private cloud deployments. 
                  In the event of an unscheduled outage exceeding the SLA threshold, enterprise customers are entitled to contractual service credits calculated proportionally against monthly billing.
                </p>
              </div>

              <div className="legal-section">
                <h4>2. Intellectual Property Ownership</h4>
                <p>
                  The customer retains 100% exclusive, worldwide intellectual property ownership of all source files uploaded, vector embeddings calculated, metadata generated, and RAG synthesis completions produced by your workspace. 
                  RAG Hub claims zero rights or ownership over customer proprietary intelligence.
                </p>
              </div>

              <div className="legal-section">
                <h4>3. Deployment Sovereignty & Air-Gapped Licensing</h4>
                <p>
                  Enterprise licenses grant full rights to deploy RAG Hub within customer-owned AWS, GCP, or Azure Virtual Private Clouds (VPC), or air-gapped on-premise Kubernetes clusters. 
                  Air-gapped installations operate autonomously without outbound internet telemetry requirements.
                </p>
              </div>

              <div className="legal-section">
                <h4>4. Cryptographic SOC 2 Audit Telemetry</h4>
                <p>
                  All authentication attempts, document ingestions, query executions, and administrative permission changes are permanently recorded in an append-only audit trail. 
                  Compliance officers can export full cryptographic audit telemetry in standard JSON and CSV formats at any time.
                </p>
              </div>
            </div>
          )}

          {activeModal === 'sovereignty' && (
            <div className="legal-doc-content">
              <div className="legal-badge-pill">DATA SOVEREIGNTY CHARTER</div>
              <h2>Sovereign Data Guarantee & Kernel Security</h2>
              <p className="legal-intro">
                Our Contractual Commitment to Chief Information Security Officers (CISOs)
              </p>

              <div className="legal-section">
                <h4>1. Double-Gated Security Architecture</h4>
                <p>
                  Every request submitted to RAG Hub must pass two independent, verifiable security gates:
                </p>
                <ul className="pillar-list" style={{ marginTop: '10px' }}>
                  <li><Check size={14} /> <strong>Gate 1 (API Middleware):</strong> Validates JWT cryptographic signatures, verifies active database approval, and enforces relational department filtering.</li>
                  <li><Check size={14} /> <strong>Gate 2 (PostgreSQL 16 RLS):</strong> Transaction-scoped session context (<code className="code-tag">SET LOCAL app.tenant_id</code>) ensures unauthorized vectors are dropped inside the database kernel.</li>
                </ul>
              </div>

              <div className="legal-section">
                <h4>2. Hallucination-Free Inline Source Provenance</h4>
                <p>
                  All synthetic completions are strictly bounded by authorized source vectors. 
                  The inference engine appends verified inline citations (<code className="code-tag">[1]</code>) pointing to the exact document title, byte offset, and cosine match score.
                </p>
              </div>

              <div className="legal-section">
                <h4>3. Incident Response & 24/7 Security Hotline</h4>
                <p>
                  Enterprise customers receive dedicated incident response support with a 15-minute SLA for Sev-1 security events. 
                  Inquiries: <a href="mailto:enterprise.raghub@gmail.com">enterprise.raghub@gmail.com</a>.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-primary" onClick={onClose}>
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PUBLIC FOOTER (5-COLUMN ENTERPRISE LAYOUT WITH DIRECT DEEP MAPPING)
// ---------------------------------------------------------------------------
export function PublicFooter({
  setActivePage,
  onOpenLegalModal
}: {
  setActivePage: (p: 'platform' | 'solutions' | 'security' | 'pricing' | 'contact' | 'docs' | 'auth', subSection?: string) => void;
  onOpenLegalModal?: (type: 'privacy' | 'terms' | 'sovereignty') => void;
}) {
  return (
    <footer className="public-footer">
      <div className="public-container">
        <div className="footer-top-grid">
          {/* Col 1: Brand & Compliance */}
          <div className="footer-brand-col">
            <div className="public-nav-brand">
              <div className="brand-logo-gem">
                <Layers size={20} />
              </div>
              <div className="brand-title-wrap">
                <span className="brand-title">RAG Hub</span>
                <span className="brand-badge-pill">ENTERPRISE</span>
              </div>
            </div>
            <p className="footer-tagline">
              Sovereign Multi-Tenant Retrieval-Augmented Generation. 
              Engineered on PostgreSQL 16 + pgvector with kernel-level Row-Level Security.
            </p>
            <div className="footer-compliance-badges">
              <span className="comp-badge">SOC 2 Type II</span>
              <span className="comp-badge">ISO 27001</span>
              <span className="comp-badge">GDPR Ready</span>
              <span className="comp-badge">HIPAA Aligned</span>
              <span className="comp-badge">Zero Retention</span>
            </div>
            <div style={{ marginTop: '16px' }}>
              <a
                href="mailto:enterprise.raghub@gmail.com"
                style={{ color: 'var(--brand-primary)', textDecoration: 'none', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Mail size={14} />
                <span>enterprise.raghub@gmail.com</span>
              </a>
            </div>
          </div>

          {/* Col 2: Platform Architecture */}
          <div className="footer-links-col">
            <h5>Platform</h5>
            <ul>
              <li><button type="button" onClick={() => setActivePage('platform', 'platform-overview')}>Architecture Overview</button></li>
              <li><button type="button" onClick={() => setActivePage('platform', 'platform-pgvector')}>PostgreSQL 16 & pgvector</button></li>
              <li><button type="button" onClick={() => setActivePage('platform', 'platform-simulator')}>Kernel RLS Simulator</button></li>
              <li><button type="button" onClick={() => setActivePage('platform', 'platform-citations')}>Grounded LLM Citations</button></li>
              <li><button type="button" onClick={() => setActivePage('platform', 'platform-briefings')}>Executive Briefings</button></li>
              <li><button type="button" onClick={() => setActivePage('platform', 'platform-comparison')}>Enterprise Comparison</button></li>
            </ul>
          </div>

          {/* Col 3: Department Solutions */}
          <div className="footer-links-col">
            <h5>Solutions</h5>
            <ul>
              <li><button type="button" onClick={() => setActivePage('solutions', 'finance')}>Finance & Spend Governance</button></li>
              <li><button type="button" onClick={() => setActivePage('solutions', 'legal')}>Legal, Risk & IP Compliance</button></li>
              <li><button type="button" onClick={() => setActivePage('solutions', 'devops')}>Engineering Runbooks</button></li>
              <li><button type="button" onClick={() => setActivePage('solutions', 'hr')}>HR Employee Policies</button></li>
              <li><button type="button" onClick={() => setActivePage('security', 'security-rbac')}>Department Boundary Matrix</button></li>
            </ul>
          </div>

          {/* Col 4: Technical Documentation */}
          <div className="footer-links-col">
            <h5>Developer Docs</h5>
            <ul>
              <li><button type="button" onClick={() => setActivePage('docs', 'architecture')}>Platform Architecture Spec</button></li>
              <li><button type="button" onClick={() => setActivePage('docs', 'retrieval')}>Hybrid Vector Search & RRF</button></li>
              <li><button type="button" onClick={() => setActivePage('docs', 'ingestion')}>Document Ingestion Pipeline</button></li>
              <li><button type="button" onClick={() => setActivePage('docs', 'rbac')}>Multi-Tenant RBAC Guide</button></li>
              <li><button type="button" onClick={() => setActivePage('docs', 'api')}>REST API Reference</button></li>
              <li><button type="button" onClick={() => setActivePage('docs', 'compliance')}>SOC 2 Audit Telemetry</button></li>
            </ul>
          </div>

          {/* Col 5: Enterprise & Trust */}
          <div className="footer-links-col">
            <h5>Trust & Company</h5>
            <ul>
              <li><button type="button" onClick={() => setActivePage('security', 'security-layers')}>Security Trust Center</button></li>
              <li><button type="button" onClick={() => setActivePage('security', 'security-guarantees')}>Sovereign Data Guarantee</button></li>
              <li><button type="button" onClick={() => setActivePage('pricing', 'pricing-plans')}>Enterprise Pricing & SLA</button></li>
              <li><button type="button" onClick={() => setActivePage('pricing', 'pricing-faq')}>Enterprise FAQ</button></li>
              <li><button type="button" onClick={() => setActivePage('contact')}>Contact Solutions Team</button></li>
              <li><button type="button" onClick={() => setActivePage('auth')}>Sandbox Platform Login</button></li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom Bar with Interactive Legal & Policy Modals */}
        <div className="footer-bottom-bar">
          <p>© {new Date().getFullYear()} RAG Hub Enterprise Systems Inc. All rights reserved.</p>
          <div className="footer-legal-links">
            <button type="button" onClick={() => onOpenLegalModal?.('privacy')}>
              Privacy & Security Policy
            </button>
            <span>•</span>
            <button type="button" onClick={() => onOpenLegalModal?.('terms')}>
              Terms of Service & SLA
            </button>
            <span>•</span>
            <button type="button" onClick={() => onOpenLegalModal?.('sovereignty')}>
              Sovereign Data Guarantee
            </button>
            <span>•</span>
            <a href="mailto:enterprise.raghub@gmail.com">
              enterprise.raghub@gmail.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
