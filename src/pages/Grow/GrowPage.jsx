import React from 'react';
import { Sprout } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import Banner from '../../components/ui/Banner.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import SubTabNav from '../../components/nav/SubTabNav.jsx';
import HabitsTab from './HabitsTab.jsx';
import WorkoutsTab from './WorkoutsTab.jsx';
import ChoresTab from './ChoresTab.jsx';
import MaintenanceTab from './MaintenanceTab.jsx';
import FinanceTab from './FinanceTab.jsx';
import MealPlannerPage from '../Plan/MealPlannerPage.jsx';

// Batch 7 — full split, same pattern as Batch 6's ControlCenterPage.
// 882 lines (6 sections + 9 inline Supabase calls) down to composition
// only; the 9 direct calls moved into the new services/habits.js.
const TABS = [
  { key: 'habits', label: 'Systems' }, // "Habits" -> "Systems": per backlog #8, route key unchanged so nothing downstream breaks
  { key: 'workouts', label: 'Workouts' },
  { key: 'chores', label: 'Chores' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'finance', label: 'Finance' },
  { key: 'nutrition', label: 'Nutrition' },
];

export default function GrowPage() {
  const { tab = 'habits' } = useParams();
  const navigate = useNavigate();

  return (
    <div>
      <Banner slotKey="grow_banner" scene="grow" />
      <PageHeader icon={Sprout} title="Grow" />
      <SubTabNav tabs={TABS} active={tab} onChange={t => navigate(`/grow/${t}`)} />

      {tab === 'habits' && <HabitsTab />}
      {tab === 'workouts' && <WorkoutsTab />}
      {tab === 'chores' && <ChoresTab />}
      {tab === 'maintenance' && <MaintenanceTab />}
      {tab === 'finance' && <FinanceTab />}
      {tab === 'nutrition' && <MealPlannerPage embedded />}
    </div>
  );
}
