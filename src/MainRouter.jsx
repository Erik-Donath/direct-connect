import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PeerProvider } from './PeerContext';
import App from './pages/App';
import ChatWindow from './pages/ChatWindow';
import HostSetup from './pages/HostSetup';
import CentralPanelLayout from './components/CentralPanelLayout';

export default function MainRouter() {
  const base = import.meta.env.BASE_URL || '/'; // Use Vite's BASE_URL for correct routing on GitHub Pages
  return (
    <PeerProvider>
      <BrowserRouter basename={base}>
        <Routes>
          <Route element={<CentralPanelLayout title="Direct Connect" />}> 
            <Route path="/" element={<App />} />
            <Route path="/host" element={<HostSetup />} />
            <Route path="/chat" element={<ChatWindow />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PeerProvider>
  );
}
