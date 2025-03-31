'use client';

import React, { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

class ErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 border border-red-300 p-6 rounded-lg text-red-800 mt-10 mx-4">
          <h2 className="text-2xl font-bold mb-2">Something went wrong 🧯</h2>
          <p className="text-sm mb-4">Please try refreshing the page or report this issue.</p>
          <pre className="bg-red-100 text-xs p-3 rounded overflow-x-auto">
            {this.state.error?.message}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
