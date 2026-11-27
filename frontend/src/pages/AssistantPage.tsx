import React, { useState, useEffect, useRef } from 'react';
import {
  AlertCircle,
  BookOpen,
  Bot,
  ChevronDown,
  ChevronUp,
  Database,
  ExternalLink,
  Loader2,
  MessageSquareText,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  User as UserIcon,
  Wrench,
} from 'lucide-react';
import { chatService } from '@/services/api';
import {
  aiApi,
  type CopilotToolTrace,
  type RagCitation,
  type RagQueryResponse,
  type RagSourceDoc,
  type RagStatusResponse,
} from '@/services/aiApi';
import { Badge, Card, PageHeader } from '@/components/ui';
import type { ChatSession } from '@/types';

interface CopilotMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: RagCitation[];
  tools_used?: CopilotToolTrace[];
  llm_configured?: boolean;
  fallback_used?: boolean;
  fallback_reason?: string;
  configuration_error?: string;
  provider_error?: string;
  provider?: string;
  model?: string;
  created_at: string;
}

const TARGET_COPILOT_PROMPTS = [
  'Where did most of my money go this month?',
  'How much did I save?',
  'Why did my expenses increase?',
  'Can I afford a ₹40,000 laptop?',
  'What happens if my income decreases by 20%?',
  "Predict my next month's expenses.",
  'Explain SIP, mutual funds, NAV, and expense ratios.',
];

const RAG_STARTER_QUERIES = [
  'How are ELSS mutual funds taxed?',
  'What is expense ratio and exit load?',
  'RBI rules on UPI transaction disputes',
  'How does SIP rupee cost averaging work according to SEBI?',
  'How big should my emergency fund be under RBI guidelines?',
];

function RagStatusPanel({
  status,
  onAsk,
  loadFailed,
}: {
  status: RagStatusResponse | null;
  onAsk: (q: string) => void;
  loadFailed: boolean;
}) {
  return (
    <Card className="p-5 space-y-3.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          RAG System Status
        </h3>
        <Badge variant={status?.ready ? 'positive' : 'warning'}>
          {status ? (status.ready ? 'Ready' : 'Not indexed') : loadFailed ? 'Unavailable' : 'Checking...'}
        </Badge>
      </div>

      {status ? (
        <>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between gap-3">
              <span className="text-text-muted shrink-0">Engine</span>
              <span className="text-text-primary font-medium text-right">{status.engine_label}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-text-muted shrink-0">Retrieval</span>
              <span className="text-text-primary font-medium text-right">
                {status.retrieval_mode === 'dense_embeddings' ? 'Dense embeddings' : 'TF-IDF fallback'} ·{' '}
                {status.embedding_model}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-text-muted shrink-0">Synthesis LLM</span>
              <span className="text-text-primary font-medium text-right">
                {status.llm_configured ? status.llm_model : 'Not configured'}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-text-muted shrink-0">Indexed corpus</span>
              <span className="text-text-primary font-semibold text-right">
                {status.chunks_in_db} chunks · {status.total_documents} documents
              </span>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Indexed Indian regulatory sources
            </p>
            {status.organizations.map((org) => (
              <div
                key={org.organization}
                className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--bg)] border border-card-border"
              >
                <span className="text-[11px] font-semibold text-text-primary truncate" title={org.documents.join(' · ')}>
                  {org.organization}
                </span>
                <span className="text-[10px] font-mono text-primary shrink-0">{org.chunk_count} chunks</span>
              </div>
            ))}
          </div>

          <div className="space-y-1.5 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Try a sample question</p>
            <div className="flex flex-col gap-1.5">
              {status.sample_questions.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onAsk(q)}
                  className="text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-card border border-card-border hover:border-primary text-text-secondary hover:text-primary transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <p className="text-xs text-text-secondary">
          {loadFailed
            ? 'Could not load RAG status. Make sure you are signed in and FastAPI is running on port 8000.'
            : 'Loading RAG corpus status...'}
        </p>
      )}
    </Card>
  );
}

