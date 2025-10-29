/**
 * Input Validation Utilities
 * 
 * Provides common validation functions to prevent injection attacks
 * and ensure data integrity.
 */

/**
 * Validate and sanitize string input
 */
export const sanitizeString = (input: unknown, maxLength: number = 1000): string => {
  if (typeof input !== "string") {
    throw new Error("Input must be a string");
  }
  
  // Remove null bytes and control characters
  let sanitized = input.replace(/\0/g, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Enforce max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  
  return sanitized;
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

/**
 * Validate URL format and protocol
 */
export const isValidHttpUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
};

/**
 * Validate UUID format
 */
export const isValidUuid = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Validate integer within range
 */
export const validateInteger = (value: unknown, min?: number, max?: number): number => {
  const num = typeof value === "string" ? parseInt(value, 10) : Number(value);
  
  if (!Number.isInteger(num) || !Number.isFinite(num)) {
    throw new Error("Value must be a valid integer");
  }
  
  if (min !== undefined && num < min) {
    throw new Error(`Value must be at least ${min}`);
  }
  
  if (max !== undefined && num > max) {
    throw new Error(`Value must be at most ${max}`);
  }
  
  return num;
};

/**
 * Validate object has required keys
 */
export const validateRequiredKeys = <T extends Record<string, unknown>>(
  obj: T,
  keys: string[]
): void => {
  const missing = keys.filter(key => !(key in obj) || obj[key] === undefined || obj[key] === null);
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(", ")}`);
  }
};

/**
 * Sanitize object by removing undefined/null values
 */
export const sanitizeObject = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined && value !== null)
  ) as Partial<T>;
};

/**
 * Validate array length
 */
export const validateArrayLength = (arr: unknown[], min: number = 0, max: number = 100): void => {
  if (!Array.isArray(arr)) {
    throw new Error("Value must be an array");
  }
  
  if (arr.length < min) {
    throw new Error(`Array must contain at least ${min} items`);
  }
  
  if (arr.length > max) {
    throw new Error(`Array must contain at most ${max} items`);
  }
};
