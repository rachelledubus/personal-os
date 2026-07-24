import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { TimerProvider } from './context/TimerContext.jsx';
import SideNav from './components/nav/SideNav.jsx';
import Breadcrumb from './components/nav/Breadcrumb.jsx';
import QuickJump from './components/nav/QuickJump.jsx';
import GlobalCapture from './components/capture/GlobalCapture.jsx';
import KawaiiBackdrop from './components/ui/KawaiiBackdrop.jsx';
import Companion from './components/companion/Companion.jsx';
import MiniTimerBar from './components/timer/MiniTimerBar.jsx';
import { getFeatureFlag } from './services/settings.js';
import AuthScreen from './pages/AuthScreen.jsx';

import TodayPage from './pages/Today/TodayPage.jsx';
import FocusMode from './pages/Today/FocusMode.jsx';
import ResearchMode from './pages/Today/ResearchMode.jsx';

import PlannerPage from './pages/Plan/PlannerPage.jsx';
import MealPlannerPage from './pages/Plan/MealPlannerPage.jsx';

import GrowPage from './pages/Grow/GrowPage.jsx';

import BusinessPage from './pages/Business/BusinessPage.jsx';
import ContentPiecePage from './pages/Business/ContentPiecePage.jsx';
import BusinessWeeklyResetPage from './pages/Business/BusinessWeeklyResetPage.jsx';
import GuidedFlow from './pages/Business/GuidedFlow.jsx';
import ReviewPage from './pages/Review/ReviewPage.jsx';

import LibraryPage from './pages/Library/LibraryPage.jsx';

import InboxPage from './pages/Inbox/InboxPage.jsx';
import ControlCenterPage from './pages/ControlCenter/ControlCenterPage.jsx';

export default function App() {
  const { user, loading } = useAuth();
  const [showDecorations, setShowDecorations] = useState(true);

  useEffect(() => {
    if (user) {
      getFeatureFlag('show_decorations').then(setShowDecorations);
    }
  }, [user]);

  if (loading) return <div className="app-loading">Loading…</div>;
  if (!user) return <AuthScreen />;

  return (
    <div className="app-shell">
      {showDecorations && <KawaiiBackdrop />}
      <SideNav />
      <TimerProvider>
        <div className="app-content">
          <Breadcrumb />
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
            <Route path="/business/content/:id" element={<ContentPiecePage />} />
            <Route path="/business/weekly-reset" element={<BusinessWeeklyResetPage />} />
            <Route path="/business/flows/:flowKey" element={<GuidedFlow />} />
            <Route path="/review" element={<ReviewPage />} />

            <Route path="/library" element={<LibraryPage />} />
            <Route path="/library/:tab" element={<LibraryPage />} />

            <Route path="*" element={<Navigate to="/today" replace />} />
          </Routes>
        </div>
        <MiniTimerBar />
      </TimerProvider>
      {showDecorations && <Companion />}
      <GlobalCapture />
      <QuickJump />
    </div>
  );
}