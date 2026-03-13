import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Bot,
  Send,
  Sparkles,
  Trash2,
  MessageSquare,
  Loader2,
  ShieldCheck,
  Plus,
} from "lucide-react";
import {
  createAssistantSession,
  getAssistantHistory,
  sendAssistantMessage,
  deleteAssistantSession,
} from "../services/assistantService";

const STORAGE_KEY = "crm_assistant_active_session_v1";

const QUICK_PROMPTS = [
  "Show me conversion rate by stage for this month",
  "Which contacts are most likely to close this week?",
  "Summarize overdue follow-ups by owner",
  "What changed in pipeline since last week?",
];

const formatTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const parseStoredSessionToken = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw || "";
  } catch {
    return "";
  }
};

const AssistantBubble = ({ message }) => {
  const isAssistant = message.role === "assistant";
  return (
    <div className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[90%] rounded-2xl px-4 py-3 shadow-sm ${
          isAssistant ? "bg-white border border-slate-200 text-slate-800" : "bg-sky-600 text-white"
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        {isAssistant && message.query && (
          <div className="mt-3 rounded-xl bg-slate-900 text-slate-100 p-3 overflow-x-auto">
            <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Generated Query</p>
            <pre className="text-xs whitespace-pre-wrap">{message.query}</pre>
          </div>
        )}
        {isAssistant && message.insight && (
          <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3">
            <p className="text-[11px] uppercase tracking-wide text-emerald-700 mb-1">Insight</p>
            <p className="text-sm text-emerald-900 whitespace-pre-wrap">{message.insight}</p>
          </div>
        )}
        <p className={`mt-2 text-[11px] ${isAssistant ? "text-slate-400" : "text-sky-100"}`}>
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
};

const AIAssistantPage = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  const [activeToken, setActiveToken] = useState("");
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [loadingSession, setLoadingSession] = useState(false);
  const [sending, setSending] = useState(false);
  const [executeQuery, setExecuteQuery] = useState(true);
  const [generateInsight, setGenerateInsight] = useState(true);
  const [error, setError] = useState("");

  const endRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const token = parseStoredSessionToken();
    if (token) setActiveToken(token);
  }, []);

  useEffect(() => {
    if (activeToken) {
      localStorage.setItem(STORAGE_KEY, activeToken);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [activeToken]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const loadHistory = useCallback(async (token) => {
    setLoadingSession(true);
    setError("");
    try {
      const data = await getAssistantHistory(token);
      setMessages(data.messages || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load session history.");
      setMessages([]);
    } finally {
      setLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    if (!activeToken) {
      setMessages([]);
      return;
    }
    loadHistory(activeToken);
  }, [activeToken, loadHistory]);

  const handleCreateSession = useCallback(async () => {
    setError("");
    setLoadingSession(true);
    try {
      const data = await createAssistantSession({
        queryType: "mysql",
        systemInstructions: "Be concise and explain assumptions before final answers.",
      });

      setActiveToken(data.sessionToken);
      setMessages([]);
      setTimeout(() => textareaRef.current?.focus(), 0);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not create assistant session.");
    } finally {
      setLoadingSession(false);
    }
  }, []);

  const handleDeleteSession = useCallback(async () => {
    if (!activeToken) return;

    try {
      await deleteAssistantSession(activeToken);
    } catch {
      // Ignore delete errors and still clear local state.
    }

    setActiveToken("");
    setMessages([]);
    setPrompt("");
  }, [activeToken]);

  const handleSend = useCallback(async () => {
    if (!activeToken || !prompt.trim() || sending) return;

    const userText = prompt.trim();
    const optimistic = {
      role: "user",
      content: userText,
      query: null,
      query_result: null,
      insight: null,
      timestamp: new Date().toISOString(),
    };

    setPrompt("");
    setSending(true);
    setError("");
    setMessages((prev) => [...prev, optimistic]);

    try {
      const data = await sendAssistantMessage(activeToken, {
        message: userText,
        executeQuery,
        generateInsight,
      });

      if (data?.response) {
        setMessages((prev) => [...prev, data.response]);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  }, [activeToken, prompt, executeQuery, generateInsight, sending]);

  const handleQuickPrompt = useCallback(
    (value) => {
      setPrompt(value);
      setTimeout(() => textareaRef.current?.focus(), 0);
    },
    []
  );

  return (
    <div className="h-full bg-slate-50 p-3 sm:p-4 lg:p-5">
      <div className="h-full rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col overflow-hidden">
        <header className="px-4 sm:px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 flex items-center gap-2">
              <Bot className={`w-6 h-6 ${isAdmin ? "text-orange-600" : "text-sky-600"}`} />
              AI Assistant
            </h1>
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> Conversational CRM assistant for insights and operational tasks
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateSession}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl text-white ${isAdmin ? "bg-orange-600 hover:bg-orange-700" : "bg-sky-600 hover:bg-sky-700"}`}
            >
              <Plus className="w-4 h-4" /> New Chat
            </button>
            <button
              onClick={handleDeleteSession}
              disabled={!activeToken}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border border-slate-300 text-slate-600 hover:bg-white disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4" /> End Session
            </button>
          </div>
        </header>

        <div className="px-4 sm:px-5 py-2.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Sparkles className="w-3.5 h-3.5" />
              Read-only mode and tenant-safe guardrails enabled
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <label className="inline-flex items-center gap-1.5">
                <input type="checkbox" checked={executeQuery} onChange={(e) => setExecuteQuery(e.target.checked)} />
                Execute
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input type="checkbox" checked={generateInsight} onChange={(e) => setGenerateInsight(e.target.checked)} />
                Insight
              </label>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/70">
            {!activeToken && (
              <div className="h-full grid place-items-center text-center">
                <div className="max-w-md">
                  <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-700 font-medium">Start a new conversation</p>
                  <p className="text-sm text-slate-500 mt-1">Ask naturally, like you would in ChatGPT or Gemini.</p>
                  <button
                    onClick={handleCreateSession}
                    className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white ${isAdmin ? "bg-orange-600 hover:bg-orange-700" : "bg-sky-600 hover:bg-sky-700"}`}
                  >
                    <Plus className="w-4 h-4" /> Start Chat
                  </button>
                </div>
              </div>
            )}

            {activeToken && messages.length === 0 && !loadingSession && (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">Try one of these:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {QUICK_PROMPTS.map((item) => (
                    <button
                      key={item}
                      onClick={() => handleQuickPrompt(item)}
                      className="text-left rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loadingSession && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading conversation...
              </div>
            )}

            {messages.map((m, idx) => (
              <AssistantBubble key={`${m.timestamp || idx}-${idx}`} message={m} />
            ))}

            {sending && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
              </div>
            )}

            <div ref={endRef} />
        </div>

        <footer className="p-3 sm:p-4 border-t border-slate-100 bg-white">
            {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={2}
                placeholder={activeToken ? "Message AI Assistant..." : "Click 'New Chat' to begin"}
                className="flex-1 resize-none border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                disabled={!activeToken || sending}
              />
              <button
                onClick={handleSend}
                disabled={!activeToken || sending || !prompt.trim()}
                className={`h-11 px-4 rounded-xl text-white inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isAdmin ? "bg-orange-600 hover:bg-orange-700" : "bg-sky-600 hover:bg-sky-700"
                }`}
              >
                <Send className="w-4 h-4" /> Send
              </button>
            </div>
        </footer>
      </div>
    </div>
  );
};

export default AIAssistantPage;
