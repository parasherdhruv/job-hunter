import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/app/login/login-form';

const replace = jest.fn();
const refresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh, push: jest.fn() }),
  useSearchParams: () => new URLSearchParams('next=/jobs'),
}));

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return { ...actual, api: { auth: { login: jest.fn() } } };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { api } = jest.requireMock('@/lib/api') as { api: { auth: { login: jest.Mock } } };

describe('LoginForm', () => {
  beforeEach(() => {
    api.auth.login.mockReset();
    replace.mockReset();
    refresh.mockReset();
  });

  it('signs in and redirects to the requested page', async () => {
    api.auth.login.mockResolvedValue({ username: 'admin', createdAt: 'now' });

    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText('Username'), 'admin');
    await userEvent.type(screen.getByLabelText('Password'), 'secret-pass');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(api.auth.login).toHaveBeenCalledWith('admin', 'secret-pass');
    expect(replace).toHaveBeenCalledWith('/jobs');
  });

  it('shows the server error message on failure', async () => {
    const { ApiError } = jest.requireActual('@/lib/api') as typeof import('@/lib/api');
    api.auth.login.mockRejectedValue(new ApiError('Invalid username or password.', 401, 'UNAUTHORIZED'));

    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText('Username'), 'admin');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username or password.');
    expect(replace).not.toHaveBeenCalled();
  });
});
