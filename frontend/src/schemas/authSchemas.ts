import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .max(254, 'Email address must be 254 characters or fewer.')
  .email('Enter a valid email address.')
  .transform((email) => email.toLowerCase());

export const loginPasswordSchema = z.string().min(1, 'Enter your password.');

export const signupPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long.')
  .regex(/[A-Z]/, 'Include at least one uppercase letter.')
  .regex(/[a-z]/, 'Include at least one lowercase letter.')
  .regex(/[0-9]/, 'Include at least one number.')
  .regex(/[^A-Za-z0-9\s]/, 'Include at least one special character.')
  .refine((password) => password === password.trim(), 'Password cannot start or end with whitespace.');

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, 'Full name must be at least 2 characters long.')
  .max(100, 'Full name must be 100 characters or fewer.');

export const institutionNameSchema = z
  .string()
  .trim()
  .min(2, 'Institution name must be at least 2 characters long.')
  .max(120, 'Institution name must be 120 characters or fewer.');

export const loginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
});

export const registrationSchema = z
  .object({
    fullName: fullNameSchema,
    email: emailSchema,
    password: signupPasswordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password.'),
    userType: z.enum(['institution', 'collector']),
    institutionName: z.string().optional(),
  })
  .superRefine((form, context) => {
    if (form.confirmPassword && form.password !== form.confirmPassword) {
      context.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'Passwords do not match.',
      });
    }

    if (form.userType === 'institution') {
      const result = institutionNameSchema.safeParse(form.institutionName ?? '');
      if (!result.success) {
        for (const issue of result.error.issues) {
          context.addIssue({
            code: 'custom',
            path: ['institutionName'],
            message: issue.message,
          });
        }
      }
    }
  });
