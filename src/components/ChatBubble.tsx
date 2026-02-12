import React from 'react';
import type { ConversationMessage } from '@/types/conversation';

interface ChatBubbleProps {
  message: ConversationMessage;
}

/**
 * Simple regex-based markdown renderer.
 * Handles: headers (##), bold (**), italic (*), unordered lists (-), and line breaks.
 */
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let codeBlockLines: string[] | null = null;

  function flushList() {
    if (listItems.length > 0) {
      nodes.push(
        <ul key={`ul-${nodes.length}`} className="list-disc pl-4 space-y-1">
          {listItems}
        </ul>,
      );
      listItems = [];
    }
  }

  function flushCodeBlock() {
    if (codeBlockLines !== null) {
      nodes.push(
        <pre key={`code-${nodes.length}`} className="bg-stone-800 text-stone-100 rounded p-2 text-xs overflow-x-auto whitespace-pre-wrap">
          <code>{codeBlockLines.join('\n')}</code>
        </pre>,
      );
      codeBlockLines = null;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    // Code block fences
    if (line.startsWith('```')) {
      if (codeBlockLines !== null) {
        flushCodeBlock();
      } else {
        flushList();
        codeBlockLines = [];
      }
      continue;
    }

    // Inside code block — collect lines verbatim
    if (codeBlockLines !== null) {
      codeBlockLines.push(line);
      continue;
    }

    // Headers
    const headerMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headerMatch) {
      flushList();
      const level = headerMatch[1]!.length as 1 | 2 | 3 | 4;
      const text = headerMatch[2]!;
      const heading = React.createElement(
        `h${level}`,
        { key: i, className: 'font-semibold mt-2 first:mt-0' },
        ...renderInline(text),
      );
      nodes.push(heading);
      continue;
    }

    // List items
    const listMatch = line.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      listItems.push(<li key={i}>{renderInline(listMatch[1]!)}</li>);
      continue;
    }

    // Numbered list items
    const numListMatch = line.match(/^\d+\.\s+(.+)$/);
    if (numListMatch) {
      flushList();
      listItems.push(<li key={i}>{renderInline(numListMatch[1]!)}</li>);
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      flushList();
      continue;
    }

    // Regular paragraph
    flushList();
    nodes.push(
      <p key={i} className="leading-relaxed">
        {renderInline(line)}
      </p>,
    );
  }

  flushCodeBlock();
  flushList();
  return nodes;
}

/** Render inline markdown: `code`, **bold**, *italic* */
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Match `code`, **bold**, or *italic*
  const regex = /(`(.+?)`|\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // Inline code
      parts.push(
        <code key={match.index} className="bg-stone-200 text-stone-800 px-1 py-0.5 rounded text-xs">
          {match[2]}
        </code>,
      );
    } else if (match[3]) {
      // Bold
      parts.push(<strong key={match.index}>{match[3]}</strong>);
    } else if (match[4]) {
      // Italic
      parts.push(<em key={match.index}>{match[4]}</em>);
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 ${
          isUser
            ? 'bg-green-700 text-white'
            : 'bg-stone-100 border border-stone-200 text-stone-800'
        }`}
      >
        {message.photos && message.photos.length > 0 && (
          <div className="flex gap-1 mb-2">
            {message.photos.map((photo, i) => (
              <img
                key={i}
                src={photo}
                alt={`Photo ${i + 1}`}
                className="w-16 h-16 rounded object-cover"
              />
            ))}
          </div>
        )}

        {isUser ? (
          <p className="text-sm leading-relaxed">{message.content}</p>
        ) : (
          <div className="text-sm space-y-1">{renderMarkdown(message.content)}</div>
        )}

        <p
          className={`text-[10px] mt-1 ${
            isUser ? 'text-green-200' : 'text-stone-400'
          }`}
        >
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}
