import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import SideNav from './components/nav/SideNav.jsx';
import GlobalCapture from './components/capture/GlobalCapture.jsx';
import KawaiiBackdrop from './components/ui/KawaiiBackdrop.jsx';
import RunningChibi from './components/ui/RunningChibi.jsx';
import { getFeatureFlag, getRunningChibiVariant } from './services/settings.js';
import AuthScreen from './pages/AuthScreen.jsx';

import TodayPage from './pages/Today/TodayPage.jsx';
import FocusMode from './pages/Today/FocusMode.jsx';
import ResearchMode from './pages/Today/ResearchMode.jsx';

import PlannerPage from './pages/Plan/PlannerPage.jsx';
import MealPlannerPage from './pages/Plan/MealPlannerPage.jsx';

import GrowPage from './pages/Grow/GrowPage.jsx';

import BusinessPage from './pages/Business/BusinessPage.jsx';
import GuidedFlow from './pages/Business/GuidedFlow.jsx';

import LibraryPage from './pages/Library/LibraryPage.jsx';

import InboxPage from './pages/Inbox/InboxPage.jsx';
import ControlCenterPage from './pages/ControlCenter/ControlCenterPage.jsx';

export default function App() {
  const { user, loading } = useAuth();
  const [showDecorations, setShowDecorations] = useState(true);
  const [chibiVariant, setChibiVariant] = useState('bunny');

  useEffect(() => {
    if (user) {
      getFeatureFlag('show_decorations').then(setShowDecorations);
      getRunningChibiVariant().then(setChibiVariant);
    }
  }, [user]);

  if (loading) return <div className="app-loading">Loading…</div>;
  if (!user) return <AuthScreen />;

  return (
    <div className="app-shell">
      {showDecorations && <KawaiiBackdrop />}
      {showDecorations && <RunningChibi variant={chibiVariant} />}
      <SideNav />
      <div className="app-content">
        <Routes>
          <Route path="/" element={<Navigate to="/today" replace />} />

          <Route path="/today" element={<TodayPage />} />
          <Route path="/today/focus" element={<FocusMode />} />
          <Route path="/today/research" element={<ResearchMode />} />

          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/control-center" element={<ControlCenterPage />} />

          <Route path="/plan" element={<PlannerPage />} />
          <Route path="/plan/:tab" element={<PlannerPage />} />
          <Route path="/plan/meals" element={<MealPlannerPage />} />

          <Route path="/grow" element={<GrowPage />} />
          <Route path="/grow/:tab" element={<GrowPage />} />

          <Route path="/business" element={<BusinessPage />} />
          <Route path="/business/:tab" element={<BusinessPage />} />
          <Route path="/business/flows/:flowKey" element={<GuidedFlow />} />

          <Route path="/library" element={<LibraryPage />} />
          <Route path="/library/:tab" element={<LibraryPage />} />

          <Route path="*" element={<Navigate to="/today" replace />} />
        </Routes>
      </div>
      <GlobalCapture />
    </div>
  );
}
