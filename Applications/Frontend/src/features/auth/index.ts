// Public API of the auth feature. Routes, app and other features import only from here.

// Wiring (app)
export { createFirebaseAuthController } from './firebase/firebase-auth';
export { connectAuth } from './connect-auth';
export { AuthProvider } from './components/auth-provider';
export type { AuthController } from './model/auth-controller';
export type { AuthState, AuthUser } from './model/auth-state';
export { isVerified } from './model/auth-state';

// Route guards and search params (routes)
export {
  NotAllowedError,
  redirectIfSignedIn,
  requireAdmin,
  requireAuthenticated,
  requireUnverified,
  type GuardContext,
} from './guards';
export { authSearchSchema, type AuthSearch } from './schemas/search';

// Screens
export { LoginScreen } from './screens/login-screen';
export { SignUpScreen } from './screens/signup-screen';
export { ForgotPasswordScreen } from './screens/forgot-password-screen';
export { VerifyEmailScreen } from './screens/verify-email-screen';
export { NotAllowedScreen } from './screens/not-allowed-screen';

// For the shell and other features
export { UserMenu } from './components/user-menu';
export { useAuth, useSignOut } from './components/auth-context';
export { useMe, type Me } from './api/me';
