/**
 * Password Validation Utility (V25)
 * 
 * Implements strong password policy:
 * - Minimum 12 characters
 * - At least one uppercase letter
 * - At least one lowercase letter  
 * - At least one number
 * - At least one special character
 */

import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 12;

export const passwordSchema = z.string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~]/, 'Password must contain at least one special character');

export interface PasswordStrength {
  score: number; // 0-5
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  color: string;
  requirements: PasswordRequirement[];
}

export interface PasswordRequirement {
  label: string;
  met: boolean;
}

export function validatePassword(password: string): PasswordStrength {
  const requirements: PasswordRequirement[] = [
    { label: `At least ${PASSWORD_MIN_LENGTH} characters`, met: password.length >= PASSWORD_MIN_LENGTH },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
    { label: 'One special character', met: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~]/.test(password) },
  ];

  const score = requirements.filter(r => r.met).length;

  const strengthMap: Record<number, { label: PasswordStrength['label']; color: string }> = {
    0: { label: 'Very Weak', color: 'bg-destructive' },
    1: { label: 'Very Weak', color: 'bg-destructive' },
    2: { label: 'Weak', color: 'bg-orange-500' },
    3: { label: 'Fair', color: 'bg-yellow-500' },
    4: { label: 'Strong', color: 'bg-green-500' },
    5: { label: 'Very Strong', color: 'bg-green-600' },
  };

  return {
    score,
    ...strengthMap[score],
    requirements,
  };
}

export function getPasswordErrors(password: string): string[] {
  const result = passwordSchema.safeParse(password);
  if (result.success) return [];
  return result.error.errors.map(e => e.message);
}

export function isPasswordValid(password: string): boolean {
  return passwordSchema.safeParse(password).success;
}
