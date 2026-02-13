import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { AdminProvider } from './context/AdminContext';
import { EmailCacheProvider } from './context/EmailCacheContext';
import { ContactsCacheProvider } from './context/ContactsCacheContext';
import { SessionsCacheProvider } from './context/SessionsCacheContext';
import { SocketProvider } from './context/SocketContext';
import { useRoutePrefetch } from './hooks/useRoutePrefetch';
import { lazy, Suspense, Component, memo } from 'react';

// ============================================================================
// LAZY LOADED COMPONENTS - All pages use code splitting for optimal performance
// ============================================================================

// Public pages (unauthenticated)
const LoginPage = lazy(() => import('./pages/LoginPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const PublicPageView = lazy(() => import('./pages/PublicPageView'));
const AcceptAppointmentPage = lazy(() => import('./pages/AcceptAppointmentPage'));

// Layouts
const DashboardLayout = lazy(() => import('./components/layout/DashboardLayout'));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));

// Dashboard pages (employees)
const ContactsPage = lazy(() => import('./pages/ContactsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const GmailPage = lazy(() => import('./pages/GmailPage'));
const StageFollowupsPage = lazy(() => import('./pages/StageFollowupsPage'));

// Admin pages
const AdminTeamPage = lazy(() => import('./pages/AdminTeamPage'));
const AdminAnalyticsPage = lazy(() => import('./pages/AdminAnalyticsPage'));

// Page builder feature
const PagesListPage = lazy(() => import('./pages/PagesListPage'));
const PageBuilderPage = lazy(() => import('./pages/PageBuilderPage'));
const PageResponsesPage = lazy(() => import('./pages/PageResponsesPage'));

// Discuss (Team Chat)
const DiscussPage = lazy(() => import('./pages/DiscussPage'));

// Shared pages (all authenticated users)
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const FollowupsPage = lazy(() => import('./pages/FollowupsPage'));

// ============================================================================
// ERROR BOUNDARY - Graceful error handling for lazy loaded components
// ============================================================================
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Route loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-6">We encountered an error loading this page.</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-sky-500 hover:bg-sky-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// LOADING STATES - Optimized loading indicators
// ============================================================================

// Full page loading spinner (for initial page loads and public routes)
const LoadingSpinner = () => (
  <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-100 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4"></div>
      <p className="text-gray-600 text-sm">Loading...</p>
    </div>
  </div>
);

// Inline loading indicator for nested routes (minimal layout shift)
const InlineLoader = () => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
  </div>
);

// ============================================================================
// ROUTE GUARDS - Memoized for performance
// ============================================================================

// Authenticated Route Component - Accessible by both employees AND admins
const AuthenticatedRoute = memo(({ children }) => {
  const { isAuthenticated, loading, needsOnboarding } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (needsOnboarding) return <Navigate to="/onboarding" replace />;

  return children;
});
AuthenticatedRoute.displayName = 'AuthenticatedRoute';

// Protected Route Component (for employees only)
const ProtectedRoute = memo(({ children }) => {
  const { isAuthenticated, loading, needsOnboarding, isAdmin } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (needsOnboarding) return <Navigate to="/onboarding" replace />;
  if (isAdmin) return <Navigate to="/admin/team" replace />;

  return children;
});
ProtectedRoute.displayName = 'ProtectedRoute';

// Admin Route Component - Only accessible by admins
const AdminRoute = memo(({ children }) => {
  const { isAuthenticated, loading, needsOnboarding, isAdmin } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (needsOnboarding) return <Navigate to="/onboarding" replace />;
  if (!isAdmin) return <Navigate to="/contacts/lead" replace />;

  return children;
});
AdminRoute.displayName = 'AdminRoute';

// Onboarding Route Component
const OnboardingRoute = memo(({ children }) => {
  const { isAuthenticated, loading, needsOnboarding } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!needsOnboarding) return <Navigate to="/contacts/lead" replace />;

  return children;
});
OnboardingRoute.displayName = 'OnboardingRoute';

// Public Route Component (redirect if already logged in)
const PublicRoute = memo(({ children }) => {
  const { isAuthenticated, loading, needsOnboarding, isAdmin } = useAuth();

  if (loading) return <LoadingSpinner />;

  if (isAuthenticated) {
    if (needsOnboarding) return <Navigate to="/onboarding" replace />;
    return <Navigate to={isAdmin ? "/admin/team" : "/contacts/lead"} replace />;
  }

  return children;
});
PublicRoute.displayName = 'PublicRoute';

// ============================================================================
// SUSPENSE WRAPPERS - Handles lazy loading states with error boundaries
// ============================================================================

