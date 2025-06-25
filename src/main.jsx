import { createRoot } from 'react-dom/client';
import MainRouter from './MainRouter';
import { ProtocolProvider } from './ProtocolProvider';
import './index.css';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').then(reg => {
      reg.onupdatefound = () => {
        const newWorker = reg.installing;
        newWorker.onstatechange = () => {
          if (
            newWorker.state === 'activated' &&
            navigator.serviceWorker.controller
          ) {
            window.location.reload();
          }
        };
      };
    });
  }).catch(error => {
    console.warn('Service worker registration failed:', error);
  });
}

createRoot(document.getElementById('root')).render(
  <ProtocolProvider>
    <MainRouter />
  </ProtocolProvider>
);
