import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Signup from './Signup';
import { Toaster } from '@/components/ui/toaster';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { signUp: vi.fn() },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: { id: 'profile-1' }, error: null })),
        })),
      })),
    })),
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const signUpMock = supabase.auth.signUp as unknown as ReturnType<typeof vi.fn>;

function renderSignup() {
  return render(
    <MemoryRouter>
      <Signup />
      <Toaster />
    </MemoryRouter>
  );
}

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  password: string,
  { withDepartment = true }: { withDepartment?: boolean } = {}
) {
  await user.type(screen.getByLabelText(/full name/i), 'Asha Verma');
  await user.type(screen.getByLabelText(/email address/i), 'asha.verma@example.edu');
  await user.type(screen.getByLabelText(/^password$/i), password);

  if (withDepartment) {
    await user.click(screen.getByRole('combobox', { name: /department/i }));
    await user.click(await screen.findByRole('option', { name: 'Information Technology' }));
  }
}

describe('Signup password handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks a weak password client-side and never calls the auth backend', async () => {
    const user = userEvent.setup();
    renderSignup();

    await fillForm(user, 'weakpass');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    expect(await screen.findByText('Password must include an uppercase letter')).toBeInTheDocument();
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it('accepts a strong password and submits it to the auth backend', async () => {
    signUpMock.mockResolvedValue({
      data: { user: { id: 'user-1' }, session: { access_token: 'token' } },
      error: null,
    });

    const user = userEvent.setup();
    renderSignup();

    await fillForm(user, 'Str0ng!Passw0rd');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => expect(signUpMock).toHaveBeenCalledTimes(1));
    expect(signUpMock.mock.calls[0][0]).toMatchObject({
      email: 'asha.verma@example.edu',
      password: 'Str0ng!Passw0rd',
    });
    expect(screen.queryByText(/must include/i)).not.toBeInTheDocument();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/select-role'));
  });

  it('renders the exact backend error text for a leaked (pwned) password', async () => {
    const backendMessage =
      'Password is known to be weak and easy to guess, please choose a different one.';
    signUpMock.mockResolvedValue({ data: { user: null, session: null }, error: { message: backendMessage } });

    const user = userEvent.setup();
    renderSignup();

    await fillForm(user, 'Passw0rd!123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    // Shown inline under the password field AND in the toast — verbatim, unmodified.
    const matches = await screen.findAllByText(backendMessage);
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(await screen.findByText('Signup Failed')).toBeInTheDocument();
  });

  it('renders the exact backend error text for a non-password failure without blaming the password', async () => {
    const backendMessage = 'User already registered';
    signUpMock.mockResolvedValue({ data: { user: null, session: null }, error: { message: backendMessage } });

    const user = userEvent.setup();
    renderSignup();

    await fillForm(user, 'Str0ng!Passw0rd');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    expect(await screen.findByText(backendMessage)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('surfaces the exact database provisioning error instead of a password error', async () => {
    const backendMessage = 'Database error saving new user';
    signUpMock.mockResolvedValue({ data: { user: null, session: null }, error: { message: backendMessage } });

    const user = userEvent.setup();
    renderSignup();

    await fillForm(user, 'Str0ng!Passw0rd');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    expect(await screen.findByText(backendMessage)).toBeInTheDocument();
    expect(await screen.findByText("Couldn't finish setting up your account")).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).not.toHaveAttribute('aria-invalid', 'true');
  });
});
