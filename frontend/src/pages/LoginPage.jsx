import { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { googleLogin } from '../services/authService';
import { 
  Mail, 
  UserPlus, 
  AlertCircle, 
  CheckCircle, 
  ArrowRight, 
  Building2, 
  Shield, 
  Users,
  Sparkles,
  ArrowLeft,
  Crown
} from 'lucide-react';

const LoginPage = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  // Mode states: 'default' | 'admin-register' | 'invite'
  const [mode, setMode] = useState('default');
  
  // Get invite token from URL if present
  const inviteToken = searchParams.get('invite');

  useEffect(() => {
    if (inviteToken) {
      setMode('invite');
    }
  }, [inviteToken]);

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError('');

    try {
      const isAdminRegistration = mode === 'admin-register';
      const data = await googleLogin(
        credentialResponse.credential, 
        mode === 'invite' ? inviteToken : null,
        isAdminRegistration
      );
      
      login(data.user, data.token);
      
      // If new admin, redirect to onboarding
      if (data.isNewAdmin) {
        navigate('/onboarding');
      }
      // Navigation will be handled by the route protection logic in App.jsx
    } catch (err) {
      const errorCode = err.response?.data?.code;
      const errorMessage = err.response?.data?.message;
      
      // Handle specific error codes with friendly messages
      if (errorCode === 'NOT_INVITED') {
        setError('You haven\'t been invited to this platform yet. Please ask your administrator for an invitation.');
      } else if (errorCode === 'EMAIL_MISMATCH') {
        setError(errorMessage);
      } else if (errorCode === 'INVALID_INVITE') {
        setError('This invitation link is invalid or has expired. Please ask your administrator for a new invitation.');
      } else if (errorCode === 'PENDING_INVITATION') {
        setError('Please use the invitation link sent to your email to complete your registration.');
      } else if (errorCode === 'ACCOUNT_DISABLED') {
        setError('Your account has been disabled. Please contact your administrator.');
      } else {
        setError(errorMessage || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google login failed. Please try again.');
  };

  // Admin Registration Mode UI
  if (mode === 'admin-register') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-200 rounded-full opacity-40 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-orange-200 rounded-full opacity-40 blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-100 rounded-full opacity-30 blur-3xl"></div>
        </div>

        <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-md border border-amber-100">
          {/* Back Button */}
          <button
            onClick={() => {
              setMode('default');
              setError('');
            }}
            className="absolute top-6 left-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-8 mt-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl shadow-xl shadow-amber-500/30 mb-6">
              <Crown className="w-10 h-10 text-white" />
            </div>
            
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 rounded-full text-sm font-semibold mb-4">
              <Sparkles className="w-4 h-4" />
              New Administrator
            </div>
            
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-3">
              Create Your Organization
            </h1>
            <p className="text-gray-500 leading-relaxed">
              Set up your CRM account and start managing your team
            </p>
          </div>

          {/* Features */}
          <div className="mb-8 space-y-3">
            <div className="flex items-center gap-3 p-3 bg-amber-50/50 rounded-xl">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Create Your Company</p>
                <p className="text-xs text-gray-500">Set up your organization profile</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-orange-50/50 rounded-xl">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Invite Your Team</p>
                <p className="text-xs text-gray-500">Add employees via email invitations</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-yellow-50/50 rounded-xl">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Full Admin Access</p>
                <p className="text-xs text-gray-500">Manage team, leads, and analytics</p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Google Login Button */}
          <div className="flex flex-col items-center gap-4">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                <span className="ml-3 text-gray-600">Creating your account...</span>
              </div>
            ) : (
              <div className="w-full flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap={false}
                  theme="outline"
                  size="large"
                  text="continue_with"
                  shape="rectangular"
                  logo_alignment="left"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-8">
            By continuing, you agree to our Terms and Privacy Policy
          </p>
        </div>
      </div>
    );
  }

  // Invite Mode UI
  if (mode === 'invite') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 flex items-center justify-center p-4">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-200 rounded-full opacity-50 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-200 rounded-full opacity-50 blur-3xl"></div>
        </div>

        <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl p-8 w-full max-w-md border border-emerald-100">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl shadow-lg shadow-emerald-500/30 mb-4">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-3">
              <CheckCircle className="w-4 h-4" />
              You've been invited!
            </div>
            
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Accept Invitation</h1>
            <p className="text-gray-500">Sign in with your Google account to join the team</p>
          </div>

          {/* Invitation Info Banner */}
          {!error && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-emerald-800 font-medium">Complete your registration</p>
                  <p className="text-xs text-emerald-600 mt-1">
                    Click the button below to sign in with Google and join your team.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Google Login Button */}
          <div className="flex flex-col items-center gap-4">
            {loading ? (
              <div className="flex items-center justify-center py-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                <span className="ml-3 text-gray-600">Setting up your account...</span>
              </div>
            ) : (
              <div className="w-full flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap={false}
                  theme="outline"
                  size="large"
                  text="continue_with"
                  shape="rectangular"
                  logo_alignment="left"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-8">
            By signing in, you agree to our Terms and Privacy Policy
          </p>
        </div>
      </div>
    );
  }

  // Default Login UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-100 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky-200 rounded-full opacity-50 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full opacity-50 blur-3xl"></div>
      </div>

      {/* Login Card */}
      <div className="relative bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-8 w-full max-w-md border border-sky-100">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-sky-400 to-blue-500 rounded-2xl shadow-lg shadow-sky-500/30 mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h1>
          <p className="text-gray-500">Sign in to your CRM account</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Google Login Button */}
        <div className="flex flex-col items-center gap-4 mb-6">
          {loading ? (
            <div className="flex items-center justify-center py-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
              <span className="ml-3 text-gray-600">Signing in...</span>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap={true}
                theme="outline"
                size="large"
                text="signin_with"
                shape="rectangular"
                logo_alignment="left"
              />
            </div>
          )}
        </div>

        {/* Access Note for non-invited users */}
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-800 font-medium">Invitation Required</p>
              <p className="text-xs text-amber-700 mt-1">
                Only invited team members can access this platform. 
                Contact your administrator if you need access.
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-gray-200"></div>
          <span className="px-4 text-sm text-gray-400">or</span>
          <div className="flex-1 border-t border-gray-200"></div>
        </div>

        {/* Admin Registration CTA */}
        <button
          onClick={() => {
            setMode('admin-register');
            setError('');
          }}
          className="w-full group relative overflow-hidden bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30"
        >
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Crown className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold">Create New Organization</p>
              <p className="text-xs text-amber-100">Set up your company as an Admin</p>
            </div>
            <ArrowRight className="w-5 h-5 ml-auto group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Info Text */}
        <p className="text-center text-sm text-gray-500 mt-6">
          By signing in, you agree to our{' '}
          <a href="#" className="text-sky-600 hover:text-sky-700 font-medium">
            Terms
          </a>{' '}
          and{' '}
          <a href="#" className="text-sky-600 hover:text-sky-700 font-medium">
            Privacy Policy
          </a>
        </p>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-center text-xs text-gray-400">
            © 2024 CRM System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
