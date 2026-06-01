import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';

import ProtectedRoute from './components/ProtectedRoute';

// Lazy load pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const DocumentDetailPage = lazy(() => import('./pages/DocumentDetailPage'));
const GapAnalysisPage = lazy(() => import('./pages/GapAnalysisPage'));

const Fallback = () => (
  <div className="flex h-screen w-full items-center justify-center bg-surface-50">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-surface-200 border-t-primary-600"></div>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/document/:id"
            element={
              <ProtectedRoute>
                <DocumentDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gap-analysis"
            element={
              <ProtectedRoute>
                <GapAnalysisPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </Router>
  </React.StrictMode>
);