import { createRoot } from 'react-dom/client';
import MainRouter from './MainRouter';
import { ProtocolProvider } from './ProtocolProvider';
import './index.css';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(reg => {
        if (reg.waiting) {
          reg.waiting.postMessage("SKIP_WAITING");
          window.location.reload();
          return;
        }

        reg.onupdatefound = () => {
          const newWorker = reg.installing;
          newWorker.onstatechange = () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              newWorker.postMessage("SKIP_WAITING");
            }
          };
        };

        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });
      })
      .catch(error => {
        console.warn('Service worker registration failed:', error);
      });
  });
}

createRoot(document.getElementById('root')).render(
  <ProtocolProvider>
    <MainRouter />
  </ProtocolProvider>
);