// Centralized currency formatting utility
// Maps country names/codes to ISO 4217 currency codes
const countryToCurrency = {
  // North America
  'US': 'USD',
  'USA': 'USD',
  'United States': 'USD',
  'United States of America': 'USD',
  'Canada': 'CAD',
  'CA': 'CAD',
  'Mexico': 'MXN',
  'MX': 'MXN',
  
  // Europe
  'United Kingdom': 'GBP',
  'UK': 'GBP',
  'GB': 'GBP',
  'Germany': 'EUR',
  'DE': 'EUR',
  'France': 'EUR',
  'FR': 'EUR',
  'Italy': 'EUR',
  'IT': 'EUR',
  'Spain': 'EUR',
  'ES': 'EUR',
  'Netherlands': 'EUR',
  'NL': 'EUR',
  'Belgium': 'EUR',
  'BE': 'EUR',
  'Austria': 'EUR',
  'AT': 'EUR',
  'Ireland': 'EUR',
  'IE': 'EUR',
  'Portugal': 'EUR',
  'PT': 'EUR',
  'Finland': 'EUR',
  'FI': 'EUR',
  'Switzerland': 'CHF',
  'CH': 'CHF',
  'Sweden': 'SEK',
  'SE': 'SEK',
  'Norway': 'NOK',
  'NO': 'NOK',
  'Denmark': 'DKK',
  'DK': 'DKK',
  'Poland': 'PLN',
  'PL': 'PLN',
  
  // Asia Pacific
  'India': 'INR',
  'IN': 'INR',
  'Japan': 'JPY',
  'JP': 'JPY',
  'China': 'CNY',
  'CN': 'CNY',
  'South Korea': 'KRW',
  'KR': 'KRW',
  'Australia': 'AUD',
  'AU': 'AUD',
  'New Zealand': 'NZD',
  'NZ': 'NZD',
  'Singapore': 'SGD',
  'SG': 'SGD',
  'Hong Kong': 'HKD',
  'HK': 'HKD',
  'Taiwan': 'TWD',
  'TW': 'TWD',
  'Thailand': 'THB',
  'TH': 'THB',
  'Malaysia': 'MYR',
  'MY': 'MYR',
  'Indonesia': 'IDR',
  'ID': 'IDR',
  'Philippines': 'PHP',
  'PH': 'PHP',
  'Vietnam': 'VND',
  'VN': 'VND',
  
  // Middle East
  'United Arab Emirates': 'AED',
  'UAE': 'AED',
  'AE': 'AED',
  'Saudi Arabia': 'SAR',
  'SA': 'SAR',
  'Israel': 'ILS',
  'IL': 'ILS',
  
  // South America
  'Brazil': 'BRL',
  'BR': 'BRL',
  'Argentina': 'ARS',
  'AR': 'ARS',
  'Chile': 'CLP',
  'CL': 'CLP',
  'Colombia': 'COP',
  'CO': 'COP',
  
  // Africa
  'South Africa': 'ZAR',
  'ZA': 'ZAR',
  'Nigeria': 'NGN',
  'NG': 'NGN',
  'Egypt': 'EGP',
  'EG': 'EGP',
  'Kenya': 'KES',
  'KE': 'KES',
};

const defaultCurrency = 'USD';

// Cache Intl.NumberFormat instances per currency+options for performance
const nfCache = new Map();

function getNumberFormatter(currency, { compact = false, maximumFractionDigits = 0 } = {}) {
  const key = `${currency}|${compact}|${maximumFractionDigits}`;
  if (nfCache.has(key)) return nfCache.get(key);

  const opts = {
    style: 'currency',
    currency,
    maximumFractionDigits,
  };
  if (compact) {
    // Use compact notation when supported (modern browsers)
    opts.notation = 'compact';
    opts.compactDisplay = 'short';
  }

  const nf = new Intl.NumberFormat(undefined, opts);
  nfCache.set(key, nf);
  return nf;
}

export function countryToCurrencyCode(country) {
  if (!country) return defaultCurrency;
  return countryToCurrency[country] || countryToCurrency[country?.trim()] || defaultCurrency;
}

// formatCurrency will return symbol + formatted amount. Keeps a compact option
export function formatCurrency(amount = 0, country = null, { compact = true, maximumFractionDigits = 0 } = {}) {
  const code = countryToCurrencyCode(country);
  // Handle non-number gracefully
  const num = Number(amount) || 0;

  // For very small numbers when using compact, allow two decimals for readability
  const maxFrac = maximumFractionDigits != null ? maximumFractionDigits : (compact ? 1 : 0);
  try {
    const nf = getNumberFormatter(code, { compact, maximumFractionDigits: maxFrac });
    return nf.format(num);
  } catch (e) {
    // Fallback simple formatting
    const symbolMap = { USD: '$', INR: '₹', JPY: '¥', GBP: '£', EUR: '€', CAD: 'CA$', AUD: 'A$' };
    const symbol = symbolMap[code] || symbolMap[defaultCurrency] || '$';
    if (compact) {
      if (Math.abs(num) >= 1_000_000) return `${symbol}${(num / 1_000_000).toFixed(1)}M`;
      if (Math.abs(num) >= 1000) return `${symbol}${(num / 1000).toFixed(1)}k`;
    }
    return `${symbol}${Math.round(num).toLocaleString()}`;
  }
}

export default { formatCurrency, countryToCurrencyCode };
