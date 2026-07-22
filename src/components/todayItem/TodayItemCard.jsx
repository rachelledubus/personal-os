import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dumbbell, Sparkles, Star, Calendar, Megaphone, Phone, Map, Lightbulb, Circle,
} from 'lucide-react';
import Checkbox from '../ui/Checkbox.jsx';
import './TodayItemCard.css';

const ICONS = {
  dumbbell: Dumbbell, sparkles: Sparkles, star: Star, calendar: Calendar,
  megaphone: Megaphone, phone: Phone, map: Map, lightbulb: Lightbulb, circle: Circle,
};

export default function TodayItemCard({ item, active, onToggle, onDismiss }) {
  const navigate = useNavigate();
  const Icon = ICONS[item.icon] || Circle;

  return (
    <div className={`today-item-card track-${item.track} ${active ? 'today-item-active' : ''} ${item.done ? 'today-item-done' : ''}`}>
      <div className="today-item-track-bar" />
      <div className="today-item-icon"><Icon size={17} strokeWidth={2} /></div>
      <div className="today-item-body" onClick={() => item.linkTo && navigate(item.linkTo)}>
        <div className="today-item-title">{item.title}</div>
        {item.context && <div className="today-item-context">{item.context}</div>}
      </div>
      {!item.informational && (
        <Checkbox checked={!!item.done} onChange={(v) => onToggle(item, v)} />
      )}
      {onDismiss && (
        <button className="today-item-dismiss" onClick={() => onDismiss(item)} aria-label="Dismiss for today">
          ×
        </button>
      )}
    </div>
  );
}
