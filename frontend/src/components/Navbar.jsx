import { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { api } from '../api';

export default function Navbar() {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    setLoggingOut(true);
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">
        ⚡ ResumeRank
      </NavLink>

      <div className="navbar-links">
        <NavLink
          to="/"
          end
          className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
        >
          Upload
        </NavLink>
        <NavLink
          to="/history"
          className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
        >
          History
        </NavLink>
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleLogout}
          disabled={loggingOut}
          id="logout-btn"
        >
          {loggingOut ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Logout'}
        </button>
      </div>
    </nav>
  );
}
