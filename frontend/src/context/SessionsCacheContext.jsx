import { createContext, useContext, useState, useCallback, useMemo } from 'react';

/**
 * In-memory cache for sessions data by stage
 * Persists data between route navigations within the same session
 * Optimized for fast stage switching without refetching
 */
const SessionsCacheContext = createContext(null);

// Cache expiry time (3 minutes for sessions)
const CACHE_TTL = 3 * 60 * 1000;

export const SessionsCacheProvider = ({ children }) => {
  const [cache, setCache] = useState({});

  // Check if cached data is still valid
  const isCacheValid = useCallback((stage) => {
    const entry = cache[stage];
    if (!entry?.data || !entry?.timestamp) return false;
    return Date.now() - entry.timestamp < CACHE_TTL;
  }, [cache]);

  // Get cached data for a stage
  const getCachedSessions = useCallback((stage) => {
    if (isCacheValid(stage)) {
      return cache[stage].data;
    }
    return null;
  }, [cache, isCacheValid]);

  // Set cached data for a stage
  const setCachedSessions = useCallback((stage, sessions, total) => {
    setCache((prev) => ({
      ...prev,
      [stage]: { 
        data: { sessions, total }, 
        timestamp: Date.now() 
      },
    }));
  }, []);

  // Invalidate cache for a specific stage or all stages
  const invalidateSessionsCache = useCallback((stage) => {
    if (stage) {
      setCache((prev) => {
        const newCache = { ...prev };
        delete newCache[stage];
        return newCache;
      });
    } else {
      // Invalidate all cache
      setCache({});
    }
  }, []);

  // Get cache timestamp for a stage (useful for showing "last updated")
  const getCacheTimestamp = useCallback((stage) => {
    return cache[stage]?.timestamp || null;
  }, [cache]);

  const value = useMemo(() => ({
    getCachedSessions,
    setCachedSessions,
    invalidateSessionsCache,
    isCacheValid,
    getCacheTimestamp,
  }), [getCachedSessions, setCachedSessions, invalidateSessionsCache, isCacheValid, getCacheTimestamp]);

  return (
    <SessionsCacheContext.Provider value={value}>
      {children}
    </SessionsCacheContext.Provider>
  );
};

export const useSessionsCache = () => {
  const context = useContext(SessionsCacheContext);
  if (!context) {
    throw new Error('useSessionsCache must be used within SessionsCacheProvider');
  }
  return context;
};

export default SessionsCacheContext;
