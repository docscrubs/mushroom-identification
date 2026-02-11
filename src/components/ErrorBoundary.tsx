import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary that catches render errors and displays a recovery UI.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6">
          <div className="max-w-md space-y-4 text-center">
            <h1 className="text-2xl font-bold text-red-800">Something went wrong</h1>
            <p className="text-stone-600 text-sm">
              The app encountered an unexpected error. Your data is safe — try refreshing or returning to the home page.
            </p>
            {this.state.error && (
              <details className="text-left text-xs text-stone-400">
                <summary className="cursor-pointer">Error details</summary>
                <pre className="mt-2 whitespace-pre-wrap break-words bg-stone-100 rounded p-2">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="rounded-lg bg-amber-700 px-4 py-2 text-white text-sm font-medium"
              >
                Try Again
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                className="rounded-lg bg-stone-200 px-4 py-2 text-stone-700 text-sm font-medium"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
