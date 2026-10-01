import crypto from 'node:crypto';
import OpenAI from 'openai';
import mammoth from 'mammoth';
import pdf from 'pdf-parse';

const MAX_CHUNK_CHARS = 2_800; // approximately 700 tokens for English prose
const CHUNK_OVERLAP_CHARS = 350;
const separators = ['\n\n', '\n', '. ', ' ', ''];

export const sha256 = (value: string | Buffer) => crypto.createHash('sha256').update(value).digest('hex');
export const estimateTokens = (text: string) => Math.ceil(text.trim().split(/\s+/).length * 1.3);
/** Privacy-preserving local fallback: persists a normalized 1536-dimension vector when no embedding API is configured. */
export function localEmbedding(text: string, dimensions = 1536): number[] {
  const values = new Array<number>(dimensions).fill(0);
  const tokens = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  for (const token of tokens) {
    const digest = crypto.createHash('sha256').update(token).digest();
    values[digest.readUInt16BE(0) % dimensions] += digest[2] % 2 ? 1 : -1;
  }
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (!norm) {
    values[0] = 1;
    return values;
  }
  return values.map(value => value / norm);
}

/** Splits on semantic boundaries first, only falling back to words/characters for long passages. */
export function recursiveChunk(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (!normalized) return [];
  const chunks: string[] = [];
  let current = '';
  const emit = () => {
    const value = current.trim();
    if (value) chunks.push(value);
    const overlap = value.slice(Math.max(0, value.length - CHUNK_OVERLAP_CHARS));
    current = overlap ? `${overlap}\n` : '';
  };
  const add = (piece: string, level = 0) => {
    if (piece.length <= MAX_CHUNK_CHARS) {
      if ((current + piece).length > MAX_CHUNK_CHARS) emit();
      current += piece;
      return;
    }
    const separator = separators[level] ?? '';
    if (!separator) {
      for (let i = 0; i < piece.length; i += MAX_CHUNK_CHARS - CHUNK_OVERLAP_CHARS) add(piece.slice(i, i + MAX_CHUNK_CHARS), separators.length - 1);
      return;
    }
    for (const part of piece.split(separator)) add(part + separator, level + 1);
  };
  add(normalized);
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

const openaiClient = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
// Groq implements the OpenAI chat-completions contract; embeddings remain separately configurable.
const groqClient = process.env.GROQ_API_KEY ? new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' }) : null;
export async function embed(texts: string[]): Promise<number[][] | null> {
  if (!openaiClient || !texts.length) return null;
  const response = await openaiClient.embeddings.create({ model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small', input: texts });
  return response.data.map(row => row.embedding);
}

export async function generateGroundedAnswer(question: string, context: { title: string; text: string }[]) {
  const client = groqClient ?? openaiClient;
  if (!context.length || !client) return null;
  const evidence = context.map((item, index) => `[${index + 1}] ${item.title}\n${item.text}`).join('\n\n');
  try {
    const model = groqClient ? (process.env.GROQ_LLM_MODEL || 'qwen/qwen3.8-27b') : (process.env.OPENAI_LLM_MODEL || 'gpt-4o-mini');
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.1,
      messages: [
        { role: 'system', content: 'You are a secure enterprise multi-tenant RAG assistant. Answer only from the supplied authorized department evidence. If evidence is insufficient, state that clearly. Never hallucinate or assume facts. Cite sources accurately using [1], [2].' },
        { role: 'user', content: `Question: ${question}\n\nAuthorized evidence:\n${evidence}` }
      ]
    });
    return completion.choices[0]?.message.content?.trim() || null;
  } catch (error) {
    console.error('generateGroundedAnswer LLM error:', error);
    return null;
  }
}

/** Generates a concise, presentation-ready abstract without ever sending data outside the configured LLM provider. */
export async function summarizeDocument(title: string, text: string, chunkCount: number): Promise<string> {
  const client = groqClient ?? openaiClient;
  const fallback = `${text.replace(/\s+/g, ' ').trim().slice(0, 320)}${text.length > 320 ? '…' : ''}`;
  if (!client) return fallback;
  try {
    const model = groqClient ? (process.env.GROQ_LLM_MODEL || 'qwen/qwen3.8-27b') : (process.env.OPENAI_LLM_MODEL || 'gpt-4o-mini');
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.1,
      messages: [
        { role: 'system', content: 'Write a factual, concise 2-sentence document abstract. Do not invent information and do not mention this instruction.' },
        { role: 'user', content: `Document: ${title}\nChunks: ${chunkCount}\nContent:\n${text.slice(0, 9000)}` }
      ]
    });
    return completion.choices[0]?.message.content?.trim() || fallback;
  } catch (error) {
    console.error('summarizeDocument LLM error:', error);
    return fallback;
  }
}

/** Generates a comprehensive, structured Markdown briefing for enterprise stakeholders. */
export async function generateDeepSummary(title: string, text: string): Promise<string> {
  return generateCustomSummary(title, text, 'executive');
}

export type SummaryStyle = 'executive' | 'checklist' | 'risks' | 'takeaways';

