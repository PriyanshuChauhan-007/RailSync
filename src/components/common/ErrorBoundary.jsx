import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("RailSync ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "40px", maxWidth: "800px", margin: "40px auto", background: "#0f172a", borderRadius: "12px", border: "1px solid #334155", color: "#f8fafc", fontFamily: "sans-serif" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <span style={{ fontSize: "24px" }}>⚠️</span>
            <h2 style={{ margin: 0, fontSize: "20px", color: "#f43f5e" }}>RailSync Operational Workspace Recovery</h2>
          </div>
          <p style={{ color: "#94a3b8", lineHeight: "1.6", margin: "0 0 20px" }}>
            The workspace encountered a temporary display issue while synchronizing operational parameters.
            Your planning session context remains safe.
          </p>
          <div style={{ background: "#1e293b", padding: "12px 16px", borderRadius: "6px", fontSize: "13px", color: "#e2e8f0", marginBottom: "24px", fontFamily: "monospace", overflowX: "auto" }}>
            {this.state.error?.message || "Unknown rendering exception"}
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="button"
              onClick={this.handleReset}
              style={{ background: "#0284c7", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}
            >
              Reload Workspace
            </button>
            <button
              type="button"
              onClick={() => { window.location.href = "/"; }}
              style={{ background: "transparent", color: "#94a3b8", border: "1px solid #475569", padding: "10px 20px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}
            >
              Back to Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
