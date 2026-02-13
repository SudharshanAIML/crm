import { memo } from 'react';
import { Mail, Calendar, Check, X, ExternalLink, Loader2, AlertCircle, Shield, ChevronRight } from 'lucide-react';
import { GOOGLE_INTEGRATION_FEATURES } from './utils/settingsHelpers';

/**
 * Google logo SVG component
 */
const GoogleLogo = memo(({ className = 'w-6 h-6' }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
));

GoogleLogo.displayName = 'GoogleLogo';

/**
 * Individual service status pill
 */
const ServicePill = memo(({ icon: Icon, label, active }) => (
  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${
    active
      ? 'bg-white border border-green-200 text-green-700 shadow-sm'
      : 'bg-gray-50 border border-gray-150 text-gray-400'
  }`}>
    <Icon className={`w-4 h-4 ${active ? 'text-green-500' : 'text-gray-300'}`} />
    <span className="font-medium">{label}</span>
    {active && <Check className="w-3.5 h-3.5 text-green-500 ml-auto" />}
  </div>
));

ServicePill.displayName = 'ServicePill';

/**
 * Google Account integration card — unified Gmail + Calendar connection
 */
const GoogleIntegration = memo(({
  emailConnected,
  emailLoading,
  connectingEmail,
  userEmail,
  onConnect,
  onDisconnect,
}) => (
  <div className={`border rounded-2xl overflow-hidden transition-all ${
    emailConnected
      ? 'border-green-200 bg-gradient-to-br from-green-50/40 via-white to-emerald-50/30'
      : 'border-gray-200 bg-white'
  }`}>
    {/* Header */}
    <div className="p-6">
      <div className="flex items-start gap-4">
        {/* Google icon */}
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
          emailConnected
            ? 'bg-white border border-green-100 shadow-green-500/10'
            : 'bg-white border border-gray-100 shadow-gray-500/10'
        }`}>
          <GoogleLogo className="w-7 h-7" />
        </div>

        {/* Title + description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <h3 className="font-semibold text-gray-900 text-lg">Google Account</h3>
            {emailConnected ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Connected
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
                Not connected
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {emailConnected
              ? 'Your Google account powers Gmail and Calendar sync across the CRM.'
              : 'Connect once to enable Gmail, Calendar sync, and more.'}
          </p>
          {emailConnected && userEmail && (
            <div className="flex items-center gap-2 mt-2.5 text-sm text-gray-600">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">
                  {userEmail.charAt(0).toUpperCase()}
                </span>
              </div>
              <span>{userEmail}</span>
            </div>
          )}
        </div>

        {/* Action button */}
        <div className="shrink-0">
          {emailLoading ? (
            <div className="flex items-center gap-2 text-gray-400 px-4 py-2.5">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Checking…</span>
            </div>
          ) : emailConnected ? (
            <button
              onClick={onDisconnect}
              className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 hover:border-red-300 transition-all"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={onConnect}
              disabled={connectingEmail}
              className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-600/25"
            >
              {connectingEmail ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting…
                </>
              ) : (
                <>
                  <GoogleLogo className="w-4 h-4" />
                  Connect with Google
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>

    {/* Connected: Service pills */}
    {emailConnected && !emailLoading && (
      <div className="px-6 pb-5">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2.5">Active services</p>
        <div className="flex flex-wrap gap-2">
          <ServicePill icon={Mail} label="Gmail" active />
          <ServicePill icon={Calendar} label="Google Calendar" active />
        </div>
      </div>
    )}

    {/* Disconnected: Feature overview */}
    {!emailConnected && !emailLoading && (
      <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-blue-500" />
          <p className="text-sm font-medium text-gray-700">What you'll get</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {GOOGLE_INTEGRATION_FEATURES.map((feature, i) => (
            <div key={i} className="flex items-start gap-2.5 group">
              <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-blue-100 transition-colors">
                <Check className="w-3 h-3 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">{feature.title}</p>
                <p className="text-xs text-gray-400">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Security footer */}
    {!emailConnected && !emailLoading && (
      <div className="border-t border-gray-100 px-6 py-3 flex items-center gap-2 text-xs text-gray-400">
        <Shield className="w-3.5 h-3.5" />
        <span>Secured with OAuth 2.0 — we never see your password</span>
      </div>
    )}
  </div>
));

GoogleIntegration.displayName = 'GoogleIntegration';

/**
 * Integrations tab component
 * Manages Google account connection (Gmail + Calendar)
 */
const IntegrationsTab = memo(({
  emailConnected,
  emailLoading,
  emailError,
  connectingEmail,
  userEmail,
  onConnect,
  onDisconnect,
  onClearError,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Integrations</h2>
        <p className="text-gray-500 mt-1">Connect external services to enhance your workflow</p>
      </div>

      {/* Error Alert */}
      {emailError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 flex-1">{emailError}</p>
          <button onClick={onClearError} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Google Account Integration */}
      <GoogleIntegration
        emailConnected={emailConnected}
        emailLoading={emailLoading}
        connectingEmail={connectingEmail}
        userEmail={userEmail}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />
    </div>
  );
});

IntegrationsTab.displayName = 'IntegrationsTab';

export default IntegrationsTab;
