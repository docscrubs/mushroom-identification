import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IdentifyPage } from './IdentifyPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <IdentifyPage />
    </MemoryRouter>,
  );
}

describe('IdentifyPage', () => {
  beforeEach(() => {
    renderPage();
  });

  describe('photo capture', () => {
    it('renders a file input for photo capture', () => {
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toBeTruthy();
    });

    it('has correct accept and capture attributes', () => {
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input.getAttribute('accept')).toBe('image/*');
      expect(input.getAttribute('capture')).toBe('environment');
    });

    it('shows photo attached indicator after file selection', () => {
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['pixels'], 'mushroom.jpg', { type: 'image/jpeg' });

      fireEvent.change(input, { target: { files: [file] } });

      expect(screen.getByText(/photo attached/i)).toBeTruthy();
    });

    it('clears photo on reset', () => {
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['pixels'], 'mushroom.jpg', { type: 'image/jpeg' });

      fireEvent.change(input, { target: { files: [file] } });
      expect(screen.getByText(/photo attached/i)).toBeTruthy();

      const resetButton = screen.getByRole('button', { name: /reset/i });
      fireEvent.click(resetButton);

      expect(screen.queryByText(/photo attached/i)).toBeNull();
    });
  });
});
