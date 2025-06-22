import React from "react";
import "./CentralPanelLayout.css";

export default function CentralPanelLayout({ title, children }) {
  return (
    <div className="app-root">
      <div className="app-panel">
        <h1 className="app-title">{title}</h1>
        {children}
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
