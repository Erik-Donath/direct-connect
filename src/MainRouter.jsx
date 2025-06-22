import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PeerProvider } from './PeerContext';
import App from './App';
import ChatWindow from './ChatWindow';

export default function MainRouter() {
  const base = import.meta.env.BASE_URL || '/'; // Use Vite's BASE_URL for correct routing on GitHub Pages
  return (
    <PeerProvider>
      <BrowserRouter basename={base}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/chat" element={<ChatWindow />} />
        </Routes>
      </BrowserRouter>
    </PeerProvider>
  );
}
