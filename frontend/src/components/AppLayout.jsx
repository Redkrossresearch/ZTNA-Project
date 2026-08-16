import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import './layout.css';
import './polish.css';

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Navbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="app-content" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