export default function AssistantPage() {
  const [activeTab, setActiveTab] = useState<'copilot' | 'rag'>('copilot');

  // Copilot state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // RAG Assistant state
  const [ragQuery, setRagQuery] = useState('');
  const [ragLoading, setRagLoading] = useState(false);
  const [ragResult, setRagResult] = useState<RagQueryResponse | null>(null);
  const [ragError, setRagError] = useState<string | null>(null);
  const [verifiedSources, setVerifiedSources] = useState<RagSourceDoc[]>([]);
  const [ragStatus, setRagStatus] = useState<RagStatusResponse | null>(null);
  const [ragStatusFailed, setRagStatusFailed] = useState(false);

  useEffect(() => {
    loadSessions();
    aiApi
      .getRagSources()
      .then((res) => setVerifiedSources(res.sources || []))
      .catch(() => {
        // non-blocking if backend offline
      });
    aiApi
      .getRagStatus()
      .then(setRagStatus)
      .catch(() => setRagStatusFailed(true));
  }, []);

  useEffect(() => {
    if (activeSession) {
      loadMessages(activeSession.id);
    }
  }, [activeSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadSessions() {
    try {
      const list = await chatService.listSessions();
      if (list.length > 0) {
        setSessions(list);
        if (!activeSession) setActiveSession(list[0]);
      } else {
        const created = await chatService.createSession('Financial Copilot Session');
        setSessions([created]);
        setActiveSession(created);
      }
    } catch (err) {
      console.error('Failed to load chat sessions:', err);
    }
  }

  async function loadMessages(sessionId: string) {
    const raw = localStorage.getItem(`finoracle_copilot_msgs_${sessionId}`);
    if (raw) {
      try {
        setMessages(JSON.parse(raw));
        return;
      } catch {
        // reset
      }
    }
    setMessages([
      {
        id: 'welcome',
        session_id: sessionId,
        role: 'assistant',
        content:
          'Welcome to FinOracle AI Copilot. Ask about your recorded spending, savings rate, ML expense forecast, unusual spending alerts, affordability checks, or Indian personal finance concepts (SEBI, RBI, AMFI, Income Tax). Every figure is computed deterministically from your verified account data.',
        created_at: new Date().toISOString(),
      },
    ]);
  }

  async function handleNewSession() {
    const created = await chatService.createSession(`Copilot Chat ${sessions.length + 1}`);
    setSessions([created, ...sessions]);
    setActiveSession(created);
  }

  async function handleDeleteSession(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await chatService.deleteSession(id);
    localStorage.removeItem(`finoracle_copilot_msgs_${id}`);
    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);
    if (activeSession?.id === id) {
      setActiveSession(remaining[0] || null);
    }
  }

  async function handleSendMessage(textToSend?: string) {
    const text = (textToSend ?? inputText).trim();
    if (!text || !activeSession || loading) return;

    setInputText('');
    setLoading(true);

    const userMessage: CopilotMessage = {
      id: `user-${Date.now()}`,
      session_id: activeSession.id,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);

    try {
      const res = await aiApi.copilotChat(activeSession.id, text);
      const aiMsg: CopilotMessage = {
        id: `ai-${Date.now()}`,
        session_id: activeSession.id,
        role: 'assistant',
        content: res.response,
        sources: res.sources,
        tools_used: res.tools_used,
        llm_configured: res.llm_configured,
        fallback_used: res.fallback_used,
        fallback_reason: res.fallback_reason,
        configuration_error: res.configuration_error,
        provider_error: res.provider_error,
        provider: res.provider,
        model: res.model,
        created_at: new Date().toISOString(),
      };
      const updated = [...nextMessages, aiMsg];
      setMessages(updated);
      localStorage.setItem(`finoracle_copilot_msgs_${activeSession.id}`, JSON.stringify(updated));
    } catch (err) {
      const errMsg: CopilotMessage = {
        id: `err-${Date.now()}`,
        session_id: activeSession.id,
        role: 'assistant',
        content:
          err instanceof Error
            ? `Unable to reach the AI Copilot backend: ${err.message}. Verify you are signed in and the FastAPI server is running on port 8000.`
            : 'Unable to reach the AI Copilot backend.',
        llm_configured: false,
        created_at: new Date().toISOString(),
      };
      const updated = [...nextMessages, errMsg];
      setMessages(updated);
      localStorage.setItem(`finoracle_copilot_msgs_${activeSession.id}`, JSON.stringify(updated));
    } finally {
      setLoading(false);
    }
  }

  async function handleRagSearch(q?: string) {
    const queryText = (q ?? ragQuery).trim();
    if (!queryText || ragLoading) return;
    setRagQuery(queryText);
    setRagLoading(true);
    setRagError(null);
    try {
      const res = await aiApi.queryRag(queryText, 4);
      setRagResult(res);
    } catch (err) {
      setRagError(err instanceof Error ? err.message : 'RAG retrieval failed.');
    } finally {
      setRagLoading(false);
    }
  }

  return (
    <div className="space-y-6 min-w-0 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="AI Financial Copilot & Grounded RAG"
          subtitle="Tool-calling personal finance assistant backed by deterministic Python calculations, ML models, and official Indian sources"
        />

        <div className="inline-flex bg-card border border-card-border rounded-xl p-1 text-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('copilot')}
            className={`px-3.5 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'copilot'
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            AI Financial Copilot
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rag')}
            className={`px-3.5 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'rag'
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            RAG Knowledge Assistant (RBI / SEBI / AMFI)
          </button>
        </div>
      </div>

      {/* Compact RAG corpus status strip (visible in both modes) */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2.5 rounded-xl bg-card border border-card-border text-[11px]">
        <span className="inline-flex items-center gap-1.5 font-bold text-primary">
          <Database className="w-3.5 h-3.5" /> RAG
        </span>
        {ragStatus ? (
          <>
            <span className="text-text-secondary">{ragStatus.engine_label}</span>
            <span className="text-text-secondary">
              <strong className="text-text-primary">{ragStatus.chunks_in_db}</strong> chunks indexed
            </span>
            <span className="flex flex-wrap gap-1">
              {ragStatus.organizations.map((o) => (
                <span
                  key={o.organization}
                  className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold text-[10px]"
                >
                  {o.organization}
                </span>
              ))}
            </span>
          </>
        ) : (
          <span className="text-text-muted">
            {ragStatusFailed ? 'RAG status unavailable — check sign-in and backend.' : 'Loading RAG status...'}
          </span>
        )}
        {activeTab === 'copilot' && (
          <button
            type="button"
            onClick={() => setActiveTab('rag')}
            className="ml-auto text-primary font-semibold hover:underline"
          >
            Open RAG Knowledge Assistant →
          </button>
        )}
      </div>

      {activeTab === 'copilot' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[740px]">
          {/* Sessions Sidebar */}
          <div className="hidden lg:flex lg:col-span-3 flex-col bg-card border border-card-border rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-card-border flex items-center justify-between">
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Sessions
              </span>
              <button
                onClick={handleNewSession}
                className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                title="New Session"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 no-scrollbar">
              {sessions.map((session) => {
                const isActive = activeSession?.id === session.id;
                return (
                  <div
                    key={session.id}
                    onClick={() => setActiveSession(session)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-primary border border-primary/25'
                        : 'text-text-secondary hover:text-text-primary hover:bg-[var(--bg)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <MessageSquareText className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{session.title}</span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="p-1 text-text-muted hover:text-negative"
                      title="Delete session"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-9 flex flex-col bg-card border border-card-border rounded-2xl overflow-hidden h-full">
            <div className="px-5 py-4 border-b border-card-border flex items-center justify-between bg-card">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">
                    {activeSession?.title || 'FinOracle AI Copilot'}
                  </h3>
                  <p className="text-[11px] text-text-muted flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    User-scoped JWT · 9 Typed Deterministic Tools · Grounded Citations
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                const hasSources = !!msg.sources && msg.sources.length > 0;
                const hasTools = !!msg.tools_used && msg.tools_used.length > 0;

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isUser
                          ? 'bg-primary text-white'
                          : 'bg-[var(--bg)] border border-card-border text-primary'
                      }`}
                    >
                      {isUser ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    <div className="max-w-[85%] space-y-2">
                      {!isUser && msg.fallback_used && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-medium text-amber-800">
                          <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>
                            Deterministic fallback · {msg.fallback_reason || 'LLM temporarily unavailable'}
                          </span>
                        </div>
                      )}
                      {!isUser && !msg.fallback_used && msg.model && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-medium text-primary">
                          <ShieldCheck className="w-3 h-3 shrink-0" />
                          <span>{msg.model} · Deterministic Tools</span>
                        </div>
                      )}

                      <div
                        className={`p-4 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                          isUser
                            ? 'bg-primary text-white rounded-tr-none'
                            : 'bg-[var(--bg)] border border-card-border text-text-primary rounded-tl-none'
                        }`}
                      >
                        {msg.content}
                      </div>

                      {/* Tool Execution Transparency Drawer */}
                      {hasTools && (
                        <div className="bg-card border border-card-border rounded-xl p-2.5 text-[11px]">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedTools((prev) => ({ ...prev, [msg.id]: !prev[msg.id] }))
                            }
                            className="flex items-center justify-between w-full text-text-secondary hover:text-text-primary font-semibold"
                          >
                            <span className="flex items-center gap-1.5 text-primary">
                              <Wrench className="w-3.5 h-3.5" />
                              Backend Tools Executed ({msg.tools_used?.length})
                            </span>
                            {expandedTools[msg.id] ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {msg.tools_used?.map((t, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md bg-[var(--bg)] border border-card-border font-mono text-[10px] text-text-primary"
                              >
                                {t.tool_name}
                              </span>
                            ))}
                          </div>

                          {expandedTools[msg.id] && (
                            <div className="mt-2.5 pt-2.5 border-t border-card-border space-y-2">
                              {msg.tools_used?.map((t, idx) => (
                                <div
                                  key={idx}
                                  className="p-2.5 rounded-lg bg-[var(--bg)] border border-card-border space-y-1"
                                >
                                  <p className="font-mono font-bold text-text-primary">
                                    {t.tool_name}({JSON.stringify(t.arguments)})
                                  </p>
                                  <pre className="text-[10px] text-text-secondary overflow-x-auto max-h-40 whitespace-pre-wrap">
                                    {JSON.stringify(t.result, null, 2)}
                                  </pre>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Verified Citations Drawer */}
                      {hasSources && (
                        <div className="bg-card border border-card-border rounded-xl p-2.5 text-[11px]">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedSources((prev) => ({ ...prev, [msg.id]: !prev[msg.id] }))
                            }
                            className="flex items-center justify-between w-full text-text-secondary hover:text-text-primary font-semibold"
                          >
                            <span className="flex items-center gap-1.5 text-primary">
                              <BookOpen className="w-3.5 h-3.5" />
                              Verified Official Citations ({msg.sources?.length})
                            </span>
                            {expandedSources[msg.id] ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {expandedSources[msg.id] && (
                            <div className="mt-2 space-y-2 pt-2 border-t border-card-border">
                              {msg.sources?.map((src, i) => (
                                <div key={i} className="p-2.5 bg-[var(--bg)] rounded-lg space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-text-primary">
                                      {src.source_title || src.title}
                                    </span>
                                    <span className="text-[10px] text-primary font-mono shrink-0">
                                      {((src.similarity ?? src.relevance_score ?? 0) * 100).toFixed(0)}% match
                                    </span>
                                  </div>
                                  <p className="text-text-secondary">{src.chunk_text}</p>
                                  <div className="flex items-center justify-between text-[10px] text-text-muted pt-1">
                                    <span>
                                      {src.organization} · {src.section} · {src.publication_or_retrieval_date}
                                    </span>
                                    {src.url && (
                                      <a
                                        href={src.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
                                      >
                                        Official Source <ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[var(--bg)] border border-card-border flex items-center justify-center text-primary">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="bg-[var(--bg)] border border-card-border px-3.5 py-2.5 rounded-2xl text-xs text-text-secondary">
                    Executing authenticated tools & synthesizing grounded response...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Target Starter Prompts */}
            <div className="px-4 py-2 border-t border-card-border bg-[var(--bg)]/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-bold uppercase text-text-muted shrink-0">Try:</span>
              {TARGET_COPILOT_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  className="text-[11px] bg-card hover:border-primary text-text-secondary hover:text-text-primary px-2.5 py-1 rounded-lg border border-card-border whitespace-nowrap transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="p-4 border-t border-card-border bg-card">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ask about your spending, savings, forecast, affordability, or SIP/mutual funds..."
                  className="input-field flex-1 text-xs py-2.5"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !inputText.trim()}
                  className="btn-primary p-2.5 rounded-xl disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* Dedicated RAG Financial Knowledge Assistant Tab */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-5">
            <Card className="p-5 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  Semantic Indian Financial Knowledge Search (SQLite + NumPy RAG)
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Answers are strictly grounded in official RBI, SEBI, AMFI, NCFE, Income Tax Department, and PFRDA documents.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRagSearch();
                }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={ragQuery}
                    onChange={(e) => setRagQuery(e.target.value)}
                    placeholder="Ask about SIP, NAV, Expense Ratio, ELSS, Section 80C, LTCG, Emergency Funds, NPS..."
                    className="input-field pl-9 text-xs py-2.5"
                  />
                </div>
                <button
                  type="submit"
                  disabled={ragLoading || !ragQuery.trim()}
                  className="btn-primary text-xs px-5"
                >
                  {ragLoading ? 'Searching...' : 'Ask RAG'}
                </button>
              </form>

              <div className="flex flex-wrap gap-1.5">
                {RAG_STARTER_QUERIES.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleRagSearch(q)}
                    className="text-[11px] bg-[var(--bg)] hover:border-primary border border-card-border px-2.5 py-1 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </Card>

            {ragError && (
              <Card className="p-4 border-negative/30 bg-negative/5 text-xs text-negative">
                {ragError}
              </Card>
            )}

            {ragResult && (
              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-sm font-bold text-text-primary">Grounded Answer</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant={ragResult.sufficient_context ? 'positive' : 'warning'}>
                      {ragResult.sufficient_context ? 'Verified Context Found' : 'Insufficient Verified Context'}
                    </Badge>
                    {ragResult.retrieval_mode && (
                      <Badge variant="default">{ragResult.retrieval_mode}</Badge>
                    )}
                  </div>
                </div>

                {!ragResult.sufficient_context && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Not in the indexed corpus.</strong> No excerpt from the indexed RBI, SEBI, AMFI, NCFE,
                      Income Tax Department or PFRDA documents cleared the similarity threshold, so FinOracle AI will
                      not guess an answer.
                    </span>
                  </div>
                )}

                {ragResult.fallback_used && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-medium text-amber-800">
                    <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>Showing verified source excerpts · {ragResult.fallback_reason || 'LLM temporarily unavailable'}</span>
                  </div>
                )}

                {!ragResult.llm_configured && ragResult.configuration_error && (
                  <div className="p-3 rounded-xl bg-warning/10 border border-warning/30 text-xs text-text-primary">
                    <strong>LLM Configuration Required:</strong> {ragResult.configuration_error}
                  </div>
                )}

                {ragResult.provider_error && !ragResult.fallback_used && (
                  <div className="p-3 rounded-xl bg-warning/10 border border-warning/30 text-xs text-text-primary">
                    <strong>LLM Provider Notice:</strong> {ragResult.provider_error}
                  </div>
                )}

                {(ragResult.answer || ragResult.retrieved_excerpts_summary) && (
                  <div className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap bg-[var(--bg)] p-4 rounded-xl border border-card-border">
                    {ragResult.answer || ragResult.retrieved_excerpts_summary}
                  </div>
                )}

                {ragResult.citations.length > 0 && (
                  <div className="space-y-2.5 pt-2">
                    <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                      Source Citations ({ragResult.citations.length})
                    </h4>
                    {ragResult.citations.map((cit) => (
                      <div
                        key={cit.chunk_id}
                        className="p-4 rounded-xl bg-card border border-card-border border-l-4 border-l-primary space-y-2 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-text-primary">
                              [{cit.index}] {cit.source_title}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px]">
                              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                                {cit.organization}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-[var(--bg)] border border-card-border text-text-secondary">
                                Section: {cit.section}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-[var(--bg)] border border-card-border text-text-secondary">
                                Date: {cit.publication_or_retrieval_date}
                              </span>
                            </div>
                          </div>
                          <Badge variant="positive">{(cit.similarity * 100).toFixed(0)}% similarity</Badge>
                        </div>
                        <p className="text-xs text-text-secondary leading-relaxed">{cit.chunk_text}</p>
                        {cit.url && (
                          <a
                            href={cit.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                          >
                            Verify on {cit.organization} <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-[11px] text-text-muted border-t border-card-border pt-3">
                  {ragResult.disclaimer}
                </p>
              </Card>
            )}
          </div>

          <div className="lg:col-span-4 space-y-4">
            <RagStatusPanel status={ragStatus} onAsk={handleRagSearch} loadFailed={ragStatusFailed} />
            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-bold text-text-primary">Authoritative Corpus Sources</h3>
              <p className="text-xs text-text-secondary">
                FinOracle AI restricts RAG citations strictly to official Indian public institutions:
              </p>
              <div className="space-y-2.5">
                {verifiedSources.map((src) => (
                  <div
                    key={src.source_title}
                    className="p-3 rounded-xl bg-[var(--bg)] border border-card-border space-y-1"
                  >
                    <p className="text-xs font-bold text-text-primary">{src.organization}</p>
                    <p className="text-[11px] text-text-secondary">{src.source_title}</p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {src.sections.map((sec) => (
                        <span
                          key={sec}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-card border border-card-border text-text-muted"
                        >
                          {sec}
                        </span>
                      ))}
                    </div>
                    {src.url && (
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline pt-1"
                      >
                        Official Portal <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
