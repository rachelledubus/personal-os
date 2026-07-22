import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dumbbell, Sparkles, Star, Calendar, Megaphone, Phone, Map, Lightbulb, Circle,
} from 'lucide-react';
import Checkbox from '../ui/Checkbox.jsx';
import './MissionCard.css';

const ICONS = {
  dumbbell: Dumbbell, sparkles: Sparkles, star: Star, calendar: Calendar,
  megaphone: Megaphone, phone: Phone, map: Map, lightbulb: Lightbulb, circle: Circle,
};

export default function MissionCard({ mission, active, onToggle, onDismiss }) {
  const navigate = useNavigate();
  const Icon = ICONS[mission.icon] || Circle;

  return (
    <div className={`mission-card track-${mission.track} ${active ? 'mission-active' : ''} ${mission.done ? 'mission-done' : ''}`}>
      <div className="mission-track-bar" />
      <div className="mission-icon"><Icon size={17} strokeWidth={2} /></div>
      <div className="mission-body" onClick={() => mission.linkTo && navigate(mission.linkTo)}>
        <div className="mission-title">{mission.title}</div>
        {mission.context && <div className="mission-context">{mission.context}</div>}
      </div>
      {!mission.informational && (
        <Checkbox checked={!!mission.done} onChange={(v) => onToggle(mission, v)} />
      )}
      {onDismiss && (
        <button className="mission-dismiss" onClick={() => onDismiss(mission)} aria-label="Dismiss for today">
          ×
        </button>
      )}
    </div>
  );
}
