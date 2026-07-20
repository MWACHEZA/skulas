import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './assets/css/style.css'
import './assets/css/common.css'
import './assets/css/portal.css'
import './i18n'

// Global utility for confirm dialogs that return a promise
// toastConfirm is now bound to window inside ToastProvider

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
