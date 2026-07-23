import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Inbox, CalendarDays, Sprout, Briefcase, BookOpen, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { getAssetUrl } from '../../services/assets.js';
import CozyClock from './CozyClock.jsx';
import './SideNav.css';

const ZONES = [
  { path: '/today', label: 'Today', icon: Home },
  { path: '/inbox', label: 'Inbox', icon: Inbox },
  { path: '/plan', label: 'Plan', icon: CalendarDays },
  { path: '/grow', label: 'Grow', icon: Sprout },
  { path: '/business', label: 'Business', icon: Briefcase },
  { path: '/library', label: 'Library', icon: BookOpen },
];

export default function SideNav() {
  const { signOut, user } = useAuth();
  const initial = user?.email?.[0]?.toUpperCase() || '?';
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => { getAssetUrl('profile_avatar').then(setAvatarUrl); }, []);

  return (
    <nav className="side-nav">
      <div className="side-nav-avatar-row">
        <div className="side-nav-avatar" title="Profile">
          {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : <span>{initial}</span>}
        </div>
      </div>

      <CozyClock />

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
      <NavLink to="/control-center" className={({ isActive }) => `side-nav-link side-nav-link-utility ${isActive ? 'active' : ''}`}>
        <Settings size={16} strokeWidth={2} /> <span>Control Center</span>
      </NavLink>
      <button className="side-nav-signout" onClick={signOut}>
        <LogOut size={16} /> <span>Sign out</span>
      </button>
    </nav>
  );
}
