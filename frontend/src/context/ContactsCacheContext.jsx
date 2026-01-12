import { createContext, useContext, useState, useCallback, useMemo } from 'react';

/**
 * Simple in-memory cache for contacts data
 * Persists data between route navigations within the same session
 */
const ContactsCacheContext = createContext(null);

// Cache expiry time (2 minutes for contacts - they change more frequently)
const CACHE_TTL = 2 * 60 * 1000;

export const ContactsCacheProvider = ({ children }) => {
  const [cache, setCache] = useState({});

  // Check if cached data is still valid
  const isCacheValid = useCallback((stage) => {
    const entry = cache[stage];
    if (!entry?.data || !entry?.timestamp) return false;
    return Date.now() - entry.timestamp < CACHE_TTL;
  }, [cache]);

  // Get cached data for a stage
  const getCachedContacts = useCallback((stage) => {
    if (isCacheValid(stage)) {
      return cache[stage].data;
    }
    return null;
  }, [cache, isCacheValid]);

  // Set cached data for a stage
  const setCachedContacts = useCallback((stage, contacts) => {
    setCache((prev) => ({
      ...prev,
      [stage]: { data: contacts, timestamp: Date.now() },
    }));
  }, []);

  // Invalidate cache for a specific stage or all stages
  const invalidateContactsCache = useCallback((stage) => {
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

  const value = useMemo(() => ({
    getCachedContacts,
    setCachedContacts,
    invalidateContactsCache,
    isCacheValid,
  }), [getCachedContacts, setCachedContacts, invalidateContactsCache, isCacheValid]);

  return (
    <ContactsCacheContext.Provider value={value}>
      {children}
    </ContactsCacheContext.Provider>
  );
};

export const useContactsCache = () => {
  const context = useContext(ContactsCacheContext);
  if (!context) {
    throw new Error('useContactsCache must be used within ContactsCacheProvider');
  }
  return context;
};

export default ContactsCacheContext;
