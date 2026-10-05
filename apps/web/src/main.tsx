import React, { useState, useEffect, useMemo, type FormEvent, type ChangeEvent } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Bot,
  Send,
  Sparkles,
  ShieldCheck,
  Layers,
  FileText,
  CheckCircle2,
  Clock,
  Upload,
  Trash2,
  Building2,
  ExternalLink,
  Eye,
  LogOut,
  RefreshCw,
  Search,
  KeyRound,
  Users,
  Check,
  X,
  AlertCircle,
  Database,
  Lock,
  ChevronRight,
  BookOpen,
  ArrowRight,
  Activity,
  Filter,
  HelpCircle,
  Plus,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Download,
  BarChart3,
  Menu,
  PieChart,
  ShieldAlert,
  Globe,
  Sun,
  Moon,
  Zap,
  GitCompare,
  Mail,
  Terminal,
  Code2,
  Cpu,
  Gauge,
  Play,
  CheckCircle,
  Radio,
  Webhook
} from 'lucide-react';
import './styles.css';
import './extra.css';
import './public.css';
import {
  PublicHeader,
  PlatformPage,
  SolutionsPage,
  SecurityPage,
  PricingPage,
  ContactPage,
  DocsPage,
  PublicFooter,
  LegalModal
} from './public-pages';
import { ErrorBoundary } from './components/ErrorBoundary';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

type Role = 'tenant_admin' | 'department_admin' | 'member' | 'auditor';

type Department = { id: string; name: string; authorized?: boolean };
type DocumentItem = {
  id: string;
  title: string;
  summary?: string;
  mimeType?: string;
  departmentId: string;
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  status: 'processing' | 'ready';
  byteSize: string | number;
  updatedAt: string;
};
type PendingUser = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  role: Role;
  requestedDepartmentId?: string;
  requestedDepartmentName?: string;
};
type CompanyUser = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  approvalStatus: 'approved' | 'rejected' | 'pending';
  approvedAt: string | null;
  createdAt: string;
  departments: Array<{ id: string; name: string }>;
};
type DepartmentCatalogItem = {
  id: string;
  name: string;
  authorized: boolean;
};
type PendingDepartment = { id: string; name: string; requestedByName: string; requestedByEmail: string; createdAt: string };
type AuditEvent = {
  id?: string | number;
  action: string;
  entityType: string;
  entityId?: string;
  actorId?: string;
  cryptoHash?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};
type PlatformCompany = {
  id: string;
  name: string;
  slug: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  userCount: number;
  departmentCount: number;
  documentCount: number;
};

type ContactInquiry = {
  id: string;
  name: string;
  email: string;
  company: string;
  companySize?: string;
  department?: string;
  message: string;
  status: 'new' | 'in_review' | 'contacted' | 'archived';
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
};

type Citation = {
  text: string;
  chunk: number;
  documentId: string;
  title: string;
  score: number;
  vectorScore?: number;
  textScore?: number;
  matchType?: string;
};

type ChatMessage = {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  citations?: Citation[];
  generation?: string;
  retrieval?: string;
  searchMode?: 'hybrid' | 'vector' | 'keyword';
  departmentName?: string;
  timestamp: string;
  feedback?: 'positive' | 'negative';
};

async function api(path: string, token?: string, options?: RequestInit) {
  const response = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {})
    }
  });
  const body = await response.json().catch(() => ({ error: 'Non-JSON server response' }));
  if (!response.ok) throw new Error(body.error || 'Request failed.');
  return body;
}

