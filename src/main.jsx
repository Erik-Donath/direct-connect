import { createRoot } from 'react-dom/client';
import MainRouter from './MainRouter';
import { ProtocolProvider } from './ProtocolProvider';
import './index.css';

createRoot(document.getElementById('root')).render(
  <ProtocolProvider>
    <MainRouter />
  </ProtocolProvider>
);
