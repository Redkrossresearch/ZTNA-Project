import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './layout.css';

const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  return (
    <header className="app-navbar">
      <div className="app-navbar-left">
        <button className="menu-toggle" onClick={onToggleSidebar} aria-label="Toggle navigation menu">
          ☰
        </button>
        <div className="app-navbar-brand">
          ZTNA<span>Secure</span>
        </div>
      </div>

      <div className="app-navbar-right" ref={dropdownRef}>
        <div className="navbar-user" onClick={() => setMenuOpen((v) => !v)}>
          <div className="navbar-avatar">{initials}</div>
          <span className="navbar-username">
            {user?.name}
            <span className="navbar-role-badge">{user?.role}</span>
          </span>
        </div>

        {menuOpen && (
          <div className="navbar-dropdown">
            <Link to="/profile" onClick={() => setMenuOpen(false)}>
              My Profile
            </Link>
            <button type="button" onClick={handleLogout}>
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
