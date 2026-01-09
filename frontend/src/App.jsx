import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { AdminProvider } from './context/AdminContext';
import { lazy, Suspense } from 'react';

// Eagerly loaded pages (critical path)
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import Dashboard from './pages/Dashboard';

// Lazy loaded pages (code splitting)
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const AdminTeamPage = lazy(() => import('./pages/AdminTeamPage'));
const AdminContactsPage = lazy(() => import('./pages/AdminContactsPage'));
const AdminAnalyticsPage = lazy(() => import('./pages/AdminAnalyticsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const FollowupsPage = lazy(() => import('./pages/FollowupsPage'));
const StageFollowupsPage = lazy(() => import('./pages/StageFollowupsPage'));

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-100 flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
  </div>
);

// Authenticated Route Component - Accessible by both employees AND admins
// Use this for shared pages like Settings, Followups, etc.
const AuthenticatedRoute = ({ children }) => {
  const { isAuthenticated, loading, needsOnboarding } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (needsOnboarding) return <Navigate to="/onboarding" />;

  return children;
};

// Protected Route Component (for employees only - admins go to admin dashboard)
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, needsOnboarding, isAdmin } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (needsOnboarding) return <Navigate to="/onboarding" />;
  // Redirect admins to their dashboard
  if (isAdmin) return <Navigate to="/admin" />;

  return children;
};

// Admin Route Component - Only accessible by admins
const AdminRoute = ({ children }) => {
  const { isAuthenticated, loading, needsOnboarding, isAdmin } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (needsOnboarding) return <Navigate to="/onboarding" />;
  if (!isAdmin) return <Navigate to="/dashboard" />;

  return children;
};

// Onboarding Route Component
const OnboardingRoute = ({ children }) => {
  const { isAuthenticated, loading, needsOnboarding } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!needsOnboarding) return <Navigate to="/dashboard" />;

  return children;
};

// Public Route Component (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, needsOnboarding, isAdmin } = useAuth();

  if (loading) return <LoadingSpinner />;

  if (isAuthenticated) {
    if (needsOnboarding) return <Navigate to="/onboarding" />;
    // Admins go to admin team page, employees go to regular dashboard
    return <Navigate to={isAdmin ? "/admin/team" : "/dashboard"} />;
  }

  return children;
};

// Suspense wrapper for lazy loaded components
const SuspenseWrapper = ({ children }) => (
  <Suspense fallback={<LoadingSpinner />}>
    {children}
  </Suspense>
);

function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <CurrencyProvider>
          <AdminProvider>
            <BrowserRouter>
              <Routes>
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                }
              />
              <Route
                path="/onboarding"
                element={
                  <OnboardingRoute>
                    <OnboardingPage />
                  </OnboardingRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              
              {/* Admin routes with nested layout */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <SuspenseWrapper>
                      <AdminLayout />
                    </SuspenseWrapper>
                  </AdminRoute>
                }
              >
                <Route index element={<Navigate to="/admin/team" replace />} />
                <Route path="team" element={<AdminTeamPage />} />
                <Route path="contacts" element={<AdminContactsPage />} />
                <Route path="analytics" element={<AdminAnalyticsPage />} />
              </Route>
              
              <Route
                path="/settings"
                element={
                  <AuthenticatedRoute>
                    <SuspenseWrapper>
                      <SettingsPage />
                    </SuspenseWrapper>
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="/followups/:contactId"
                element={
                  <AuthenticatedRoute>
                    <SuspenseWrapper>
                      <FollowupsPage />
                    </SuspenseWrapper>
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="/:stage/followups"
                element={
                  <AuthenticatedRoute>
                    <SuspenseWrapper>
                      <StageFollowupsPage />
                    </SuspenseWrapper>
                  </AuthenticatedRoute>
                }
              />
                <Route path="/" element={<Navigate to="/login" />} />
                <Route path="*" element={<Navigate to="/login" />} />
              </Routes>
            </BrowserRouter>
          </AdminProvider>
        </CurrencyProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
