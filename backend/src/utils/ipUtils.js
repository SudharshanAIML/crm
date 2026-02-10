/**
 * IP Address Utilities
 * Extract, validate, and enrich IP addresses from HTTP requests
 * Handles proxy headers for real client IP detection
 */

/**
 * Extract real client IP address from request
 * Checks multiple headers in order of reliability:
 * 1. CF-Connecting-IP (Cloudflare)
 * 2. X-Real-IP (Nginx)
 * 3. X-Forwarded-For (Standard proxy header)
 * 4. req.ip (Express default, works when trust proxy is enabled)
 * 5. req.connection.remoteAddress (fallback)
 * 
 * @param {Object} req - Express request object
 * @returns {string|null} Real client IP address or null
 */
export const getRealIP = (req) => {
  try {
    // 1. Cloudflare's CF-Connecting-IP header (most reliable when behind Cloudflare)
    const cfIP = req.get('CF-Connecting-IP');
    if (cfIP && isValidIP(cfIP)) {
      return sanitizeIP(cfIP);
    }

    // 2. X-Real-IP header (commonly used by Nginx)
    const realIP = req.get('X-Real-IP');
    if (realIP && isValidIP(realIP)) {
      return sanitizeIP(realIP);
    }

    // 3. X-Forwarded-For header (standard for proxies)
    // Format: client, proxy1, proxy2
    // Take the first (leftmost) IP which is the original client
    const forwardedFor = req.get('X-Forwarded-For');
    if (forwardedFor) {
      const ips = forwardedFor.split(',').map(ip => ip.trim());
      const clientIP = ips[0];
      if (clientIP && isValidIP(clientIP)) {
        return sanitizeIP(clientIP);
      }
    }

    // 4. Express req.ip (works when 'trust proxy' is enabled)
    if (req.ip && isValidIP(req.ip)) {
      return sanitizeIP(req.ip);
    }

    // 5. Direct connection IP (fallback)
    const remoteAddr = req.connection?.remoteAddress || 
                      req.socket?.remoteAddress || 
                      req.connection?.socket?.remoteAddress;
    if (remoteAddr && isValidIP(remoteAddr)) {
      return sanitizeIP(remoteAddr);
    }

    return null;
  } catch (error) {
    console.error('Error extracting IP address:', error);
    return null;
  }
};

/**
 * Validate IP address format (IPv4 or IPv6)
 * @param {string} ip - IP address to validate
 * @returns {boolean} True if valid IP format
 */
export const isValidIP = (ip) => {
  if (!ip || typeof ip !== 'string') return false;

  // Remove IPv6 prefix if present (::ffff:192.168.1.1)
  const cleanIP = ip.replace(/^::ffff:/i, '');

  // IPv4 regex pattern
  const ipv4Pattern = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // IPv6 regex pattern (simplified)
  const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  
  return ipv4Pattern.test(cleanIP) || ipv6Pattern.test(ip);
};

/**
 * Sanitize IP address (remove IPv6 prefix, trim whitespace)
 * @param {string} ip - IP address to sanitize
 * @returns {string} Sanitized IP address
 */
export const sanitizeIP = (ip) => {
  if (!ip) return null;
  
  // Remove IPv6 prefix for IPv4-mapped addresses
  let cleanIP = ip.trim().replace(/^::ffff:/i, '');
  
  // Ensure max length (45 chars for IPv6)
  if (cleanIP.length > 45) {
    cleanIP = cleanIP.substring(0, 45);
  }
  
  return cleanIP;
};

/**
 * Check if IP is private/internal
 * @param {string} ip - IP address to check
 * @returns {boolean} True if private IP
 */
export const isPrivateIP = (ip) => {
  if (!ip) return false;
  
  const cleanIP = sanitizeIP(ip);
  
  // Private IPv4 ranges
  const privateRanges = [
    /^10\./,                    // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./,              // 192.168.0.0/16
    /^127\./,                   // 127.0.0.0/8 (localhost)
    /^169\.254\./,              // 169.254.0.0/16 (link-local)
    /^::1$/,                    // IPv6 localhost
    /^fe80:/,                   // IPv6 link-local
    /^fc00:/,                   // IPv6 private
  ];
  
  return privateRanges.some(pattern => pattern.test(cleanIP));
};

/**
 * Get IP metadata (type, privacy, location estimate)
 * @param {string} ip - IP address
 * @returns {Object} IP metadata
 */
export const getIPMetadata = (ip) => {
  if (!ip || !isValidIP(ip)) {
    return {
      ip: null,
      valid: false,
      type: 'unknown',
      isPrivate: false,
    };
  }

  const cleanIP = sanitizeIP(ip);
  const isIPv6 = cleanIP.includes(':');
  const isPrivate = isPrivateIP(cleanIP);

  return {
    ip: cleanIP,
    valid: true,
    type: isIPv6 ? 'IPv6' : 'IPv4',
    isPrivate,
    displayName: isPrivate ? `${cleanIP} (Private)` : cleanIP,
  };
};

/**
 * Anonymize IP address for privacy compliance (GDPR)
 * Removes last octet for IPv4, last 80 bits for IPv6
 * @param {string} ip - IP address to anonymize
 * @returns {string} Anonymized IP
 */
export const anonymizeIP = (ip) => {
  if (!ip || !isValidIP(ip)) return null;
  
  const cleanIP = sanitizeIP(ip);
  
  if (cleanIP.includes(':')) {
    // IPv6: Zero out last 80 bits (last 5 groups)
    const parts = cleanIP.split(':');
    return parts.slice(0, 3).join(':') + '::0';
  } else {
    // IPv4: Zero out last octet
    const parts = cleanIP.split('.');
    parts[3] = '0';
    return parts.join('.');
  }
};

/**
 * Rate limit key generator using IP
 * Uses anonymized IP for privacy while maintaining rate limit effectiveness
 * @param {Object} req - Express request
 * @returns {string} Rate limit key
 */
export const getIPRateLimitKey = (req) => {
  const ip = getRealIP(req);
  return ip ? anonymizeIP(ip) : 'unknown';
};

export default {
  getRealIP,
  isValidIP,
  sanitizeIP,
  isPrivateIP,
  getIPMetadata,
  anonymizeIP,
  getIPRateLimitKey,
};
