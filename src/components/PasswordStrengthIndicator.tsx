/**
 * Password Strength Indicator Component (V25)
 * 
 * Displays password strength and requirements in real-time.
 */

import { validatePassword, PasswordStrength } from '@/utils/passwordValidation';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
  className?: string;
}

export function PasswordStrengthIndicator({ 
  password, 
  showRequirements = true,
  className 
}: PasswordStrengthIndicatorProps) {
  const strength = validatePassword(password);

  if (!password) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span className={cn(
            'font-medium',
            strength.score <= 2 && 'text-destructive',
            strength.score === 3 && 'text-yellow-600',
            strength.score >= 4 && 'text-green-600'
          )}>
            {strength.label}
          </span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                level <= strength.score ? strength.color : 'bg-muted'
              )}
            />
          ))}
        </div>
      </div>

      {/* Requirements List */}
      {showRequirements && (
        <ul className="space-y-1 text-xs">
          {strength.requirements.map((req, index) => (
            <li 
              key={index}
              className={cn(
                'flex items-center gap-1.5 transition-colors',
                req.met ? 'text-green-600' : 'text-muted-foreground'
              )}
            >
              {req.met ? (
                <Check className="h-3 w-3" />
              ) : (
                <X className="h-3 w-3" />
              )}
              {req.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
