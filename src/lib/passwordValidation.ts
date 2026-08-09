import { z } from 'zod';

export const passwordRequirements = [
  { id: 'length', label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { id: 'upper', label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { id: 'lower', label: 'One lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { id: 'number', label: 'One number', test: (value: string) => /[0-9]/.test(value) },
  { id: 'special', label: 'One special character', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
] as const;

export const strongPasswordSchema = z.string()
  .min(8, { message: 'Password must be at least 8 characters' })
  .max(72, { message: 'Password must be 72 characters or fewer' })
  .regex(/[A-Z]/, { message: 'Password must include an uppercase letter' })
  .regex(/[a-z]/, { message: 'Password must include a lowercase letter' })
  .regex(/[0-9]/, { message: 'Password must include a number' })
  .regex(/[^A-Za-z0-9]/, { message: 'Password must include a special character' });

export function getPasswordValidationError(value: string): string | null {
  const result = strongPasswordSchema.safeParse(value);
  return result.success ? null : result.error.errors[0]?.message ?? 'Password is invalid';
}