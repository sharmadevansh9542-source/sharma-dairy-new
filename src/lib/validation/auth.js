import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(254),
  password: z.string().min(1).max(128),
});

export const positiveQuantitySchema = z.number().finite().positive().max(100000);
export const moneySchema = z.number().finite().nonnegative().max(1000000000);
