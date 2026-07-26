import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Inbox, CalendarDays, Sprout, Briefcase, BookOpen, LogOut, Settings, ClipboardCheck, Search, MoreHorizontal } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { getAssetUrl } from '../../services/assets.js';
import CozyClock from './CozyClock.jsx';
import Modal from '../ui/Modal.jsx';
import './SideNav.css';

const ZONES = [
  { path: '/today', label: 'Today', icon: Home },
  { path: '/inbox', label: 'Inbox', icon: Inbox },
  { path: '/plan', label: 'Plan', icon: CalendarDays },
  { path: '/grow', label: 'Grow', icon: Sprout },
  { path: '/business', label: 'Business', icon: Briefcase },
  { path: '/library', label: 'Library', icon: BookOpen },
  { path: '/review', label: 'Review', icon: ClipboardCheck },
];

export default function SideNav() {
  const { signOut, user } = useAuth();
  const initial = user?.email?.[0]?.toUpperCase() || '?';
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);

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
      <button
        className="side-nav-link side-nav-link-utility side-nav-quickjump"
        onClick={() => window.dispatchEvent(new Event('quickjump:open'))}
        title="Quick jump (Ctrl/Cmd+K)"
      >
        <Search size={16} strokeWidth={2} /> <span>Search / Jump</span>
      </button>

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

        {/* Mobile-only: the bottom bar has no room for the avatar, clock,
            search, and Control Center links that live in the desktop
            sidebar, so they're folded into this "More" sheet instead of
            being squeezed into the row and cut off. Hidden on desktop
            via SideNav.css (.side-nav-more). */}
        <button
          type="button"
          className="side-nav-link side-nav-more"
          onClick={() => setMoreOpen(true)}
        >
          <MoreHorizontal size={18} strokeWidth={2} />
          <span>More</span>
        </button>
      </div>

      <NavLink to="/control-center" className={({ isActive }) => `side-nav-link side-nav-link-utility ${isActive ? 'active' : ''}`}>
        <Settings size={16} strokeWidth={2} /> <span>Control Center</span>
      </NavLink>
      <button className="side-nav-signout" onClick={signOut}>
        <LogOut size={16} /> <span>Sign out</span>
      </button>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <div className="side-nav-more-sheet">
          <div className="side-nav-more-profile">
            <div className="side-nav-avatar" title="Profile">
              {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : <span>{initial}</span>}
            </div>
            <div>
              <div className="side-nav-brand-title">Rachelle's System</div>
              {user && <div className="side-nav-brand-email">{user.email}</div>}
            </div>
          </div>

          <button
            type="button"
            className="side-nav-more-item"
            onClick={() => { setMoreOpen(false); window.dispatchEvent(new Event('quickjump:open')); }}
          >
            <Search size={18} strokeWidth={2} /> <span>Search / Jump</span>
          </button>

          <NavLink to="/control-center" className="side-nav-more-item" onClick={() => setMoreOpen(false)}>
            <Settings size={18} strokeWidth={2} /> <span>Control Center</span>
          </NavLink>

          <button type="button" className="side-nav-more-item side-nav-more-signout" onClick={signOut}>
            <LogOut size={18} strokeWidth={2} /> <span>Sign out</span>
          </button>
        </div>
      </Modal>
    </nav>
  );
}