import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Enter your email or 10-digit mobile number').max(254),
  password: z.string().min(1, 'Password is required').max(128),
});

export const farmerRegisterSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
  phone: z.string().trim().regex(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits'),
  email: z.string().trim().email('Please enter a valid email address').optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  confirmPassword: z.string(),
  village: z.string().trim().min(2, 'Village/Town name is required').max(120),
  address: z.string().trim().max(300).optional().or(z.literal('')),
  fatherName: z.string().trim().max(100).optional().or(z.literal('')),
  alternatePhone: z.string().trim().max(20).optional().or(z.literal('')),
  animalType: z.string().trim().max(50).optional().or(z.literal('')),
  terms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the terms and privacy policy',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const customerRegisterSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
  phone: z.string().trim().regex(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits'),
  email: z.string().trim().email('Please enter a valid email address').optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  confirmPassword: z.string(),
  address: z.string().trim().min(3, 'Full delivery address is required').max(300),
  alternatePhone: z.string().trim().max(20).optional().or(z.literal('')),
  category: z.enum(['HOUSEHOLD', 'RETAIL', 'HOTEL', 'RESTAURANT']).default('HOUSEHOLD'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const staffRegisterSchema = z.object({
  token: z.string().trim().min(10, 'Invitation token is required'),
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
  phone: z.string().trim().regex(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits'),
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  confirmPassword: z.string(),
  jobTitle: z.string().trim().max(100).optional().or(z.literal('')),
  department: z.string().trim().max(100).optional().or(z.literal('')),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const staffInviteSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  expiresInHours: z.number().int().min(1).max(168).default(48),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'New passwords do not match',
  path: ['confirmPassword'],
});

export const positiveQuantitySchema = z.number().finite().positive().max(100000);
export const moneySchema = z.number().finite().nonnegative().max(1000000000);
