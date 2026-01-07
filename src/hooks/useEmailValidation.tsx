/**
 * Email Validation Hook (V2, V4, V5)
 * 
 * Validates email addresses against:
 * - Allowed government domains (from database)
 * - Blocked disposable email domains (from database)
 * - SSO requirements for specific domains
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EmailValidationResult {
  isValid: boolean;
  isAllowedDomain: boolean;
  isBlockedDomain: boolean;
  requiresAccessCode: boolean;
  requiresSSO: boolean;
  domainType: string | null;
  error: string | null;
}

interface AllowedDomain {
  domain: string;
  domain_type: string;
  requires_access_code: boolean;
  requires_sso: boolean;
}

export function useEmailValidation() {
  const [isValidating, setIsValidating] = useState(false);
  const [cachedAllowedDomains, setCachedAllowedDomains] = useState<AllowedDomain[] | null>(null);
  const [cachedBlockedDomains, setCachedBlockedDomains] = useState<string[] | null>(null);

  // Fetch allowed domains (cached)
  const fetchAllowedDomains = useCallback(async (): Promise<AllowedDomain[]> => {
    if (cachedAllowedDomains) return cachedAllowedDomains;

    const { data, error } = await supabase
      .from('allowed_email_domains')
      .select('domain, domain_type, requires_access_code, requires_sso')
      .eq('is_active', true);

    if (error) {
      console.error('Failed to fetch allowed domains:', error);
      return [];
    }

    setCachedAllowedDomains(data || []);
    return data || [];
  }, [cachedAllowedDomains]);

  // Fetch blocked domains (cached)
  const fetchBlockedDomains = useCallback(async (): Promise<string[]> => {
    if (cachedBlockedDomains) return cachedBlockedDomains;

    const { data, error } = await supabase
      .from('blocked_email_domains')
      .select('domain')
      .eq('is_active', true);

    if (error) {
      console.error('Failed to fetch blocked domains:', error);
      return [];
    }

    const domains = (data || []).map(d => d.domain);
    setCachedBlockedDomains(domains);
    return domains;
  }, [cachedBlockedDomains]);

  // Check if email domain matches allowed domain pattern
  const matchesDomain = (emailDomain: string, allowedDomain: string): boolean => {
    return emailDomain === allowedDomain || emailDomain.endsWith(`.${allowedDomain}`);
  };

  // Validate email
  const validateEmail = useCallback(async (email: string): Promise<EmailValidationResult> => {
    setIsValidating(true);

    try {
      const emailLower = email.toLowerCase().trim();
      const emailDomain = emailLower.split('@')[1];

      if (!emailDomain) {
        return {
          isValid: false,
          isAllowedDomain: false,
          isBlockedDomain: false,
          requiresAccessCode: true,
          requiresSSO: false,
          domainType: null,
          error: 'Invalid email format',
        };
      }

      // Check blocked domains first
      const blockedDomains = await fetchBlockedDomains();
      if (blockedDomains.includes(emailDomain)) {
        return {
          isValid: false,
          isAllowedDomain: false,
          isBlockedDomain: true,
          requiresAccessCode: true,
          requiresSSO: false,
          domainType: null,
          error: 'Temporary or disposable email addresses are not allowed',
        };
      }

      // Check allowed domains
      const allowedDomains = await fetchAllowedDomains();
      const matchedDomain = allowedDomains.find(d => matchesDomain(emailDomain, d.domain));

      if (matchedDomain) {
        return {
          isValid: true,
          isAllowedDomain: true,
          isBlockedDomain: false,
          requiresAccessCode: matchedDomain.requires_access_code,
          requiresSSO: matchedDomain.requires_sso,
          domainType: matchedDomain.domain_type,
          error: null,
        };
      }

      // Not an allowed domain - requires access code
      return {
        isValid: true,
        isAllowedDomain: false,
        isBlockedDomain: false,
        requiresAccessCode: true,
        requiresSSO: false,
        domainType: null,
        error: null,
      };

    } catch (error) {
      console.error('Email validation error:', error);
      return {
        isValid: false,
        isAllowedDomain: false,
        isBlockedDomain: false,
        requiresAccessCode: true,
        requiresSSO: false,
        domainType: null,
        error: 'Failed to validate email. Please try again.',
      };
    } finally {
      setIsValidating(false);
    }
  }, [fetchAllowedDomains, fetchBlockedDomains]);

  // Clear cache (useful after admin updates domains)
  const clearCache = useCallback(() => {
    setCachedAllowedDomains(null);
    setCachedBlockedDomains(null);
  }, []);

  return {
    validateEmail,
    isValidating,
    clearCache,
  };
}
