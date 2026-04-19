import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  fullName: z
    .string()
    .min(2, 'Name must be at least 2 characters.')
    .max(100, 'Name must be under 100 characters.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  confirmPassword: z.string(),
  preferredLanguage: z.enum(['en', 'hi', 'es', 'fr', 'ar', 'pt']).default('en'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
