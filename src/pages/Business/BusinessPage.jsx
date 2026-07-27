import React from 'react';
import { Briefcase } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader.jsx';
import GroupedTabNav from '../../components/nav/GroupedTabNav.jsx';
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
import CommunityTab from './CommunityTab.jsx';
import ResearchLogTab from './ResearchLogTab.jsx';
import ImprovementLogTab from './ImprovementLogTab.jsx';

// Grouped per the Shell & Layout Specification, Section 4 — Business
// had grown to 10 flat tabs, past the point a flat row stays
// predictable, especially on mobile. Grouping is fixed and permanent:
// a new tab gets slotted into one of these four, it doesn't earn a
// new top-level group without a deliberate conversation about it.
//
// Dashboard stands alone (it's the landing view, not a category of
// its own). The other nine split into three groups matching how the
// business actually thinks about them, not how they were built:
//   Relationships — the people side: pipeline, contacts, clients
//   Growth — the output side: content, marketing, funnels, roadmap
//   Reference — things you consult rather than act on: library, reports
const TAB_GROUPS = [
  { key: 'dashboard', label: 'Dashboard', tabs: [{ key: 'dashboard', label: 'Dashboard' }] },
  {
    key: 'relationships', label: 'Relationships', tabs: [
      { key: 'relationships', label: 'Relationships' },
      { key: 'pipeline', label: 'Pipeline' },
      { key: 'clients', label: 'Clients' },
      { key: 'community', label: 'Community' },
    ]
  },
  {
    key: 'growth', label: 'Growth', tabs: [
      { key: 'content', label: 'Content' },
      { key: 'marketing', label: 'Marketing' },
      { key: 'funnels', label: 'Funnels' },
      { key: 'roadmap', label: 'Roadmap' },
    ]
  },
  {
    key: 'reference', label: 'Reference', tabs: [
      { key: 'library', label: 'Library' },
      { key: 'reports', label: 'Reports' },
      { key: 'research', label: 'Research' },
      { key: 'improvement', label: 'Improvement Log' },
    ]
  },
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
      <GroupedTabNav groups={TAB_GROUPS} active={tab} onChange={t => navigate(`/business/${t}`)} />

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
      {tab === 'community' && <CommunityTab />}
      {tab === 'research' && <ResearchLogTab />}
      {tab === 'improvement' && <ImprovementLogTab />}
    </div>
  );
}
