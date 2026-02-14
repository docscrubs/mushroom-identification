import { render, screen } from '@testing-library/react';
import { PipelineProgress } from './PipelineProgress';

describe('PipelineProgress', () => {
  it('renders three stage labels', () => {
    render(<PipelineProgress stage="candidates" />);
    expect(screen.getByText('Candidates')).toBeTruthy();
    expect(screen.getByText('Lookup')).toBeTruthy();
    expect(screen.getByText('Verification')).toBeTruthy();
  });

  it('highlights candidates stage as active', () => {
    const { container } = render(<PipelineProgress stage="candidates" />);
    const steps = container.querySelectorAll('[data-stage]');
    expect(steps[0]!.getAttribute('data-active')).toBe('true');
    expect(steps[1]!.getAttribute('data-active')).toBe('false');
    expect(steps[2]!.getAttribute('data-active')).toBe('false');
  });

  it('highlights lookup stage and marks candidates as completed', () => {
    const { container } = render(<PipelineProgress stage="lookup" />);
    const steps = container.querySelectorAll('[data-stage]');
    expect(steps[0]!.getAttribute('data-completed')).toBe('true');
    expect(steps[1]!.getAttribute('data-active')).toBe('true');
    expect(steps[2]!.getAttribute('data-active')).toBe('false');
  });

  it('highlights verification stage and marks prior stages as completed', () => {
    const { container } = render(<PipelineProgress stage="verification" />);
    const steps = container.querySelectorAll('[data-stage]');
    expect(steps[0]!.getAttribute('data-completed')).toBe('true');
    expect(steps[1]!.getAttribute('data-completed')).toBe('true');
    expect(steps[2]!.getAttribute('data-active')).toBe('true');
  });

  it('shows custom status text when provided', () => {
    render(<PipelineProgress stage="candidates" statusText="Generating candidates..." />);
    expect(screen.getByText('Generating candidates...')).toBeTruthy();
  });

  it('shows default status text for each stage', () => {
    const { rerender } = render(<PipelineProgress stage="candidates" />);
    expect(screen.getByText('Generating candidates...')).toBeTruthy();

    rerender(<PipelineProgress stage="lookup" />);
    expect(screen.getByText('Looking up species...')).toBeTruthy();

    rerender(<PipelineProgress stage="verification" />);
    expect(screen.getByText('Verifying against dataset...')).toBeTruthy();
  });
});
