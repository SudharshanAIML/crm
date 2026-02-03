import { useState, useEffect, useCallback, lazy, Suspense, memo } from 'react';
import {
    Inbox,
    Send,
    FileEdit,
    Search,
    RefreshCw,
    Plus,
    Mail,
    AlertCircle,
    ExternalLink,
    Loader2,
    ChevronLeft,
    Sparkles,
    Plane,
} from 'lucide-react';
import {
    getConnectionStatus,
    getConnectUrl,
    getGmailInbox,
    getGmailSent,
    getGmailDrafts,
    searchGmail,
} from '../../services/emailService';
import EmailList from './EmailList';
import EmailDetail from './EmailDetail';
import ComposeEmail from './ComposeEmail';

// Lazy load heavy components for better initial load performance
const AIOutreach = lazy(() => import('../outreach/AIOutreach'));
const AutoPilot = lazy(() => import('../outreach/AutoPilot'));

// Loading fallback component for lazy-loaded tabs
const TabLoadingFallback = memo(() => (
    <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
        <span className="ml-2 text-gray-600">Loading...</span>
    </div>
));

const TABS = [
    { id: 'inbox', label: 'Inbox', icon: Inbox },
    { id: 'sent', label: 'Sent', icon: Send },
    { id: 'drafts', label: 'Drafts', icon: FileEdit },
    { id: 'ai-outreach', label: 'AI Outreach', icon: Sparkles },
    { id: 'autopilot', label: 'Auto Pilot', icon: Plane },
];

