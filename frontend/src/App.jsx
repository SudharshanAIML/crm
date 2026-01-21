import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { AdminProvider } from './context/AdminContext';
import { EmailCacheProvider } from './context/EmailCacheContext';
import { ContactsCacheProvider } from './context/ContactsCacheContext';
import { SessionsCacheProvider } from './context/SessionsCacheContext';
import { lazy, Suspense } from 'react';

// Eagerly loaded pages (critical path)
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';

// Lazy loaded layouts
const DashboardLayout = lazy(() => import('./components/layout/DashboardLayout'));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));

// Lazy loaded dashboard pages
const ContactsPage = lazy(() => import('./pages/ContactsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const GmailPage = lazy(() => import('./pages/GmailPage'));

// Lazy loaded admin pages
const AdminTeamPage = lazy(() => import('./pages/AdminTeamPage'));
const AdminContactsPage = lazy(() => import('./pages/AdminContactsPage'));
const AdminAnalyticsPage = lazy(() => import('./pages/AdminAnalyticsPage'));

// Lazy loaded shared pages
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const FollowupsPage = lazy(() => import('./pages/FollowupsPage'));
const StageFollowupsPage = lazy(() => import('./pages/StageFollowupsPage'));

// Loading Spinner Component - Full page
const LoadingSpinner = () => (
  <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-100 flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
  </div>
);

// Inline loading indicator for nested routes (doesn't cause layout shift)
const InlineLoader = () => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
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
  if (!isAdmin) return <Navigate to="/contacts/lead" />;

  return children;
};

// Onboarding Route Component
const OnboardingRoute = ({ children }) => {
  const { isAuthenticated, loading, needsOnboarding } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!needsOnboarding) return <Navigate to="/contacts/lead" />;

  return children;
};

// Public Route Component (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, needsOnboarding, isAdmin } = useAuth();

  if (loading) return <LoadingSpinner />;

  if (isAuthenticated) {
    if (needsOnboarding) return <Navigate to="/onboarding" />;
    // Admins go to admin team page, employees go to contacts
    return <Navigate to={isAdmin ? "/admin/team" : "/contacts/lead"} />;
  }

  return children;
};

// Suspense wrapper for lazy loaded components (full page)
const SuspenseWrapper = ({ children }) => (
  <Suspense fallback={<LoadingSpinner />}>
    {children}
  </Suspense>
);

// Suspense wrapper for nested routes (inline, no layout shift)
const NestedSuspense = ({ children }) => (
  <Suspense fallback={<InlineLoader />}>
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
            <EmailCacheProvider>
              <ContactsCacheProvider>
                <SessionsCacheProvider>
                <BrowserRouter>
                  <Routes>
                  {/* Public Routes */}
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

                {/* Dashboard Layout with nested routes */}
                <Route
                  element={
                    <ProtectedRoute>
                      <SuspenseWrapper>
                        <DashboardLayout />
                      </SuspenseWrapper>
                    </ProtectedRoute>
                  }
                >
                  {/* Contact Stage Routes */}
                  <Route path="/contacts/:stage" element={<NestedSuspense><ContactsPage /></NestedSuspense>} />
                  
                  {/* Session/Followup Stage Routes */}
                  <Route path="/sessions/:stage" element={<NestedSuspense><StageFollowupsPage /></NestedSuspense>} />
                  
                  {/* Workspace View Routes */}
                  <Route path="/analytics" element={<NestedSuspense><AnalyticsPage /></NestedSuspense>} />
                  <Route path="/calendar" element={<NestedSuspense><CalendarPage /></NestedSuspense>} />
                  <Route path="/gmail" element={<NestedSuspense><GmailPage /></NestedSuspense>} />
                </Route>

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
                  <Route path="team" element={<NestedSuspense><AdminTeamPage /></NestedSuspense>} />
                  <Route path="contacts" element={<NestedSuspense><AdminContactsPage /></NestedSuspense>} />
                  <Route path="analytics" element={<NestedSuspense><AdminAnalyticsPage /></NestedSuspense>} />
                </Route>

                {/* Settings - Accessible by all authenticated users */}
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

                {/* Followups for individual contact */}
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

                {/* Redirects */}
                <Route path="/dashboard" element={<Navigate to="/contacts/lead" replace />} />
                <Route path="/contacts" element={<Navigate to="/contacts/lead" replace />} />
                <Route path="/" element={<Navigate to="/login" />} />
                <Route path="*" element={<Navigate to="/login" />} />
                </Routes>
                </BrowserRouter>
                </SessionsCacheProvider>
              </ContactsCacheProvider>
            </EmailCacheProvider>
          </AdminProvider>
        </CurrencyProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
