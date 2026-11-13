import { z } from 'zod';

/*
 * Client-side form rules. Messages are translation keys (namespace-qualified so
 * i18n:check can see them); FormTextField translates them.
 */

const email = z
  .string()
  .trim()
  .min(1, 'auth:form.emailRequired')
  .pipe(z.email('auth:form.emailInvalid'));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'auth:form.passwordRequired'),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const signUpSchema = z.object({
  name: z.string().trim().min(1, 'auth:form.nameRequired').max(120),
  email,
  password: z.string().min(8, 'auth:form.passwordTooShort'),
});
export type SignUpValues = z.infer<typeof signUpSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
