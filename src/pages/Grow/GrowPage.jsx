import React from 'react';
import { Sprout } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import Banner from '../../components/ui/Banner.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import GroupedTabNav from '../../components/nav/GroupedTabNav.jsx';
import HabitsTab from './HabitsTab.jsx';
import WorkoutsTab from './WorkoutsTab.jsx';
import ChoresTab from './ChoresTab.jsx';
import MaintenanceTab from './MaintenanceTab.jsx';
import FinanceTab from './FinanceTab.jsx';
import MealPlannerPage from '../Plan/MealPlannerPage.jsx';

// Batch 7 — full split, same pattern as Batch 6. 882 lines down to
// composition only; the 9 direct calls moved into services/habits.js.
// Grouped per the Shell spec Section 4 (domain-based, matching the
// Master Reference's suggestion): Body covers the person, Home covers
// the house, Money stands alone since it doesn't share a domain with
// either.
const TAB_GROUPS = [
  {
    key: 'body', label: 'Body', tabs: [
      { key: 'habits', label: 'Systems' },
      { key: 'workouts', label: 'Workouts' },
      { key: 'nutrition', label: 'Nutrition' },
    ]
  },
  {
    key: 'home', label: 'Home', tabs: [
      { key: 'chores', label: 'Chores' },
      { key: 'maintenance', label: 'Maintenance' },
    ]
  },
  { key: 'finance', label: 'Finance', tabs: [{ key: 'finance', label: 'Finance' }] },
];

export default function GrowPage() {
  const { tab = 'habits' } = useParams();
  const navigate = useNavigate();

  return (
    <div>
      <Banner slotKey="grow_banner" scene="grow" />
      <PageHeader icon={Sprout} title="Grow" />
      <GroupedTabNav groups={TAB_GROUPS} active={tab} onChange={t => navigate(`/grow/${t}`)} />

      {tab === 'habits' && <HabitsTab />}
      {tab === 'workouts' && <WorkoutsTab />}
      {tab === 'chores' && <ChoresTab />}
      {tab === 'maintenance' && <MaintenanceTab />}
      {tab === 'finance' && <FinanceTab />}
      {tab === 'nutrition' && <MealPlannerPage embedded />}
    </div>
  );
}
