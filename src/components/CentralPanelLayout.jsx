import React from "react";
import { Outlet } from "react-router-dom";
import "./CentralPanelLayout.css";

export default function CentralPanelLayout({ title }) {
  return (
    <div className="app-root">
      <div className="app-panel">
        <h1 className="app-title">
          <img src="/icon.svg" alt="App Icon" className="app-title-icon" />
          {title}
        </h1>
        <Outlet />
      </div>
      <div className="footer-meta">
        <span className="copyright-notice">
          &copy; 2025 Erik Donath
        </span>
        <a
          className="github-link"
          href="https://github.com/your-repo"
          target="_blank"
          rel="noopener noreferrer"
        >
          View on GitHub
        </a>
      </div>
    </div>
  );
}
