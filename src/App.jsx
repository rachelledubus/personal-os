import React, { useEffect, useState, Suspense, lazy } from 'react';
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
import { CapacityModeProvider } from './components/layout/CapacityModeContext.jsx';
import Skeleton from './components/ui/Skeleton.jsx';
import { getFeatureFlag } from './services/settings.js';
import AuthScreen from './pages/AuthScreen.jsx';

// Stage L — route-based code splitting. Each top-level page is its
// own chunk now instead of one bundle with all 7 zones' worth of code
// loaded up front. Done after the monolith splits (Batches 6-9) on
// purpose — a lazy chunk for a 1,700-line BusinessPage was a bad
// trade before; a lazy chunk for BusinessPage's now-60-line shell
// (which pulls in its own tab chunks as needed) is a real win.
const TodayPage = lazy(() => import('./pages/Today/TodayPage.jsx'));
const FocusMode = lazy(() => import('./pages/Today/FocusMode.jsx'));
const ResearchMode = lazy(() => import('./pages/Today/ResearchMode.jsx'));

const PlannerPage = lazy(() => import('./pages/Plan/PlannerPage.jsx'));

const GrowPage = lazy(() => import('./pages/Grow/GrowPage.jsx'));

const BusinessPage = lazy(() => import('./pages/Business/BusinessPage.jsx'));
const ContentPiecePage = lazy(() => import('./pages/Business/ContentPiecePage.jsx'));
const BusinessWeeklyResetPage = lazy(() => import('./pages/Business/BusinessWeeklyResetPage.jsx'));
const GuidedFlow = lazy(() => import('./pages/Business/GuidedFlow.jsx'));
const ReviewPage = lazy(() => import('./pages/Review/ReviewPage.jsx'));

const LibraryPage = lazy(() => import('./pages/Library/LibraryPage.jsx'));

const InboxPage = lazy(() => import('./pages/Inbox/InboxPage.jsx'));
const ControlCenterPage = lazy(() => import('./pages/ControlCenter/ControlCenterPage.jsx'));

export default function App() {
  const { user, loading } = useAuth();
  const [showDecorations, setShowDecorations] = useState(true);

  useEffect(() => {
    if (user) {
      getFeatureFlag('show_decorations').then(setShowDecorations);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="app-loading" style={{ flexDirection: 'column', gap: 12, width: 240 }}>
        <Skeleton height={24} />
        <Skeleton width="70%" />
        <Skeleton width="85%" />
      </div>
    );
  }
  if (!user) return <AuthScreen />;

  return (
    <CapacityModeProvider>
    <div className="app-shell">
      {showDecorations && <KawaiiBackdrop />}
      <SideNav />
      <TimerProvider>
        <div className="app-content">
          <Breadcrumb />
          <Suspense fallback={
            <div className="stack" style={{ gap: 'var(--space-3)', padding: 'var(--space-5)' }}>
              <Skeleton variant="card" />
              <Skeleton variant="card" />
            </div>
          }>
          <Routes>
            <Route path="/" element={<Navigate to="/today" replace />} />

            <Route path="/today" element={<TodayPage />} />
            <Route path="/today/focus" element={<FocusMode />} />
            <Route path="/today/research" element={<ResearchMode />} />

            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/control-center" element={<ControlCenterPage />} />

            <Route path="/plan" element={<PlannerPage />} />
            <Route path="/plan/:tab" element={<PlannerPage />} />
            <Route path="/plan/meals" element={<Navigate to="/grow/nutrition" replace />} />

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
          </Suspense>
        </div>
        <MiniTimerBar />
      </TimerProvider>
      {showDecorations && <Companion />}
      <GlobalCapture />
      <QuickJump />
    </div>
    </CapacityModeProvider>
  );
}