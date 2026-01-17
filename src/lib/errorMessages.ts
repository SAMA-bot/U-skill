/**
 * Security-focused error message utility
 * Maps internal error messages to user-friendly versions to prevent information leakage
 */

type ErrorWithMessage = {
  message?: string;
  code?: string;
};

/**
 * Converts Supabase/system error messages to generic user-friendly messages
 * This prevents exposing internal system details that could aid attackers
 */
export function getUserFriendlyError(error: ErrorWithMessage | null | undefined, context: 'auth' | 'general' = 'auth'): string {
  if (!error?.message) {
    return 'An unexpected error occurred. Please try again.';
  }

  const message = error.message.toLowerCase();

  // Authentication-related errors - use generic messages to prevent user enumeration
  if (context === 'auth') {
    if (
      message.includes('invalid login credentials') ||
      message.includes('invalid password') ||
      message.includes('user not found') ||
      message.includes('invalid email')
    ) {
      return 'Invalid email or password. Please check your credentials and try again.';
    }

    if (message.includes('email already registered') || message.includes('user already registered')) {
      return 'An account with this email already exists. Please sign in instead.';
    }

    if (message.includes('email not confirmed')) {
      return 'Please verify your email address to continue.';
    }

    if (message.includes('too many requests') || message.includes('rate limit')) {
      return 'Too many attempts. Please wait a moment before trying again.';
    }

    if (message.includes('password') && message.includes('weak')) {
      return 'Please choose a stronger password with at least 6 characters.';
    }

    if (message.includes('expired') || message.includes('token')) {
      return 'Your session has expired. Please sign in again.';
    }
  }

  // Database/API errors - never expose internal details
  if (
    message.includes('violates') ||
    message.includes('constraint') ||
    message.includes('foreign key') ||
    message.includes('unique')
  ) {
    return 'Unable to complete this action. Please try again.';
  }

  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return 'Connection issue. Please check your internet and try again.';
  }

  if (message.includes('unauthorized') || message.includes('permission') || message.includes('forbidden')) {
    return 'You do not have permission to perform this action.';
  }

  if (message.includes('not found')) {
    return 'The requested resource was not found.';
  }

  if (message.includes('timeout')) {
    return 'The request took too long. Please try again.';
  }

  // Default fallback - never expose raw error messages
  console.error('Unhandled error (logged for debugging):', error.message);
  return 'An error occurred. Please try again later.';
}
