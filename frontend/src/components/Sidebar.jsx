import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './layout.css';

const Sidebar = ({ isOpen, onClose }) => {
  const { isAdmin } = useAuth();

  const linkClass = ({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`;

  return (
    <>
      <aside className={`app-sidebar${isOpen ? ' open' : ''}`}>
        <div className="sidebar-section-label">Main</div>
        <NavLink to="/dashboard" className={linkClass} onClick={onClose}>
          <span className="sidebar-icon">◧</span> Dashboard
        </NavLink>
        <NavLink to="/profile" className={linkClass} onClick={onClose}>
          <span className="sidebar-icon">◍</span> Profile
        </NavLink>

        <div className="sidebar-section-label">Security</div>
        <NavLink to="/sessions" className={linkClass} onClick={onClose}>
          <span className="sidebar-icon">◔</span> My Sessions
        </NavLink>
        <NavLink to="/access-logs" className={linkClass} onClick={onClose}>
          <span className="sidebar-icon">▤</span> Access Logs
        </NavLink>
        <NavLink to="/security-alerts" className={linkClass} onClick={onClose}>
          <span className="sidebar-icon">◭</span> Security Alerts
        </NavLink>

        {isAdmin && (
          <>
            <div className="sidebar-section-label">Administration</div>
            <NavLink to="/admin/dashboard" className={linkClass} onClick={onClose}>
              <span className="sidebar-icon">◔</span> Admin Dashboard
            </NavLink>
            <NavLink to="/admin/users" className={linkClass} onClick={onClose}>
              <span className="sidebar-icon">◫</span> User Management
            </NavLink>
            <NavLink to="/admin/incidents" className={linkClass} onClick={onClose}>
              <span className="sidebar-icon">◭</span> Incident Management
            </NavLink>
            <NavLink to="/admin/access-logs" className={linkClass} onClick={onClose}>
              <span className="sidebar-icon">▤</span> All Access Logs
            </NavLink>
            <NavLink to="/admin/threat-intel" className={linkClass} onClick={onClose}>
              <span className="sidebar-icon">◈</span> Threat Intelligence
            </NavLink>
          </>
        )}
      </aside>
      <div className={`sidebar-backdrop${isOpen ? ' open' : ''}`} onClick={onClose} />
    </>
  );
};

export default Sidebar;
