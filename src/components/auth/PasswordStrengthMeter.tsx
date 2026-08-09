import { Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { passwordRequirements } from '@/lib/passwordValidation';

export interface PasswordRule {
  id: string;
  label: string;
  test: (v: string) => boolean;
}

export const passwordRules: PasswordRule[] = [...passwordRequirements];

export function getPasswordScore(value: string) {
  return passwordRules.reduce((acc, r) => acc + (r.test(value) ? 1 : 0), 0);
}

const levels = [
  { label: 'Very weak', bar: 'bg-destructive', text: 'text-destructive' },
  { label: 'Weak', bar: 'bg-destructive', text: 'text-destructive' },
  { label: 'Fair', bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  { label: 'Good', bar: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
  { label: 'Strong', bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  { label: 'Very strong', bar: 'bg-emerald-600', text: 'text-emerald-600 dark:text-emerald-400' },
];

interface Props {
  value: string;
}

export function PasswordStrengthMeter({ value }: Props) {
  if (!value) return null;

  const score = getPasswordScore(value);
  const level = levels[score];
  const pct = (score / passwordRules.length) * 100;

  return (
    <div className="space-y-2 pt-1" aria-live="polite">
      <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${level.bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.25 }}
        />
      </div>
      <p className={`text-xs font-medium ${level.text}`}>Password strength: {level.label}</p>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
        {passwordRules.map((rule) => {
          const ok = rule.test(value);
          return (
            <li
              key={rule.id}
              className={`flex items-center gap-1.5 text-xs ${
                ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
              }`}
            >
              {ok ? (
                <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <X className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              )}
              <span>{rule.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
