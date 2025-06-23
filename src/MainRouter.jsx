import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './pages/App';
import ChatWindow from './pages/ChatWindow';
import HostSetup from './pages/HostSetup';
import MainLayout from './components/MainLayout';

export default function MainRouter() {
  console.debug('MainRouter: Render');
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout title="Direct Connect" />}> 
          <Route path="/" element={<App />} />
          <Route path="/host" element={<HostSetup />} />
          <Route path="/chat" element={<ChatWindow />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
