import { z } from 'zod';

export const roleSchema = z.enum(['admin', 'member']);

export type Role = z.infer<typeof roleSchema>;

// Só para comparar e gravar: " Dono@Acme.example " e "dono@acme.example" são a mesma pessoa.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Resposta de `GET /me`. O `state` decide quais campos existem e para onde o app leva a pessoa.
export const meSchema = z.discriminatedUnion('state', [
  z.object({
    state: z.literal('member'),
    user: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      avatarUrl: z.string().nullable(),
    }),
    team: z.object({ id: z.string(), name: z.string(), slug: z.string() }),
    role: roleSchema,
    // `null` quando a equipe não tem projeto ativo.
    defaultProjectSlug: z.string().nullable(),
  }),
  z.object({ state: z.literal('needs_team'), email: z.string() }),
  z.object({ state: z.literal('not_invited'), email: z.string() }),
]);

export type Me = z.infer<typeof meSchema>;
