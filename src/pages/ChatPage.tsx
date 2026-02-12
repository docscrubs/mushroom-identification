import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChatBubble } from '@/components/ChatBubble';
import { ChatInput } from '@/components/ChatInput';
import { SessionList } from '@/components/SessionList';
import { SafetyDisclaimer } from '@/components/SafetyDisclaimer';
import { useAppStore } from '@/stores/app-store';
import { db } from '@/db/database';
import {
  startConversation,
  sendMessage,
  endConversation,
  getSession,
  listSessions,
} from '@/llm/conversation';
import type { ConversationSession } from '@/types/conversation';

export function ChatPage() {
  const isOnline = useAppStore((s) => s.isOnline);
  const hasApiKey = useAppStore((s) => s.hasApiKey);

  const [activeSession, setActiveSession] = useState<ConversationSession | null>(null);
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const refreshSessions = useCallback(async () => {
    const all = await listSessions(db);
    setSessions(all);
  }, []);

  // Load sessions on mount
  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages.length]);

  async function handleNewConversation() {
    const session = await startConversation(db);
    setActiveSession(session);
    setError(null);
    setShowSidebar(false);
    setShowFeedback(false);
    await refreshSessions();
  }

  async function handleSelectSession(sessionId: string) {
    const session = await getSession(db, sessionId);
    if (session) {
      setActiveSession(session);
      setError(null);
    }
    setShowSidebar(false);
  }

  async function handleSend(text: string, photos: string[]) {
    if (!activeSession) {
      // Auto-create a session on first message
      const session = await startConversation(db);
      setActiveSession(session);
      await refreshSessions();
      await doSend(session.session_id, text, photos);
    } else {
      await doSend(activeSession.session_id, text, photos);
    }
  }

  async function doSend(sessionId: string, text: string, photos: string[]) {
    setLoading(true);
    setError(null);

    const result = await sendMessage(
      db,
      sessionId,
      text,
      photos.length > 0 ? photos : undefined,
    );

    if (result.ok) {
      setActiveSession(result.session);
    } else {
      // Update session to show user message even on error
      const session = await getSession(db, sessionId);
      if (session) setActiveSession(session);
      setError(result.message);
    }

    setLoading(false);
    await refreshSessions();
  }

  async function handleEndConversation() {
    if (!activeSession) return;
    await endConversation(db, activeSession.session_id);
    const updated = await getSession(db, activeSession.session_id);
    if (updated) setActiveSession(updated);
    setShowFeedback(true);
    await refreshSessions();
  }

  function handleFeedback(_helpful: boolean) {
    setShowFeedback(false);
  }

  // Offline state
  if (!isOnline) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-green-900">Identify</h1>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 space-y-2">
          <p className="text-sm font-medium text-amber-800">You're offline</p>
          <p className="text-xs text-amber-600">
            Chat identification requires an internet connection.
            Use offline identification for genus-level results.
          </p>
          <Link
            to="/identify"
            className="inline-block rounded-lg bg-amber-600 px-4 py-2 text-sm text-white font-medium active:bg-amber-700 mt-2"
          >
            Offline Identification
          </Link>
        </div>
      </div>
    );
  }

  // No API key
  if (!hasApiKey) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-green-900">Identify</h1>
        <div className="rounded-lg bg-violet-50 border border-violet-200 p-4 space-y-2">
          <p className="text-sm font-medium text-violet-800">API key required</p>
          <p className="text-xs text-violet-600">
            Set up your z.ai API key in Settings to use chat identification.
          </p>
          <Link
            to="/settings"
            className="inline-block rounded-lg bg-violet-600 px-4 py-2 text-sm text-white font-medium active:bg-violet-700 mt-2"
          >
            Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200">
        <h1 className="text-lg font-bold text-green-900">
          {activeSession ? 'Identifying...' : 'Identify'}
        </h1>
        <div className="flex gap-2">
          {activeSession && activeSession.status === 'active' && (
            <button
              onClick={handleEndConversation}
              className="text-xs text-stone-500 px-2 py-1 rounded active:bg-stone-100"
            >
              End
            </button>
          )}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="text-xs text-stone-500 px-2 py-1 rounded active:bg-stone-100"
            aria-label="Toggle session list"
          >
            History
          </button>
        </div>
      </div>

      {/* Sidebar overlay */}
      {showSidebar && (
        <div className="py-3 border-b border-stone-200">
          <SessionList
            sessions={sessions}
            activeSessionId={activeSession?.session_id ?? null}
            onSelect={handleSelectSession}
            onNewConversation={handleNewConversation}
          />
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3">
        {!activeSession || activeSession.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
            <p className="text-stone-400 text-sm">
              Describe a mushroom you've found, and I'll help identify it.
            </p>
            <p className="text-stone-300 text-xs">
              You can include photos, mention habitat, cap shape, gill type, or any features you notice.
            </p>
            <SafetyDisclaimer compact />
          </div>
        ) : (
          <>
            {activeSession.messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-stone-100 border border-stone-200 rounded-lg px-3 py-2">
                  <span className="flex gap-1">
                    <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {showFeedback && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center space-y-2">
            <p className="text-sm text-green-800">Was this identification helpful?</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => handleFeedback(true)}
                className="px-4 py-1.5 text-sm rounded-lg bg-green-600 text-white active:bg-green-700"
              >
                Yes
              </button>
              <button
                onClick={() => handleFeedback(false)}
                className="px-4 py-1.5 text-sm rounded-lg bg-stone-200 text-stone-700 active:bg-stone-300"
              >
                Not really
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        loading={loading}
        disabled={activeSession?.status === 'completed'}
      />
    </div>
  );
}
