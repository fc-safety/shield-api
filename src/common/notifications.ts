import { z } from 'zod';

export const FromAddressSchema = z.union([
  z.string().email(),
  z
    .string()
    .regex(
      /^[A-Za-z0-9\s]+\s<[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}>$/,
    ),
]);
