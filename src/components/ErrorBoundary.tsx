import * as React from "react";
import { ErrorCard } from "@/components/ui/error-card";

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  error: Error | null;
}

/**
 * App-level error boundary so a render crash never shows a blank white screen.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <ErrorCard
            className="max-w-lg"
            title={this.props.fallbackTitle ?? "This page hit an unexpected error"}
            error={this.state.error}
            onRetry={this.handleReset}
          />
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
