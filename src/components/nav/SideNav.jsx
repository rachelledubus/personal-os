import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Inbox, CalendarDays, Sprout, Briefcase, BookOpen, LogOut, Settings, ClipboardCheck, Search, MoreHorizontal } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { getAssetUrl } from '../../services/assets.js';
import CozyClock from './CozyClock.jsx';
import Overlay from '../ui/Overlay.jsx';
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

// Shell spec 5.1: mobile bottom nav gets a fixed small set of
// destinations (4-5), with less-frequent zones reachable through a
// "More" sheet instead of taking a primary slot. Desktop is
// unaffected — this split only changes what CSS shows in the mobile
// bottom-bar transform of the exact same nav.
const MOBILE_PRIMARY_PATHS = new Set(['/today', '/inbox', '/plan', '/grow', '/business']);

export default function SideNav() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const initial = user?.email?.[0]?.toUpperCase() || '?';
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => { getAssetUrl('profile_avatar').then(setAvatarUrl); }, []);

  function goTo(path) {
    setMoreOpen(false);
    navigate(path);
  }

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
            data-mobile-overflow={!MOBILE_PRIMARY_PATHS.has(path)}
          >
            <Icon size={18} strokeWidth={2} />
            <span>{label}</span>
          </NavLink>
        ))}
        <button className="side-nav-link side-nav-more" onClick={() => setMoreOpen(true)}>
          <MoreHorizontal size={18} strokeWidth={2} />
          <span>More</span>
        </button>
      </div>
      <NavLink to="/control-center" className={({ isActive }) => `side-nav-link side-nav-link-utility ${isActive ? 'active' : ''}`} data-mobile-overflow="true">
        <Settings size={16} strokeWidth={2} /> <span>Control Center</span>
      </NavLink>
      <button className="side-nav-signout" onClick={signOut}>
        <LogOut size={16} /> <span>Sign out</span>
      </button>

      {/* Mobile-only "More" sheet — Library, Review, Control Center,
          Search/Jump, and Sign out. Desktop never triggers this (the
          button is CSS-hidden above 900px), so nothing here changes
          desktop behavior. */}
      <Overlay open={moreOpen} onClose={() => setMoreOpen(false)} variant="drawer" title="More">
        <div className="stack" style={{ gap: 4 }}>
          {ZONES.filter(z => !MOBILE_PRIMARY_PATHS.has(z.path)).map(({ path, label, icon: Icon }) => (
            <button key={path} className="side-nav-more-item" onClick={() => goTo(path)}>
              <Icon size={18} strokeWidth={2} /> <span>{label}</span>
            </button>
          ))}
          <button className="side-nav-more-item" onClick={() => goTo('/control-center')}>
            <Settings size={18} strokeWidth={2} /> <span>Control Center</span>
          </button>
          <button className="side-nav-more-item" onClick={() => { setMoreOpen(false); window.dispatchEvent(new Event('quickjump:open')); }}>
            <Search size={18} strokeWidth={2} /> <span>Search / Jump</span>
          </button>
          <button className="side-nav-more-item" onClick={signOut}>
            <LogOut size={18} strokeWidth={2} /> <span>Sign out</span>
          </button>
        </div>
      </Overlay>
    </nav>
  );
}