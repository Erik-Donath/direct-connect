import React from 'react';
import { createRoot } from 'react-dom/client';
import MainRouter from './MainRouter';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MainRouter />
  </React.StrictMode>
);
