import { z } from 'zod';

export const errorCodeSchema = z.enum([
  'VALIDATION',
  'UNAUTHENTICATED',
  'NOT_INVITED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'VERSION_CONFLICT',
  'STATE_CHANGED',
  'RATE_LIMITED',
  'INTERNAL',
]);

export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const apiErrorSchema = z.object({
  code: errorCodeSchema,
  message: z.string(),
  fields: z.record(z.string(), z.string()).optional(),
});

export type ApiErrorBody = z.infer<typeof apiErrorSchema>;
