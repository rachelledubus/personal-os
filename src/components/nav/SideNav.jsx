import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, CalendarDays, Sprout, Briefcase, BookOpen, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import './SideNav.css';

const ZONES = [
  { path: '/today', label: 'Today', icon: Home },
  { path: '/plan', label: 'Plan', icon: CalendarDays },
  { path: '/grow', label: 'Grow', icon: Sprout },
  { path: '/business', label: 'Business', icon: Briefcase },
  { path: '/library', label: 'Library', icon: BookOpen },
];

export default function SideNav() {
  const { signOut, user } = useAuth();
  return (
    <nav className="side-nav">
      <div className="side-nav-brand">
        <div className="side-nav-brand-title">Rachelle's System</div>
        {user && <div className="side-nav-brand-email">{user.email}</div>}
      </div>
      <div className="side-nav-links">
        {ZONES.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `side-nav-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} strokeWidth={2} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
      <button className="side-nav-signout" onClick={signOut}>
        <LogOut size={16} /> <span>Sign out</span>
      </button>
    </nav>
  );
}
