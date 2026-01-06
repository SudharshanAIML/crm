import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { formatCurrency, countryToCurrencyCode } from '../utils/currency';
import api from '../services/api';

const CurrencyContext = createContext(null);

// Cache company data - use sessionStorage for persistence within session
const getSessionCache = () => {
  try {
    return sessionStorage.getItem('companyCountry');
  } catch {
    return null;
  }
};

const setSessionCache = (country) => {
  try {
    if (country) {
      sessionStorage.setItem('companyCountry', country);
    } else {
      sessionStorage.removeItem('companyCountry');
    }
  } catch {
    // Ignore storage errors
  }
};

let fetchPromise = null;

export const CurrencyProvider = ({ children }) => {
  const [companyCountry, setCompanyCountry] = useState(getSessionCache);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch company data on mount - always fetch fresh to ensure correct currency
  useEffect(() => {
    const fetchCompanyData = async () => {
      // If already fetching, wait for that promise
      if (fetchPromise) {
        try {
          const country = await fetchPromise;
          setCompanyCountry(country);
          setSessionCache(country);
        } catch {
          setCompanyCountry(null);
        }
        setLoading(false);
        return;
      }

      // Start new fetch
      fetchPromise = (async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            return null;
          }

          const response = await api.get('/companies/my-company');
          const country = response.data?.country || null;
          console.log('[CurrencyContext] Fetched company country:', country);
          return country;
        } catch (err) {
          // If endpoint doesn't exist or error, default to null (USD)
          console.warn('[CurrencyContext] Could not fetch company currency info:', err.message);
          return null;
        }
      })();

      try {
        const country = await fetchPromise;
        setCompanyCountry(country);
        setSessionCache(country);
      } catch {
        setError('Failed to load currency settings');
        setCompanyCountry(null);
      } finally {
        setLoading(false);
        fetchPromise = null;
      }
    };

    fetchCompanyData();
  }, []);

  // Memoized currency code
  const currencyCode = useMemo(() => 
    countryToCurrencyCode(companyCountry), 
    [companyCountry]
  );

  // Memoized format function that uses the company's currency
  const format = useCallback((amount, options = {}) => {
    return formatCurrency(amount, companyCountry, options);
  }, [companyCountry]);

  // Format with explicit compact notation (for large numbers)
  const formatCompact = useCallback((amount) => {
    return formatCurrency(amount, companyCountry, { compact: true, maximumFractionDigits: 1 });
  }, [companyCountry]);

  // Format with full precision (no compact)
  const formatFull = useCallback((amount, decimals = 2) => {
    return formatCurrency(amount, companyCountry, { compact: false, maximumFractionDigits: decimals });
  }, [companyCountry]);

  // Get just the currency symbol
  const currencySymbol = useMemo(() => {
    const symbolMap = {
      USD: '$', INR: '₹', JPY: '¥', GBP: '£', EUR: '€', CAD: 'CA$', AUD: 'A$'
    };
    return symbolMap[currencyCode] || '$';
  }, [currencyCode]);

  // Update company country (useful after admin updates company settings)
  const updateCompanyCountry = useCallback((newCountry) => {
    setSessionCache(newCountry);
    setCompanyCountry(newCountry);
  }, []);

  // Clear cache on logout
  const clearCache = useCallback(() => {
    setSessionCache(null);
    fetchPromise = null;
    setCompanyCountry(null);
  }, []);

  const value = useMemo(() => ({
    companyCountry,
    currencyCode,
    currencySymbol,
    loading,
    error,
    format,
    formatCompact,
    formatFull,
    updateCompanyCountry,
    clearCache,
  }), [
    companyCountry, currencyCode, currencySymbol, loading, error,
    format, formatCompact, formatFull, updateCompanyCountry, clearCache
  ]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

// Custom hook for easy access
export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    // Return default implementation if used outside provider
    return {
      companyCountry: null,
      currencyCode: 'USD',
      currencySymbol: '$',
      loading: false,
      error: null,
      format: (amount, opts) => formatCurrency(amount, null, opts),
      formatCompact: (amount) => formatCurrency(amount, null, { compact: true }),
      formatFull: (amount, decimals = 2) => formatCurrency(amount, null, { compact: false, maximumFractionDigits: decimals }),
      updateCompanyCountry: () => {},
      clearCache: () => {},
    };
  }
  return context;
};

export default CurrencyContext;
