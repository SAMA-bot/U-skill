import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, Mail, MailCheck, Loader2, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  trackSignupEvent,
  flushSignupTelemetry,
  newRequestId,
  emailDomainOf,
} from '@/lib/signupTelemetry';

const RESEND_COOLDOWN_SECONDS = 60;
const PENDING_EMAIL_KEY = 'pending-verification-email';
const PENDING_REQUEST_KEY = 'pending-verification-request-id';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();

  const stateEmail = (location.state as { email?: string } | null)?.email;
  const email = useMemo(
    () => stateEmail ?? localStorage.getItem(PENDING_EMAIL_KEY) ?? '',
    [stateEmail],
  );
  const requestId = useMemo(
    () => localStorage.getItem(PENDING_REQUEST_KEY) ?? newRequestId(),
    [],
  );

  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (stateEmail) localStorage.setItem(PENDING_EMAIL_KEY, stateEmail);
  }, [stateEmail]);

  // Already verified and signed in — move on.
  useEffect(() => {
    if (!loading && user?.email_confirmed_at) {
      localStorage.removeItem(PENDING_EMAIL_KEY);
      localStorage.removeItem(PENDING_REQUEST_KEY);
      navigate('/select-role', { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email) {
      setStatus('error');
      setErrorMessage("We don't know which address to send to. Please sign up again.");
      return;
    }
    if (cooldown > 0 || status === 'sending') return;

    setStatus('sending');
    setErrorMessage('');
    const startedAt = Date.now();

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: window.location.origin },
    });

    trackSignupEvent({
      requestId,
      stage: 'verification_resend',
      status: error ? 'error' : 'success',
      emailDomain: emailDomainOf(email),
      durationMs: Date.now() - startedAt,
      errorCode: error ? ((error as { code?: string }).code ?? 'resend_failed') : null,
      errorMessage: error?.message ?? null,
    });
    void flushSignupTelemetry();

    if (error) {
      setStatus('error');
      setErrorMessage(error.message);
      toast({
        title: "Couldn't send the verification email",
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setStatus('sent');
    setCooldown(RESEND_COOLDOWN_SECONDS);
    toast({
      title: 'Verification email sent',
      description: `We sent a new link to ${email}. It can take a minute to arrive.`,
    });
  };

  const handleCheck = async () => {
    setChecking(true);
    const { data, error } = await supabase.auth.getUser();
    setChecking(false);

    if (error || !data.user) {
      toast({
        title: 'Not verified yet',
        description:
          "We couldn't confirm your email yet. Open the link in your inbox, then come back and check again.",
        variant: 'destructive',
      });
      return;
    }

    if (data.user.email_confirmed_at) {
      trackSignupEvent({
        requestId,
        stage: 'email_verified',
        status: 'success',
        emailDomain: emailDomainOf(data.user.email ?? email),
        userId: data.user.id,
      });
      void flushSignupTelemetry();
      localStorage.removeItem(PENDING_EMAIL_KEY);
      localStorage.removeItem(PENDING_REQUEST_KEY);
      toast({ title: 'Email verified', description: 'Taking you to your dashboard...' });
      navigate('/select-role', { replace: true });
      return;
    }

    toast({
      title: 'Still waiting for verification',
      description: 'Your email address has not been confirmed yet. Please open the link we sent you.',
      variant: 'destructive',
    });
  };

  return (
    <div className="min-h-screen bg-section-alt flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="container-wide mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 text-foreground">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-heading font-bold text-lg">FacultyUp</span>
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link to="/auth/login" className="text-primary hover:underline font-medium">
                Log In
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="bg-card rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
              {status === 'sent' ? (
                <MailCheck className="w-8 h-8 text-primary" />
              ) : (
                <Mail className="w-8 h-8 text-primary" />
              )}
            </div>

            <h1 className="font-heading text-2xl font-bold text-foreground mb-2">
              Verify your email address
            </h1>
            <p className="text-muted-foreground">
              {email ? (
                <>
                  We sent a verification link to{' '}
                  <span className="font-medium text-foreground break-all">{email}</span>. Open it to
                  activate your account.
                </>
              ) : (
                'Open the verification link we sent to your inbox to activate your account.'
              )}
            </p>

            {status === 'sent' && (
              <div
                role="status"
                className="mt-5 flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-left text-sm text-foreground"
              >
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                <span>A new verification email is on its way. Check spam if you don't see it.</span>
              </div>
            )}

            {status === 'error' && errorMessage && (
              <div
                role="alert"
                className="mt-5 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-left text-sm text-destructive"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="mt-6 space-y-3">
              <Button
                onClick={handleResend}
                disabled={status === 'sending' || cooldown > 0}
                className="w-full h-12 text-base"
              >
                {status === 'sending' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : cooldown > 0 ? (
                  `Resend available in ${cooldown}s`
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Resend verification email
                  </>
                )}
              </Button>

              <Button variant="outline" onClick={handleCheck} disabled={checking} className="w-full h-12">
                {checking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "I've verified — continue"
                )}
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mt-6">
              Wrong address?{' '}
              <Link to="/auth/signup" className="text-primary hover:underline font-medium">
                Sign up again
              </Link>
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
