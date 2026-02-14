import { render, screen } from '@testing-library/react';
import { ChatBubble } from './ChatBubble';
import type { ConversationMessage } from '@/types/conversation';

function makeMessage(overrides: Partial<ConversationMessage> = {}): ConversationMessage {
  return {
    id: 'msg-1',
    role: 'user',
    content: 'Hello',
    timestamp: '2025-06-15T10:30:00.000Z',
    ...overrides,
  };
}

describe('ChatBubble', () => {
  it('renders user message content', () => {
    render(<ChatBubble message={makeMessage({ content: 'I found a mushroom' })} />);
    expect(screen.getByText('I found a mushroom')).toBeTruthy();
  });

  it('renders assistant message content', () => {
    render(
      <ChatBubble
        message={makeMessage({ role: 'assistant', content: 'That looks interesting.' })}
      />,
    );
    expect(screen.getByText('That looks interesting.')).toBeTruthy();
  });

  it('user messages have right-aligned styling', () => {
    const { container } = render(
      <ChatBubble message={makeMessage({ role: 'user' })} />,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('justify-end');
  });

  it('assistant messages have left-aligned styling', () => {
    const { container } = render(
      <ChatBubble message={makeMessage({ role: 'assistant' })} />,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('justify-start');
  });

  it('renders markdown bold text', () => {
    render(
      <ChatBubble
        message={makeMessage({
          role: 'assistant',
          content: 'This is **very important** information.',
        })}
      />,
    );
    const strong = screen.getByText('very important');
    expect(strong.tagName).toBe('STRONG');
  });

  it('renders markdown italic text', () => {
    render(
      <ChatBubble
        message={makeMessage({
          role: 'assistant',
          content: 'The species *Amanita phalloides* is deadly.',
        })}
      />,
    );
    const em = screen.getByText('Amanita phalloides');
    expect(em.tagName).toBe('EM');
  });

  it('renders markdown headers', () => {
    render(
      <ChatBubble
        message={makeMessage({
          role: 'assistant',
          content: '## Key candidates\nSome text here.',
        })}
      />,
    );
    const heading = screen.getByText('Key candidates');
    expect(heading.tagName).toBe('H2');
  });

  it('renders markdown list items', () => {
    render(
      <ChatBubble
        message={makeMessage({
          role: 'assistant',
          content: '- First item\n- Second item',
        })}
      />,
    );
    expect(screen.getByText('First item')).toBeTruthy();
    expect(screen.getByText('Second item')).toBeTruthy();
  });

  it('renders photo thumbnails in user messages', () => {
    render(
      <ChatBubble
        message={makeMessage({
          photos: ['data:image/jpeg;base64,abc123'],
        })}
      />,
    );
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe('data:image/jpeg;base64,abc123');
  });

  it('displays timestamp', () => {
    render(
      <ChatBubble
        message={makeMessage({ timestamp: '2025-06-15T10:30:00.000Z' })}
      />,
    );
    // Should display some form of time (timezone-dependent output)
    expect(screen.getByText(/\d{1,2}:\d{2}/)).toBeTruthy();
  });

  describe('markdown table rendering', () => {
    it('renders a simple table with header and rows', () => {
      const tableMarkdown = [
        '| Feature | You described | Dataset says | Verdict |',
        '|---------|-------------|-------------|---------|',
        '| Cap colour | olive green | olive green to dirty yellow | MATCH |',
        '| Gills | white | White to cream | MATCH |',
      ].join('\n');

      const { container } = render(
        <ChatBubble
          message={makeMessage({ role: 'assistant', content: tableMarkdown })}
        />,
      );

      const table = container.querySelector('table');
      expect(table).toBeTruthy();

      // Header cells
      const headerCells = table!.querySelectorAll('th');
      expect(headerCells).toHaveLength(4);
      expect(headerCells[0]!.textContent).toBe('Feature');
      expect(headerCells[3]!.textContent).toBe('Verdict');

      // Body rows
      const bodyRows = table!.querySelectorAll('tbody tr');
      expect(bodyRows).toHaveLength(2);
    });

    it('renders table cells with inline markdown', () => {
      const tableMarkdown = [
        '| Species | Status |',
        '|---------|--------|',
        '| **Death Cap** | *DEADLY* |',
      ].join('\n');

      render(
        <ChatBubble
          message={makeMessage({ role: 'assistant', content: tableMarkdown })}
        />,
      );

      const strong = screen.getByText('Death Cap');
      expect(strong.tagName).toBe('STRONG');
      const em = screen.getByText('DEADLY');
      expect(em.tagName).toBe('EM');
    });

    it('renders table with check/cross marks in verdicts', () => {
      const tableMarkdown = [
        '| Feature | Verdict |',
        '|---------|---------|',
        '| Cap | MATCH |',
        '| Gills | CONTRADICTION |',
      ].join('\n');

      render(
        <ChatBubble
          message={makeMessage({ role: 'assistant', content: tableMarkdown })}
        />,
      );

      expect(screen.getByText('MATCH')).toBeTruthy();
      expect(screen.getByText('CONTRADICTION')).toBeTruthy();
    });

    it('renders table between other markdown elements', () => {
      const content = [
        '## Verification',
        '',
        '| Feature | Verdict |',
        '|---------|---------|',
        '| Cap | MATCH |',
        '',
        'Some text after the table.',
      ].join('\n');

      const { container } = render(
        <ChatBubble
          message={makeMessage({ role: 'assistant', content })}
        />,
      );

      expect(screen.getByText('Verification')).toBeTruthy();
      expect(container.querySelector('table')).toBeTruthy();
      expect(screen.getByText('Some text after the table.')).toBeTruthy();
    });
  });
});
