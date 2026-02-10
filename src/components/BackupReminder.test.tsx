import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { BackupReminder } from './BackupReminder';
import { useAppStore } from '@/stores/app-store';

function renderWithRouter(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('BackupReminder', () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState());
  });

  it('does not render when backup is not needed', () => {
    renderWithRouter(<BackupReminder />);
    expect(screen.queryByText(/back up/i)).toBeNull();
  });

  it('renders when backup is needed (session threshold)', () => {
    useAppStore.setState({ sessionsSinceBackup: 10 });
    renderWithRouter(<BackupReminder />);
    expect(screen.getByText(/back up your data/i)).toBeTruthy();
  });

  it('renders when backup is needed (30-day threshold)', () => {
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    useAppStore.setState({ lastBackupDate: thirtyOneDaysAgo, sessionsSinceBackup: 0 });
    renderWithRouter(<BackupReminder />);
    expect(screen.getByText(/back up your data/i)).toBeTruthy();
  });

  it('has a link to settings page', () => {
    useAppStore.setState({ sessionsSinceBackup: 10 });
    renderWithRouter(<BackupReminder />);
    const link = screen.getByRole('link', { name: /back up now/i });
    expect(link.getAttribute('href')).toBe('/settings');
  });

  it('hides after dismiss is clicked', async () => {
    useAppStore.setState({ sessionsSinceBackup: 10 });
    renderWithRouter(<BackupReminder />);
    expect(screen.getByText(/back up your data/i)).toBeTruthy();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /dismiss/i }));

    expect(screen.queryByText(/back up your data/i)).toBeNull();
  });

  it('does not render when recently dismissed', () => {
    useAppStore.setState({
      sessionsSinceBackup: 10,
      backupReminderDismissedAt: new Date().toISOString(),
    });
    renderWithRouter(<BackupReminder />);
    expect(screen.queryByText(/back up your data/i)).toBeNull();
  });
});
