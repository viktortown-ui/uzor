import './features/pwa/pwaInstallBridge';
import './features/pwa/pwaServiceWorkerRegistration';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { App } from './app/App';
import { PwaStatus } from './app/PwaStatus';
import { PwaInstallProvider } from './features/pwa/PwaInstallProvider';
import { PwaInstallDebug, PwaInstallLauncher } from './features/pwa/PwaInstallLauncher';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <PwaInstallProvider>
        <App />
        <PwaInstallLauncher />
        <PwaInstallDebug />
        <PwaStatus />
      </PwaInstallProvider>
    </HashRouter>
  </React.StrictMode>,
);
