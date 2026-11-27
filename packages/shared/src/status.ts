import { z } from 'zod';

export const envStatusSchema = z.enum(['livre', 'reservado', 'uso', 'bloqueado']);

export type EnvStatus = z.infer<typeof envStatusSchema>;

export const STATUS_LABEL: Record<EnvStatus, string> = {
  livre: 'Livre',
  reservado: 'Reservado',
  uso: 'Em uso',
  bloqueado: 'Bloqueado',
};
