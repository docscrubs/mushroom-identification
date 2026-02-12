import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, type Mock } from 'vitest';
import { useAppStore } from '@/stores/app-store';
import type { ConversationSession } from '@/types/conversation';

// Mock react-router-dom to avoid ESM/CJS issue in vmForks
vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

// Mock the conversation orchestrator
vi.mock('@/llm/conversation', () => ({
  startConversation: vi.fn(),
  sendMessage: vi.fn(),
  endConversation: vi.fn(),
  getSession: vi.fn(),
  listSessions: vi.fn(),
}));

// Mock the database
vi.mock('@/db/database', () => ({
  db: {},
}));

import { ChatPage } from './ChatPage';
import {
  startConversation,
  sendMessage,
  endConversation,
  listSessions,
} from '@/llm/conversation';

const mockStartConversation = startConversation as Mock;
const mockSendMessage = sendMessage as Mock;
const mockEndConversation = endConversation as Mock;
const mockListSessions = listSessions as Mock;

function makeSession(overrides: Partial<ConversationSession> = {}): ConversationSession {
  return {
    session_id: 'session-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    messages: [],
    status: 'active',
    ...overrides,
  };
}

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

describe('ChatPage', () => {
  beforeEach(() => {
    useAppStore.setState({
      ...useAppStore.getInitialState(),
      isOnline: true,
      hasApiKey: true,
      isInitialized: true,
    });
    mockStartConversation.mockReset();
    mockSendMessage.mockReset();
    mockEndConversation.mockReset();
    mockListSessions.mockReset();
    mockListSessions.mockResolvedValue([]);
  });

  it('shows welcome message when no active conversation', () => {
    render(<ChatPage />);
    expect(screen.getByText(/describe a mushroom/i)).toBeTruthy();
  });

  it('shows offline message when not online', () => {
    useAppStore.setState({ isOnline: false });
    render(<ChatPage />);
    expect(screen.getByText(/you're offline/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /offline identification/i })).toBeTruthy();
  });

  it('shows API key message when no key configured', () => {
    useAppStore.setState({ hasApiKey: false });
    render(<ChatPage />);
    expect(screen.getByText(/api key required/i)).toBeTruthy();
    expect(screen.getByText(/go to settings/i)).toBeTruthy();
  });

  it('sends a message and displays response', async () => {
    const session = makeSession();
    mockStartConversation.mockResolvedValue(session);
    mockSendMessage.mockResolvedValue({
      ok: true,
      session: makeSession({
        messages: [
          {
            id: 'msg-1',
            role: 'user' as const,
            content: 'Brown cap under oak',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'msg-2',
            role: 'assistant' as const,
            content: 'This could be several species.',
            timestamp: new Date().toISOString(),
          },
        ],
      }),
      response: 'This could be several species.',
    });

    const user = userEvent.setup();
    render(<ChatPage />);

    const textarea = screen.getByPlaceholderText(/describe/i);
    await user.type(textarea, 'Brown cap under oak');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText('Brown cap under oak')).toBeTruthy();
      expect(screen.getByText('This could be several species.')).toBeTruthy();
    });
  });

  it('displays error message from sendMessage', async () => {
    const session = makeSession();
    mockStartConversation.mockResolvedValue(session);
    mockSendMessage.mockResolvedValue({
      ok: false,
      error: 'api_error',
      message: 'Network timeout occurred',
    });
    // getSession returns session with user message after error
    const { getSession: mockGetSession } = await import('@/llm/conversation');
    (mockGetSession as Mock).mockResolvedValue(
      makeSession({
        messages: [
          {
            id: 'msg-1',
            role: 'user' as const,
            content: 'test',
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    );

    const user = userEvent.setup();
    render(<ChatPage />);

    const textarea = screen.getByPlaceholderText(/describe/i);
    await user.type(textarea, 'test');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText(/network timeout/i)).toBeTruthy();
    });
  });

  it('New Conversation button creates fresh session', async () => {
    const session = makeSession();
    mockStartConversation.mockResolvedValue(session);
    mockListSessions.mockResolvedValue([session]);

    const user = userEvent.setup();
    render(<ChatPage />);

    // Open history sidebar
    await user.click(screen.getByText(/history/i));
    // Click the "New Conversation" button (first match — the green CTA, not the session preview)
    const buttons = screen.getAllByRole('button', { name: /new conversation/i });
    await user.click(buttons[0]!);

    expect(mockStartConversation).toHaveBeenCalled();
  });
});
