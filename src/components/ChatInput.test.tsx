import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ChatInput } from './ChatInput';

describe('ChatInput', () => {
  it('renders textarea and send button', () => {
    render(<ChatInput onSend={vi.fn()} loading={false} disabled={false} />);
    expect(screen.getByPlaceholderText(/describe/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /send/i })).toBeTruthy();
  });

  it('send button is disabled when text is empty and no photos', () => {
    render(<ChatInput onSend={vi.fn()} loading={false} disabled={false} />);
    const button = screen.getByRole('button', { name: /send/i });
    expect(button).toBeDisabled();
  });

  it('send button is disabled when loading', () => {
    render(<ChatInput onSend={vi.fn()} loading={true} disabled={false} />);
    const textarea = screen.getByPlaceholderText(/describe/i);
    // Type something to make it non-empty
    userEvent.type(textarea, 'test');
    const button = screen.getByRole('button', { name: /send/i });
    expect(button).toBeDisabled();
  });

  it('send button is disabled when disabled prop is true', () => {
    render(<ChatInput onSend={vi.fn()} loading={false} disabled={true} />);
    const button = screen.getByRole('button', { name: /send/i });
    expect(button).toBeDisabled();
  });

  it('calls onSend with text when send button is clicked', async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();

    render(<ChatInput onSend={onSend} loading={false} disabled={false} />);
    const textarea = screen.getByPlaceholderText(/describe/i);

    await user.type(textarea, 'Brown mushroom in woodland');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(onSend).toHaveBeenCalledWith('Brown mushroom in woodland', []);
  });

  it('clears input after sending', async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();

    render(<ChatInput onSend={onSend} loading={false} disabled={false} />);
    const textarea = screen.getByPlaceholderText(/describe/i) as HTMLTextAreaElement;

    await user.type(textarea, 'Some text');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(textarea.value).toBe('');
  });

  it('Enter key submits the form', async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();

    render(<ChatInput onSend={onSend} loading={false} disabled={false} />);
    const textarea = screen.getByPlaceholderText(/describe/i);

    await user.type(textarea, 'Hello{Enter}');

    expect(onSend).toHaveBeenCalledWith('Hello', []);
  });

  it('Shift+Enter inserts a newline instead of submitting', async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();

    render(<ChatInput onSend={onSend} loading={false} disabled={false} />);
    const textarea = screen.getByPlaceholderText(/describe/i) as HTMLTextAreaElement;

    await user.type(textarea, 'Line 1{Shift>}{Enter}{/Shift}Line 2');

    expect(onSend).not.toHaveBeenCalled();
    expect(textarea.value).toContain('Line 1');
    expect(textarea.value).toContain('Line 2');
  });

  it('has a photo attach button', () => {
    render(<ChatInput onSend={vi.fn()} loading={false} disabled={false} />);
    // File input for photos
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeTruthy();
  });
});