const GmailView = () => {
    const [activeTab, setActiveTab] = useState('inbox');
    
    // Separate cached state for each email tab (prevents re-fetching on tab switch)
    const [inboxData, setInboxData] = useState({ emails: [], nextPageToken: null, loaded: false });
    const [sentData, setSentData] = useState({ emails: [], nextPageToken: null, loaded: false });
    const [draftsData, setDraftsData] = useState({ drafts: [], nextPageToken: null, loaded: false });
    
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState({ emails: [], nextPageToken: null, active: false });

    // Track which tabs have been visited (for keep-alive pattern)
    const [visitedTabs, setVisitedTabs] = useState(new Set(['inbox']));

    // Connection state
    const [emailConnected, setEmailConnected] = useState(null);
    const [checkingConnection, setCheckingConnection] = useState(true);

    // Selected email/draft for detail view
    const [selectedEmail, setSelectedEmail] = useState(null);

    // Compose modal
    const [showCompose, setShowCompose] = useState(false);
    const [editingDraft, setEditingDraft] = useState(null);

    // Check connection on mount
    useEffect(() => {
        checkConnection();
    }, []);

    // Fetch data only when tab hasn't been loaded yet
    useEffect(() => {
        if (emailConnected) {
            const needsFetch = 
                (activeTab === 'inbox' && !inboxData.loaded) ||
                (activeTab === 'sent' && !sentData.loaded) ||
                (activeTab === 'drafts' && !draftsData.loaded);
            
            if (needsFetch) {
                fetchData();
            } else if (['inbox', 'sent', 'drafts'].includes(activeTab)) {
                setLoading(false);
            }
        }
    }, [activeTab, emailConnected, inboxData.loaded, sentData.loaded, draftsData.loaded]);

    const checkConnection = async () => {
        try {
            setCheckingConnection(true);
            const status = await getConnectionStatus();
            setEmailConnected(status.connected);
        } catch (err) {
            setEmailConnected(false);
        } finally {
            setCheckingConnection(false);
        }
    };

    const handleConnectEmail = async () => {
        try {
            const { authUrl } = await getConnectUrl();
            window.location.href = authUrl;
        } catch (err) {
            setError('Failed to initiate Gmail connection');
        }
    };

    const fetchData = useCallback(async (pageToken = null, forceRefresh = false) => {
        try {
            if (!pageToken) {
                setLoading(true);
            }
            setError(null);
            setSearchResults(prev => ({ ...prev, active: false }));

            let result;
            if (activeTab === 'inbox') {
                result = await getGmailInbox({ pageToken });
                setInboxData(prev => ({
                    emails: pageToken ? [...prev.emails, ...result.messages] : result.messages,
                    nextPageToken: result.nextPageToken,
                    loaded: true
                }));
            } else if (activeTab === 'sent') {
                result = await getGmailSent({ pageToken });
                setSentData(prev => ({
                    emails: pageToken ? [...prev.emails, ...result.messages] : result.messages,
                    nextPageToken: result.nextPageToken,
                    loaded: true
                }));
            } else if (activeTab === 'drafts') {
                result = await getGmailDrafts({ pageToken });
                setDraftsData(prev => ({
                    drafts: pageToken ? [...prev.drafts, ...result.drafts] : result.drafts,
                    nextPageToken: result.nextPageToken,
                    loaded: true
                }));
            }
        } catch (err) {
            if (err.response?.data?.code === 'EMAIL_NOT_CONNECTED') {
                setEmailConnected(false);
            } else {
                setError('Failed to load emails. Please try again.');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeTab]);

    const handleRefresh = () => {
        setRefreshing(true);
        setSelectedEmail(null);
        // Reset loaded state for current tab to force refresh
        if (activeTab === 'inbox') {
            setInboxData(prev => ({ ...prev, loaded: false }));
        } else if (activeTab === 'sent') {
            setSentData(prev => ({ ...prev, loaded: false }));
        } else if (activeTab === 'drafts') {
            setDraftsData(prev => ({ ...prev, loaded: false }));
        }
        fetchData(null, true);
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) {
            setSearchResults({ emails: [], nextPageToken: null, active: false });
            return;
        }

        try {
            setIsSearching(true);
            setLoading(true);
            const result = await searchGmail(searchQuery);
            setSearchResults({
                emails: result.messages,
                nextPageToken: result.nextPageToken,
                active: true
            });
        } catch (err) {
            setError('Search failed. Please try again.');
        } finally {
            setIsSearching(false);
            setLoading(false);
        }
    };

    const handleLoadMore = () => {
        const currentPageToken = searchResults.active 
            ? searchResults.nextPageToken
            : activeTab === 'inbox' 
                ? inboxData.nextPageToken 
                : activeTab === 'sent' 
                    ? sentData.nextPageToken 
                    : draftsData.nextPageToken;
        
        if (currentPageToken) {
            fetchData(currentPageToken);
        }
    };

    // Get current tab's data
    const getCurrentEmails = () => {
        if (searchResults.active) return searchResults.emails;
        if (activeTab === 'inbox') return inboxData.emails;
        if (activeTab === 'sent') return sentData.emails;
        return [];
    };

    const getCurrentDrafts = () => draftsData.drafts;

    const hasMoreData = () => {
        if (searchResults.active) return !!searchResults.nextPageToken;
        if (activeTab === 'inbox') return !!inboxData.nextPageToken;
        if (activeTab === 'sent') return !!sentData.nextPageToken;
        if (activeTab === 'drafts') return !!draftsData.nextPageToken;
        return false;
    };

    const handleEmailSelect = (email) => {
        setSelectedEmail(email);
    };

    const handleDraftEdit = (draft) => {
        setEditingDraft(draft);
        setShowCompose(true);
    };

    const handleComposeClose = () => {
        setShowCompose(false);
        setEditingDraft(null);
    };

    const handleEmailSent = () => {
        handleComposeClose();
        if (activeTab === 'sent') {
            handleRefresh();
        }
    };

    const handleDraftSaved = () => {
        if (activeTab === 'drafts') {
            handleRefresh();
        }
    };

    const handleDraftDeleted = () => {
        handleRefresh();
        setSelectedEmail(null);
    };

    const handleBackToList = () => {
        setSelectedEmail(null);
    };

    // Loading state
    if (checkingConnection) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
                <span className="ml-3 text-gray-600">Checking Gmail connection...</span>
            </div>
        );
    }

    // Not connected state
    if (!emailConnected) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-8">
                <div className="text-center max-w-md mx-auto">
                    <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-sky-100 to-blue-100 flex items-center justify-center mb-6">
                        <Mail className="w-10 h-10 text-sky-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-3">Connect Your Gmail</h2>
                    <p className="text-gray-600 mb-6">
                        Connect your Gmail account to read, compose, and manage your emails directly from the CRM.
                    </p>
                    <button
                        onClick={handleConnectEmail}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-medium hover:from-sky-600 hover:to-blue-700 transition-all shadow-lg shadow-sky-500/25"
                    >
                        Connect Gmail
                        <ExternalLink className="w-4 h-4" />
                    </button>
                    <p className="text-xs text-gray-500 mt-4">
                        You'll be redirected to Google to authorize access
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="border-b border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {selectedEmail && (
                            <button
                                onClick={handleBackToList}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
                            >
                                <ChevronLeft className="w-5 h-5 text-gray-600" />
                            </button>
                        )}
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center">
                            <Mail className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800">Gmail</h2>
                            <p className="text-sm text-gray-500">Manage your emails</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={() => setShowCompose(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg hover:from-sky-600 hover:to-blue-700 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Compose</span>
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 mb-4">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    setSelectedEmail(null);
                                    setSearchQuery('');
                                    // Clear search results when switching tabs
                                    setSearchResults({ emails: [], nextPageToken: null, active: false });
                                    // Mark tab as visited for keep-alive
                                    setVisitedTabs(prev => new Set([...prev, tab.id]));
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                                    ? 'bg-sky-100 text-sky-700'
                                    : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Search */}
                {activeTab !== 'drafts' && activeTab !== 'ai-outreach' && activeTab !== 'autopilot' && (
                    <form onSubmit={handleSearch} className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search emails..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                        />
                    </form>
                )}
            </div>

            {/* Error */}
            {error && activeTab !== 'ai-outreach' && activeTab !== 'autopilot' && (
                <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* Content - Keep-alive pattern: mount once and toggle visibility to preserve state */}
            {/* AI Outreach Tab - stays mounted after first visit */}
            {visitedTabs.has('ai-outreach') && (
                <div className={`p-4 ${activeTab === 'ai-outreach' ? '' : 'hidden'}`}>
                    <Suspense fallback={<TabLoadingFallback />}>
                        <AIOutreach />
                    </Suspense>
                </div>
            )}

            {/* AutoPilot Tab - stays mounted after first visit */}
            {visitedTabs.has('autopilot') && (
                <div className={`p-4 ${activeTab === 'autopilot' ? '' : 'hidden'}`}>
                    <Suspense fallback={<TabLoadingFallback />}>
                        <AutoPilot />
                    </Suspense>
                </div>
            )}

            {/* Email Tabs */}
            <div className={`${activeTab !== 'ai-outreach' && activeTab !== 'autopilot' ? '' : 'hidden'}`}>
                <div className="flex h-[calc(100vh-20rem)] min-h-[400px]">
                    {/* Email List */}
                    <div className={`${selectedEmail ? 'hidden lg:block' : ''} w-full lg:w-2/5 border-r border-gray-200 overflow-y-auto`}>
                        <EmailList
                            emails={activeTab === 'drafts' ? getCurrentDrafts() : getCurrentEmails()}
                            loading={loading}
                            isDrafts={activeTab === 'drafts'}
                            selectedId={selectedEmail?.id || selectedEmail?.draftId}
                            onSelect={activeTab === 'drafts' ? handleDraftEdit : handleEmailSelect}
                            onLoadMore={handleLoadMore}
                            hasMore={hasMoreData()}
                        />
                    </div>

                    {/* Email Detail */}
                    <div className={`${selectedEmail ? '' : 'hidden lg:flex'} flex-1 overflow-y-auto`}>
                        {selectedEmail ? (
                            <EmailDetail
                                email={selectedEmail}
                                onBack={handleBackToList}
                                onRefresh={handleRefresh}
                            />
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-400">
                                <div className="text-center">
                                    <Mail className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p>Select an email to read</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Compose Modal */}
            {showCompose && (
                <ComposeEmail
                    isOpen={showCompose}
                    draft={editingDraft}
                    onClose={handleComposeClose}
                    onSent={handleEmailSent}
                    onDraftSaved={handleDraftSaved}
                    onDraftDeleted={handleDraftDeleted}
                />
            )}
        </div>
    );
};

export default GmailView;
