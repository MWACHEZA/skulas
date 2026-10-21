// ── DOM Mutation Protection ──────────────────────────────────────────────────
// Prevents Google Chrome Auto-Translate, translation extensions, and 3rd-party
// DOM injectors (e.g., QR scanners) from crashing React reconciliation with:
// "NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node."
if (typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[DOM Protection] removeChild parent mismatch bypassed:', child);
      }
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[DOM Protection] insertBefore parent mismatch bypassed:', referenceNode);
      }
      return newNode;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}

import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './assets/css/style.css'
import './assets/css/common.css'
import './assets/css/portal.css'
import './i18n'

// Global utility for confirm dialogs that return a promise
// toastConfirm is now bound to window inside ToastProvider

/** Top-level error boundary – catches any render crash and shows a readable message instead of a blank screen */
class RootErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[RootErrorBoundary] Uncaught render error:', error, info);
  }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div style={{ fontFamily: 'sans-serif', padding: 40, background: '#fff0f0', minHeight: '100vh' }}>
          <h1 style={{ color: '#c00', marginBottom: 8 }}>⚠️ App crashed on startup</h1>
          <p style={{ color: '#555', marginBottom: 16 }}>
            Open <strong>DevTools → Console</strong> for the full stack trace.
          </p>
          <pre style={{ background: '#1e1e1e', color: '#f8f8f2', padding: 24, borderRadius: 8, overflowX: 'auto', fontSize: 13, whiteSpace: 'pre-wrap' }}>
            {err.message}{'\n\n'}{err.stack}
          </pre>
          <button onClick={() => window.location.reload()}
            style={{ marginTop: 20, padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>,
)
