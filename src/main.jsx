import { createRoot } from 'react-dom/client';
import MainRouter from './MainRouter';
import { ProtocolProvider } from './ProtocolProvider';
import './index.css';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
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