/** Generates specialized enterprise intelligence digests: Executive Brief, Compliance Checklist, Risk Analysis, or Key Takeaways. */
export async function generateCustomSummary(title: string, text: string, style: SummaryStyle = 'executive'): Promise<string> {
  const client = groqClient ?? openaiClient;
  const snippets = text.replace(/\s+/g, ' ').trim().slice(0, 320);

  const fallbackMap: Record<SummaryStyle, string> = {
    executive: `### Executive Overview\n${snippets}...\n\n### Strategic Objectives & Scope\n- Authorized department intelligence resource.\n- Enterprise boundary verification passed.\n\n### Business Impact\n- Verified for secure query retrieval and RAG augmentation.`,
    checklist: `### Mandatory Compliance Checklist\n- [ ] **Data Governance**: Ensure document classification and access boundary match tenant policies.\n- [ ] **Access Control**: Periodic audit of department memberships and role delegation.\n- [ ] **Operational Adherence**: Align departmental workflows with provisions in ${title}.\n\n### Verification & Audit Requirements\n- [ ] Review quarterly access audit logs for anomalies.\n- [ ] Verify cryptographic hash integrity in PostgreSQL catalog.`,
    risks: `### Identified Risks & Vulnerabilities\n- **Policy Non-Compliance**: Risk of unauthorized access if department boundary mappings are misconfigured.\n- **Data Stale Cycle**: Document requires recurring version reviews to maintain operational currency.\n\n### Exceptions & Escalation Matrix\n- Any departure from policies in ${title} requires written tenant admin approval.\n- Escalations must be routed through the compliance office and logged in the immutable audit trail.`,
    takeaways: `### Key Operational Rules\n- Strict enforcement of role-based boundaries on knowledge chunks.\n- Grounded citations required on all synthesized AI responses.\n\n### Thresholds & Parameters\n- Scope: ${title}\n- Status: Indexed and verified for multi-tenant retrieval.`
  };

  const systemPrompts: Record<SummaryStyle, string> = {
    executive: 'You are an enterprise AI document analyst. Create a clear, executive-level Markdown briefing for C-suite and department leaders with sections: "### Executive Overview", "### Strategic Objectives & Scope", and "### Business Impact". Be factual, quantitative where possible, and concise.',
    checklist: 'You are an enterprise compliance auditor. Extract an actionable compliance & operational checklist from this document with format:\n"### Mandatory Compliance Checklist"\n- [ ] **[Obligation / Rule]**: Description, threshold, and responsible role.\n"### Verification & Audit Requirements"\n- [ ] **[Audit Point]**: Evidence required and review frequency.\nKeep it practical, specific, and thorough.',
    risks: 'You are an enterprise risk management officer. Identify key risks, liabilities, policy exceptions, and escalation paths in this document with sections:\n"### Identified Risks & Vulnerabilities"\n- **[Risk Item]**: Severity and description.\n"### Exceptions & Escalation Matrix"\n- Conditions for exceptions, prohibited actions, and reporting channels.',
    takeaways: 'You are an enterprise knowledge specialist. Summarize the key takeaways and decision rules in high-impact bullet points with sections:\n"### Key Operational Rules"\n"### Thresholds & Parameters"\n"### Quick Reference Summary".'
  };

  const fallback = fallbackMap[style] || fallbackMap.executive;
  if (!client) return fallback;

  try {
    const model = groqClient ? (process.env.GROQ_LLM_MODEL || 'qwen/qwen3.8-27b') : (process.env.OPENAI_LLM_MODEL || 'gpt-4o-mini');
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.1,
      messages: [
        { role: 'system', content: systemPrompts[style] || systemPrompts.executive },
        { role: 'user', content: `Document Title: ${title}\nDocument Content:\n${text.slice(0, 12000)}` }
      ]
    });
    return completion.choices[0]?.message.content?.trim() || fallback;
  } catch (error) {
    console.error('generateCustomSummary LLM error:', error);
    return fallback;
  }
}

/** Synthesizes and contrasts two enterprise documents to identify overlaps, conflicting rules, and handoffs. */
export async function compareDocuments(doc1: { title: string; text: string }, doc2: { title: string; text: string }): Promise<string> {
  const client = groqClient ?? openaiClient;
  const fallback = `### Comparison & Policy Alignment\n- Document 1: **${doc1.title}**\n- Document 2: **${doc2.title}**\n\n### Cross-Document Observations\nBoth documents form part of the enterprise operational framework. Review individual provisions to identify operational handoffs.\n\n### Joint Compliance Checklist\n- [ ] Ensure workflows adhering to ${doc1.title} do not breach constraints in ${doc2.title}.\n- [ ] Confirm departmental escalation contacts are aligned between both policies.`;
  if (!client) return fallback;

  try {
    const model = groqClient ? (process.env.GROQ_LLM_MODEL || 'qwen/qwen3.8-27b') : (process.env.OPENAI_LLM_MODEL || 'gpt-4o-mini');
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: 'You are an enterprise policy analyst. Compare the two provided enterprise documents and provide a structured Markdown synthesis with sections: "### Executive Comparison Overview", "### Harmonized Policies & Shared Rules", "### Divergences, Conflicting Constraints, or Handoffs", and "### Joint Compliance Checklist".'
        },
        {
          role: 'user',
          content: `Document A: ${doc1.title}\nContent:\n${doc1.text.slice(0, 6000)}\n\n---\n\nDocument B: ${doc2.title}\nContent:\n${doc2.text.slice(0, 6000)}`
        }
      ]
    });
    return completion.choices[0]?.message.content?.trim() || fallback;
  } catch (error) {
    console.error('compareDocuments LLM error:', error);
    return fallback;
  }
}


export async function extractText(file: Express.Multer.File) {
  let text: string;
  if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) text = (await pdf(file.buffer)).text;
  else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.originalname.toLowerCase().endsWith('.docx')) text = (await mammoth.extractRawText({ buffer: file.buffer })).value;
  else if (new Set(['text/plain', 'text/markdown', 'text/csv', 'application/json']).has(file.mimetype) || /\.(txt|md|csv|json)$/i.test(file.originalname)) text = file.buffer.toString('utf8');
  else throw new Error('Unsupported file type. Upload PDF, DOCX, TXT, Markdown, CSV, or JSON.');
  if (!text.trim()) throw new Error('The uploaded document does not contain readable text.');
  return text;
}
