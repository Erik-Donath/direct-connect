import { createRoot } from 'react-dom/client';
import MainRouter from './MainRouter';
import { ProtocolProvider } from './ProtocolContext';
import './index.css';

createRoot(document.getElementById('root')).render(
  <ProtocolProvider>
    <MainRouter />
  </ProtocolProvider>
);