// Full page suspense wrapper with error boundary
const SuspenseWrapper = ({ children }) => (
  <ErrorBoundary>
    <Suspense fallback={<LoadingSpinner />}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

// Nested route suspense wrapper with error boundary (minimal UI shift)
const NestedSuspense = ({ children }) => (
  <ErrorBoundary>
    <Suspense fallback={<InlineLoader />}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

// ============================================================================
// ROUTE PREFETCH WRAPPER - Automatically prefetches likely next routes
// ============================================================================
const RoutePrefetchWrapper = ({ children }) => {
  useRoutePrefetch(); // Automatically prefetch routes based on location
  return children;
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
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
                  <SocketProvider>
                  <BrowserRouter>
                    <RoutePrefetchWrapper>
                      <Routes>
                        {/* ===== PUBLIC ROUTES ===== */}
                        <Route
                          path="/login"
                          element={
                            <PublicRoute>
                              <SuspenseWrapper>
                                <LoginPage />
                              </SuspenseWrapper>
                            </PublicRoute>
                          }
                        />
                        
                        {/* Public appointment acceptance route (no auth) */}
                        <Route
                          path="/accept/:token"
                          element={
                            <SuspenseWrapper>
                              <AcceptAppointmentPage />
                            </SuspenseWrapper>
                          }
                        />
                        
                        <Route
                          path="/onboarding"
                          element={
                            <OnboardingRoute>
                              <SuspenseWrapper>
                                <OnboardingPage />
                              </SuspenseWrapper>
                            </OnboardingRoute>
                          }
                        />

                        {/* ===== EMPLOYEE DASHBOARD ROUTES ===== */}
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
                          
                          {/* Pages (Landing Page Builder) */}
                          <Route path="/pages" element={<NestedSuspense><PagesListPage /></NestedSuspense>} />
                          <Route path="/pages/new" element={<NestedSuspense><PageBuilderPage /></NestedSuspense>} />
                          <Route path="/pages/:pageId/edit" element={<NestedSuspense><PageBuilderPage /></NestedSuspense>} />
                          <Route path="/pages/:pageId/responses" element={<NestedSuspense><PageResponsesPage /></NestedSuspense>} />
                          
                          {/* Discuss (Team Chat) */}
                          <Route path="/discuss" element={<NestedSuspense><DiscussPage /></NestedSuspense>} />
                        </Route>

                        {/* ===== ADMIN DASHBOARD ROUTES ===== */}
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
                          {/* Default redirect to team */}
                          <Route index element={<Navigate to="/admin/team" replace />} />
                          
                          {/* Team Management - Admin only */}
                          <Route path="team" element={<NestedSuspense><AdminTeamPage /></NestedSuspense>} />
                          
                          {/* Contact Stage Routes - Same as employee */}
                          <Route path="contacts/:stage" element={<NestedSuspense><ContactsPage /></NestedSuspense>} />
                          
                          {/* Session/Followup Stage Routes - Same as employee */}
                          <Route path="sessions/:stage" element={<NestedSuspense><StageFollowupsPage /></NestedSuspense>} />
                          
                          {/* Workspace View Routes - Admin uses company-wide analytics */}
                          <Route path="analytics" element={<NestedSuspense><AdminAnalyticsPage /></NestedSuspense>} />
                          <Route path="calendar" element={<NestedSuspense><CalendarPage /></NestedSuspense>} />
                          <Route path="gmail" element={<NestedSuspense><GmailPage /></NestedSuspense>} />
                          
                          {/* Pages (Landing Page Builder) - Admin */}
                          <Route path="pages" element={<NestedSuspense><PagesListPage /></NestedSuspense>} />
                          <Route path="pages/new" element={<NestedSuspense><PageBuilderPage /></NestedSuspense>} />
                          <Route path="pages/:pageId/edit" element={<NestedSuspense><PageBuilderPage /></NestedSuspense>} />
                          <Route path="pages/:pageId/responses" element={<NestedSuspense><PageResponsesPage /></NestedSuspense>} />
                          
                          {/* Discuss (Team Chat) - Admin */}
                          <Route path="discuss" element={<NestedSuspense><DiscussPage /></NestedSuspense>} />
                          
                          {/* Settings */}
                          <Route path="settings" element={<NestedSuspense><SettingsPage /></NestedSuspense>} />
                          
                          {/* Followups for individual contact (admin) */}
                          <Route path="followups/:contactId" element={<NestedSuspense><FollowupsPage /></NestedSuspense>} />
                        </Route>

                        {/* ===== SHARED AUTHENTICATED ROUTES ===== */}
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

                        {/* ===== REDIRECTS ===== */}
                        <Route path="/dashboard" element={<Navigate to="/contacts/lead" replace />} />
                        <Route path="/contacts" element={<Navigate to="/contacts/lead" replace />} />
                        
                        {/* ===== PUBLIC PAGE VIEW (No auth required) ===== */}
                        <Route 
                          path="/p/:slug" 
                          element={
                            <SuspenseWrapper>
                              <PublicPageView />
                            </SuspenseWrapper>
                          } 
                        />
                        
                        {/* ===== LANDING PAGE ===== */}
                        <Route 
                          path="/" 
                          element={
                            <SuspenseWrapper>
                              <LandingPage />
                            </SuspenseWrapper>
                          } 
                        />
                        
                        {/* ===== CATCH ALL ===== */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </RoutePrefetchWrapper>
                  </BrowserRouter>
                  </SocketProvider>
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
