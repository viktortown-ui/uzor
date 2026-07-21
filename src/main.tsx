import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { App } from './app/App';
import { PwaStatus } from './app/PwaStatus';
import { PwaInstallProvider } from './features/pwa/PwaInstallProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <PwaInstallProvider>
        <App />
        <PwaStatus />
      </PwaInstallProvider>
    </HashRouter>
  </React.StrictMode>,
);
