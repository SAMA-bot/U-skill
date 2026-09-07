import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { ThemeToggle } from '@/components/ThemeToggle';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { strongPasswordSchema } from '@/lib/passwordValidation';

const signupSchema = z.object({
  fullName: z.string().trim().min(2, { message: "Full name must be at least 2 characters" }).max(100),
  email: z.string().trim().email({ message: "Please enter a valid email address" }),
  password: strongPasswordSchema,
  department: z.string().min(1, { message: "Please select a department" }),
});

const departments = [
  "Computer Science & Engineering",
  "Information Technology",
  "Electronics & Communication",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "Management Studies",
];

export default function Signup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate('/select-role');
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setErrors({});

    const requestId = newRequestId();
    const startedAt = Date.now();

    const result = signupSchema.safeParse({ fullName, email, password, department });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      trackSignupEvent({
        requestId,
        stage: 'client_validation',
        status: 'error',
        emailDomain: emailDomainOf(email),
        durationMs: Date.now() - startedAt,
        errorCode: 'client_validation_failed',
        errorMessage: Object.values(fieldErrors).join('; '),
        metadata: { invalidFields: Object.keys(fieldErrors).join(','), passwordLength: password.length },
      });
      void flushSignupTelemetry();
      return;
    }

    setIsLoading(true);

    const signupPayload = {
      email: result.data.email,
      password: result.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: result.data.fullName,
          department: result.data.department,
        },
      },
    };

    const emailDomain = emailDomainOf(signupPayload.email);

    trackSignupEvent({
      requestId,
      stage: 'signup_submitted',
      status: 'start',
      emailDomain,
      metadata: {
        passwordLength: signupPayload.password.length,
        department: signupPayload.options.data.department,
      },
    });

    if (!signupPayload.password) {
      setIsLoading(false);
      setErrors({ password: 'Password is required' });
      trackSignupEvent({
        requestId,
        stage: 'signup_submitted',
        status: 'error',
        emailDomain,
        errorCode: 'empty_password',
        errorMessage: 'Validated password was empty before auth request',
        durationMs: Date.now() - startedAt,
      });
      void flushSignupTelemetry();
      return;
    }

    const authStartedAt = Date.now();
    const { result: authResult, captured } = await withResponseCapture(
      (url) => url.includes('/auth/v1/signup'),
      () => supabase.auth.signUp(signupPayload),
    );
    const { data, error } = authResult;
    const authDuration = Date.now() - authStartedAt;

    if (error) {
      const raw = (error.message || '').toLowerCase();

      // Profile/database provisioning failures — never surface these as password problems
      const isProfileFailure =
        raw.includes('database error') ||
        raw.includes('saving new user') ||
        raw.includes('unexpected_failure') ||
        raw.includes('profiles') ||
        raw.includes('relation') ||
        raw.includes('violates');

      trackSignupEvent({
        requestId,
        stage: isProfileFailure ? 'profile_provisioning' : 'auth_signup',
        status: 'error',
        emailDomain,
        durationMs: authDuration,
        httpStatus: captured.httpStatus ?? (error as { status?: number }).status ?? null,
        supabaseRequestId: captured.supabaseRequestId,
        errorCode: (error as { code?: string }).code ?? 'auth_signup_failed',
        errorMessage: error.message,
      });
      void flushSignupTelemetry();

      if (isProfileFailure) {
        setIsLoading(false);
        toast({
          title: "Couldn't finish setting up your account",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setIsLoading(false);

      const isPasswordError = raw.includes('password') || raw.includes('pwned') || raw.includes('weak');
      if (isPasswordError) setErrors({ password: error.message });

      toast({
        title: "Signup Failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    trackSignupEvent({
      requestId,
      stage: 'auth_signup',
      status: 'success',
      emailDomain,
      userId: data.user?.id ?? null,
      durationMs: authDuration,
      httpStatus: captured.httpStatus,
      supabaseRequestId: captured.supabaseRequestId,
      metadata: { hasSession: Boolean(data.session) },
    });

    // Auth succeeded — verify the profile row was actually provisioned
    if (data.session && data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (profileError || !profile) {
        trackSignupEvent({
          requestId,
          stage: 'profile_provisioning',
          status: 'error',
          emailDomain,
          userId: data.user.id,
          durationMs: Date.now() - startedAt,
          errorCode: profileError ? 'profile_query_failed' : 'profile_row_missing',
          errorMessage: profileError?.message ?? 'Profile row missing after successful auth signup',
        });
        void flushSignupTelemetry();
        setIsLoading(false);
        toast({
          title: "Account created, profile setup incomplete",
          description:
            "Your account was created, but your profile could not be set up. This isn't a password problem. Please contact your administrator so they can complete your profile.",
          variant: "destructive",
        });
        return;
      }

      trackSignupEvent({
        requestId,
        stage: 'profile_provisioning',
        status: 'success',
        emailDomain,
        userId: data.user.id,
        durationMs: Date.now() - startedAt,
      });
    }

    trackSignupEvent({
      requestId,
      stage: 'signup_completed',
      status: 'success',
      emailDomain,
      userId: data.user?.id ?? null,
      durationMs: Date.now() - startedAt,
    });
    void flushSignupTelemetry();

    toast({
      title: "Account Created",
      description: "Welcome! Redirecting to your dashboard...",
    });
    navigate('/select-role');
    setIsLoading(false);
  };


  return (
    <div className="min-h-screen bg-section-alt flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container-wide mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 text-foreground">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-heading font-bold text-lg">FacultyUp</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                Home
              </Link>
              <Link to="/#about" className="text-muted-foreground hover:text-foreground transition-colors">
                About
              </Link>
              <Link to="/#contact" className="text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </Link>
            </nav>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link
                to="/auth/login"
                className="text-primary hover:underline font-medium"
              >
                Log In
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
              Create your account
            </h1>
            <p className="text-muted-foreground">
              Join our platform to enhance your professional journey.
            </p>
          </div>

          <div className="bg-card rounded-2xl shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                   required
                   aria-invalid={Boolean(errors.fullName)}
                  className={errors.fullName ? 'border-destructive' : ''}
                />
                {errors.fullName && (
                  <p className="text-sm text-destructive">{errors.fullName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                   required
                   aria-invalid={Boolean(errors.email)}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                     required
                     aria-invalid={Boolean(errors.password)}
                    className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
                <PasswordStrengthMeter value={password} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger
                    id="department"
                    aria-invalid={Boolean(errors.department)}
                    className={errors.department ? 'border-destructive' : ''}
                  >
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.department && (
                  <p className="text-sm text-destructive">{errors.department}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-base mt-6"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Sign Up'
                )}
              </Button>
            </form>
          </div>

          <p className="text-center text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link to="/auth/login" className="text-primary hover:underline font-medium">
              Log in
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
