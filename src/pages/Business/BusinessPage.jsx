import React from 'react';
import { Briefcase } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader.jsx';
import SubTabNav from '../../components/nav/SubTabNav.jsx';
import Banner from '../../components/ui/Banner.jsx';
import DashboardTab from './DashboardTab.jsx';
import PipelineTab from './PipelineTab.jsx';
import RelationshipsTab from './RelationshipsTab.jsx';
import ContentTab from './ContentTab.jsx';
import MarketingTab from './MarketingTab.jsx';
import LibraryTab from './LibraryTab.jsx';
import ClientsTab from './ClientsTab.jsx';
import RoadmapTab from './RoadmapTab.jsx';
import ReportsTab from './ReportsTab.jsx';
import FunnelsTab from './FunnelsTab.jsx';

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'relationships', label: 'Relationships' },
  { key: 'content', label: 'Content' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'library', label: 'Library' },
  { key: 'clients', label: 'Clients' },
  { key: 'roadmap', label: 'Roadmap' },
  { key: 'reports', label: 'Reports' },
  { key: 'funnels', label: 'Funnels' },
];

// Batch 8 — full split, same pattern as Batches 6-7. 1,740 lines (10
// tabs + several private sub-components) down to composition only.
// The 2 direct Supabase calls (RoadmapTab's load) now go through
// timeline.js's listRoadmapItems(). STATUS_TONE consolidated into the
// shared Badge primitive across PipelineTab, ContactProfilePanel, and
// BusinessWeeklyResetPage — one mapping instead of three, one of
// which had drifted to stale fallback colors.
export default function BusinessPage() {
  const { tab = 'dashboard' } = useParams();
  const navigate = useNavigate();

  return (
    <div>
      <Banner slotKey="business_banner" scene="business" />
      <PageHeader icon={Briefcase} title="Business" />
      <SubTabNav tabs={TABS} active={tab} onChange={t => navigate(`/business/${t}`)} />

      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'pipeline' && <PipelineTab />}
      {tab === 'relationships' && <RelationshipsTab />}
      {tab === 'content' && <ContentTab />}
      {tab === 'marketing' && <MarketingTab />}
      {tab === 'library' && <LibraryTab />}
      {tab === 'clients' && <ClientsTab />}
      {tab === 'roadmap' && <RoadmapTab />}
      {tab === 'reports' && <ReportsTab />}
      {tab === 'funnels' && <FunnelsTab />}
    </div>
  );
}
