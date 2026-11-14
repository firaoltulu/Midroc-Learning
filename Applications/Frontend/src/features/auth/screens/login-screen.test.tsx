import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { theme } from '../../../shared/theme/theme';
import { AuthProvider } from '../components/auth-provider';
import type { AuthSearch } from '../schemas/search';
import { createFakeAuthController } from '../testing/fake-auth-controller';
import { LoginScreen } from './login-screen';

/** Renders a screen inside the theme, the providers and a one-route memory router (links need one). */
function renderWithAuth(ui: ReactNode) {
  const fake = createFakeAuthController();
  fake.signOutNow();
  const rootRoute = createRootRoute({ component: () => ui });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={new QueryClient()}>
        <AuthProvider controller={fake.controller}>
          <RouterProvider router={router as never} />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  );
  return fake;
}

const search = (value: AuthSearch = {}) => value;

describe('LoginScreen', () => {
  it('validates the form before calling Firebase', async () => {
    const fake = renderWithAuth(<LoginScreen search={search()} />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter your email')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toHaveAccessibleDescription('Enter your email');
    expect(fake.controller.signInWithPassword).not.toHaveBeenCalled();
  });

  it('signs in with the entered credentials', async () => {
    const fake = renderWithAuth(<LoginScreen search={search()} />);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/Email/), 'learner@example.com');
    await user.type(screen.getByLabelText(/^Password/), 'secret-pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(fake.controller.signInWithPassword).toHaveBeenCalledWith(
      'learner@example.com',
      'secret-pass',
    );
  });

  it('shows a translated message for wrong credentials, never the provider text', async () => {
    const fake = renderWithAuth(<LoginScreen search={search()} />);
    fake.controller.signInWithPassword.mockRejectedValueOnce(
      Object.assign(new Error('Firebase: Error (auth/invalid-credential).'), {
        code: 'auth/invalid-credential',
      }),
    );
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/Email/), 'learner@example.com');
    await user.type(screen.getByLabelText(/^Password/), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "That email and password don't match. Check them and try again.",
    );
    expect(screen.queryByText(/Firebase:/)).toBeNull();
  });

  it('explains a suspended account', async () => {
    renderWithAuth(<LoginScreen search={search({ reason: 'suspended' })} />);
    expect(await screen.findByText(/Your account is suspended/)).toBeInTheDocument();
  });

  it('ignores a cancelled Google popup', async () => {
    const fake = renderWithAuth(<LoginScreen search={search()} />);
    fake.controller.signInWithGoogle.mockRejectedValueOnce({ code: 'auth/popup-closed-by-user' });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Continue with Google' }));
    expect(fake.controller.signInWithGoogle).toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('toggles password visibility with a labelled button', async () => {
    renderWithAuth(<LoginScreen search={search()} />);
    const user = userEvent.setup();
    const password = await screen.findByLabelText(/^Password/);
    expect(password).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
