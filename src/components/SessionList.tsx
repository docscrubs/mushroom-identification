import type { ConversationSession } from '@/types/conversation';

interface SessionListProps {
  sessions: ConversationSession[];
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onNewConversation: () => void;
}

function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getPreview(session: ConversationSession): string {
  const firstUserMsg = session.messages.find((m) => m.role === 'user');
  if (!firstUserMsg) return 'New conversation';
  const preview = firstUserMsg.content.slice(0, 60);
  return preview.length < firstUserMsg.content.length ? preview + '...' : preview;
}

export function SessionList({
  sessions,
  activeSessionId,
  onSelect,
  onNewConversation,
}: SessionListProps) {
  return (
    <div className="space-y-2">
      <button
        onClick={onNewConversation}
        className="w-full rounded-lg bg-green-700 px-4 py-2.5 text-sm text-white font-medium active:bg-green-800"
      >
        New Conversation
      </button>

      {sessions.length > 0 && (
        <div className="space-y-1">
          {sessions.map((session) => (
            <button
              key={session.session_id}
              onClick={() => onSelect(session.session_id)}
              className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                session.session_id === activeSessionId
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-stone-50 border border-stone-200 active:bg-stone-100'
              }`}
            >
              <p className="font-medium text-stone-800 truncate">
                {getPreview(session)}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-stone-400">
                  {formatDate(session.updated_at)}
                </span>
                {session.status === 'completed' && (
                  <span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
                    ended
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
