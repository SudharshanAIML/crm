/**
 * Templates Page
 *
 * Unified hub for both outreach tools:
 *   • Landing Pages  — drag-and-drop page builder for outreach campaigns
 *   • Email Templates — reusable HTML email templates with dynamic variables
 *
 * Active tab is persisted in the URL search param `?tab=landing|email` so
 * users can share/bookmark their preferred view and the browser back-button
 * works correctly between tabs (replace: true keeps the history stack clean).
 *
 * Each tab's code is lazy-loaded in a separate chunk so neither tab's bundle
 * ships to the client until it is actually visited.
 */
import { lazy, Suspense, memo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout, FileText } from 'lucide-react';

/* =====================================================
   LAZY-LOADED TAB CONTENT (separate code-split chunks)
===================================================== */

// Named export → use .then() to normalise to default-shape
const LandingPagesContent = lazy(() =>
  import('./PagesListPage').then((m) => ({ default: m.PagesListContent }))
);

const EmailTemplatesContent = lazy(() => import('./EmailTemplatesPage'));

/* =====================================================
   TAB CONFIGURATION
===================================================== */

const TABS = [
  {
    id: 'landing',
    label: 'Landing Pages',
    icon: Layout,
    description: 'Build and manage outreach landing pages for your campaigns',
  },
  {
    id: 'email',
    label: 'Email Templates',
    icon: FileText,
    description: 'Create reusable email templates with dynamic personalisation variables',
  },
];

/* =====================================================
   TAB BUTTON (memoised for perf)
===================================================== */

const TabButton = memo(({ tab, isActive, onClick }) => {
  const Icon = tab.icon;
  return (
    <button
      onClick={onClick}
      role="tab"
      aria-selected={isActive}
      className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1 ${
        isActive
          ? 'border-sky-500 text-sky-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {tab.label}
    </button>
  );
});
TabButton.displayName = 'TabButton';

/* =====================================================
   LOADING SKELETON (shown while tab chunk downloads)
===================================================== */

const TabLoadingSkeleton = () => (
  <div className="space-y-4 pt-2">
    <div className="flex items-center justify-between">
      <div className="h-8 bg-gray-200 rounded-lg w-48 animate-pulse" />
      <div className="h-9 bg-gray-200 rounded-lg w-28 animate-pulse" />
    </div>
    <div className="flex gap-3">
      <div className="h-9 bg-gray-200 rounded-lg flex-1 animate-pulse" />
      <div className="h-9 bg-gray-200 rounded-lg w-36 animate-pulse" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-full mb-2" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
      ))}
    </div>
  </div>
);

/* =====================================================
   MAIN PAGE COMPONENT
===================================================== */

export default function TemplatesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Derive active tab from URL; default to 'landing' for a clean first visit
  const rawTab = searchParams.get('tab');
  const activeTab = TABS.some((t) => t.id === rawTab) ? rawTab : 'landing';

  const handleTabChange = (tabId) => {
    // replace: true — tab switches don't pollute the browser history stack
    setSearchParams({ tab: tabId }, { replace: true });
  };

  const activeTabData = TABS.find((t) => t.id === activeTab);

  return (
    <div>
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="text-sm text-gray-500 mt-0.5">{activeTabData.description}</p>
        </div>
      </div>

      {/* ── Tab Navigation ──────────────────────────────────── */}
      <div className="border-b border-gray-200 mb-6">
        <nav
          className="flex"
          role="tablist"
          aria-label="Template categories"
        >
          {TABS.map((tab) => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onClick={() => handleTabChange(tab.id)}
            />
          ))}
        </nav>
      </div>

      {/* ── Tab Content ─────────────────────────────────────── */}
      <Suspense fallback={<TabLoadingSkeleton />}>
        {activeTab === 'landing' ? (
          <LandingPagesContent />
        ) : (
          <EmailTemplatesContent />
        )}
      </Suspense>
    </div>
  );
}
