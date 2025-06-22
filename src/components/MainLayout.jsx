import React from "react";
import { Outlet } from "react-router-dom";
import "./MainLayout.css";

export default function MainLayout({ title }) {
  const base = import.meta.env.BASE_URL || "/";
  return (
    <div className="app-root">
      <header className="app-header"></header>
      <main className="app-panel">
        <h1 className="app-title">
          <img src={`${base}icon.svg`} alt="App Icon" className="app-title-icon" />
          {title}
        </h1>
        <Outlet />
      </main>
      <footer className="footer-meta">
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
      </footer>
    </div>
  );
}
