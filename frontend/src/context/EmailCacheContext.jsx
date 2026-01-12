import { createContext, useContext, useState, useCallback, useMemo } from 'react';

/**
 * Simple in-memory cache for email data
 * Persists data between route navigations within the same session
 */
const EmailCacheContext = createContext(null);

// Cache expiry time (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

export const EmailCacheProvider = ({ children }) => {
  const [cache, setCache] = useState({
    inbox: { data: null, timestamp: null },
    'crm-sent': { data: null, timestamp: null },
    drafts: { data: null, timestamp: null },
    connectionStatus: { connected: null, timestamp: null },
  });

  // Check if cached data is still valid
  const isCacheValid = useCallback((key) => {
    const entry = cache[key];
    if (!entry?.data || !entry?.timestamp) return false;
    return Date.now() - entry.timestamp < CACHE_TTL;
  }, [cache]);

  // Get cached data
  const getCachedData = useCallback((key) => {
    if (isCacheValid(key)) {
      return cache[key].data;
    }
    return null;
  }, [cache, isCacheValid]);

  // Set cached data
  const setCachedData = useCallback((key, data) => {
    setCache((prev) => ({
      ...prev,
      [key]: { data, timestamp: Date.now() },
    }));
  }, []);

  // Invalidate cache for a specific key
  const invalidateCache = useCallback((key) => {
    if (key) {
      setCache((prev) => ({
        ...prev,
        [key]: { data: null, timestamp: null },
      }));
    } else {
      // Invalidate all cache
      setCache({
        inbox: { data: null, timestamp: null },
        'crm-sent': { data: null, timestamp: null },
        drafts: { data: null, timestamp: null },
        connectionStatus: { connected: null, timestamp: null },
      });
    }
  }, []);

  // Get connection status from cache
  const getCachedConnectionStatus = useCallback(() => {
    const entry = cache.connectionStatus;
    if (!entry?.timestamp) return null;
    // Connection status cache valid for 1 minute
    if (Date.now() - entry.timestamp < 60 * 1000) {
      return entry.connected;
    }
    return null;
  }, [cache.connectionStatus]);

  // Set connection status in cache
  const setCachedConnectionStatus = useCallback((connected) => {
    setCache((prev) => ({
      ...prev,
      connectionStatus: { connected, timestamp: Date.now() },
    }));
  }, []);

  const value = useMemo(() => ({
    getCachedData,
    setCachedData,
    invalidateCache,
    isCacheValid,
    getCachedConnectionStatus,
    setCachedConnectionStatus,
  }), [getCachedData, setCachedData, invalidateCache, isCacheValid, getCachedConnectionStatus, setCachedConnectionStatus]);

  return (
    <EmailCacheContext.Provider value={value}>
      {children}
    </EmailCacheContext.Provider>
  );
};

export const useEmailCache = () => {
  const context = useContext(EmailCacheContext);
  if (!context) {
    throw new Error('useEmailCache must be used within EmailCacheProvider');
  }
  return context;
};

export default EmailCacheContext;
