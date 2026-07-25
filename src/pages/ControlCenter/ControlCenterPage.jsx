import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader.jsx';
import SubTabNav from '../../components/nav/SubTabNav.jsx';
import CategoriesSection from './CategoriesSection.jsx';
import AppearanceSection from './AppearanceSection.jsx';
import FeaturesSection from './FeaturesSection.jsx';
import AiSection from './AiSection.jsx';
import MemorySection from './MemorySection.jsx';
import DataSection from './DataSection.jsx';

const SECTIONS = [
  { key: 'categories', label: 'Categories' },
  { key: 'appearance', label: 'Appearance' },
  { key: 'features', label: 'Feature Toggles' },
  { key: 'ai', label: 'AI Settings' },
  { key: 'memory', label: 'Development Memory' },
  { key: 'data', label: 'Data' },
];

// Batch 6 — full split of the page that used to hold all 6 sections
// (plus DecisionsPanel and ResetSection) inline, 565 lines in one
// file. This is the proof-of-pattern page for the monolith splits:
// each section is now its own file under this folder, this file is
// composition only.
export default function ControlCenterPage() {
  const [section, setSection] = useState('categories');

  return (
    <div>
      <PageHeader icon={Settings} title="Control Center" subtitle="The backstage area — adjust your system yourself instead of asking for a code change." />
      <SubTabNav tabs={SECTIONS} active={section} onChange={setSection} />

      {section === 'categories' && <CategoriesSection />}
      {section === 'appearance' && <AppearanceSection />}
      {section === 'features' && <FeaturesSection />}
      {section === 'ai' && <AiSection />}
      {section === 'memory' && <MemorySection />}
      {section === 'data' && <DataSection />}
    </div>
  );
}
