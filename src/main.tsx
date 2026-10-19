import { Component, StrictMode } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { syncLocale, t } from "./lib/i18n";
import { loadSettings } from "./lib/storage";
import "./styles/global.css";

syncLocale(loadSettings().language);

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Paper crashed", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="crash-screen">
          <div className="crash-card">
            <h1>{t("Paper 遇到了一点问题")}</h1>
            <p>{this.state.error.message}</p>
            <button
              type="button"
              className="primary-button"
              onClick={() => window.location.reload()}
            >
              {t("重新载入")}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
