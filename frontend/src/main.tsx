import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import './lib/i18n';

if (typeof window !== 'undefined') {
  try {
    const keysToRemove = Object.keys(window.localStorage).filter(
      (key) => key.includes('venue') || key.includes('crowdiq-venue')
    );
    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Ignore storage access failures during bootstrap.
  }
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('A new version of CrowdIQ is available. Update now?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.info('[CrowdIQ] App ready for offline use.');
  }
});
