'use client';

import React from 'react';

class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center text-red-600 mt-10">
          <h2 className="text-2xl font-bold">Something went wrong 🧯</h2>
          <p className="text-sm mt-2">Try refreshing the page or come back later.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
