/**
 * useEmailTemplates.js
 *
 * React hook that loads email templates for the logged-in company.
 *
 * Caching strategy
 * ────────────────
 * A module-level Map stores { data, fetchedAt } per companyId.
 * The cache is considered fresh for CACHE_TTL_MS (5 min).
 * This way:
 *   • Multiple compose windows in the same session share a single fetch.
 *   • Navigating to Templates page and saving forces a stale-mark so the
 *     next open of any compose window re-fetches (call `invalidateCache()`).
 *   • No complex state management needed.
 */

import { useState, useEffect, useCallback } from 'react';
import { getTemplates } from '../services/emailTemplateService';
import { useAuth } from '../context/AuthContext';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** @type {Map<number, { data: object[], fetchedAt: number }>} */
const _cache = new Map();

/** Call this after creating / editing / deleting templates to bust the cache. */
export const invalidateTemplateCache = (companyId) => {
  if (companyId) _cache.delete(companyId);
  else _cache.clear();
};

/**
 * @returns {{
 *   templates: object[],
 *   loading: boolean,
 *   error: string|null,
 *   refetch: () => void,
 * }}
 */
const useEmailTemplates = () => {
  const { user } = useAuth();
  const companyId = user?.companyId;

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTemplates = useCallback(async (force = false) => {
    if (!companyId) return;

    const cached = _cache.get(companyId);
    if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      setTemplates(cached.data);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await getTemplates();           // company-scoped on the server
      const data = res.data || [];
      _cache.set(companyId, { data, fetchedAt: Date.now() });
      setTemplates(data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load templates');
      // Fall back to stale cache if available
      if (cached) setTemplates(cached.data);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    loading,
    error,
    refetch: () => fetchTemplates(true),
  };
};

export default useEmailTemplates;