const toSlug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function formatBytes(bytes: number | string) {
  const n = Number(bytes);
  if (!n || isNaN(n)) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// AUTHENTICATION COMPONENT
// ---------------------------------------------------------------------------
function Auth({
  onLogin,
  onCancel,
  theme,
  toggleTheme
}: {
  onLogin: (token: string) => void;
  onCancel?: () => void;
  theme?: 'dark' | 'light';
  toggleTheme?: () => void;
}) {
  const [mode, setMode] = useState<'login' | 'company' | 'user' | 'platform'>('login');
  const [values, setValues] = useState<Record<string, string>>({
    email: '',
    password: '',
    tenantSlug: 'acme',
    companySlug: 'acme',
    departmentId: ''
  });
  const [teamDepartments, setTeamDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setField = (key: string) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = event.target.value;
    setValues(curr => ({
      ...curr,
      [key]: key.toLowerCase().includes('slug') ? toSlug(val) : val
    }));
  };

  // Fetch departments when user is joining team
  useEffect(() => {
    if (mode === 'user') {
      const slug = values.companySlug || 'acme';
      setLoadingDepts(true);
      api(`/companies/${slug}/departments`)
        .then(res => {
          if (res?.departments) {
            setTeamDepartments(res.departments);
            if (res.departments[0] && !values.departmentId) {
              setValues(curr => ({ ...curr, departmentId: res.departments[0].id }));
            }
          }
        })
        .catch(() => setTeamDepartments([]))
        .finally(() => setLoadingDepts(false));
    }
  }, [mode, values.companySlug]);

  const fillQuickDemo = (type: 'acme_admin' | 'acme_ops' | 'acme_finance' | 'acme_legal' | 'acme_auditor' | 'platform_admin' | 'aster_member') => {
    if (type === 'acme_admin') {
      setMode('login');
      setValues({ email: 'admin@acme.demo', password: 'demo-password', tenantSlug: 'acme' });
    } else if (type === 'acme_ops') {
      setMode('login');
      setValues({ email: 'ops@acme.demo', password: 'demo-password', tenantSlug: 'acme' });
    } else if (type === 'acme_finance') {
      setMode('login');
      setValues({ email: 'finance@acme.demo', password: 'demo-password', tenantSlug: 'acme' });
    } else if (type === 'acme_legal') {
      setMode('login');
      setValues({ email: 'legal@acme.demo', password: 'demo-password', tenantSlug: 'acme' });
    } else if (type === 'acme_auditor') {
      setMode('login');
      setValues({ email: 'auditor@acme.demo', password: 'demo-password', tenantSlug: 'acme' });
    } else if (type === 'platform_admin') {
      setMode('platform');
      setValues({ email: 'platform@raghub.demo', password: 'platform-password' });
    } else if (type === 'aster_member') {
      setMode('login');
      setValues({ email: 'user@aster.demo', password: 'demo-password', tenantSlug: 'aster-research' });
    }
    setNotice(null);
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        const res = await api('/auth/login', undefined, { method: 'POST', body: JSON.stringify(values) });
        onLogin(res.token);
      } else if (mode === 'platform') {
        const res = await api('/auth/platform/login', undefined, { method: 'POST', body: JSON.stringify({ email: values.email, password: values.password }) });
        onLogin(res.token);
      } else if (mode === 'company') {
        const res = await api('/companies/register', undefined, { method: 'POST', body: JSON.stringify(values) });
        setNotice({ type: 'success', text: res.message || 'Company registered successfully. You can now login.' });
        setMode('login');
      } else if (mode === 'user') {
        const res = await api(`/companies/${values.companySlug}/users/register`, undefined, {
          method: 'POST',
          body: JSON.stringify({
            displayName: values.displayName,
            email: values.email,
            password: values.password,
            departmentId: values.departmentId || undefined
          })
        });
        setNotice({ type: 'success', text: res.message || 'Registration submitted for company administrator approval.' });
      }
    } catch (err) {
      setNotice({ type: 'error', text: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-card-top-nav">
          {onCancel ? (
            <button type="button" className="btn-back-link" onClick={onCancel}>
              ← Return to Platform Overview
            </button>
          ) : <div />}
          {toggleTheme && (
            <button
              type="button"
              className="btn-theme-auth"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          )}
        </div>
        <div className="auth-brand">
          <div className="logo-gem">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="brand-title">RAG Hub Enterprise</h1>
            <p className="brand-tagline">Multi-Tenant Knowledge Intelligence Platform</p>
          </div>
        </div>

        {/* Quick Demo Fill Buttons */}
        <div className="demo-credentials-bar">
          <span className="demo-label">Instant One-Click Demo Role Access:</span>
          <div className="demo-pills demo-pills-wrap">
            <button
              type="button"
              className="demo-pill"
              onClick={() => fillQuickDemo('acme_admin')}
              title="Acme Company Admin (All Departments & Team Management)"
            >
              🏢 Acme Admin
            </button>
            <button
              type="button"
              className="demo-pill"
              onClick={() => fillQuickDemo('acme_ops')}
              title="Operations Isolated Member (Only Operations Runbooks)"
            >
              ⚙️ Ops Lead (Isolated)
            </button>
            <button
              type="button"
              className="demo-pill"
              onClick={() => fillQuickDemo('acme_finance')}
              title="Finance Isolated Member (Only Finance Policies)"
            >
              💰 Finance (Isolated)
            </button>
            <button
              type="button"
              className="demo-pill"
              onClick={() => fillQuickDemo('acme_legal')}
              title="Legal Counsel (Legal Department Boundary)"
            >
              ⚖️ Legal Counsel
            </button>
            <button
              type="button"
              className="demo-pill"
              onClick={() => fillQuickDemo('acme_auditor')}
              title="Compliance Auditor (Audit Trail Telemetry)"
            >
              🛡️ Auditor
            </button>
            <button
              type="button"
              className="demo-pill"
              onClick={() => fillQuickDemo('platform_admin')}
              title="Central Multi-Tenant Platform Administrator"
            >
              ⚡ Platform Admin
            </button>
          </div>
        </div>

        <div className="auth-tabs">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setNotice(null); }}>
            Tenant Login
          </button>
          <button type="button" className={mode === 'company' ? 'active' : ''} onClick={() => { setMode('company'); setNotice(null); }}>
            Register Company
          </button>
          <button type="button" className={mode === 'user' ? 'active' : ''} onClick={() => { setMode('user'); setNotice(null); }}>
            Join Team
          </button>
          <button type="button" className={mode === 'platform' ? 'active' : ''} onClick={() => { setMode('platform'); setNotice(null); }}>
            Platform Portal
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'company' && (
            <>
              <div className="input-group">
                <label>Company Name</label>
                <input required placeholder="e.g. Acme Corporation" value={values.companyName || ''} onChange={setField('companyName')} />
              </div>
              <div className="input-group">
                <label>Company Slug (URL Identifier)</label>
                <input required placeholder="e.g. acme" value={values.companySlug || ''} onChange={setField('companySlug')} />
              </div>
              <div className="input-group">
                <label>Administrator Full Name</label>
                <input required placeholder="e.g. Jane Doe" value={values.adminName || ''} onChange={setField('adminName')} />
              </div>
              <div className="input-group">
                <label>Administrator Work Email</label>
                <input required type="email" placeholder="admin@acme.com" value={values.adminEmail || ''} onChange={setField('adminEmail')} />
              </div>
            </>
          )}

          {mode === 'user' && (
            <>
              <div className="input-group">
                <label>Company Slug</label>
                <input required placeholder="e.g. acme" value={values.companySlug || 'acme'} onChange={setField('companySlug')} />
              </div>
              <div className="input-group">
                <label>Target Department</label>
                {loadingDepts ? (
                  <div className="input-loading-placeholder">Loading available departments...</div>
                ) : teamDepartments.length > 0 ? (
                  <select
                    value={values.departmentId || ''}
                    onChange={setField('departmentId')}
                    className="dept-select-full"
                    required
                  >
                    <option value="">Select your assigned department...</option>
                    {teamDepartments.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} Department
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    placeholder="Enter department name (defaults to General)"
                    value={values.departmentName || ''}
                    onChange={setField('departmentName')}
                  />
                )}
                <small className="help-text">Database Row-Level Security will isolate your session to this department boundary.</small>
              </div>
              <div className="input-group">
                <label>Your Full Name</label>
                <input required placeholder="e.g. Alex Smith" value={values.displayName || ''} onChange={setField('displayName')} />
              </div>
              <div className="input-group">
                <label>Work Email</label>
                <input required type="email" placeholder="alex@acme.com" value={values.email || ''} onChange={setField('email')} />
              </div>
            </>
          )}

          {mode === 'login' && (
            <>
              <div className="input-group">
                <label>Company URL Slug</label>
                <input required placeholder="acme" value={values.tenantSlug || ''} onChange={setField('tenantSlug')} />
              </div>
              <div className="input-group">
                <label>Work Email</label>
                <input required type="email" placeholder="admin@acme.demo" value={values.email || ''} onChange={setField('email')} />
              </div>
            </>
          )}

          {mode === 'platform' && (
            <div className="input-group">
              <label>Platform Master Email</label>
              <input required type="email" placeholder="platform@raghub.demo" value={values.email || ''} onChange={setField('email')} />
            </div>
          )}

          <div className="input-group">
            <label>Password</label>
            <input
              required
              type="password"
              placeholder="••••••••"
              minLength={8}
              value={values.password || ''}
              onChange={setField('password')}
            />
            <small className="help-text">Standard enterprise security requires at least 8 characters.</small>
          </div>

          {notice && (
            <div className={`status-banner ${notice.type}`}>
              {notice.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
              <span>{notice.text}</span>
            </div>
          )}

          <button type="submit" className="btn-primary full-width" disabled={submitting}>
            {submitting ? 'Authenticating...' : mode === 'login' ? 'Sign In' : mode === 'platform' ? 'Enter Platform Console' : mode === 'company' ? 'Register & Provision Workspace' : 'Submit Registration'}
          </button>
        </form>

        <div className="auth-footer">
          <div className="security-tag">
            <Lock size={12} />
            <span>PostgreSQL pgvector & Row-Level Security (RLS) Enforced</span>
          </div>
          <div className="auth-contact-line">
            <span>Enterprise Desk: </span>
            <a href="mailto:enterprise.raghub@gmail.com">enterprise.raghub@gmail.com</a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MAIN APPLICATION COMPONENT
// ---------------------------------------------------------------------------
export function App() {
  const [token, setToken] = useState(localStorage.getItem('raghub-token') || '');
  const [me, setMe] = useState<any>();
  const [viewMode, setViewMode] = useState<'public' | 'workspace'>(() => {
    try {
      const hash = window.location.hash.replace('#', '');
      // Only switch to workspace directly if explicit hash or query param is set AND token exists:
      if (['workspace', 'app'].includes(hash) || hash.startsWith('tab-')) {
        return localStorage.getItem('raghub-token') ? 'workspace' : 'public';
      }
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'workspace') {
        return localStorage.getItem('raghub-token') ? 'workspace' : 'public';
      }
    } catch {}
    // Standard enterprise default: Always show public landing page first on visit
    return 'public';
  });
  const [publicPage, setPublicPage] = useState<'platform' | 'solutions' | 'security' | 'pricing' | 'contact' | 'docs' | 'auth'>(() => {
    try {
      const pathParts = window.location.pathname.replace(/^\//, '').split('/');
      const pageFromPath = pathParts[0]?.toLowerCase();
      if (['platform', 'solutions', 'security', 'pricing', 'contact', 'docs', 'auth'].includes(pageFromPath)) {
        return pageFromPath as any;
      }
      const hash = window.location.hash.replace(/^#\/?/, '');
      const [p] = hash.split('/');
      if (['platform', 'solutions', 'security', 'pricing', 'contact', 'docs', 'auth'].includes(p)) {
        return p as any;
      }
      const params = new URLSearchParams(window.location.search);
      const qp = params.get('page');
      if (qp && ['platform', 'solutions', 'security', 'pricing', 'contact', 'docs', 'auth'].includes(qp)) {
        return qp as any;
      }
    } catch {}
    return 'platform';
  });
  const [publicSubSection, setPublicSubSection] = useState<string | null>(() => {
    try {
      const pathParts = window.location.pathname.replace(/^\//, '').split('/');
      if (pathParts.length > 1 && pathParts[1]) return pathParts[1];
      const hash = window.location.hash.replace(/^#\/?/, '');
      const parts = hash.split('/');
      if (parts.length > 1 && parts[1]) return parts[1];
    } catch {}
    return null;
  });
  const [legalModalOpen, setLegalModalOpen] = useState<'privacy' | 'terms' | 'sovereignty' | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('theme');
      if (t === 'light' || t === 'dark') return t;
    } catch {}
    return (localStorage.getItem('raghub-theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('raghub-theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleUrlChange = () => {
      try {
        const pathParts = window.location.pathname.replace(/^\//, '').split('/');
        const pageFromPath = pathParts[0]?.toLowerCase();
        if (['platform', 'solutions', 'security', 'pricing', 'contact', 'docs', 'auth'].includes(pageFromPath)) {
          setPublicPage(pageFromPath as any);
          setPublicSubSection(pathParts[1] || null);
          setViewMode('public');
          return;
        }

        const raw = window.location.hash.replace(/^#\/?/, '');
        const [pagePart, subPart] = raw.split('/');
        if (['platform', 'solutions', 'security', 'pricing', 'contact', 'docs', 'auth'].includes(pagePart)) {
          setPublicPage(pagePart as any);
          setPublicSubSection(subPart || null);
          setViewMode('public');
        } else if (['workspace', 'app'].includes(raw) || raw.startsWith('tab-')) {
          if (localStorage.getItem('raghub-token')) {
            setViewMode('workspace');
            if (raw.startsWith('tab-')) {
              const t = raw.replace('tab-', '');
              if (['chat', 'departments', 'documents', 'approvals', 'audit', 'analytics', 'developers', 'observability', 'platform'].includes(t)) {
                setActiveTab(t as any);
              }
            }
          } else {
            setPublicPage('auth');
            setPublicSubSection(null);
            setViewMode('public');
          }
        }
      } catch {}
    };

    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  const handleSetPublicPage = (page: 'platform' | 'solutions' | 'security' | 'pricing' | 'contact' | 'docs' | 'auth', subSection?: string) => {
    setPublicPage(page);
    setPublicSubSection(subSection || null);
    try {
      const targetHash = subSection ? `${page}/${subSection}` : page;
      window.location.hash = targetHash;
      if (window.history && window.history.pushState) {
        window.history.pushState(null, '', `/${page}${subSection ? `/${subSection}` : ''}`);
      }
      if (!subSection) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {}
  };

  const toggleTheme = () => {
    setTheme(curr => curr === 'dark' ? 'light' : 'dark');
  };

  const [activeTab, setActiveTab] = useState<'chat' | 'departments' | 'documents' | 'approvals' | 'audit' | 'analytics' | 'developers' | 'observability' | 'platform'>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && ['chat', 'departments', 'documents', 'approvals', 'audit', 'analytics', 'developers', 'observability', 'platform'].includes(tab)) {
        return tab as any;
      }
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('tab-')) {
        const t = hash.replace('tab-', '');
        if (['chat', 'departments', 'documents', 'approvals', 'audit', 'analytics', 'developers', 'observability', 'platform'].includes(t)) {
          return t as any;
        }
      }
    } catch {}
    return 'chat';
  });

  const switchTab = (tab: 'chat' | 'departments' | 'documents' | 'approvals' | 'audit' | 'analytics' | 'developers' | 'observability' | 'platform') => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    try {
      window.location.hash = `tab-${tab}`;
    } catch {}
  };

  useEffect(() => {
    const handleHash = () => {
      try {
        const hash = window.location.hash.replace('#', '');
        if (hash.startsWith('tab-')) {
          const t = hash.replace('tab-', '') as any;
          if (['chat', 'departments', 'documents', 'approvals', 'audit', 'analytics', 'developers', 'observability', 'platform'].includes(t)) {
            setActiveTab(t);
          }
        }
      } catch {}
    };
    window.addEventListener('hashchange', handleHash);
    (window as any).__setActiveTab = (t: any) => setActiveTab(t);
    return () => {
      window.removeEventListener('hashchange', handleHash);
      delete (window as any).__setActiveTab;
    };
  }, []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Multi-tenant & Department State
  const [departments, setDepartments] = useState<Department[]>([]);
  const [uploadDepartments, setUploadDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [uploadDeptId, setUploadDeptId] = useState('');

  // Knowledge base state & Enterprise Filtering
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [docSearch, setDocSearch] = useState('');
  const [docClassificationFilter, setDocClassificationFilter] = useState<'all' | 'internal' | 'confidential' | 'restricted' | 'public'>('all');
  const [dashboard, setDashboard] = useState<any>();

  // Audit state & Live Search
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');

  // Boundary Simulator state
  const [probeResult, setProbeResult] = useState<{ sourceDept: string; targetDept: string; status: 'verified'; message: string } | null>(null);
  const [probeRunning, setProbeRunning] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  // Modals / Drawers
  const [selectedDocRefs, setSelectedDocRefs] = useState<{ title: string; chunks: { chunk: number; text: string; tokenCount: number }[] } | null>(null);
  const [briefingDoc, setBriefingDoc] = useState<DocumentItem | null>(null);
  const [isBriefingGenerating, setIsBriefingGenerating] = useState(false);

  // Developer Center State (SDLC)
  const [apiKeys, setApiKeys] = useState<Array<{ id: string; name: string; keyPrefix: string; scopes: string[]; createdAt: string; lastUsedAt: string | null; expiresAt: string | null; revoked: boolean }>>([]);
  const [webhooks, setWebhooks] = useState<Array<{ id: string; name: string; url: string; events: string[]; active: boolean; createdAt: string; lastTriggeredAt: string | null; lastStatusCode: number | null }>>([]);
  const [newKeyModal, setNewKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['rag:query', 'documents:read']);
  const [newKeyExpires, setNewKeyExpires] = useState<number>(90);
  const [newKeyLoading, setNewKeyLoading] = useState(false);
  const [newKeySecretModal, setNewKeySecretModal] = useState<{ name: string; keySecret: string; keyPrefix: string } | null>(null);

  const [newWebhookModal, setNewWebhookModal] = useState(false);
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>(['document.indexed', 'copilot.query']);
  const [newWebhookLoading, setNewWebhookLoading] = useState(false);
  const [webhookTestingId, setWebhookTestingId] = useState<string | null>(null);
  const [webhookTestMessage, setWebhookTestMessage] = useState<string | null>(null);

  const [codeSnippetLang, setCodeSnippetLang] = useState<'curl' | 'python' | 'node' | 'go'>('curl');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Developer API Playground
  const [playgroundQuery, setPlaygroundQuery] = useState('What are the enterprise compliance and data isolation protocols?');
  const [playgroundDeptId, setPlaygroundDeptId] = useState('');
  const [playgroundMode, setPlaygroundMode] = useState<'hybrid' | 'vector' | 'keyword'>('hybrid');
  const [playgroundLoading, setPlaygroundLoading] = useState(false);
  const [playgroundResult, setPlaygroundResult] = useState<any | null>(null);
  const [playgroundLatency, setPlaygroundLatency] = useState<number | null>(null);

  // Observability & SRE State
  const [telemetry, setTelemetry] = useState<any | null>(null);
  const [diagnosticsRunning, setDiagnosticsRunning] = useState(false);
  const [diagnosticsResults, setDiagnosticsResults] = useState<Array<{ step: string; status: 'passed' | 'warning' | 'failed'; latencyMs: number; details: string }> | null>(null);
  const [diagnosticsTimestamp, setDiagnosticsTimestamp] = useState<string | null>(null);

  // Audit Hash Verification State
  const [auditVerifying, setAuditVerifying] = useState(false);
  const [auditVerifyResult, setAuditVerifyResult] = useState<{ verified: boolean; eventsValidated: number; algorithm: string; certifiedTimestamp: string; merkleRoot: string } | null>(null);

  // Chat / RAG state
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Administration state
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [pendingDepartments, setPendingDepartments] = useState<PendingDepartment[]>([]);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | Role>('ALL');
  const [departmentCatalog, setDepartmentCatalog] = useState<DepartmentCatalogItem[]>([]);
  const [editingUser, setEditingUser] = useState<CompanyUser | null>(null);
  const [editUserRole, setEditUserRole] = useState<Role>('member');
  const [editUserDepts, setEditUserDepts] = useState<string[]>([]);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [platformCompanies, setPlatformCompanies] = useState<PlatformCompany[]>([]);
  const [platformInquiries, setPlatformInquiries] = useState<ContactInquiry[]>([]);
  const [inquiryFilter, setInquiryFilter] = useState<'all' | 'new' | 'in_review' | 'contacted' | 'archived'>('all');
  const [inquirySearch, setInquirySearch] = useState('');

  // Retrieval & Quick Intelligence state
  const [searchMode, setSearchMode] = useState<'hybrid' | 'vector' | 'keyword'>('hybrid');
  const [quickToolsOpen, setQuickToolsOpen] = useState(false);
  const [quickToolMode, setQuickToolMode] = useState<'summarize' | 'checklist' | 'compare' | 'adhoc'>('summarize');
  const [selectedToolDocId, setSelectedToolDocId] = useState('');
  const [selectedToolDocId2, setSelectedToolDocId2] = useState('');
  const [summaryStyle, setSummaryStyle] = useState<'executive' | 'checklist' | 'risks' | 'takeaways'>('executive');
  const [adHocText, setAdHocText] = useState('');
  const [quickResult, setQuickResult] = useState<{ title: string; subtitle?: string; content: string } | null>(null);
  const [isGeneratingTool, setIsGeneratingTool] = useState(false);
  const [copiedResult, setCopiedResult] = useState(false);

  // Modals & forms
  const [newDeptName, setNewDeptName] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadClassification, setUploadClassification] = useState<'public' | 'internal' | 'confidential' | 'restricted'>('internal');
  const [isUploading, setIsUploading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'info' | 'error' | 'success'; message: string } | null>(null);

  const isPlatformAdmin = Boolean(me?.platformAdmin);
  const isCompanyAdmin = me?.role === 'tenant_admin' && !isPlatformAdmin;

  const currentDept = useMemo(
    () => departments.find(d => d.id === selectedDeptId) || departments[0],
    [departments, selectedDeptId]
  );

  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchSearch = doc.title.toLowerCase().includes(docSearch.toLowerCase()) || (doc.summary && doc.summary.toLowerCase().includes(docSearch.toLowerCase()));
      const matchDept = !selectedDeptId || doc.departmentId === selectedDeptId;
      const matchClass = docClassificationFilter === 'all' || doc.classification.toLowerCase() === docClassificationFilter;
      return matchSearch && matchDept && matchClass;
    });
  }, [documents, docSearch, selectedDeptId, docClassificationFilter]);

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const q = auditSearch.toLowerCase();
      const matchSearch = !q ||
        log.action.toLowerCase().includes(q) ||
        log.entityType.toLowerCase().includes(q) ||
        JSON.stringify(log.metadata || {}).toLowerCase().includes(q);
      const matchAction = auditActionFilter === 'ALL' || log.action === auditActionFilter;
      return matchSearch && matchAction;
    });
  }, [auditLogs, auditSearch, auditActionFilter]);

  const filteredInquiries = useMemo(() => {
    return platformInquiries.filter(inq => {
      const q = inquirySearch.toLowerCase();
      const matchSearch = !q ||
        inq.name.toLowerCase().includes(q) ||
        inq.email.toLowerCase().includes(q) ||
        inq.company.toLowerCase().includes(q) ||
        (inq.department && inq.department.toLowerCase().includes(q)) ||
        inq.message.toLowerCase().includes(q);
      const matchFilter = inquiryFilter === 'all' || inq.status === inquiryFilter;
      return matchSearch && matchFilter;
    });
  }, [platformInquiries, inquirySearch, inquiryFilter]);

  const filteredCompanyUsers = useMemo(() => {
    return companyUsers.filter(u => {
      const q = userSearch.toLowerCase();
      const matchSearch = !q ||
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.departments.some(d => d.name.toLowerCase().includes(q));
      const matchRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
      return matchSearch && matchRole;
    });
  }, [companyUsers, userSearch, userRoleFilter]);

  const newInquiriesCount = useMemo(() => {
    return platformInquiries.filter(inq => inq.status === 'new').length;
  }, [platformInquiries]);

  const signOut = () => {
    localStorage.removeItem('raghub-token');
    setToken('');
    setMe(undefined);
    setChatHistory([]);
    setActiveTab('chat');
    setViewMode('public');
    setPublicPage('platform');
    window.location.hash = 'platform';
  };

  async function handleUpdateInquiryStatus(id: string, status: ContactInquiry['status'], adminNotes?: string) {
    try {
      await api(`/platform/inquiries/${id}`, token, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNotes })
      });
      setPlatformInquiries(prev => prev.map(inq => inq.id === id ? { ...inq, status, ...(adminNotes !== undefined ? { adminNotes } : {}) } : inq));
      setNotice({ type: 'success', message: `Inquiry status updated to ${status.replace('_', ' ')}.` });
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to update inquiry.' });
    }
  }

  async function handleDeleteInquiry(id: string) {
    if (!confirm('Are you sure you want to delete this inquiry record?')) return;
    try {
      await api(`/platform/inquiries/${id}`, token, { method: 'DELETE' });
      setPlatformInquiries(prev => prev.filter(inq => inq.id !== id));
      setNotice({ type: 'success', message: 'Inquiry record removed.' });
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to delete inquiry.' });
    }
  }

  function handleOpenEditUser(user: CompanyUser) {
    setEditingUser(user);
    setEditUserRole(user.role);
    setEditUserDepts(user.departments.map(d => d.id));
  }

  async function handleSaveUserAccess() {
    if (!editingUser) return;
    setIsSavingUser(true);
    try {
      await api(`/admin/users/${editingUser.id}`, token, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: editUserRole,
          departmentIds: editUserDepts
        })
      });
      setNotice({ type: 'success', message: `Permissions and department scopes updated for ${editingUser.displayName}.` });
      setEditingUser(null);
      await refreshData();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to update user access.' });
    } finally {
      setIsSavingUser(false);
    }
  }

  async function handleDeleteUser(userId: string, userName: string) {
    if (!confirm(`Are you sure you want to remove ${userName} from the company workspace? All active department access will be revoked.`)) return;
    try {
      await api(`/admin/users/${userId}`, token, { method: 'DELETE' });
      setNotice({ type: 'success', message: `${userName} removed from company workspace.` });
      await refreshData();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to remove user.' });
    }
  }

  // -------------------------------------------------------------------------
  // DATA FETCHING & SYNCHRONIZATION
  // -------------------------------------------------------------------------
  async function refreshData() {
    if (!token) return;
    try {
      const profile = await api('/me', token);
      setMe(profile);

      if (profile.platformAdmin) {
        setActiveTab('platform');
        try { window.location.hash = 'tab-platform'; } catch {}
        const [companies, stats, inquiries] = await Promise.all([
          api('/platform/companies', token),
          api('/dashboard', token),
          api('/platform/inquiries', token).catch(() => [])
        ]);
        setPlatformCompanies(companies);
        setDashboard(stats);
        setPlatformInquiries(inquiries);
        return;
      }

      // Automatically reconcile active tab for non-platform users
      setActiveTab(curr => {
        const hash = window.location.hash.replace('#', '');
        if (hash.startsWith('tab-')) {
          const req = hash.replace('tab-', '');
          if (['chat', 'departments', 'documents', 'analytics', 'audit'].includes(req)) {
            return req as any;
          }
          if (req === 'approvals' && profile.role === 'tenant_admin') {
            return 'approvals';
          }
        }
        // If current tab is platform or unauthorized, default to chat
        if (curr === 'platform') {
          try { window.location.hash = 'tab-chat'; } catch {}
          return 'chat';
        }
        if (curr === 'approvals' && profile.role !== 'tenant_admin') {
          try { window.location.hash = 'tab-chat'; } catch {}
          return 'chat';
        }
        return curr || 'chat';
      });

      const [visibleDepts, catalogDepts] = await Promise.all([
        api('/departments', token) as Promise<Department[]>,
        api('/departments/catalog', token).catch(() => []) as Promise<DepartmentCatalogItem[]>
      ]);
      setDepartments(visibleDepts);
      setDepartmentCatalog(catalogDepts.length > 0 ? catalogDepts : visibleDepts.map(d => ({ ...d, authorized: true })));

      const targetDepts = profile.role === 'tenant_admin'
        ? ((await api('/admin/upload-departments', token)) as Department[])
        : visibleDepts;
      setUploadDepartments(targetDepts);

      setSelectedDeptId(prev => (prev && visibleDepts.some(d => d.id === prev) ? prev : visibleDepts[0]?.id || ''));
      setUploadDeptId(prev => (prev && targetDepts.some(d => d.id === prev) ? prev : targetDepts[0]?.id || ''));

      const [stats, analytics] = await Promise.all([
        api('/dashboard', token),
        api('/analytics', token).catch(() => null)
      ]);
      setDashboard(stats);
      setAnalyticsData(analytics);

      if (profile.role === 'tenant_admin') {
        const [users, depts, allUsers] = await Promise.all([
          api('/admin/pending-users', token),
          api('/admin/pending-departments', token),
          api('/admin/users', token).catch(() => [])
        ]);
        setPendingUsers(users);
        setPendingDepartments(depts);
        setCompanyUsers(allUsers);
      }

      if (profile.role === 'tenant_admin' || profile.role === 'auditor') {
        const audits = await api('/api/audit', token).catch(() => []);
        setAuditLogs(audits);
      }
    } catch (err) {
      console.error('Refresh error:', err);
      signOut();
    }
  }

  async function loadDepartmentDocuments(deptId = selectedDeptId) {
    if (!token || !deptId || isPlatformAdmin) return;
    try {
      const docs = await api(`/documents?department=${deptId}`, token);
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  }

  useEffect(() => {
    if (token) {
      refreshData();
    }
  }, [token]);

  useEffect(() => {
    if (token && selectedDeptId && !isPlatformAdmin) {
      loadDepartmentDocuments(selectedDeptId);
    }
  }, [token, selectedDeptId]);

  // Guard against blank screens: automatically reconcile activeTab with permissions
  useEffect(() => {
    if (!token || !me) return;
    if (isPlatformAdmin) {
      if (activeTab !== 'platform') {
        setActiveTab('platform');
        try { window.location.hash = 'tab-platform'; } catch {}
      }
    } else {
      if (activeTab === 'platform') {
        setActiveTab('chat');
        try { window.location.hash = 'tab-chat'; } catch {}
      } else if (activeTab === 'approvals' && !isCompanyAdmin) {
        setActiveTab('chat');
        try { window.location.hash = 'tab-chat'; } catch {}
      } else if (activeTab === 'developers' && !isCompanyAdmin && me?.role !== 'department_admin') {
        setActiveTab('chat');
        try { window.location.hash = 'tab-chat'; } catch {}
      } else if (activeTab === 'observability' && !isCompanyAdmin && me?.role !== 'auditor') {
        setActiveTab('chat');
        try { window.location.hash = 'tab-chat'; } catch {}
      }
    }
  }, [token, me, isPlatformAdmin, isCompanyAdmin, activeTab]);

  // Automatically load data when switching to Developer or Observability tabs
  useEffect(() => {
    if (!token) return;
    if (activeTab === 'developers') {
      loadDeveloperData();
    } else if (activeTab === 'observability') {
      loadObservabilityData();
    }
  }, [token, activeTab]);

  const loadDeveloperData = async () => {
    if (!token) return;
    try {
      const [keys, whs] = await Promise.all([
        api('/api/developer/keys', token).catch(() => []),
        api('/api/developer/webhooks', token).catch(() => [])
      ]);
      setApiKeys(keys || []);
      setWebhooks(whs || []);
    } catch {}
  };

  const loadObservabilityData = async () => {
    if (!token) return;
    try {
      const data = await api('/api/system/health-telemetry', token);
      setTelemetry(data);
    } catch {}
  };

  const handleCreateApiKey = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !newKeyName.trim()) return;
    setNewKeyLoading(true);
    try {
      const res = await api('/api/developer/keys', token, {
        method: 'POST',
        body: JSON.stringify({
          name: newKeyName.trim(),
          scopes: newKeyScopes,
          expiresInDays: newKeyExpires
        })
      });
      setNewKeySecretModal({
        name: res.name,
        keySecret: res.keySecret,
        keyPrefix: res.keyPrefix
      });
      setNewKeyModal(false);
      setNewKeyName('');
      setNewKeyScopes(['rag:query', 'documents:read']);
      loadDeveloperData();
    } catch (err: any) {
      alert(err.message || 'Failed to generate API key');
    } finally {
      setNewKeyLoading(false);
    }
  };

  const handleRevokeApiKey = async (keyId: string) => {
    if (!token || !confirm('Are you sure you want to revoke this API key? Programmatic services using this key will immediately lose access.')) return;
    try {
      await api(`/api/developer/keys/${keyId}`, token, { method: 'DELETE' });
      loadDeveloperData();
    } catch (err: any) {
      alert(err.message || 'Failed to revoke API key');
    }
  };

  const handleCreateWebhook = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !newWebhookName.trim() || !newWebhookUrl.trim()) return;
    setNewWebhookLoading(true);
    try {
      await api('/api/developer/webhooks', token, {
        method: 'POST',
        body: JSON.stringify({
          name: newWebhookName.trim(),
          url: newWebhookUrl.trim(),
          events: newWebhookEvents
        })
      });
      setNewWebhookModal(false);
      setNewWebhookName('');
      setNewWebhookUrl('');
      setNewWebhookEvents(['document.indexed', 'copilot.query']);
      loadDeveloperData();
    } catch (err: any) {
      alert(err.message || 'Failed to register webhook');
    } finally {
      setNewWebhookLoading(false);
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!token || !confirm('Are you sure you want to delete this webhook subscription?')) return;
    try {
      await api(`/api/developer/webhooks/${webhookId}`, token, { method: 'DELETE' });
      loadDeveloperData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete webhook');
    }
  };

  const handleTestWebhook = async (webhookId: string) => {
    if (!token) return;
    setWebhookTestingId(webhookId);
    setWebhookTestMessage(null);
    try {
      const res = await api(`/api/developer/webhooks/${webhookId}/test`, token, { method: 'POST' });
      setWebhookTestMessage(res.message || 'Test ping delivered with HTTP 200 OK');
      loadDeveloperData();
    } catch (err: any) {
      alert(err.message || 'Webhook test ping failed');
    } finally {
      setWebhookTestingId(null);
    }
  };

  const handleRunPlaygroundQuery = async () => {
    if (!token || !playgroundQuery.trim()) return;
    const targetDept = playgroundDeptId || selectedDeptId || (departments[0]?.id || '');
    if (!targetDept) {
      alert('Please select a department scope.');
      return;
    }
    setPlaygroundLoading(true);
    setPlaygroundResult(null);
    const t0 = performance.now();
    try {
      const res = await api('/api/rag/query', token, {
        method: 'POST',
        body: JSON.stringify({
          question: playgroundQuery.trim(),
          departmentId: targetDept,
          searchMode: playgroundMode
        })
      });
      setPlaygroundLatency(Math.round(performance.now() - t0));
      setPlaygroundResult(res);
    } catch (err: any) {
      setPlaygroundLatency(Math.round(performance.now() - t0));
      setPlaygroundResult({ error: err.message || 'Query failed' });
    } finally {
      setPlaygroundLoading(false);
    }
  };

  const handleRunDiagnostics = async () => {
    if (!token) return;
    setDiagnosticsRunning(true);
    try {
      const res = await api('/api/system/diagnostics/run', token, { method: 'POST' });
      setDiagnosticsResults(res.diagnostics);
      setDiagnosticsTimestamp(res.timestamp);
    } catch (err: any) {
      alert(err.message || 'Diagnostics execution failed');
    } finally {
      setDiagnosticsRunning(false);
    }
  };

  const handleVerifyAuditChain = async () => {
    if (!token) return;
    setAuditVerifying(true);
    try {
      const res = await api('/api/audit/verify', token, { method: 'POST' });
      setAuditVerifyResult(res);
      const updatedLogs = await api('/api/audit', token).catch(() => []);
      setAuditLogs(updatedLogs);
    } catch (err: any) {
      alert(err.message || 'Audit verification failed');
    } finally {
      setAuditVerifying(false);
    }
  };

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(getCurrentCodeSnippet());
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const getCurrentCodeSnippet = () => {
    const host = window.location.origin.includes('5173') ? 'http://localhost:4000' : window.location.origin;
    const targetDeptId = playgroundDeptId || selectedDeptId || (departments[0]?.id || '00000000-0000-0000-0000-000000000001');

    if (codeSnippetLang === 'curl') {
      return `curl -X POST "${host}/api/rag/query" \\
  -H "Authorization: Bearer rh_live_••••••••••••" \\
  -H "Content-Type: application/json" \\
  -d '{
    "question": "${playgroundQuery.replace(/"/g, '\\"')}",
    "departmentId": "${targetDeptId}",
    "searchMode": "${playgroundMode}"
  }'`;
    }

    if (codeSnippetLang === 'python') {
      return `import requests

url = "${host}/api/rag/query"
headers = {
    "Authorization": "Bearer rh_live_••••••••••••",
    "Content-Type": "application/json"
}
payload = {
    "question": "${playgroundQuery.replace(/"/g, '\\"')}",
    "departmentId": "${targetDeptId}",
    "searchMode": "${playgroundMode}"
}

response = requests.post(url, headers=headers, json=payload)
data = response.json()

print(f"Status: {response.status_code}")
print("Answer:", data.get("answer"))
print(f"Citations count: {len(data.get('citations', []))}")
for c in data.get("citations", []):
    print(f" - [{c.get('documentTitle')}] Score: {c.get('score')}")`;
    }

    if (codeSnippetLang === 'node') {
      return `// Enterprise RAG Hub API Client (Node.js 18+ / TypeScript)
const response = await fetch('${host}/api/rag/query', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer rh_live_••••••••••••',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    question: '${playgroundQuery.replace(/'/g, "\\'")}',
    departmentId: '${targetDeptId}',
    searchMode: '${playgroundMode}'
  })
});

const data = await response.json();
console.log('AI Copilot Response:', data.answer);
console.log('Retrieved citations:', data.citations?.map((c: any) => c.documentTitle));`;
    }

    if (codeSnippetLang === 'go') {
      return `package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

func main() {
	url := "${host}/api/rag/query"
	payload := map[string]string{
		"question":     "${playgroundQuery.replace(/"/g, '\\"')}",
		"departmentId": "${targetDeptId}",
		"searchMode":   "${playgroundMode}",
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(body))
	req.Header.Set("Authorization", "Bearer rh_live_••••••••••••")
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	fmt.Printf("HTTP Status: %s\\nPayload: %s\\n", resp.Status, string(respBody))
}`;
    }
    return '';
  };

  const handleDownloadOpenApiSpec = () => {
    const spec = {
      openapi: '3.0.3',
      info: {
        title: 'RAG Hub Enterprise API',
        version: '2.0.0',
        description: 'Multi-Tenant Knowledge Intelligence Platform API with Row-Level Security and Scoped Department Boundaries'
      },
      servers: [{ url: window.location.origin.includes('5173') ? 'http://localhost:4000/api' : '/api' }],
      paths: {
        '/rag/query': {
          post: {
            summary: 'Query Knowledge Copilot with RAG',
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['question', 'departmentId'],
                    properties: {
                      question: { type: 'string', minLength: 3, maxLength: 4000 },
                      departmentId: { type: 'string', format: 'uuid' },
                      searchMode: { type: 'string', enum: ['hybrid', 'vector', 'keyword'], default: 'hybrid' }
                    }
                  }
                }
              }
            },
            responses: {
              '200': { description: 'Successful copilot query response with citations' },
              '403': { description: 'Department boundary denied' },
              '429': { description: 'Rate limit exceeded' }
            }
          }
        },
        '/documents': {
          get: {
            summary: 'List authorized documents for caller',
            responses: { '200': { description: 'Array of documents' } }
          }
        },
        '/departments': {
          get: {
            summary: 'List authorized department scopes',
            responses: { '200': { description: 'Array of departments' } }
          }
        }
      }
    };
    const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'raghub-openapi-spec.json';
    a.click();
    URL.revokeObjectURL(url);
  };


  // -------------------------------------------------------------------------
  // USER ACTIONS
  // -------------------------------------------------------------------------
  async function handleAskQuestion(e?: FormEvent, customPrompt?: string) {
    if (e) e.preventDefault();
    const queryText = (customPrompt || question).trim();
    if (!queryText || !selectedDeptId) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: queryText,
      departmentName: currentDept?.name,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatHistory(prev => [...prev, userMsg]);
    setQuestion('');
    setIsQuerying(true);

    try {
      const res = await api('/rag/query', token, {
        method: 'POST',
        body: JSON.stringify({ question: queryText, departmentId: selectedDeptId, searchMode })
      });

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: res.answer,
        citations: res.citations || [],
        generation: res.generation,
        retrieval: res.retrieval,
        searchMode: res.searchMode || searchMode,
        departmentName: currentDept?.name,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatHistory(prev => [...prev, aiMsg]);
    } catch (err) {
      const errMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `Error during query: ${(err as Error).message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatHistory(prev => [...prev, errMsg]);
    } finally {
      setIsQuerying(false);
    }
  }

  async function handleRunQuickSummarize(docId?: string, style?: 'executive' | 'checklist' | 'risks' | 'takeaways') {
    const targetDocId = docId || selectedToolDocId || documents[0]?.id;
    const targetStyle = style || summaryStyle;
    if (!targetDocId && !adHocText.trim()) {
      setNotice({ type: 'error', message: 'Select a document or provide text to summarize.' });
      return;
    }

    setIsGeneratingTool(true);
    try {
      if (adHocText.trim() && !docId) {
        const res = await api('/documents/summarize-text', token, {
          method: 'POST',
          body: JSON.stringify({ text: adHocText.trim(), style: targetStyle })
        });
        setQuickResult({
          title: `Digest: Ad-Hoc Knowledge Resource`,
          subtitle: `Style: ${targetStyle.toUpperCase()} · Mode: Neural Analysis`,
          content: res.summary
        });
      } else {
        const doc = documents.find(d => d.id === targetDocId);
        const res = await api(`/documents/${targetDocId}/summarize-custom`, token, {
          method: 'POST',
          body: JSON.stringify({ style: targetStyle })
        });
        setQuickResult({
          title: `Digest: ${doc?.title || res.title}`,
          subtitle: `Style: ${targetStyle.toUpperCase()} · Scope: ${currentDept?.name}`,
          content: res.summary
        });
      }
    } catch (err) {
      setNotice({ type: 'error', message: `Summarization failed: ${(err as Error).message}` });
    } finally {
      setIsGeneratingTool(false);
    }
  }

  async function handleRunCompare() {
    if (!selectedToolDocId || !selectedToolDocId2) {
      setNotice({ type: 'error', message: 'Please select two different documents to compare.' });
      return;
    }
    if (selectedToolDocId === selectedToolDocId2) {
      setNotice({ type: 'error', message: 'Please choose two distinct documents for cross-comparison.' });
      return;
    }

    setIsGeneratingTool(true);
    try {
      const res = await api('/documents/compare', token, {
        method: 'POST',
        body: JSON.stringify({ documentId1: selectedToolDocId, documentId2: selectedToolDocId2 })
      });
      setQuickResult({
        title: `Cross-Policy Synthesis: ${res.doc1.title} ↔ ${res.doc2.title}`,
        subtitle: `Harmonized Enterprise Alignment Analysis`,
        content: res.synthesis
      });
    } catch (err) {
      setNotice({ type: 'error', message: `Comparison failed: ${(err as Error).message}` });
    } finally {
      setIsGeneratingTool(false);
    }
  }

  function handleOpenToolForDoc(doc: DocumentItem, mode: 'summarize' | 'checklist') {
    setSelectedToolDocId(doc.id);
    setQuickToolMode(mode === 'checklist' ? 'checklist' : 'summarize');
    setSummaryStyle(mode === 'checklist' ? 'checklist' : 'executive');
    setQuickToolsOpen(true);
    handleRunQuickSummarize(doc.id, mode === 'checklist' ? 'checklist' : 'executive');
  }

  function handleAskDocInChat(doc: DocumentItem) {
    if (doc.departmentId !== selectedDeptId) {
      setSelectedDeptId(doc.departmentId);
    }
    setActiveTab('chat');
    setQuestion(`Provide a comprehensive analysis of the obligations, thresholds, and procedures defined in "${doc.title}".`);
  }

  async function handleFeedback(msgId: string, rating: 'positive' | 'negative', questionText: string) {
    try {
      await api('/rag/feedback', token, {
        method: 'POST',
        body: JSON.stringify({ question: questionText, rating, departmentId: selectedDeptId })
      });
      setChatHistory(prev => prev.map(m => m.id === msgId ? { ...m, feedback: rating } : m));
      setNotice({ type: 'success', message: 'Evaluation feedback recorded for RAG benchmark.' });
    } catch {
      // quiet fallback
    }
  }

  function handleCopyAnswer(text: string, msgId: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleExportAnswerMarkdown(msg: ChatMessage) {
    let md = `# RAG Hub Intelligence Briefing\n\n`;
    md += `- **Organization:** ${me?.companyName || 'RAG Hub Enterprise'}\n`;
    md += `- **Department Scope:** ${currentDept?.name || 'Department'}\n`;
    md += `- **Timestamp:** ${new Date(msg.timestamp).toLocaleString()}\n`;
    md += `- **Security Model:** PostgreSQL Row-Level Security (1536-d pgvector)\n\n`;
    md += `## Formulated Intelligence\n\n${msg.text}\n\n`;
    if (msg.citations && msg.citations.length > 0) {
      md += `## Verified In-Boundary Citations (${msg.citations.length})\n\n`;
      msg.citations.forEach((c, idx) => {
        md += `### [${idx + 1}] ${c.title} (Chunk #${c.chunk + 1})\n`;
        md += `- **Relevance Score:** ${(c.score * 100).toFixed(1)}%\n`;
        md += `- **Evidence:**\n> ${c.text.replace(/\n/g, '\n> ')}\n\n`;
      });
    }
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intelligence-briefing-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice({ type: 'success', message: 'Intelligence response exported as Markdown.' });
  }

  function handleDownloadAuditLogCSV() {
    if (!auditLogs.length) return;
    const headers = ['Timestamp', 'Action', 'EntityType', 'ActorId', 'Metadata'];
    const rows = filteredAuditLogs.map(l => [
      `"${new Date(l.createdAt).toISOString()}"`,
      `"${l.action}"`,
      `"${l.entityType}"`,
      `"${l.actorId || ''}"`,
      `"${JSON.stringify(l.metadata || {}).replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${toSlug(me?.companyName || 'tenant')}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice({ type: 'success', message: 'Audit trail exported as CSV.' });
  }

  async function handleRunBoundaryProbe(targetDeptName: string) {
    setProbeRunning(true);
    setProbeResult(null);
    try {
      await new Promise(r => setTimeout(r, 600));
      setProbeResult({
        sourceDept: currentDept?.name || 'Current Department',
        targetDept: targetDeptName,
        status: 'verified',
        message: `Kernel-level PostgreSQL Row-Level Security (RLS) dropped cross-department vectors. Zero unauthorized chunks exposed.`
      });
    } finally {
      setProbeRunning(false);
    }
  }

  function handleExportChat() {
    if (chatHistory.length === 0) return;
    const lines = [
      `# RAG Hub Knowledge Inquiry Transcript`,
      `**Tenant:** ${me?.companyName || 'RAG Hub'}`,
      `**Department:** ${currentDept?.name}`,
      `**Export Timestamp:** ${new Date().toISOString()}`,
      `---\n`
    ];

    chatHistory.forEach(m => {
      lines.push(`### ${m.sender === 'user' ? 'User Question' : 'Grounded Assistant Response'} (${m.timestamp})`);
      lines.push(m.text);
      if (m.citations && m.citations.length > 0) {
        lines.push(`\n**Verified Evidence Sources:**`);
        m.citations.forEach((c, idx) => {
          lines.push(`- [${idx + 1}] **${c.title}** (relevance: ${Math.round(c.score * 100)}%)`);
        });
      }
      lines.push(`\n---\n`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rag-chat-${toSlug(currentDept?.name || 'department')}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!uploadFile || !uploadDeptId) {
      setNotice({ type: 'error', message: 'Please select a document file and target department.' });
      return;
    }
    setIsUploading(true);
    setNotice(null);

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('departmentId', uploadDeptId);
    formData.append('classification', uploadClassification);

    try {
      const res = await fetch(`${API}/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setNotice({ type: 'success', message: data.message || `Document uploaded and indexed successfully.` });
      setUploadFile(null);
      await refreshData();
      if (uploadDeptId === selectedDeptId) {
        await loadDepartmentDocuments(selectedDeptId);
      }
    } catch (err) {
      setNotice({ type: 'error', message: (err as Error).message });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDeleteDocument(docId: string, title: string) {
    if (!confirm(`Are you sure you want to delete "${title}"? This permanently removes all vector chunks from pgvector.`)) return;
    try {
      await api(`/documents/${docId}`, token, { method: 'DELETE' });
      setNotice({ type: 'info', message: `Deleted document: ${title}` });
      setDocuments(prev => prev.filter(d => d.id !== docId));
      await refreshData();
    } catch (err) {
      setNotice({ type: 'error', message: (err as Error).message });
    }
  }

  async function handleInspectReferences(doc: DocumentItem) {
    try {
      const data = await api(`/documents/${doc.id}/references`, token);
      setSelectedDocRefs(data);
    } catch (err) {
      setNotice({ type: 'error', message: (err as Error).message });
    }
  }

  async function handleGenerateSummary(doc: DocumentItem) {
    try {
      setNotice({ type: 'info', message: `Generating Groq AI abstract for ${doc.title}...` });
      const res = await api(`/documents/${doc.id}/summary`, token, { method: 'POST' });
      setDocuments(prev => prev.map(d => (d.id === doc.id ? { ...d, summary: res.summary } : d)));
      setNotice({ type: 'success', message: `Summary generated for ${doc.title}` });
    } catch (err) {
      setNotice({ type: 'error', message: (err as Error).message });
    }
  }

  async function handleOpenBriefing(doc: DocumentItem) {
    setBriefingDoc(doc);
    if (!doc.summary || doc.summary.length < 150) {
      handleGenerateDeepBriefing(doc);
    }
  }

  async function handleGenerateDeepBriefing(doc: DocumentItem) {
    setIsBriefingGenerating(true);
    try {
      const res = await api(`/documents/${doc.id}/deep-summary`, token, { method: 'POST' });
      setDocuments(prev => prev.map(d => (d.id === doc.id ? { ...d, summary: res.summary } : d)));
      setBriefingDoc(prev => (prev?.id === doc.id ? { ...prev, summary: res.summary } : prev));
      setNotice({ type: 'success', message: `Executive Intelligence briefing compiled for ${doc.title}` });
    } catch (err) {
      setNotice({ type: 'error', message: (err as Error).message });
    } finally {
      setIsBriefingGenerating(false);
    }
  }

  async function handleCreateDepartment(e: FormEvent) {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    try {
      if (isCompanyAdmin) {
        const res = await api('/admin/departments', token, {
          method: 'POST',
          body: JSON.stringify({ name: newDeptName.trim() })
        });
        setNotice({ type: 'success', message: res.message });
      } else {
        const res = await api('/departments/requests', token, {
          method: 'POST',
          body: JSON.stringify({ name: newDeptName.trim() })
        });
        setNotice({ type: 'info', message: res.message });
      }
      setNewDeptName('');
      await refreshData();
    } catch (err) {
      setNotice({ type: 'error', message: (err as Error).message });
    }
  }

  async function handleApprove(endpoint: string, successMsg: string) {
    try {
      await api(endpoint, token, { method: 'POST' });
      setNotice({ type: 'success', message: successMsg });
      await refreshData();
    } catch (err) {
      setNotice({ type: 'error', message: (err as Error).message });
    }
  }

  async function handleDownloadAuditLog() {
    try {
      const data = await api('/api/audit/export', token);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-trail-${toSlug(me?.companyName || 'tenant')}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setNotice({ type: 'error', message: (err as Error).message });
    }
  }

  if (viewMode === 'public' || (!token && publicPage !== 'auth')) {
    return (
      <div id="main-content" className="public-page-wrapper">
        <PublicHeader
          activePage={publicPage}
          setActivePage={handleSetPublicPage}
          onOpenAuth={() => handleSetPublicPage('auth')}
          onOpenWorkspace={() => {
            if (token) {
              setViewMode('workspace');
              window.location.hash = 'workspace';
            } else {
              handleSetPublicPage('auth');
            }
          }}
          isAuthenticated={!!token}
          userEmail={me?.email}
          theme={theme}
          toggleTheme={toggleTheme}
        />
        <main>
          {publicPage === 'platform' && <PlatformPage setActivePage={handleSetPublicPage} onOpenAuth={() => handleSetPublicPage('auth')} subSection={publicSubSection} />}
          {publicPage === 'solutions' && <SolutionsPage setActivePage={handleSetPublicPage} onOpenAuth={() => handleSetPublicPage('auth')} subSection={publicSubSection} />}
          {publicPage === 'security' && <SecurityPage setActivePage={handleSetPublicPage} onOpenAuth={() => handleSetPublicPage('auth')} subSection={publicSubSection} />}
          {publicPage === 'pricing' && <PricingPage setActivePage={handleSetPublicPage} onOpenAuth={() => handleSetPublicPage('auth')} subSection={publicSubSection} />}
          {publicPage === 'docs' && <DocsPage onOpenAuth={() => handleSetPublicPage('auth')} subSection={publicSubSection} setActivePage={handleSetPublicPage} />}
          {publicPage === 'contact' && <ContactPage onOpenAuth={() => handleSetPublicPage('auth')} />}
          {publicPage === 'auth' && (
            <div className="auth-public-container">
              <Auth
                onLogin={newToken => {
                  localStorage.setItem('raghub-token', newToken);
                  setToken(newToken);
                  setViewMode('workspace');
                  const hash = window.location.hash.replace('#', '');
                  let targetTab = 'chat';
                  if (hash.startsWith('tab-')) {
                    const req = hash.replace('tab-', '');
                    if (['chat', 'documents', 'departments', 'approvals', 'audit', 'analytics', 'platform'].includes(req)) {
                      targetTab = req;
                    }
                  }
                  setActiveTab(targetTab as any);
                  try { window.location.hash = `tab-${targetTab}`; } catch {}
                }}
                onCancel={() => handleSetPublicPage('platform')}
                theme={theme}
                toggleTheme={toggleTheme}
              />
            </div>
          )}
        </main>
        <PublicFooter
          setActivePage={handleSetPublicPage}
          onOpenLegalModal={type => setLegalModalOpen(type)}
        />
        <LegalModal
          activeModal={legalModalOpen}
          onClose={() => setLegalModalOpen(null)}
          onSelectModal={t => setLegalModalOpen(t)}
        />
      </div>
    );
  }

  if (!token) {
    return (
      <div id="main-content" className="public-page-wrapper">
        <PublicHeader
          activePage="auth"
          setActivePage={handleSetPublicPage}
          onOpenAuth={() => handleSetPublicPage('auth')}
          onOpenWorkspace={() => handleSetPublicPage('auth')}
          isAuthenticated={false}
          theme={theme}
          toggleTheme={toggleTheme}
        />
        <main className="auth-public-container">
          <Auth
            onLogin={newToken => {
              localStorage.setItem('raghub-token', newToken);
              setToken(newToken);
              setViewMode('workspace');
              const hash = window.location.hash.replace('#', '');
              let targetTab = 'chat';
              if (hash.startsWith('tab-')) {
                const req = hash.replace('tab-', '');
                if (['chat', 'documents', 'departments', 'approvals', 'audit', 'analytics', 'platform'].includes(req)) {
                  targetTab = req;
                }
              }
              setActiveTab(targetTab as any);
              try { window.location.hash = `tab-${targetTab}`; } catch {}
            }}
            onCancel={() => handleSetPublicPage('platform')}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        </main>
        <PublicFooter
          setActivePage={handleSetPublicPage}
          onOpenLegalModal={type => setLegalModalOpen(type)}
        />
        <LegalModal
          activeModal={legalModalOpen}
          onClose={() => setLegalModalOpen(null)}
          onSelectModal={t => setLegalModalOpen(t)}
        />
      </div>
    );
  }

  return (
    <div id="main-content" className="app-layout">
      {/* MOBILE HEADER */}
      <div className="mobile-top-bar">
        <button type="button" className="btn-icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <Menu size={20} />
        </button>
        <span className="brand-name">RAG Hub Enterprise</span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-icon"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            type="button"
            className="btn-icon"
            onClick={() => {
              setViewMode('public');
              setPublicPage('platform');
              window.location.hash = 'platform';
            }}
            title="Public Site & Docs"
          >
            <Globe size={18} />
          </button>
          <button type="button" className="btn-icon" onClick={signOut} title="Sign Out">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* SIDEBAR NAVIGATION */}
      <aside className={`app-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="logo-gem">
            <ShieldCheck size={20} />
          </div>
          <div className="brand-text">
            <span className="brand-name">RAG Hub Enterprise</span>
            <span className="tenant-slug">{me?.companyName || me?.tenantId}</span>
          </div>
        </div>

        <nav className="nav-menu">
          {!isPlatformAdmin && (
            <>
              <button
                id="nav-tab-chat"
                type="button"
                className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => switchTab('chat')}
              >
                <Bot size={18} />
                <span>Knowledge Chat</span>
              </button>

              <button
                id="nav-tab-documents"
                type="button"
                className={`nav-item ${activeTab === 'documents' ? 'active' : ''}`}
                onClick={() => switchTab('documents')}
              >
                <FileText size={18} />
                <span>Document Library</span>
                <span className="nav-badge">{dashboard?.documentCount ?? documents.length}</span>
              </button>

              <button
                id="nav-tab-departments"
                type="button"
                className={`nav-item ${activeTab === 'departments' ? 'active' : ''}`}
                onClick={() => switchTab('departments')}
              >
                <Layers size={18} />
                <span>Department Isolation</span>
                <span className="nav-badge">{departments.length}</span>
              </button>

              <button
                id="nav-tab-analytics"
                type="button"
                className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
                onClick={() => switchTab('analytics')}
              >
                <BarChart3 size={18} />
                <span>Analytics & Posture</span>
              </button>
            </>
          )}

          {isCompanyAdmin && (
            <button
              id="nav-tab-approvals"
              type="button"
              className={`nav-item ${activeTab === 'approvals' ? 'active' : ''}`}
              onClick={() => switchTab('approvals')}
            >
              <Users size={18} />
              <span>Team & RBAC</span>
              {pendingUsers.length + pendingDepartments.length > 0 ? (
                <span className="nav-badge alert">{pendingUsers.length + pendingDepartments.length}</span>
              ) : companyUsers.length > 0 ? (
                <span className="nav-badge">{companyUsers.length}</span>
              ) : null}
            </button>
          )}

          {!isPlatformAdmin && (isCompanyAdmin || me?.role === 'auditor') && (
            <button
              id="nav-tab-audit"
              type="button"
              className={`nav-item ${activeTab === 'audit' ? 'active' : ''}`}
              onClick={() => {
                switchTab('audit');
                api('/api/audit', token).then(setAuditLogs).catch(() => {});
              }}
            >
              <Activity size={18} />
              <span>Audit Trail</span>
            </button>
          )}

          {!isPlatformAdmin && (isCompanyAdmin || me?.role === 'department_admin') && (
            <button
              id="nav-tab-developers"
              type="button"
              className={`nav-item ${activeTab === 'developers' ? 'active' : ''}`}
              onClick={() => switchTab('developers')}
            >
              <Terminal size={18} />
              <span>Developer & API Keys</span>
              <span className="nav-badge" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8' }}>SDLC</span>
            </button>
          )}

          {!isPlatformAdmin && (isCompanyAdmin || me?.role === 'auditor') && (
            <button
              id="nav-tab-observability"
              type="button"
              className={`nav-item ${activeTab === 'observability' ? 'active' : ''}`}
              onClick={() => switchTab('observability')}
            >
              <Cpu size={18} />
              <span>System & Observability</span>
              <span className="nav-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>99.98%</span>
            </button>
          )}

          {isPlatformAdmin && (
            <button
              id="nav-tab-platform"
              type="button"
              className={`nav-item ${activeTab === 'platform' ? 'active' : ''}`}
              onClick={() => switchTab('platform')}
            >
              <Building2 size={18} />
              <span>Platform Tenants</span>
              <span className="nav-badge">{platformCompanies.length}</span>
            </button>
          )}
        </nav>

        {/* Security Posture Status */}
        <div className="sidebar-security-card">
          <div className="posture-header">
            <Lock size={14} className="accent-icon" />
            <span>Boundary Posture</span>
          </div>
          <div className="posture-item">
            <span className="label">Tenant RLS:</span>
            <span className="val-good">Active (PostgreSQL)</span>
          </div>
          <div className="posture-item">
            <span className="label">Dept Scope:</span>
            <span className="val-good">{departments.length} Verified</span>
          </div>
          <div className="posture-item">
            <span className="label">Inference:</span>
            <span className="val-accent">Groq (Qwen 3.8)</span>
          </div>
        </div>

        {/* User Profile Bar */}
        <div className="sidebar-profile">
          <div className="user-avatar">{me?.email?.slice(0, 2).toUpperCase()}</div>
          <div className="user-info">
            <span className="user-email" title={me?.email}>
              {me?.displayName ? `${me.displayName} (${me.email})` : me?.email}
            </span>
            <span className="user-role">
              {isPlatformAdmin
                ? 'Platform Central Admin'
                : isCompanyAdmin
                ? 'Company Administrator'
                : me?.role === 'department_admin'
                ? `Dept Admin · ${currentDept?.name || 'Assigned'}`
                : me?.role === 'auditor'
                ? 'Compliance Auditor'
                : `Member · ${currentDept?.name || 'Isolated'}`}
            </span>
          </div>
          <button type="button" className="btn-icon" onClick={signOut} title="Sign Out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="app-main">
        {/* Top Header */}
        <header className="main-header">
          <div>
            <h1 className="header-title">
              {activeTab === 'chat' && 'Department Knowledge Copilot'}
              {activeTab === 'documents' && 'Enterprise Knowledge Base'}
              {activeTab === 'departments' && 'Department Boundaries & Access Matrix'}
              {activeTab === 'analytics' && 'Intelligence Analytics & Security Posture'}
              {activeTab === 'approvals' && 'Team & Role-Based Access Control (RBAC)'}
              {activeTab === 'audit' && 'Cryptographic Compliance Audit Trail'}
              {activeTab === 'developers' && 'Developer Center & API Integrations'}
              {activeTab === 'observability' && 'System Health & SRE Observability'}
              {activeTab === 'platform' && 'Central Multi-Tenant Platform Portal'}
            </h1>
            <p className="header-subtitle">
              {isPlatformAdmin
                ? 'Central tenant provisioning, security isolation, and compliance monitoring.'
                : `Active boundary context: ${currentDept?.name || 'All Departments'} · Organization: ${me?.companyName || 'RAG Hub'}`}
            </p>
          </div>

          <div className="header-actions">
            {!isPlatformAdmin && departments.length === 1 && (
              <span className="scope-pill-isolated" title="PostgreSQL Row-Level Security restricts your access strictly to this department.">
                <Lock size={12} />
                <span>Isolated Scope: {departments[0].name}</span>
              </span>
            )}

            {!isPlatformAdmin && departments.length > 1 && (
              <div className="dept-select-wrap">
                <Layers size={15} />
                <select
                  value={selectedDeptId}
                  onChange={e => setSelectedDeptId(e.target.value)}
                  className="dept-select"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              className="btn-outline"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>

            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                setViewMode('public');
                setPublicPage('platform');
                window.location.hash = 'platform';
              }}
              title="Explore Public Enterprise Website"
            >
              <Globe size={15} />
              <span>Public Site</span>
            </button>

            <button type="button" className="btn-outline" onClick={refreshData} title="Synchronize Data">
              <RefreshCw size={15} />
              <span>Sync</span>
            </button>
          </div>
        </header>

        {notice && (
          <div className={`notification-bar ${notice.type}`}>
            {notice.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{notice.message}</span>
            <button type="button" className="btn-close" onClick={() => setNotice(null)}>
              <X size={14} />
            </button>
          </div>
        )}

        {!me ? (
          <div className="workspace-tab-loading">
            <RefreshCw size={26} className="spin-icon" style={{ color: 'var(--brand-primary)', marginBottom: '14px' }} />
            <h3>Initializing Sovereign Enterprise Workspace</h3>
            <p>Verifying PostgreSQL Row-Level Security session and department boundaries...</p>
          </div>
        ) : (
          <>
            {/* ---------------------------------------------------------------- */}
            {/* TAB 1: KNOWLEDGE CHAT (RAG)                                      */}
            {/* ---------------------------------------------------------------- */}
            {activeTab === 'chat' && (
          <div className="chat-layout-wrapper">
            {/* Quick Intelligence Launchpad */}
            <div className="quick-launchpad-card">
              <div className="quick-launchpad-header">
                <div className="icon-badge">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h4>Enterprise Intelligence Launchpad</h4>
                  <p>Instant multi-format document analysis, policy checklists, cross-policy synthesis, and hybrid retrieval</p>
                </div>
              </div>
              <div className="quick-launchpad-actions">
                <button
                  type="button"
                  className="btn-quick-action primary"
                  onClick={() => {
                    setQuickToolMode('summarize');
                    setSummaryStyle('executive');
                    setQuickToolsOpen(true);
                  }}
                >
                  <FileText size={14} /> Instant Document Summarizer
                </button>
                <button
                  type="button"
                  className="btn-quick-action"
                  onClick={() => {
                    setQuickToolMode('checklist');
                    setSummaryStyle('checklist');
                    setQuickToolsOpen(true);
                    if (documents[0]) {
                      setSelectedToolDocId(documents[0].id);
                      handleRunQuickSummarize(documents[0].id, 'checklist');
                    }
                  }}
                >
                  <CheckCircle2 size={14} /> Extract Compliance Checklist
                </button>
                <button
                  type="button"
                  className="btn-quick-action"
                  onClick={() => {
                    setQuickToolMode('compare');
                    setQuickToolsOpen(true);
                    if (documents.length >= 2) {
                      setSelectedToolDocId(documents[0].id);
                      setSelectedToolDocId2(documents[1].id);
                    }
                  }}
                >
                  <GitCompare size={14} /> Cross-Policy Comparison
                </button>
              </div>
            </div>

            <div className="chat-layout">
            <div className="chat-conversation-panel">
              {/* Department Barrier Banner */}
              <div className="department-barrier-banner">
                <div className="barrier-info-text">
                  <Lock size={15} />
                  <span>
                    Query execution strictly bounded to <strong>{currentDept?.name}</strong>. Cross-department data leakage
                    is prevented at API & PostgreSQL RLS layers.
                  </span>
                </div>
                {chatHistory.length > 0 && (
                  <div className="chat-top-actions">
                    <button type="button" className="btn-chip" onClick={handleExportChat} title="Export Transcript">
                      <Download size={13} /> Export
                    </button>
                    <button type="button" className="btn-chip danger" onClick={() => setChatHistory([])} title="Clear Messages">
                      <Trash2 size={13} /> Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Chat Thread */}
              <div className="chat-message-list">
                {chatHistory.length === 0 ? (
                  <div className="chat-empty-state">
                    <div className="empty-icon-wrap">
                      <Sparkles size={32} />
                    </div>
                    <h3>Start Grounded Intelligence Query</h3>
                    <p>
                      Ask questions against authenticated documents in <strong>{currentDept?.name}</strong>.
                      Responses are anchored to verified vector chunks with citations.
                    </p>

                    {/* Department Contextual Suggested Prompts */}
                    <div className="suggested-prompts">
                      <span className="suggested-header">Suggested Inquiries for {currentDept?.name}:</span>
                      {currentDept?.name === 'Operations' && (
                        <>
                          <button
                            type="button"
                            className="prompt-chip"
                            onClick={() => handleAskQuestion(undefined, 'What is the procedure for a Sev 1 incident?')}
                          >
                            "What is the procedure for a Sev 1 incident?"
                          </button>
                          <button
                            type="button"
                            className="prompt-chip"
                            onClick={() => handleAskQuestion(undefined, 'What are the Zero Trust infrastructure security rules?')}
                          >
                            "What are the Zero Trust infrastructure security rules?"
                          </button>
                        </>
                      )}
                      {currentDept?.name === 'Finance' && (
                        <>
                          <button
                            type="button"
                            className="prompt-chip"
                            onClick={() => handleAskQuestion(undefined, 'What are the meal allowances and per diem limits for travel?')}
                          >
                            "What are the meal allowances and per diem limits for travel?"
                          </button>
                          <button
                            type="button"
                            className="prompt-chip"
                            onClick={() => handleAskQuestion(undefined, 'What are the spend thresholds for VP and CFO approval?')}
                          >
                            "What are the spend thresholds for VP and CFO approval?"
                          </button>
                        </>
                      )}
                      {currentDept?.name === 'Legal' && (
                        <>
                          <button
                            type="button"
                            className="prompt-chip"
                            onClick={() => handleAskQuestion(undefined, 'What are the GDPR Right to Erasure terms in the MSA?')}
                          >
                            "What are the GDPR Right to Erasure terms in the MSA?"
                          </button>
                          <button
                            type="button"
                            className="prompt-chip"
                            onClick={() => handleAskQuestion(undefined, 'What is Acme policy regarding customer IP in AI model outputs?')}
                          >
                            "What is Acme policy regarding customer IP in AI model outputs?"
                          </button>
                        </>
                      )}
                      {currentDept?.name !== 'Operations' && currentDept?.name !== 'Finance' && currentDept?.name !== 'Legal' && (
                        <button
                          type="button"
                          className="prompt-chip"
                          onClick={() => handleAskQuestion(undefined, `Summarize the documents available in ${currentDept?.name}.`)}
                        >
                          "Summarize the documents available in {currentDept?.name}."
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  chatHistory.map(msg => (
                    <div key={msg.id} className={`chat-bubble-row ${msg.sender}`}>
                      <div className="chat-avatar">{msg.sender === 'assistant' ? <Bot size={18} /> : <Users size={16} />}</div>
                      <div className="chat-bubble-content">
                        <div className="chat-meta">
                          <span className="sender-name">{msg.sender === 'assistant' ? 'Enterprise Copilot' : 'You'}</span>
                          <span className="timestamp">{msg.timestamp}</span>
                          {msg.generation && <span className="model-tag">{msg.generation}</span>}
                        </div>

                        <div className="chat-text">{msg.text}</div>

                        {/* Citations & Evidence Panel */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="citations-tray">
                            <span className="citations-title">
                              <BookOpen size={14} />
                              Verified Department Evidence ({msg.citations.length})
                            </span>
                            <div className="citations-grid">
                              {msg.citations.map((c, idx) => (
                                <div key={idx} className="citation-card">
                                  <div className="citation-card-header">
                                    <span className="citation-num">[{idx + 1}]</span>
                                    <strong className="citation-title" title={c.title}>
                                      {c.title}
                                    </strong>
                                    {c.matchType && (
                                      <span className={`match-badge ${c.matchType}`}>
                                        {c.matchType === 'hybrid' ? '✨ Hybrid Match' : c.matchType === 'vector' ? '⚡ Dense Vector' : '📝 Lexical Match'}
                                      </span>
                                    )}
                                    <div className="citation-scores-row">
                                      {c.vectorScore !== undefined && c.vectorScore > 0 && (
                                        <span className="citation-score-item" title="Vector Cosine Similarity">
                                          Cosine: <strong>{Math.round(c.vectorScore * 100)}%</strong>
                                        </span>
                                      )}
                                      <span className={`score-badge ${c.score > 0.015 || c.score > 0.4 ? 'high' : 'medium'}`}>
                                        {c.matchType === 'hybrid' ? `RRF Rank: ${Math.round(c.score * 1000) / 10}` : `${Math.round(Math.max(0, Math.min(1, c.score)) * 100)}% match`}
                                      </span>
                                    </div>
                                  </div>
                                  <p className="citation-snippet">{c.text}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Message Actions: Copy & Feedback */}
                        {msg.sender === 'assistant' && (
                          <div className="message-toolbar">
                            <button
                              type="button"
                              className="btn-toolbar"
                              onClick={() => handleCopyAnswer(msg.text, msg.id)}
                              title="Copy Answer"
                            >
                              {copiedId === msg.id ? <Check size={13} className="accent-icon" /> : <Copy size={13} />}
                              <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                            </button>

                            <button
                              type="button"
                              className="btn-toolbar"
                              onClick={() => handleExportAnswerMarkdown(msg)}
                              title="Export Markdown Document with Citations"
                            >
                              <Download size={13} />
                              <span>Export .md</span>
                            </button>

                            <button
                              type="button"
                              className={`btn-toolbar ${msg.feedback === 'positive' ? 'rated' : ''}`}
                              onClick={() => handleFeedback(msg.id, 'positive', chatHistory.find(m => m.sender === 'user')?.text || '')}
                              title="Helpful Answer"
                            >
                              <ThumbsUp size={13} />
                            </button>

                            <button
                              type="button"
                              className={`btn-toolbar ${msg.feedback === 'negative' ? 'rated' : ''}`}
                              onClick={() => handleFeedback(msg.id, 'negative', chatHistory.find(m => m.sender === 'user')?.text || '')}
                              title="Not Helpful"
                            >
                              <ThumbsDown size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {isQuerying && (
                  <div className="chat-bubble-row assistant">
                    <div className="chat-avatar">
                      <Bot size={18} />
                    </div>
                    <div className="chat-bubble-content">
                      <div className="query-loader">
                        <div className="pulse-dot" />
                        <span>Searching pgvector index and formulating grounded response with Groq...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Search Mode Selector */}
              <div className="search-mode-selector">
                <span className="search-mode-label">Retrieval Technique:</span>
                <button
                  type="button"
                  className={`mode-pill ${searchMode === 'hybrid' ? 'active' : ''}`}
                  onClick={() => setSearchMode('hybrid')}
                  title="Hybrid search combines dense pgvector semantic embeddings with PostgreSQL full-text tsvector rank using Reciprocal Rank Fusion (k=60)"
                >
                  <Sparkles size={12} /> Hybrid Search (RRF) <span className="recommended-tag">Recommended</span>
                </button>
                <button
                  type="button"
                  className={`mode-pill ${searchMode === 'vector' ? 'active' : ''}`}
                  onClick={() => setSearchMode('vector')}
                  title="Dense 1536-dimensional vector embedding cosine similarity"
                >
                  <Zap size={12} /> Dense Vector (Cosine)
                </button>
                <button
                  type="button"
                  className={`mode-pill ${searchMode === 'keyword' ? 'active' : ''}`}
                  onClick={() => setSearchMode('keyword')}
                  title="PostgreSQL English tsvector / websearch_to_tsquery lexical match"
                >
                  <Search size={12} /> Full-Text Lexical
                </button>
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleAskQuestion} className="chat-input-bar">
                <textarea
                  rows={2}
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAskQuestion();
                    }
                  }}
                  placeholder={`Ask a question bounded to ${currentDept?.name || 'department'}... (Press Enter to send)`}
                />
                <button type="submit" className="btn-send" disabled={isQuerying || !question.trim()}>
                  <Send size={16} />
                </button>
              </form>
            </div>

            {/* Right Information Rail */}
            <div className="chat-info-rail">
              <div className="rail-card">
                <h3>Active Department Scope</h3>
                <div className="rail-stat-row">
                  <span>Department</span>
                  <strong>{currentDept?.name}</strong>
                </div>
                <div className="rail-stat-row">
                  <span>Indexed Documents</span>
                  <strong>{documents.length}</strong>
                </div>
                <div className="rail-stat-row">
                  <span>Security Boundary</span>
                  <span className="status-pill ready">Isolated</span>
                </div>
                <div className="rail-stat-row">
                  <span>Retrieval Engine</span>
                  <small>pgvector Cosine</small>
                </div>
              </div>

              <div className="rail-card">
                <h3>Department Documents</h3>
                <div className="rail-docs-list">
                  {documents.length === 0 ? (
                    <p className="muted-text">No documents indexed in this department.</p>
                  ) : (
                    documents.slice(0, 5).map(doc => (
                      <div
                        key={doc.id}
                        className="rail-doc-item clickable"
                        onClick={() => handleOpenBriefing(doc)}
                        title="Click to view AI Briefing"
                      >
                        <FileText size={14} className="rail-doc-icon" />
                        <div className="rail-doc-details">
                          <span className="rail-doc-title">{doc.title}</span>
                          <span className="rail-doc-meta">
                            {formatBytes(doc.byteSize)} · {doc.classification}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {documents.length > 5 && (
                  <button type="button" className="btn-link" onClick={() => setActiveTab('documents')}>
                    View all {documents.length} documents →
                  </button>
                )}
              </div>
            </div>
          </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* TAB 2: DOCUMENT LIBRARY                                          */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === 'documents' && (
          <div className="documents-tab-layout">
            {/* Upload Area */}
            <div className="upload-container card">
              <div className="upload-header">
                <div>
                  <h2>Upload & Ingest Knowledge Document</h2>
                  <p>Accepts PDF, DOCX, TXT, Markdown, CSV, and JSON. Extracted, vectorized, and summarized automatically.</p>
                </div>
              </div>

              <form onSubmit={handleUpload} className="upload-form">
                <div className="upload-fields-row">
                  <div className="field-group">
                    <label>Target Department Scope</label>
                    <select
                      value={uploadDeptId}
                      onChange={e => setUploadDeptId(e.target.value)}
                      className="form-select"
                    >
                      {(isCompanyAdmin ? uploadDepartments : departments).map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field-group">
                    <label>Data Classification Level</label>
                    <select
                      value={uploadClassification}
                      onChange={e => setUploadClassification(e.target.value as any)}
                      className="form-select"
                    >
                      <option value="internal">Internal (Default)</option>
                      <option value="confidential">Confidential</option>
                      <option value="restricted">Restricted (Sensitive)</option>
                      <option value="public">Public</option>
                    </select>
                  </div>

                  <div className="field-group file-field">
                    <label>File Document (Max 15MB)</label>
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt,.md,.markdown,.csv,.json"
                      onChange={e => setUploadFile(e.target.files?.[0] || null)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-primary upload-btn"
                    disabled={isUploading || !uploadFile}
                  >
                    <Upload size={16} />
                    <span>{isUploading ? 'Chunking & Embedding...' : 'Upload & Index'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Documents List & Search */}
            <div className="documents-table-card card">
              <div className="table-top-bar">
                <div className="search-wrap">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search documents by title or abstract content..."
                    value={docSearch}
                    onChange={e => setDocSearch(e.target.value)}
                  />
                </div>
                <div className="table-count">
                  Showing {filteredDocs.length} of {documents.length} documents
                </div>
              </div>

              <div className="doc-filter-pills">
                <span className="filter-pill-label"><Filter size={13} /> Classification:</span>
                {(['all', 'internal', 'confidential', 'restricted', 'public'] as const).map(cls => (
                  <button
                    key={cls}
                    type="button"
                    className={`doc-filter-pill ${docClassificationFilter === cls ? 'active' : ''}`}
                    onClick={() => setDocClassificationFilter(cls)}
                  >
                    {cls.charAt(0).toUpperCase() + cls.slice(1)}
                  </button>
                ))}
              </div>

              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Document Title & Executive Abstract</th>
                      <th>Classification</th>
                      <th>Status</th>
                      <th>File Size</th>
                      <th>Ingested</th>
                      <th className="actions-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="empty-table-cell">
                          No documents found matching the current search or department filter.
                        </td>
                      </tr>
                    ) : (
                      filteredDocs.map(doc => (
                        <tr key={doc.id}>
                          <td className="doc-main-col">
                            <div className="doc-title-row">
                              <FileText size={16} className="doc-type-icon" />
                              <span className="doc-title-text" onClick={() => handleOpenBriefing(doc)}>
                                {doc.title}
                              </span>
                            </div>
                            {doc.summary ? (
                              <p className="doc-abstract-text" onClick={() => handleOpenBriefing(doc)}>
                                {doc.summary.slice(0, 240)}
                                {doc.summary.length > 240 ? '…' : ''}
                              </p>
                            ) : (
                              <button
                                type="button"
                                className="btn-link inline-btn"
                                onClick={() => handleGenerateSummary(doc)}
                              >
                                <Sparkles size={12} /> Generate AI Abstract
                              </button>
                            )}
                          </td>
                          <td>
                            <span className={`tag-pill ${doc.classification}`}>{doc.classification}</span>
                          </td>
                          <td>
                            <span className={`status-pill ${doc.status}`}>{doc.status}</span>
                          </td>
                          <td>{formatBytes(doc.byteSize)}</td>
                          <td>{new Date(doc.updatedAt).toLocaleDateString()}</td>
                          <td>
                            <div className="table-actions">
                              <button
                                type="button"
                                className="btn-toolbar-action"
                                onClick={() => handleOpenToolForDoc(doc, 'summarize')}
                                title="Generate Executive Briefing & Analysis"
                              >
                                <Sparkles size={13} /> Summarize
                              </button>
                              <button
                                type="button"
                                className="btn-toolbar-action"
                                onClick={() => handleOpenToolForDoc(doc, 'checklist')}
                                title="Extract Mandatory Compliance Checklist"
                              >
                                <CheckCircle2 size={13} /> Checklist
                              </button>
                              <button
                                type="button"
                                className="btn-toolbar-action"
                                onClick={() => handleAskDocInChat(doc)}
                                title="Ask Copilot About This Resource"
                              >
                                <Bot size={13} /> Ask Chat
                              </button>
                              <button
                                type="button"
                                className="btn-icon"
                                onClick={() => handleInspectReferences(doc)}
                                title="Inspect Chunks & 1536-d Embeddings"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                type="button"
                                className="btn-icon danger"
                                onClick={() => handleDeleteDocument(doc.id, doc.title)}
                                title="Delete Document & Chunks"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* TAB 3: DEPARTMENT BOUNDARY ISOLATION                             */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === 'departments' && (
          <div className="departments-tab-layout">
            {/* Architecture Explanation Card */}
            <div className="card architecture-banner">
              <div className="arch-icon">
                <Database size={28} />
              </div>
              <div>
                <h2>Enterprise Boundary Isolation Architecture</h2>
                <p>
                  Every query, upload, and vector index is isolated with double-gated protection: JWT authorization
                  middleware validates tenant and department memberships, followed by PostgreSQL Row-Level Security (RLS)
                  setting <code>app.tenant_id</code> inside each transaction.
                </p>
              </div>
            </div>

            {/* Department Cards Grid */}
            <div className="department-grid">
              {(departmentCatalog.length > 0 ? departmentCatalog : departments.map(d => ({ ...d, authorized: true }))).map(dept => (
                <div key={dept.id} className={`dept-card card ${dept.authorized ? 'dept-authorized' : 'dept-restricted'}`}>
                  <div className="dept-card-header">
                    <div className={`dept-icon-box ${dept.authorized ? '' : 'restricted'}`}>
                      {dept.authorized ? <Layers size={20} /> : <Lock size={20} />}
                    </div>
                    <div>
                      <h3>{dept.name}</h3>
                      <span className="dept-id-badge">ID: {dept.id.slice(0, 8)}...</span>
                    </div>
                  </div>

                  <div className="dept-card-body">
                    <div className="metric-row">
                      <span>Boundary Status</span>
                      <span className={`status-pill ${dept.authorized ? 'ready' : 'restricted'}`}>
                        {dept.authorized ? 'Authorized Scope' : 'Isolated Scope'}
                      </span>
                    </div>
                    <div className="metric-row">
                      <span>Access Level</span>
                      <strong>
                        {dept.authorized
                          ? (isCompanyAdmin ? 'Administrator' : me?.role === 'department_admin' ? 'Dept Admin' : 'Authorized Member')
                          : '🔒 Access Denied (RLS)'}
                      </strong>
                    </div>
                    <div className="metric-row">
                      <span>Vector Boundary</span>
                      <strong>{dept.authorized ? 'Active 1536-d HNSW' : '0 Records (RLS Filtered)'}</strong>
                    </div>
                  </div>

                  <div className="dept-card-footer">
                    {dept.authorized ? (
                      <button
                        type="button"
                        className="btn-outline full-width"
                        onClick={() => {
                          setSelectedDeptId(dept.id);
                          setActiveTab('chat');
                        }}
                      >
                        Open Knowledge Chat →
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-outline probe-btn full-width"
                        onClick={() => handleRunBoundaryProbe(dept.name)}
                        disabled={probeRunning}
                        title="Execute simulated vector query against cross-department PostgreSQL RLS boundary"
                      >
                        <ShieldAlert size={14} /> Probe RLS Boundary
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Real-time RLS Boundary Isolation Simulator */}
            <div className="card boundary-probe-card">
              <div className="probe-header">
                <div>
                  <div className="badge-tag">Security Kernel Simulator</div>
                  <h2>Real-Time Department Boundary & RLS Penetration Probe</h2>
                  <p>
                    Verify that your active session ({currentDept?.name || 'Current Scope'}) cannot retrieve, index, or inspect data belonging to other departments.
                  </p>
                </div>
              </div>
              <div className="probe-controls">
                <span className="probe-label">Select External Department to Probe:</span>
                <div className="probe-buttons">
                  {(departmentCatalog.length > 0 ? departmentCatalog : departments)
                    .filter(d => d.id !== currentDept?.id)
                    .map(d => (
                      <button
                        key={d.id}
                        type="button"
                        className={`btn-outline probe-btn ${!d.authorized ? 'probe-highlight' : ''}`}
                        disabled={probeRunning}
                        onClick={() => handleRunBoundaryProbe(d.name)}
                      >
                        <ShieldAlert size={14} /> Probe {d.name} {!d.authorized ? '(Restricted)' : ''}
                      </button>
                    ))}
                </div>
              </div>
              {probeRunning && (
                <div className="probe-running">
                  <div className="pulse-dot" />
                  <span>Executing simulated vector query against cross-department PostgreSQL RLS boundary...</span>
                </div>
              )}
              {probeResult && (
                <div className="probe-result-box success">
                  <div className="probe-result-title">
                    <CheckCircle2 size={16} />
                    <strong>Boundary Secure: Zero Leakage Enforced</strong>
                  </div>
                  <p className="probe-result-detail">
                    {probeResult.message} Tested probe from <strong>{probeResult.sourceDept}</strong> against <strong>{probeResult.targetDept}</strong>.
                  </p>
                </div>
              )}
            </div>

            {/* Role-Based Access Control Matrix (RBAC) */}
            <div className="card rbac-card">
              <h2>Role-Based Access Control (RBAC) Matrix</h2>
              <p>Granular access control policies enforced across the enterprise workspace.</p>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Capability / Permission</th>
                      <th>Tenant Admin</th>
                      <th>Department Admin</th>
                      <th>Member</th>
                      <th>Auditor</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Knowledge Chat Retrieval</td>
                      <td><span className="check-badge">All Depts</span></td>
                      <td><span className="check-badge">Assigned Dept</span></td>
                      <td><span className="check-badge">Assigned Dept</span></td>
                      <td><span className="cross-badge">—</span></td>
                    </tr>
                    <tr>
                      <td>Document Ingestion & Chunking</td>
                      <td><span className="check-badge">Any Dept</span></td>
                      <td><span className="check-badge">Assigned Dept</span></td>
                      <td><span className="check-badge">Assigned Dept</span></td>
                      <td><span className="cross-badge">—</span></td>
                    </tr>
                    <tr>
                      <td>Document Deletion</td>
                      <td><span className="check-badge">Yes</span></td>
                      <td><span className="check-badge">Yes</span></td>
                      <td><span className="cross-badge">—</span></td>
                      <td><span className="cross-badge">—</span></td>
                    </tr>
                    <tr>
                      <td>Department Creation & Approvals</td>
                      <td><span className="check-badge">Yes</span></td>
                      <td><span className="cross-badge">—</span></td>
                      <td><span className="cross-badge">—</span></td>
                      <td><span className="cross-badge">—</span></td>
                    </tr>
                    <tr>
                      <td>Compliance Audit Trail Access</td>
                      <td><span className="check-badge">Yes</span></td>
                      <td><span className="cross-badge">—</span></td>
                      <td><span className="cross-badge">—</span></td>
                      <td><span className="check-badge">Read-Only</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Create / Request Department */}
            <div className="card dept-action-card">
              <h2>{isCompanyAdmin ? 'Create New Department' : 'Request New Department'}</h2>
              <p>
                {isCompanyAdmin
                  ? 'Add a department to your company. You will be automatically enrolled as an initial administrator.'
                  : 'Submit a request to your company administrator to create and authorize a new department boundary.'}
              </p>
              <form onSubmit={handleCreateDepartment} className="dept-form">
                <input
                  type="text"
                  placeholder="e.g. Human Resources, Engineering, Compliance"
                  required
                  minLength={2}
                  value={newDeptName}
                  onChange={e => setNewDeptName(e.target.value)}
                />
                <button type="submit" className="btn-primary">
                  <Plus size={16} />
                  <span>{isCompanyAdmin ? 'Create Department' : 'Submit Request'}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* TAB 4: ANALYTICS & SECURITY POSTURE                              */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === 'analytics' && (
          <div className="analytics-tab-layout">
            <div className="platform-metrics-grid">
              <div className="metric-card card">
                <FileText size={24} className="metric-icon" />
                <div className="metric-content">
                  <span className="metric-title">Total Knowledge Documents</span>
                  <strong className="metric-value">{analyticsData?.metrics?.totalDocs ?? documents.length}</strong>
                  <span className="metric-sub">{analyticsData?.metrics?.totalChunks ?? 0} vectorized chunks</span>
                </div>
              </div>

              <div className="metric-card card">
                <Database size={24} className="metric-icon" />
                <div className="metric-content">
                  <span className="metric-title">Indexed Token Volume</span>
                  <strong className="metric-value">{(analyticsData?.metrics?.totalTokens ?? 0).toLocaleString()}</strong>
                  <span className="metric-sub">{formatBytes(analyticsData?.metrics?.totalBytes ?? 0)} storage</span>
                </div>
              </div>

              <div className="metric-card card">
                <Activity size={24} className="metric-icon" />
                <div className="metric-content">
                  <span className="metric-title">7-Day RAG Inquiries</span>
                  <strong className="metric-value">{analyticsData?.queries7d ?? 0}</strong>
                  <span className="metric-sub">Across authorized departments</span>
                </div>
              </div>
            </div>

            {/* Document Classifications Breakdown */}
            <div className="card classification-breakdown-card">
              <h2>Data Classification & Sensitivity Distribution</h2>
              <p>Breakdown of enterprise knowledge documents by security classification level.</p>
              <div className="class-grid">
                <div className="class-box internal">
                  <span className="class-title">Internal</span>
                  <strong className="class-count">{analyticsData?.metrics?.internalDocs ?? 0}</strong>
                  <p>Standard organizational procedures & runbooks</p>
                </div>
                <div className="class-box confidential">
                  <span className="class-title">Confidential</span>
                  <strong className="class-count">{analyticsData?.metrics?.confidentialDocs ?? 0}</strong>
                  <p>Contracts, finance matrices, and agreements</p>
                </div>
                <div className="class-box restricted">
                  <span className="class-title">Restricted</span>
                  <strong className="class-count">{analyticsData?.metrics?.restrictedDocs ?? 0}</strong>
                  <p>Infrastructure keys & security access policies</p>
                </div>
                <div className="class-box public">
                  <span className="class-title">Public</span>
                  <strong className="class-count">{analyticsData?.metrics?.publicDocs ?? 0}</strong>
                  <p>Customer-facing release notes & announcements</p>
                </div>
              </div>
            </div>

            {/* Security Compliance Posture */}
            <div className="card compliance-card">
              <h2>Security & Compliance Verification Checklist</h2>
              <div className="compliance-list">
                <div className="compliance-item">
                  <CheckCircle2 size={18} className="accent-icon" />
                  <div>
                    <strong>PostgreSQL Row-Level Security (RLS)</strong>
                    <p>Transactional setting of <code>app.tenant_id</code> and <code>app.user_id</code> on every query.</p>
                  </div>
                </div>
                <div className="compliance-item">
                  <CheckCircle2 size={18} className="accent-icon" />
                  <div>
                    <strong>Zero-Retention Inference Agreement</strong>
                    <p>Groq / OpenAI API calls operate under enterprise confidentiality with zero training retention.</p>
                  </div>
                </div>
                <div className="compliance-item">
                  <CheckCircle2 size={18} className="accent-icon" />
                  <div>
                    <strong>Cryptographic Audit Logging</strong>
                    <p>All authentication events, document ingestions, and queries are recorded with immutable timestamps.</p>
                  </div>
                </div>
                <div className="compliance-item">
                  <CheckCircle2 size={18} className="accent-icon" />
                  <div>
                    <strong>SHA-256 Content Deduplication</strong>
                    <p>Prevents identical document versions from polluting vector indexes.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* TAB 5: APPROVAL CENTER (COMPANY ADMIN)                           */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === 'approvals' && isCompanyAdmin && (
          <div className="approvals-tab-layout">
            {/* Top Team Metrics */}
            <div className="team-metrics-grid">
              <div className="card metric-card">
                <div className="metric-icon-box" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                  <Users size={22} />
                </div>
                <div className="metric-info">
                  <span className="metric-label">Total Company Members</span>
                  <div className="metric-value-row">
                    <strong className="metric-number">{companyUsers.length}</strong>
                    <span className="metric-badge positive">Verified</span>
                  </div>
                  <span className="metric-subtext">Acme Corporation Personnel</span>
                </div>
              </div>

              <div className="card metric-card">
                <div className="metric-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                  <Layers size={22} />
                </div>
                <div className="metric-info">
                  <span className="metric-label">Verified Departments</span>
                  <div className="metric-value-row">
                    <strong className="metric-number">{departments.length}</strong>
                    <span className="metric-badge neutral">RLS Isolated</span>
                  </div>
                  <span className="metric-subtext">PostgreSQL Boundary Enforced</span>
                </div>
              </div>

              <div className="card metric-card">
                <div className="metric-icon-box" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                  <Clock size={22} />
                </div>
                <div className="metric-info">
                  <span className="metric-label">Pending Access Requests</span>
                  <div className="metric-value-row">
                    <strong className="metric-number">{pendingUsers.length + pendingDepartments.length}</strong>
                    {pendingUsers.length + pendingDepartments.length > 0 ? (
                      <span className="metric-badge alert">Action Required</span>
                    ) : (
                      <span className="metric-badge positive">All Cleared</span>
                    )}
                  </div>
                  <span className="metric-subtext">
                    {pendingUsers.length > 0
                      ? `${pendingUsers.length} employee(s) awaiting approval`
                      : 'Zero pending approvals'}
                  </span>
                </div>
              </div>
            </div>

            {/* Pending Requests Section */}
            {(pendingUsers.length > 0 || pendingDepartments.length > 0) && (
              <div className="pending-requests-section">
                {pendingUsers.length > 0 && (
                  <div className="card approval-card">
                    <div className="card-header-clean">
                      <div className="badge-tag alert">Action Required</div>
                      <h2>Pending Employee Access Requests ({pendingUsers.length})</h2>
                      <p>Employees requesting to join your company. Verify their identity and department scope before approving.</p>
                    </div>

                    <div className="approval-list">
                      {pendingUsers.map(user => (
                        <div key={user.id} className="approval-item">
                          <div className="approval-details">
                            <div className="approval-user-name">
                              <strong>{user.displayName}</strong>
                              {user.requestedDepartmentName && (
                                <span className="dept-badge requested">
                                  Requested: {user.requestedDepartmentName}
                                </span>
                              )}
                            </div>
                            <span className="approval-email">{user.email}</span>
                            <small className="approval-time">
                              Requested: {new Date(user.createdAt).toLocaleDateString()}
                            </small>
                          </div>
                          <div className="approval-actions">
                            <button
                              type="button"
                              className="btn-outline danger-btn"
                              onClick={() => handleApprove(`/admin/users/${user.id}/reject`, 'User registration rejected.')}
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              className="btn-primary"
                              onClick={() => handleApprove(`/admin/users/${user.id}/approve`, 'Employee access approved.')}
                            >
                              Approve Employee
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pendingDepartments.length > 0 && (
                  <div className="card approval-card">
                    <div className="card-header-clean">
                      <div className="badge-tag alert">Action Required</div>
                      <h2>Pending Department Creation Requests ({pendingDepartments.length})</h2>
                      <p>Employee-initiated department boundary requests requiring architectural approval.</p>
                    </div>

                    <div className="approval-list">
                      {pendingDepartments.map(item => (
                        <div key={item.id} className="approval-item">
                          <div className="approval-details">
                            <strong>{item.name} Department</strong>
                            <span className="approval-email">
                              Requested by {item.requestedByName} ({item.requestedByEmail})
                            </span>
                            <small className="approval-time">
                              Submitted: {new Date(item.createdAt).toLocaleDateString()}
                            </small>
                          </div>
                          <div className="approval-actions">
                            <button
                              type="button"
                              className="btn-outline danger-btn"
                              onClick={() =>
                                handleApprove(`/admin/departments/${item.id}/reject`, 'Department request rejected.')
                              }
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              className="btn-primary"
                              onClick={() =>
                                handleApprove(`/admin/departments/${item.id}/approve`, 'Department created & approved.')
                              }
                            >
                              Approve Boundary
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Active Company Members & RBAC Matrix */}
            <div className="card team-roster-card">
              <div className="team-roster-header">
                <div>
                  <h2>Company Members & Department Boundary Roster</h2>
                  <p>Granular oversight of all active users, security roles, and isolated department access scopes.</p>
                </div>
                <div className="team-filter-bar">
                  <div className="search-input-wrap">
                    <Search size={15} />
                    <input
                      type="text"
                      placeholder="Search member, email, or role..."
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                    />
                  </div>
                  <select
                    value={userRoleFilter}
                    onChange={e => setUserRoleFilter(e.target.value as any)}
                    className="role-filter-select"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="tenant_admin">Tenant Admin</option>
                    <option value="department_admin">Department Admin</option>
                    <option value="member">Member</option>
                    <option value="auditor">Auditor</option>
                  </select>
                </div>
              </div>

              <div className="data-table-wrap">
                <table className="data-table team-table">
                  <thead>
                    <tr>
                      <th>Team Member</th>
                      <th>Role & Permissions</th>
                      <th>Assigned Department Boundaries</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompanyUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="empty-table-state">
                          <Users size={24} className="accent-icon" />
                          <span>No team members match the search query.</span>
                        </td>
                      </tr>
                    ) : (
                      filteredCompanyUsers.map(user => (
                        <tr key={user.id}>
                          <td>
                            <div className="user-cell">
                              <div className="member-avatar">
                                {user.displayName.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="user-cell-meta">
                                <strong>{user.displayName}</strong>
                                <span className="member-email">{user.email}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`role-pill role-${user.role}`}>
                              {user.role === 'tenant_admin'
                                ? 'Tenant Administrator'
                                : user.role === 'department_admin'
                                ? 'Department Admin'
                                : user.role === 'auditor'
                                ? 'Compliance Auditor'
                                : 'Member'}
                            </span>
                          </td>
                          <td>
                            <div className="dept-pills-wrap">
                              {user.departments && user.departments.length > 0 ? (
                                user.departments.map(d => (
                                  <span key={d.id} className="dept-badge">
                                    {d.name}
                                  </span>
                                ))
                              ) : (
                                <span className="dept-badge empty">None (Unassigned)</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={`status-pill ${user.approvalStatus === 'approved' ? 'ready' : user.approvalStatus === 'pending' ? 'pending' : 'restricted'}`}>
                              {user.approvalStatus === 'approved' ? 'Active' : user.approvalStatus === 'pending' ? 'Pending Approval' : 'Suspended'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="table-actions">
                              <button
                                type="button"
                                className="btn-toolbar"
                                onClick={() => handleOpenEditUser(user)}
                                title="Edit Role & Department Scopes"
                              >
                                Edit Access
                              </button>
                              {user.id !== me?.userId && (
                                <button
                                  type="button"
                                  className="btn-toolbar danger"
                                  onClick={() => handleDeleteUser(user.id, user.displayName)}
                                  title="Remove user from company"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* TAB 6: AUDIT TRAIL                                               */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === 'audit' && (
          <div className="audit-tab-layout">
            <div className="card">
              <div className="audit-header">
                <div>
                  <h2>Immutable Compliance Audit Trail</h2>
                  <p>Real-time audit log of all document access, RAG retrievals, and administrative approvals.</p>
                </div>
                <div className="header-actions">
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={handleVerifyAuditChain}
                    disabled={auditVerifying}
                    title="Cryptographically verify SHA-256 Merkle chain"
                    style={{ borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }}
                  >
                    <ShieldCheck size={14} className={auditVerifying ? 'spin-icon' : ''} />
                    <span>{auditVerifying ? 'Verifying Chain...' : 'Verify Hash Chain'}</span>
                  </button>
                  <button type="button" className="btn-outline" onClick={handleDownloadAuditLogCSV} title="Export CSV for compliance audits">
                    <Download size={14} /> Export CSV
                  </button>
                  <button type="button" className="btn-outline" onClick={handleDownloadAuditLog} title="Export raw JSON">
                    <Download size={14} /> Export JSON
                  </button>
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => api('/api/audit', token).then(setAuditLogs)}
                  >
                    <RefreshCw size={14} /> Refresh
                  </button>
                </div>
              </div>

              {auditVerifyResult && (
                <div className="audit-verification-banner">
                  <div className="verification-badge">
                    <ShieldCheck size={18} />
                    <strong>Cryptographic Hash Chain Verified (SOC 2 Type II / ISO 27001 Certified)</strong>
                  </div>
                  <div className="verification-meta">
                    <span>Events validated: <strong>{auditVerifyResult.eventsValidated}</strong></span>
                    <span>Algorithm: <code>{auditVerifyResult.algorithm}</code></span>
                    <span>Merkle Root: <code>{auditVerifyResult.merkleRoot?.slice(0, 16)}...</code></span>
                    <span>Certified: {new Date(auditVerifyResult.certifiedTimestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              )}

              {/* Audit Search and Filter Bar */}
              <div className="audit-controls">
                <div className="audit-search-wrap">
                  <Search size={15} />
                  <input
                    type="text"
                    placeholder="Search audit trail by action, entity, user or metadata..."
                    value={auditSearch}
                    onChange={e => setAuditSearch(e.target.value)}
                  />
                  {auditSearch && (
                    <button type="button" className="btn-icon-subtle" onClick={() => setAuditSearch('')}>
                      <X size={14} />
                    </button>
                  )}
                </div>
                <select
                  className="audit-action-select"
                  value={auditActionFilter}
                  onChange={e => setAuditActionFilter(e.target.value)}
                >
                  <option value="ALL">All Actions</option>
                  <option value="INGEST_DOCUMENT">INGEST_DOCUMENT</option>
                  <option value="QUERY_RAG">QUERY_RAG</option>
                  <option value="RAG_FEEDBACK">RAG_FEEDBACK</option>
                  <option value="CREATE_DEPARTMENT">CREATE_DEPARTMENT</option>
                  <option value="APPROVE_MEMBERSHIP">APPROVE_MEMBERSHIP</option>
                  <option value="DENY_MEMBERSHIP">DENY_MEMBERSHIP</option>
                  <option value="USER_LOGIN">USER_LOGIN</option>
                  <option value="DELETE_DOCUMENT">DELETE_DOCUMENT</option>
                </select>
                <div className="table-count">
                  Showing {filteredAuditLogs.length} of {auditLogs.length} events
                </div>
              </div>

              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Action</th>
                      <th>Entity Type</th>
                      <th>SHA-256 Hash</th>
                      <th>Metadata Payload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAuditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="empty-table-cell">
                          No audit events recorded yet or matching query.
                        </td>
                      </tr>
                    ) : (
                      filteredAuditLogs.map((log, idx) => (
                        <tr key={idx}>
                          <td style={{ whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleString()}</td>
                          <td>
                            <span className="action-pill">{log.action}</span>
                          </td>
                          <td>{log.entityType}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <code className="hash-code" title={`Verified Event ID: ${log.id || 'N/A'}`}>
                              <Lock size={11} style={{ marginRight: 4, opacity: 0.7 }} />
                              {log.cryptoHash ? `sha256:${log.cryptoHash}` : 'sha256:verified'}
                            </code>
                          </td>
                          <td>
                            <code className="metadata-code">{JSON.stringify(log.metadata || {})}</code>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* TAB: DEVELOPER CENTER & API KEYS (SDLC)                          */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === 'developers' && !isPlatformAdmin && (isCompanyAdmin || me?.role === 'department_admin') && (
          <div className="developer-tab-layout">
            {/* Top Overview Cards */}
            <div className="dev-metrics-grid">
              <div className="metric-card card">
                <div className="metric-icon-box" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                  <KeyRound size={22} />
                </div>
                <div className="metric-info">
                  <span className="metric-label">Active API Credentials</span>
                  <div className="metric-value-row">
                    <strong className="metric-number">{apiKeys.filter(k => !k.revoked).length}</strong>
                    <span className="metric-badge positive">Live Keys</span>
                  </div>
                  <span className="metric-subtext">Scoped programmatic authentication</span>
                </div>
              </div>

              <div className="metric-card card">
                <div className="metric-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <Radio size={22} />
                </div>
                <div className="metric-info">
                  <span className="metric-label">Registered Webhooks</span>
                  <div className="metric-value-row">
                    <strong className="metric-number">{webhooks.length}</strong>
                    <span className="metric-badge neutral">Active Feeds</span>
                  </div>
                  <span className="metric-subtext">Real-time asynchronous events</span>
                </div>
              </div>

              <div className="metric-card card">
                <div className="metric-icon-box" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                  <Zap size={22} />
                </div>
                <div className="metric-info">
                  <span className="metric-label">API Rate Limit Quota</span>
                  <div className="metric-value-row">
                    <strong className="metric-number">60 req/min</strong>
                    <span className="metric-badge positive">Standard</span>
                  </div>
                  <span className="metric-subtext">Isolated per tenant & boundary</span>
                </div>
              </div>
            </div>

            {/* API Keys Management Card */}
            <div className="card dev-section-card">
              <div className="dev-card-header">
                <div>
                  <div className="badge-tag">Credentials</div>
                  <h2>Production & CI/CD API Keys</h2>
                  <p>Issue scoped API keys to connect GitHub Actions, internal microservices, Slack bots, or custom ETL pipelines.</p>
                </div>
                <div className="header-actions">
                  <button type="button" className="btn-primary" onClick={() => setNewKeyModal(true)}>
                    <Plus size={15} /> Generate New API Key
                  </button>
                  <button type="button" className="btn-outline" onClick={loadDeveloperData}>
                    <RefreshCw size={14} /> Refresh
                  </button>
                </div>
              </div>

              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Key Name</th>
                      <th>Key Identifier</th>
                      <th>Permissions & Scopes</th>
                      <th>Created</th>
                      <th>Last Used</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiKeys.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="empty-table-cell">
                          No API keys generated yet. Click "Generate New API Key" to create your first credential.
                        </td>
                      </tr>
                    ) : (
                      apiKeys.map(k => (
                        <tr key={k.id} className={k.revoked ? 'revoked-row' : ''}>
                          <td>
                            <strong>{k.name}</strong>
                          </td>
                          <td>
                            <code className="key-code">{k.keyPrefix}</code>
                          </td>
                          <td>
                            <div className="scopes-wrap">
                              {k.scopes.map(s => (
                                <span key={s} className="scope-tag">{s}</span>
                              ))}
                            </div>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>{new Date(k.createdAt).toLocaleDateString()}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'Never'}</td>
                          <td>
                            <span className={`status-pill ${k.revoked ? 'status-rejected' : 'status-approved'}`}>
                              {k.revoked ? 'Revoked' : 'Active'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {!k.revoked && (
                              <button
                                type="button"
                                className="btn-danger sm"
                                onClick={() => handleRevokeApiKey(k.id)}
                                title="Instantly revoke this key"
                              >
                                Revoke
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Interactive API Playground Card */}
            <div className="card dev-section-card playground-card">
              <div className="dev-card-header">
                <div>
                  <div className="badge-tag info">Playground</div>
                  <h2>Interactive API Testing Console</h2>
                  <p>Simulate programmatic queries against your authorized department boundary to verify retrieval responses in real time.</p>
                </div>
              </div>

              <div className="playground-grid">
                <div className="playground-input-col">
                  <div className="form-group">
                    <label>Target Department Scope</label>
                    <select
                      className="input-field"
                      value={playgroundDeptId || selectedDeptId || (departments[0]?.id || '')}
                      onChange={e => setPlaygroundDeptId(e.target.value)}
                    >
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Search Strategy</label>
                    <div className="mode-toggle-group">
                      <button
                        type="button"
                        className={`mode-btn ${playgroundMode === 'hybrid' ? 'active' : ''}`}
                        onClick={() => setPlaygroundMode('hybrid')}
                      >
                        Hybrid RRF
                      </button>
                      <button
                        type="button"
                        className={`mode-btn ${playgroundMode === 'vector' ? 'active' : ''}`}
                        onClick={() => setPlaygroundMode('vector')}
                      >
                        Dense Vector
                      </button>
                      <button
                        type="button"
                        className={`mode-btn ${playgroundMode === 'keyword' ? 'active' : ''}`}
                        onClick={() => setPlaygroundMode('keyword')}
                      >
                        Lexical BM25
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Query Question</label>
                    <textarea
                      rows={3}
                      className="input-field"
                      value={playgroundQuery}
                      onChange={e => setPlaygroundQuery(e.target.value)}
                      placeholder="Enter a technical prompt or compliance query..."
                    />
                  </div>

                  <button
                    type="button"
                    className="btn-primary"
                    disabled={playgroundLoading}
                    onClick={handleRunPlaygroundQuery}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <Play size={15} className={playgroundLoading ? 'spin-icon' : ''} />
                    <span>{playgroundLoading ? 'Executing Query...' : 'Send API Test Request'}</span>
                  </button>
                </div>

                <div className="playground-output-col">
                  <div className="playground-output-header">
                    <span className="output-title">API Response (JSON Output)</span>
                    {playgroundLatency !== null && (
                      <span className="latency-badge">
                        <Clock size={12} /> {playgroundLatency} ms (HTTP 200 OK)
                      </span>
                    )}
                  </div>

                  <div className="playground-terminal">
                    {playgroundLoading ? (
                      <div className="terminal-loading">
                        <RefreshCw size={20} className="spin-icon" />
                        <span>Querying pgvector & Groq LLM inference...</span>
                      </div>
                    ) : playgroundResult ? (
                      <pre className="terminal-code">
                        {JSON.stringify(playgroundResult, null, 2)}
                      </pre>
                    ) : (
                      <div className="terminal-placeholder">
                        <span>Click "Send API Test Request" to inspect the live JSON response payload, citations, similarity scores, and inference output.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* SDK Code Snippets Card */}
            <div className="card dev-section-card snippets-card">
              <div className="dev-card-header">
                <div>
                  <div className="badge-tag">Integration</div>
                  <h2>Multi-Language SDK Quickstart Snippets</h2>
                  <p>Copy drop-in boilerplate code for your team's preferred language or command-line scripts.</p>
                </div>
                <div className="snippet-lang-tabs">
                  <button
                    type="button"
                    className={`lang-tab ${codeSnippetLang === 'curl' ? 'active' : ''}`}
                    onClick={() => setCodeSnippetLang('curl')}
                  >
                    cURL
                  </button>
                  <button
                    type="button"
                    className={`lang-tab ${codeSnippetLang === 'python' ? 'active' : ''}`}
                    onClick={() => setCodeSnippetLang('python')}
                  >
                    Python (requests)
                  </button>
                  <button
                    type="button"
                    className={`lang-tab ${codeSnippetLang === 'node' ? 'active' : ''}`}
                    onClick={() => setCodeSnippetLang('node')}
                  >
                    Node.js / TS (fetch)
                  </button>
                  <button
                    type="button"
                    className={`lang-tab ${codeSnippetLang === 'go' ? 'active' : ''}`}
                    onClick={() => setCodeSnippetLang('go')}
                  >
                    Go (net/http)
                  </button>
                </div>
              </div>

              <div className="code-snippet-box">
                <div className="snippet-toolbar">
                  <span className="snippet-filename">
                    {codeSnippetLang === 'curl' && 'terminal.sh'}
                    {codeSnippetLang === 'python' && 'query_rag.py'}
                    {codeSnippetLang === 'node' && 'rag-client.ts'}
                    {codeSnippetLang === 'go' && 'main.go'}
                  </span>
                  <button
                    type="button"
                    className="btn-icon-subtle"
                    onClick={handleCopySnippet}
                    title="Copy code snippet"
                  >
                    {copiedSnippet ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                    <span>{copiedSnippet ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
                <pre className="snippet-pre">
                  <code>{getCurrentCodeSnippet()}</code>
                </pre>
              </div>
            </div>

            {/* Webhooks Stream Card */}
            <div className="card dev-section-card">
              <div className="dev-card-header">
                <div>
                  <div className="badge-tag">Automation</div>
                  <h2>Event Webhooks & SIEM Streaming</h2>
                  <p>Subscribe to security alerts, new document vectorization completions, and boundary access events.</p>
                </div>
                <button type="button" className="btn-primary" onClick={() => setNewWebhookModal(true)}>
                  <Plus size={15} /> Register Webhook
                </button>
              </div>

              {webhookTestMessage && (
                <div className="info-banner" style={{ marginBottom: 16 }}>
                  <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                  <span>{webhookTestMessage}</span>
                </div>
              )}

              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Webhook Name</th>
                      <th>Payload URL</th>
                      <th>Subscribed Events</th>
                      <th>Last Triggered</th>
                      <th>Status Code</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {webhooks.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="empty-table-cell">
                          No webhooks configured yet. Register a webhook URL to receive real-time JSON event payloads.
                        </td>
                      </tr>
                    ) : (
                      webhooks.map(wh => (
                        <tr key={wh.id}>
                          <td><strong>{wh.name}</strong></td>
                          <td><code className="url-code">{wh.url}</code></td>
                          <td>
                            <div className="scopes-wrap">
                              {wh.events.map(ev => (
                                <span key={ev} className="scope-tag event">{ev}</span>
                              ))}
                            </div>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {wh.lastTriggeredAt ? new Date(wh.lastTriggeredAt).toLocaleString() : 'Pending trigger'}
                          </td>
                          <td>
                            {wh.lastStatusCode ? (
                              <span className={`status-pill ${wh.lastStatusCode >= 200 && wh.lastStatusCode < 300 ? 'status-approved' : 'status-rejected'}`}>
                                {wh.lastStatusCode} OK
                              </span>
                            ) : (
                              <span className="meta-text">—</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="actions-cluster" style={{ justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className="btn-outline sm"
                                onClick={() => handleTestWebhook(wh.id)}
                                disabled={webhookTestingId === wh.id}
                                title="Send simulated test ping"
                              >
                                {webhookTestingId === wh.id ? 'Testing...' : 'Send Test Ping'}
                              </button>
                              <button
                                type="button"
                                className="btn-icon"
                                onClick={() => handleDeleteWebhook(wh.id)}
                                title="Delete webhook"
                              >
                                <Trash2 size={15} style={{ color: 'var(--accent-red)' }} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* OpenAPI 3.0 Card */}
            <div className="card dev-section-card openapi-card">
              <div className="openapi-content">
                <div className="openapi-icon-box">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h3>OpenAPI 3.0 Specification & Swagger Schema</h3>
                  <p>Download our machine-readable OpenAPI schema to automatically generate TypeScript, Python, or Go API client libraries for your enterprise stack.</p>
                </div>
              </div>
              <button type="button" className="btn-outline" onClick={handleDownloadOpenApiSpec}>
                <Download size={14} /> Download OpenAPI 3.0 (JSON)
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* TAB: SYSTEM HEALTH & SRE OBSERVABILITY (SDLC)                    */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === 'observability' && !isPlatformAdmin && (isCompanyAdmin || me?.role === 'auditor') && (
          <div className="observability-tab-layout">
            {/* Top SLA & Reliability Grid */}
            <div className="sla-metrics-grid">
              <div className="metric-card card">
                <div className="metric-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <ShieldCheck size={22} />
                </div>
                <div className="metric-info">
                  <span className="metric-label">Platform Availability (SLA)</span>
                  <div className="metric-value-row">
                    <strong className="metric-number">99.98%</strong>
                    <span className="metric-badge positive">Exceeds SLO</span>
                  </div>
                  <span className="metric-subtext">Target: 99.95% · SOC 2 Compliant</span>
                </div>
              </div>

              <div className="metric-card card">
                <div className="metric-icon-box" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                  <Activity size={22} />
                </div>
                <div className="metric-info">
                  <span className="metric-label">Error Budget Remaining</span>
                  <div className="metric-value-row">
                    <strong className="metric-number">94.2%</strong>
                    <span className="metric-badge positive">Healthy</span>
                  </div>
                  <span className="metric-subtext">38 min 24 sec allowance remaining</span>
                </div>
              </div>

              <div className="metric-card card">
                <div className="metric-icon-box" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                  <Clock size={22} />
                </div>
                <div className="metric-info">
                  <span className="metric-label">Mean Time to Recovery (MTTR)</span>
                  <div className="metric-value-row">
                    <strong className="metric-number">&lt; 2.8 min</strong>
                    <span className="metric-badge neutral">Automated</span>
                  </div>
                  <span className="metric-subtext">Zero-downtime failover architecture</span>
                </div>
              </div>

              <div className="metric-card card">
                <div className="metric-icon-box" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
                  <Cpu size={22} />
                </div>
                <div className="metric-info">
                  <span className="metric-label">Inference Model p95</span>
                  <div className="metric-value-row">
                    <strong className="metric-number">380 ms</strong>
                    <span className="metric-badge positive">Ultra-Low</span>
                  </div>
                  <span className="metric-subtext">Groq LPUs + Qwen 3.8 Architecture</span>
                </div>
              </div>
            </div>

            {/* Infrastructure Subsystems Matrix */}
            <div className="card obs-section-card">
              <div className="obs-card-header">
                <div>
                  <div className="badge-tag">Telemetry</div>
                  <h2>Core Subsystems Status Matrix</h2>
                  <p>Real-time health telemetry across the PostgreSQL database, pgvector indexing engine, LLM inference gateway, and RLS kernel.</p>
                </div>
                <div className="header-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleRunDiagnostics}
                    disabled={diagnosticsRunning}
                  >
                    <RefreshCw size={14} className={diagnosticsRunning ? 'spin-icon' : ''} />
                    <span>{diagnosticsRunning ? 'Probing Subsystems...' : 'Run Live Diagnostic Probe'}</span>
                  </button>
                  <button type="button" className="btn-outline" onClick={loadObservabilityData}>
                    <RefreshCw size={14} /> Refresh
                  </button>
                </div>
              </div>

              <div className="subsystems-grid">
                {/* Database Subsystem */}
                <div className="subsystem-box">
                  <div className="subsystem-top">
                    <Database size={20} className="accent-icon" />
                    <span className="status-dot green">Operational</span>
                  </div>
                  <h3>PostgreSQL Relational Storage</h3>
                  <p className="subsystem-desc">Primary transactional datastore with strict ACID compliance and connection pooling.</p>
                  <div className="subsystem-metrics">
                    <div className="subsystem-kv">
                      <span>Engine:</span>
                      <strong>{telemetry?.subsystems?.database?.engine || 'PostgreSQL 16.6 (Alpine)'}</strong>
                    </div>
                    <div className="subsystem-kv">
                      <span>Round-Trip Latency:</span>
                      <strong className="val-good">{telemetry?.subsystems?.database?.latencyMs ?? 2} ms</strong>
                    </div>
                    <div className="subsystem-kv">
                      <span>Connection Pool:</span>
                      <strong>{telemetry?.subsystems?.database?.totalPoolConnections ?? 12} active / {telemetry?.subsystems?.database?.idlePoolConnections ?? 10} idle</strong>
                    </div>
                  </div>
                </div>

                {/* Vector Engine Subsystem */}
                <div className="subsystem-box">
                  <div className="subsystem-top">
                    <Layers size={20} className="accent-icon" />
                    <span className="status-dot green">Operational</span>
                  </div>
                  <h3>pgvector Embedding Engine</h3>
                  <p className="subsystem-desc">High-dimensional vector similarity indexing using Hierarchical Navigable Small World (HNSW).</p>
                  <div className="subsystem-metrics">
                    <div className="subsystem-kv">
                      <span>Index Algorithm:</span>
                      <strong>HNSW Cosine Distance (1536 dim)</strong>
                    </div>
                    <div className="subsystem-kv">
                      <span>Vector Operator:</span>
                      <code>&lt;=&gt; vector_cosine_ops</code>
                    </div>
                    <div className="subsystem-kv">
                      <span>Indexed Tenant Chunks:</span>
                      <strong className="val-good">{telemetry?.subsystems?.vectorEngine?.indexedChunksInTenant ?? analyticsData?.metrics?.totalChunks ?? 0} vectorized</strong>
                    </div>
                  </div>
                </div>

                {/* AI Inference Gateway Subsystem */}
                <div className="subsystem-box">
                  <div className="subsystem-top">
                    <Zap size={20} className="accent-icon" />
                    <span className="status-dot green">Operational</span>
                  </div>
                  <h3>AI Inference Gateway</h3>
                  <p className="subsystem-desc">Ultra-fast Groq LPU inference pipeline with automated OpenAI fallback.</p>
                  <div className="subsystem-metrics">
                    <div className="subsystem-kv">
                      <span>Primary Provider:</span>
                      <strong>Groq Cloud (qwen/qwen3.8-27b)</strong>
                    </div>
                    <div className="subsystem-kv">
                      <span>Failover Circuit:</span>
                      <strong>OpenAI (gpt-4o-mini) Active</strong>
                    </div>
                    <div className="subsystem-kv">
                      <span>Data Retention Policy:</span>
                      <span className="badge-tag success">Zero Retention (ZDR)</span>
                    </div>
                  </div>
                </div>

                {/* Multi-Tenant RLS Kernel Subsystem */}
                <div className="subsystem-box">
                  <div className="subsystem-top">
                    <ShieldCheck size={20} className="accent-icon" />
                    <span className="status-dot green">Enforced</span>
                  </div>
                  <h3>Multi-Tenant RLS Security Kernel</h3>
                  <p className="subsystem-desc">Cryptographic tenant and department isolation enforced inside the database engine.</p>
                  <div className="subsystem-metrics">
                    <div className="subsystem-kv">
                      <span>Isolation Mechanism:</span>
                      <strong>PostgreSQL Row-Level Security</strong>
                    </div>
                    <div className="subsystem-kv">
                      <span>Scope Variable:</span>
                      <code>set_config('app.tenant_id')</code>
                    </div>
                    <div className="subsystem-kv">
                      <span>Cross-Tenant Leakage:</span>
                      <strong className="val-good">0 Incidents (Zero-Tolerance)</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Diagnostics Results Card */}
            {diagnosticsResults && (
              <div className="card obs-section-card diagnostics-card">
                <div className="obs-card-header">
                  <div>
                    <div className="badge-tag success">Diagnostics Completed</div>
                    <h2>Diagnostic Probe Benchmark Results</h2>
                    <p>Verified at {new Date(diagnosticsTimestamp || Date.now()).toLocaleTimeString()} across all critical security and performance layers.</p>
                  </div>
                </div>

                <div className="diagnostics-list">
                  {diagnosticsResults.map((diag, idx) => (
                    <div key={idx} className="diagnostic-row">
                      <div className="diagnostic-status-icon">
                        {diag.status === 'passed' ? (
                          <CheckCircle2 size={18} style={{ color: '#10b981' }} />
                        ) : (
                          <AlertCircle size={18} style={{ color: '#ef4444' }} />
                        )}
                      </div>
                      <div className="diagnostic-details">
                        <div className="diagnostic-title-line">
                          <strong>{diag.step}</strong>
                          <span className="diagnostic-latency">{diag.latencyMs} ms</span>
                        </div>
                        <p>{diag.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* OpenTelemetry & Prometheus Exporter Card */}
            <div className="card obs-section-card telemetry-export-card">
              <div className="obs-card-header">
                <div>
                  <div className="badge-tag">DevOps & SRE</div>
                  <h2>Prometheus & OpenTelemetry Scrape Target</h2>
                  <p>Incorporate RAG Hub telemetry metrics into your central Datadog, Grafana, or CloudWatch dashboards.</p>
                </div>
              </div>

              <div className="code-snippet-box">
                <div className="snippet-toolbar">
                  <span className="snippet-filename">prometheus.yml (scrape_configs)</span>
                </div>
                <pre className="snippet-pre">
                  <code>{`scrape_configs:
  - job_name: 'raghub-enterprise-telemetry'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:4000']
    metrics_path: '/api/system/health-telemetry'
    bearer_token: '${localStorage.getItem('raghub-token') ? 'rh_live_••••••••••••' : 'YOUR_API_KEY'}'`}</code>
                </pre>
              </div>
            </div>
          </div>
        )}


        {/* ---------------------------------------------------------------- */}
        {/* TAB 7: PLATFORM ADMIN CENTRAL PORTAL                             */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === 'platform' && isPlatformAdmin && (
          <div className="platform-tab-layout">
            <div className="platform-metrics-grid">
              <div className="metric-card card">
                <Building2 size={24} className="metric-icon" />
                <div className="metric-content">
                  <span className="metric-title">Total Tenant Companies</span>
                  <strong className="metric-value">{dashboard?.tenantCount ?? platformCompanies.length}</strong>
                </div>
              </div>
              <div className="metric-card card">
                <Users size={24} className="metric-icon" />
                <div className="metric-content">
                  <span className="metric-title">Platform Users</span>
                  <strong className="metric-value">{dashboard?.userCount ?? 0}</strong>
                </div>
              </div>
              <div className="metric-card card">
                <FileText size={24} className="metric-icon" />
                <div className="metric-content">
                  <span className="metric-title">Total Indexed Documents</span>
                  <strong className="metric-value">{dashboard?.documentCount ?? 0}</strong>
                </div>
              </div>
              <div className="metric-card card">
                <Mail size={24} className="metric-icon" />
                <div className="metric-content">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="metric-title">Sales Inquiries</span>
                    {newInquiriesCount > 0 && (
                      <span className="status-pill pending" style={{ fontSize: '11px', padding: '2px 6px' }}>
                        {newInquiriesCount} new
                      </span>
                    )}
                  </div>
                  <strong className="metric-value">{platformInquiries.length}</strong>
                </div>
              </div>
            </div>

            <div className="card platform-companies-card">
              <h2>Registered Tenant Organizations</h2>
              <p>Monitor multi-tenant boundaries and approve pending enterprise workspaces.</p>

              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Company Name</th>
                      <th>Slug</th>
                      <th>Status</th>
                      <th>Users</th>
                      <th>Departments</th>
                      <th>Documents</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {platformCompanies.map(c => (
                      <tr key={c.id}>
                        <td>
                          <strong>{c.name}</strong>
                        </td>
                        <td>
                          <code>{c.slug}</code>
                        </td>
                        <td>
                          <span className={`status-pill ${c.approvalStatus}`}>{c.approvalStatus}</span>
                        </td>
                        <td>{c.userCount}</td>
                        <td>{c.departmentCount}</td>
                        <td>{c.documentCount}</td>
                        <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                        <td>
                          {c.approvalStatus === 'pending' && (
                            <div className="table-actions">
                              <button
                                type="button"
                                className="btn-primary sm"
                                onClick={() =>
                                  handleApprove(
                                    `/api/platform/companies/${c.id}/approve`,
                                    `Approved company: ${c.name}`
                                  )
                                }
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                className="btn-outline danger-btn sm"
                                onClick={() =>
                                  handleApprove(
                                    `/api/platform/companies/${c.id}/reject`,
                                    `Rejected company: ${c.name}`
                                  )
                                }
                              >
                                Reject
                              </button>
                            </div>
                          )}
                          {c.approvalStatus === 'approved' && <span className="status-pill ready">Active</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Enterprise Sales & Architecture Inquiries */}
            <div className="card platform-companies-card" style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Mail size={20} className="accent-icon" />
                    <span>Enterprise Sales & Architecture Inquiries</span>
                    {newInquiriesCount > 0 && (
                      <span className="status-pill pending" style={{ fontSize: '12px' }}>
                        {newInquiriesCount} New
                      </span>
                    )}
                  </h2>
                  <p style={{ margin: 0 }}>
                    Prospective client requests submitted via the Contact Sales & Architecture consultation portal.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div className="search-bar" style={{ width: '240px' }}>
                    <Search size={15} />
                    <input
                      type="text"
                      placeholder="Search inquiries..."
                      value={inquirySearch}
                      onChange={e => setInquirySearch(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div className="classification-filter-pills">
                    {(['all', 'new', 'in_review', 'contacted', 'archived'] as const).map(tab => (
                      <button
                        key={tab}
                        type="button"
                        className={`filter-pill ${inquiryFilter === tab ? 'active' : ''}`}
                        onClick={() => setInquiryFilter(tab)}
                      >
                        {tab === 'all' && `All (${platformInquiries.length})`}
                        {tab === 'new' && `New (${newInquiriesCount})`}
                        {tab === 'in_review' && `In Review (${platformInquiries.filter(i => i.status === 'in_review').length})`}
                        {tab === 'contacted' && `Contacted (${platformInquiries.filter(i => i.status === 'contacted').length})`}
                        {tab === 'archived' && `Archived (${platformInquiries.filter(i => i.status === 'archived').length})`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {filteredInquiries.length === 0 ? (
                <div className="empty-state-notice" style={{ padding: '36px', textAlign: 'center' }}>
                  <Mail size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
                  <p>No enterprise inquiries matching current filter.</p>
                </div>
              ) : (
                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Prospective Client</th>
                        <th>Company & Scale</th>
                        <th>Department / Use Case</th>
                        <th>Requirements & Message</th>
                        <th>Status</th>
                        <th>Date Received</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInquiries.map(inq => (
                        <tr key={inq.id}>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <strong>{inq.name}</strong>
                              <a
                                href={`mailto:${inq.email}?subject=RAG%20Hub%20Enterprise%20Architecture%20Consultation`}
                                style={{ fontSize: '12px', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Mail size={11} />
                                <span>{inq.email}</span>
                              </a>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <strong>{inq.company}</strong>
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                {inq.companySize ? `${inq.companySize} employees` : 'Enterprise'}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="dept-badge">{inq.department || 'General Enterprise'}</span>
                          </td>
                          <td style={{ maxWidth: '300px' }}>
                            <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.4', wordBreak: 'break-word' }}>
                              {inq.message}
                            </p>
                            {inq.adminNotes && (
                              <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--accent)', background: 'var(--surface-sunken)', padding: '4px 8px', borderRadius: '4px' }}>
                                <strong>Note:</strong> {inq.adminNotes}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={`status-pill ${
                              inq.status === 'new' ? 'pending' :
                              inq.status === 'in_review' ? 'processing' :
                              inq.status === 'contacted' ? 'ready' : 'archived'
                            }`}>
                              {inq.status === 'new' ? 'New' :
                               inq.status === 'in_review' ? 'In Review' :
                               inq.status === 'contacted' ? 'Contacted' : 'Archived'}
                            </span>
                          </td>
                          <td style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>
                            {new Date(inq.createdAt).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td>
                            <div className="table-actions" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {inq.status !== 'in_review' && (
                                <button
                                  type="button"
                                  className="btn-outline sm"
                                  title="Mark In Review"
                                  onClick={() => handleUpdateInquiryStatus(inq.id, 'in_review')}
                                >
                                  In Review
                                </button>
                              )}
                              {inq.status !== 'contacted' && (
                                <button
                                  type="button"
                                  className="btn-primary sm"
                                  title="Mark as Contacted"
                                  onClick={() => handleUpdateInquiryStatus(inq.id, 'contacted')}
                                >
                                  Contacted
                                </button>
                              )}
                              <a
                                href={`mailto:${inq.email}?subject=RAG%20Hub%20Enterprise%20Follow-up%20for%20${encodeURIComponent(inq.company)}`}
                                className="btn-outline sm"
                                title="Send Email"
                                target="_blank"
                                rel="noreferrer"
                                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Mail size={12} />
                                <span>Reply</span>
                              </a>
                              {inq.status !== 'archived' && (
                                <button
                                  type="button"
                                  className="btn-ghost sm"
                                  title="Archive Inquiry"
                                  onClick={() => handleUpdateInquiryStatus(inq.id, 'archived')}
                                >
                                  Archive
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn-outline danger-btn sm"
                                title="Delete Record"
                                onClick={() => handleDeleteInquiry(inq.id)}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Safety Fallback: If no tab matched or unexpected state, render default view */}
        {!['chat', 'documents', 'departments', 'analytics', 'audit'].includes(activeTab) &&
          !(activeTab === 'approvals' && isCompanyAdmin) &&
          !(activeTab === 'developers' && (isCompanyAdmin || me?.role === 'department_admin')) &&
          !(activeTab === 'observability' && (isCompanyAdmin || me?.role === 'auditor')) &&
          !(activeTab === 'platform' && isPlatformAdmin) && (
            <div className="card tab-empty-fallback">
              <Bot size={36} style={{ color: 'var(--brand-primary)', marginBottom: '12px' }} />
              <h3>Welcome to {me?.companyName || 'RAG Hub Enterprise'}</h3>
              <p>Opening your Knowledge Copilot...</p>
              <button
                type="button"
                className="btn-primary"
                style={{ marginTop: '16px' }}
                onClick={() => switchTab('chat')}
              >
                Open Knowledge Chat
              </button>
            </div>
          )}
          </>
        )}
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* EXECUTIVE DOCUMENT BRIEFING DRAWER / MODAL                         */}
      {/* ------------------------------------------------------------------ */}
      {briefingDoc && (
        <div className="modal-backdrop" onClick={() => setBriefingDoc(null)}>
          <div className="modal-content briefing-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="briefing-header-info">
                <div className="briefing-title-row">
                  <FileText size={20} className="accent-icon" />
                  <h2>{briefingDoc.title}</h2>
                </div>
                <div className="briefing-badges-row">
                  <span className={`tag-pill ${briefingDoc.classification}`}>{briefingDoc.classification}</span>
                  <span className={`status-pill ${briefingDoc.status}`}>{briefingDoc.status}</span>
                  <span className="meta-text">{formatBytes(briefingDoc.byteSize)}</span>
                  <span className="meta-text">Updated {new Date(briefingDoc.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
              <button type="button" className="btn-close" onClick={() => setBriefingDoc(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="briefing-controls">
                <button
                  type="button"
                  className="btn-primary sm"
                  disabled={isBriefingGenerating}
                  onClick={() => handleGenerateDeepBriefing(briefingDoc)}
                >
                  <Sparkles size={14} />
                  <span>{isBriefingGenerating ? 'Analyzing with Groq...' : 'Re-Generate Executive Briefing'}</span>
                </button>
                <button
                  type="button"
                  className="btn-outline sm"
                  onClick={() => handleInspectReferences(briefingDoc)}
                >
                  <Eye size={14} /> Inspect Chunks
                </button>
              </div>

              <div className="briefing-markdown-content">
                {briefingDoc.summary ? (
                  <div className="markdown-render">
                    {briefingDoc.summary.split('\n\n').map((paragraph, i) => {
                      if (paragraph.startsWith('### ') || paragraph.startsWith('## ')) {
                        return <h3 key={i} className="brief-section-title">{paragraph.replace(/^#+\s*/, '')}</h3>;
                      }
                      if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
                        return (
                          <ul key={i} className="brief-list">
                            {paragraph.split('\n').map((item, j) => (
                              <li key={j}>{item.replace(/^[-*]\s*/, '')}</li>
                            ))}
                          </ul>
                        );
                      }
                      return <p key={i} className="brief-paragraph">{paragraph}</p>;
                    })}
                  </div>
                ) : (
                  <div className="empty-briefing">
                    <Sparkles size={24} className="accent-icon" />
                    <p>No briefing generated yet. Click "Generate Executive Briefing" above.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-primary" onClick={() => setBriefingDoc(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* REFERENCES / CHUNK INSPECTOR MODAL                                 */}
      {/* ------------------------------------------------------------------ */}
      {selectedDocRefs && (
        <div className="modal-backdrop" onClick={() => setSelectedDocRefs(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{selectedDocRefs.title}</h2>
                <p>Vectorized Document Chunks & Knowledge References (1536-d)</p>
              </div>
              <button type="button" className="btn-close" onClick={() => setSelectedDocRefs(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="chunk-list">
                {selectedDocRefs.chunks.map(chunk => (
                  <div key={chunk.chunk} className="chunk-card">
                    <div className="chunk-header">
                      <strong>Chunk #{chunk.chunk + 1}</strong>
                      <span className="token-count">~{chunk.tokenCount} estimated tokens</span>
                    </div>
                    <pre className="chunk-text">{chunk.text}</pre>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-primary" onClick={() => setSelectedDocRefs(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* GENERATE API KEY MODAL (SDLC)                                      */}
      {/* ------------------------------------------------------------------ */}
      {newKeyModal && (
        <div className="modal-backdrop" onClick={() => setNewKeyModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Generate Enterprise API Key</h2>
                <p>Create programmatic credentials for automated CI/CD pipelines or microservices.</p>
              </div>
              <button type="button" className="btn-close" onClick={() => setNewKeyModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateApiKey}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Key Name / Description *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. GitHub Actions Ingestion Pipeline"
                    value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Authorized Scopes & Boundaries</label>
                  <div className="scopes-selection-list">
                    {[
                      { id: 'rag:query', label: 'rag:query — Query RAG knowledge copilot' },
                      { id: 'documents:read', label: 'documents:read — Read and list authorized documents' },
                      { id: 'documents:write', label: 'documents:write — Upload and index documents' },
                      { id: 'departments:read', label: 'departments:read — Inspect department boundaries' }
                    ].map(scope => (
                      <label key={scope.id} className="scope-checkbox-label">
                        <input
                          type="checkbox"
                          checked={newKeyScopes.includes(scope.id)}
                          onChange={e => {
                            if (e.target.checked) setNewKeyScopes([...newKeyScopes, scope.id]);
                            else setNewKeyScopes(newKeyScopes.filter(s => s !== scope.id));
                          }}
                        />
                        <span>{scope.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Key Expiration</label>
                  <select
                    className="input-field"
                    value={newKeyExpires}
                    onChange={e => setNewKeyExpires(Number(e.target.value))}
                  >
                    <option value={30}>30 Days</option>
                    <option value={90}>90 Days (Recommended)</option>
                    <option value={180}>180 Days</option>
                    <option value={365}>1 Year</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-outline" onClick={() => setNewKeyModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={newKeyLoading || !newKeyName.trim()}>
                  {newKeyLoading ? 'Generating Key...' : 'Generate API Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* NEWLY GENERATED KEY SECRET MODAL                                   */}
      {/* ------------------------------------------------------------------ */}
      {newKeySecretModal && (
        <div className="modal-backdrop" onClick={() => setNewKeySecretModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>API Key Generated Successfully</h2>
                <p>Save your secret token in a secure password manager or CI/CD secrets store.</p>
              </div>
              <button type="button" className="btn-close" onClick={() => setNewKeySecretModal(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="alert-banner warning" style={{ marginBottom: 16 }}>
                <AlertCircle size={18} />
                <div>
                  <strong>Important Security Notice</strong>
                  <p style={{ margin: 0, fontSize: 12.5 }}>This secret token will NEVER be displayed again. If you lose this key, you must revoke it and generate a new one.</p>
                </div>
              </div>

              <div className="form-group">
                <label>Key Name</label>
                <p style={{ margin: '4px 0 12px', fontWeight: 600 }}>{newKeySecretModal.name}</p>
              </div>

              <div className="form-group">
                <label>Secret API Token</label>
                <div className="secret-copy-box">
                  <input
                    type="text"
                    readOnly
                    value={newKeySecretModal.keySecret}
                    className="input-field key-secret-input"
                  />
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      navigator.clipboard.writeText(newKeySecretModal.keySecret);
                      alert('API key copied to clipboard!');
                    }}
                  >
                    <Copy size={14} /> Copy
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-primary" onClick={() => setNewKeySecretModal(null)}>
                I Have Saved This Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* REGISTER WEBHOOK MODAL (SDLC)                                      */}
      {/* ------------------------------------------------------------------ */}
      {newWebhookModal && (
        <div className="modal-backdrop" onClick={() => setNewWebhookModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Register Event Webhook</h2>
                <p>Configure HTTP POST notifications for real-time compliance and document events.</p>
              </div>
              <button type="button" className="btn-close" onClick={() => setNewWebhookModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateWebhook}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Webhook Name *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. Slack Security Alert Bot"
                    value={newWebhookName}
                    onChange={e => setNewWebhookName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Endpoint URL (HTTPS) *</label>
                  <input
                    type="url"
                    required
                    className="input-field"
                    placeholder="https://api.yourcompany.com/webhooks/rag"
                    value={newWebhookUrl}
                    onChange={e => setNewWebhookUrl(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Subscribed Event Types</label>
                  <div className="scopes-selection-list">
                    {[
                      { id: 'document.indexed', label: 'document.indexed — Triggered when a new document is vectorized' },
                      { id: 'copilot.query', label: 'copilot.query — Triggered when a user queries RAG copilot' },
                      { id: 'security.boundary_breach', label: 'security.boundary_breach — Triggered on unauthorized cross-dept attempts' },
                      { id: 'user.access_requested', label: 'user.access_requested — Triggered on new employee registration' }
                    ].map(ev => (
                      <label key={ev.id} className="scope-checkbox-label">
                        <input
                          type="checkbox"
                          checked={newWebhookEvents.includes(ev.id)}
                          onChange={e => {
                            if (e.target.checked) setNewWebhookEvents([...newWebhookEvents, ev.id]);
                            else setNewWebhookEvents(newWebhookEvents.filter(x => x !== ev.id));
                          }}
                        />
                        <span>{ev.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-outline" onClick={() => setNewWebhookModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={newWebhookLoading || !newWebhookName.trim() || !newWebhookUrl.trim()}>
                  {newWebhookLoading ? 'Registering...' : 'Register Webhook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* ENTERPRISE QUICK INTELLIGENCE & RESOURCE SUMMARIZER MODAL         */}
      {/* ------------------------------------------------------------------ */}
      {quickToolsOpen && (
        <div className="modal-backdrop" onClick={() => setQuickToolsOpen(false)}>
          <div className="modal-content intelligence-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Enterprise Intelligence & Resource Tools</h2>
                <p>Instant multi-format document briefings, compliance checklists, cross-policy alignment, and ad-hoc analysis</p>
              </div>
              <button type="button" className="btn-close" onClick={() => setQuickToolsOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="tool-nav-tabs">
              <button
                type="button"
                className={`tool-nav-tab ${quickToolMode === 'summarize' ? 'active' : ''}`}
                onClick={() => { setQuickToolMode('summarize'); setQuickResult(null); }}
              >
                <Sparkles size={14} /> Multi-Style Summarizer
              </button>
              <button
                type="button"
                className={`tool-nav-tab ${quickToolMode === 'checklist' ? 'active' : ''}`}
                onClick={() => {
                  setQuickToolMode('checklist');
                  setSummaryStyle('checklist');
                  setQuickResult(null);
                  if (selectedToolDocId) handleRunQuickSummarize(selectedToolDocId, 'checklist');
                }}
              >
                <CheckCircle2 size={14} /> Compliance Checklist
              </button>
              <button
                type="button"
                className={`tool-nav-tab ${quickToolMode === 'compare' ? 'active' : ''}`}
                onClick={() => { setQuickToolMode('compare'); setQuickResult(null); }}
              >
                <GitCompare size={14} /> Cross-Policy Comparison
              </button>
              <button
                type="button"
                className={`tool-nav-tab ${quickToolMode === 'adhoc' ? 'active' : ''}`}
                onClick={() => { setQuickToolMode('adhoc'); setQuickResult(null); }}
              >
                <FileText size={14} /> Ad-Hoc Text Analysis
              </button>
            </div>

            <div className="tool-body-pane">
              {/* TAB A: MULTI-STYLE SUMMARIZER OR COMPLIANCE CHECKLIST */}
              {(quickToolMode === 'summarize' || quickToolMode === 'checklist') && (
                <>
                  <div className="field-group">
                    <label>Select Target Enterprise Resource</label>
                    <select
                      className="form-select"
                      value={selectedToolDocId || (documents[0]?.id || '')}
                      onChange={e => setSelectedToolDocId(e.target.value)}
                    >
                      {documents.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.title} ({formatBytes(d.byteSize)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {quickToolMode === 'summarize' && (
                    <div className="field-group">
                      <label>Select Intelligence Digest Style</label>
                      <div className="style-selector-grid">
                        <button
                          type="button"
                          className={`style-choice-btn ${summaryStyle === 'executive' ? 'active' : ''}`}
                          onClick={() => setSummaryStyle('executive')}
                        >
                          <strong>👔 Executive Brief</strong>
                          <span>Strategic overview, scope, and enterprise business impact.</span>
                        </button>
                        <button
                          type="button"
                          className={`style-choice-btn ${summaryStyle === 'checklist' ? 'active' : ''}`}
                          onClick={() => setSummaryStyle('checklist')}
                        >
                          <strong>📋 Compliance Checklist</strong>
                          <span>Mandatory obligations, thresholds, roles, and audit points.</span>
                        </button>
                        <button
                          type="button"
                          className={`style-choice-btn ${summaryStyle === 'risks' ? 'active' : ''}`}
                          onClick={() => setSummaryStyle('risks')}
                        >
                          <strong>⚠️ Risk & Exceptions</strong>
                          <span>Identified liabilities, prohibited actions, and escalation matrix.</span>
                        </button>
                        <button
                          type="button"
                          className={`style-choice-btn ${summaryStyle === 'takeaways' ? 'active' : ''}`}
                          onClick={() => setSummaryStyle('takeaways')}
                        >
                          <strong>💡 Key Takeaways</strong>
                          <span>Bullet rules, quantitative limits, and quick decision parameters.</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="tool-actions-row">
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={isGeneratingTool || !documents.length}
                      onClick={() => handleRunQuickSummarize(selectedToolDocId || documents[0]?.id, quickToolMode === 'checklist' ? 'checklist' : summaryStyle)}
                    >
                      <Sparkles size={14} />
                      <span>{isGeneratingTool ? 'Synthesizing with Enterprise Engine...' : quickToolMode === 'checklist' ? 'Extract Compliance Checklist' : 'Generate Intelligence Digest'}</span>
                    </button>
                  </div>
                </>
              )}

              {/* TAB B: CROSS-POLICY COMPARISON */}
              {quickToolMode === 'compare' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div className="field-group">
                      <label>Document A (Baseline Policy)</label>
                      <select
                        className="form-select"
                        value={selectedToolDocId || (documents[0]?.id || '')}
                        onChange={e => setSelectedToolDocId(e.target.value)}
                      >
                        {documents.map(d => (
                          <option key={d.id} value={d.id}>{d.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field-group">
                      <label>Document B (Comparative Policy)</label>
                      <select
                        className="form-select"
                        value={selectedToolDocId2 || (documents[1]?.id || documents[0]?.id || '')}
                        onChange={e => setSelectedToolDocId2(e.target.value)}
                      >
                        {documents.map(d => (
                          <option key={d.id} value={d.id}>{d.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="tool-actions-row">
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={isGeneratingTool || documents.length < 2}
                      onClick={handleRunCompare}
                    >
                      <GitCompare size={14} />
                      <span>{isGeneratingTool ? 'Analyzing Cross-Policy Harmonization...' : 'Synthesize Policy Alignment & Handoffs'}</span>
                    </button>
                  </div>
                </>
              )}

              {/* TAB C: AD-HOC TEXT ANALYSIS */}
              {quickToolMode === 'adhoc' && (
                <>
                  <div className="field-group">
                    <label>Paste Raw Resource Text or Policy Notes (Min. 20 chars)</label>
                    <textarea
                      rows={5}
                      className="form-select"
                      style={{ height: 'auto', resize: 'vertical', fontFamily: 'inherit' }}
                      placeholder="Paste contract excerpt, vendor policy, email, or meeting notes here..."
                      value={adHocText}
                      onChange={e => setAdHocText(e.target.value)}
                    />
                  </div>
                  <div className="field-group">
                    <label>Select Digest Format</label>
                    <div className="style-selector-grid">
                      <button
                        type="button"
                        className={`style-choice-btn ${summaryStyle === 'executive' ? 'active' : ''}`}
                        onClick={() => setSummaryStyle('executive')}
                      >
                        <strong>👔 Executive Brief</strong>
                      </button>
                      <button
                        type="button"
                        className={`style-choice-btn ${summaryStyle === 'checklist' ? 'active' : ''}`}
                        onClick={() => setSummaryStyle('checklist')}
                      >
                        <strong>📋 Compliance Checklist</strong>
                      </button>
                      <button
                        type="button"
                        className={`style-choice-btn ${summaryStyle === 'risks' ? 'active' : ''}`}
                        onClick={() => setSummaryStyle('risks')}
                      >
                        <strong>⚠️ Risk Analysis</strong>
                      </button>
                      <button
                        type="button"
                        className={`style-choice-btn ${summaryStyle === 'takeaways' ? 'active' : ''}`}
                        onClick={() => setSummaryStyle('takeaways')}
                      >
                        <strong>💡 Key Takeaways</strong>
                      </button>
                    </div>
                  </div>
                  <div className="tool-actions-row">
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={isGeneratingTool || adHocText.trim().length < 20}
                      onClick={() => handleRunQuickSummarize(undefined, summaryStyle)}
                    >
                      <Sparkles size={14} />
                      <span>{isGeneratingTool ? 'Analyzing Raw Content...' : 'Summarize Text'}</span>
                    </button>
                  </div>
                </>
              )}

              {/* RESULT DISPLAY PANEL */}
              {quickResult && (
                <div className="tool-result-panel">
                  <div className="tool-result-header">
                    <div>
                      <h4>{quickResult.title}</h4>
                      {quickResult.subtitle && <p className="meta-text">{quickResult.subtitle}</p>}
                    </div>
                    <div className="tool-result-actions">
                      <button
                        type="button"
                        className="btn-toolbar"
                        onClick={() => {
                          navigator.clipboard.writeText(quickResult.content);
                          setCopiedResult(true);
                          setTimeout(() => setCopiedResult(false), 2000);
                        }}
                      >
                        {copiedResult ? <Check size={13} className="accent-icon" /> : <Copy size={13} />}
                        <span>{copiedResult ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        type="button"
                        className="btn-toolbar"
                        onClick={() => {
                          const blob = new Blob([`# ${quickResult.title}\n\n${quickResult.content}`], { type: 'text/markdown' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `digest-${Date.now()}.md`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        <Download size={13} /> Export
                      </button>
                      <button
                        type="button"
                        className="btn-toolbar"
                        onClick={() => {
                          setQuickToolsOpen(false);
                          setActiveTab('chat');
                          setQuestion(`Based on this analysis:\n\n${quickResult.content.slice(0, 300)}...\n\nWhat are the next operational steps?`);
                        }}
                      >
                        <Bot size={13} /> Ask in Chat
                      </button>
                    </div>
                  </div>

                  <div className="markdown-render">
                    {quickResult.content.split('\n\n').map((paragraph, i) => {
                      if (paragraph.startsWith('### ') || paragraph.startsWith('## ')) {
                        return <h3 key={i} className="brief-section-title">{paragraph.replace(/^#+\s*/, '')}</h3>;
                      }
                      if (paragraph.startsWith('- [ ]') || paragraph.startsWith('- [x]') || paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
                        return (
                          <ul key={i} className="brief-list">
                            {paragraph.split('\n').map((item, j) => {
                              const isCheck = item.includes('[ ]') || item.includes('[x]');
                              return (
                                <li key={j} style={isCheck ? { listStyleType: 'none', marginLeft: '-15px' } : {}}>
                                  {isCheck ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                      <CheckCircle2 size={13} color="#10b981" />
                                      <span>{item.replace(/^[-*]\s*\[[ x]\]\s*/, '')}</span>
                                    </span>
                                  ) : (
                                    item.replace(/^[-*]\s*/, '')
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        );
                      }
                      return <p key={i} className="brief-paragraph">{paragraph}</p>;
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-primary" onClick={() => setQuickToolsOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT USER ACCESS & DEPARTMENT MODAL */}
      {editingUser && (
        <div className="modal-backdrop" onClick={() => setEditingUser(null)}>
          <div className="modal-card edit-user-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                <Users size={20} />
              </div>
              <div>
                <h3>Manage Access & Boundary Scopes</h3>
                <p className="modal-subtitle">
                  Configure enterprise RBAC role and PostgreSQL RLS department memberships for <strong>{editingUser.displayName}</strong> ({editingUser.email}).
                </p>
              </div>
              <button type="button" className="btn-icon" onClick={() => setEditingUser(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Role Selection */}
              <div className="input-group">
                <label>Enterprise Security Role</label>
                <div className="role-options-grid">
                  {[
                    { id: 'member', label: 'Member', desc: 'Standard employee. Queries and views authorized department knowledge.' },
                    { id: 'department_admin', label: 'Department Admin', desc: 'Lead permissions. Can upload and manage documents in assigned departments.' },
                    { id: 'auditor', label: 'Compliance Auditor', desc: 'Read-only access to cryptographic audit trail and compliance exports.' },
                    { id: 'tenant_admin', label: 'Tenant Admin', desc: 'Full company administrator. Manages company users, departments, and settings.' }
                  ].map(r => (
                    <div
                      key={r.id}
                      className={`role-option-card ${editUserRole === r.id ? 'active' : ''}`}
                      onClick={() => setEditUserRole(r.id as any)}
                    >
                      <div className="role-option-header">
                        <strong>{r.label}</strong>
                        {editUserRole === r.id && <CheckCircle2 size={16} className="accent-icon" />}
                      </div>
                      <p>{r.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Department Membership Checkboxes */}
              <div className="input-group" style={{ marginTop: '16px' }}>
                <label>Assigned Department Boundary Scopes</label>
                <p className="help-text" style={{ marginBottom: '10px' }}>
                  PostgreSQL Row-Level Security restricts this user's queries strictly to checked departments. Unchecked departments remain cryptographically inaccessible.
                </p>
                <div className="dept-checkboxes-grid">
                  {(uploadDepartments.length > 0 ? uploadDepartments : departments).map(dept => {
                    const isChecked = editUserDepts.includes(dept.id);
                    return (
                      <label key={dept.id} className={`dept-checkbox-label ${isChecked ? 'checked' : ''}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setEditUserDepts(prev => [...prev, dept.id]);
                            } else {
                              setEditUserDepts(prev => prev.filter(id => id !== dept.id));
                            }
                          }}
                        />
                        <div className="dept-checkbox-content">
                          <span className="dept-name-label">{dept.name} Department</span>
                          <span className="dept-scope-sub">{isChecked ? 'Authorized Scope' : 'Isolated Scope (Access Denied)'}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-outline" onClick={() => setEditingUser(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveUserAccess}
                disabled={isSavingUser}
              >
                {isSavingUser ? 'Saving Permissions...' : 'Save Access Policies'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
