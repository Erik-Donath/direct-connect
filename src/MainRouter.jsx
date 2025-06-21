import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PeerProvider } from './PeerContext';
import App from './App';
import ChatWindow from './ChatWindow';

export default function MainRouter() {
  return (
    <PeerProvider>
      <Router>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/chat" element={<ChatWindow />} />
        </Routes>
      </Router>
    </PeerProvider>
  );
}
