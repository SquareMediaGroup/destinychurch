// Keeps one broken page from blanking the whole window. Resets when the
// page changes (pass the view as `resetKey`).

import { Component, type ReactNode } from "react";

interface Props {
  resetKey: string;
  children: ReactNode;
}

export class ErrorBoundary extends Component<Props, { error: Error | null; key: string }> {
  state = { error: null as Error | null, key: this.props.resetKey };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: { error: Error | null; key: string }) {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null;
  }

  componentDidCatch(error: Error) {
    console.error("⚠️ D1 Admin page crashed:", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="empty">
        <b>Something went wrong on this page</b>
        <span>{this.state.error.message}</span>
        <div style={{ marginTop: 12 }}>
          <button className="btn" onClick={() => this.setState({ error: null })}>Try again</button>
        </div>
      </div>
    );
  }
}
