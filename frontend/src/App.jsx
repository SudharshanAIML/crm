import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import SettingsPage from './pages/SettingsPage';
import FollowupsPage from './pages/FollowupsPage';
import StageFollowupsPage from './pages/StageFollowupsPage';

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
    // Admins go to admin dashboard, employees go to regular dashboard
    return <Navigate to={isAdmin ? "/admin" : "/dashboard"} />;
  }

  return children;
};

function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <CurrencyProvider>
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
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <AuthenticatedRoute>
                    <SettingsPage />
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="/followups/:contactId"
                element={
                  <AuthenticatedRoute>
                    <FollowupsPage />
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="/:stage/followups"
                element={
                  <AuthenticatedRoute>
                    <StageFollowupsPage />
                  </AuthenticatedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/login" />} />
              <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
          </BrowserRouter>
        </CurrencyProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
