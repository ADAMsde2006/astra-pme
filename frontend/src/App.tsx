import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { OverviewPage } from './pages/OverviewPage';
import { WatchlistPage } from './pages/WatchlistPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { FieldAuditPage } from './pages/FieldAuditPage';
import { ContradictionLedgerPage } from './pages/ContradictionLedgerPage';
import { ExitLedgerPage } from './pages/ExitLedgerPage';
import { EarlyWarningPage } from './pages/EarlyWarningPage';
import { PredictionsPage } from './pages/PredictionsPage';
import { DriversPage } from './pages/DriversPage';
import { BenchmarkingPage } from './pages/BenchmarkingPage';
import { AssistantPage } from './pages/AssistantPage';
import { ModelCardPage } from './pages/ModelCardPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="overview" element={<OverviewPage />} />
          <Route path="watchlist" element={<WatchlistPage />} />
          <Route path="projects/:projectCode" element={<ProjectDetailPage />} />
          <Route path="audit" element={<FieldAuditPage />} />
          <Route path="contradictions" element={<ContradictionLedgerPage />} />
          <Route path="exits" element={<ExitLedgerPage />} />
          <Route path="early-warning" element={<EarlyWarningPage />} />
          <Route path="predictions" element={<PredictionsPage />} />
          <Route path="drivers" element={<DriversPage />} />
          <Route path="benchmarking" element={<BenchmarkingPage />} />
          <Route path="assistant" element={<AssistantPage />} />
          <Route path="model-card" element={<ModelCardPage />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
