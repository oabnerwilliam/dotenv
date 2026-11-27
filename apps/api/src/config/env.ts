import { normalizeEmail } from '@env/shared';
import { z } from 'zod';

const envSchema = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(3333),
    DATABASE_URL: z.string().min(1),
    // Reduzida à origem (sem barra final nem caminho): é o que o navegador compara no CORS.
    WEB_ORIGIN: z.url({ protocol: /^https?$/ }).transform((url) => new URL(url).origin),
    // Sem barra no fim: o emissor do token é montado a partir dela e comparado texto a texto.
    SUPABASE_URL: z.url({ protocol: /^https?$/ }).transform((url) => url.replace(/\/+$/, '')),
    // Chave com poder administrativo sobre o Auth.
    SUPABASE_SECRET_KEY: z.string().min(1),
    OWNER_EMAIL: z.string().transform(normalizeEmail).pipe(z.email()),
    AUTH_TEST_MODE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(300),
    NODE_ENV: z.string().optional(),
  })
  // O modo de teste aceita login por senha. Ligado no ar, seria uma porta aberta: a API só sobe
  // com ele quando `NODE_ENV` é exatamente `test`.
  .refine((env) => !env.AUTH_TEST_MODE || env.NODE_ENV === 'test', {
    path: ['AUTH_TEST_MODE'],
  });

export type Env = z.infer<typeof envSchema>;

export const ENV = Symbol('ENV');

// A mensagem cita só os nomes das variáveis: os valores podem ser senhas e iriam para o log.
export function loadEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(source);
  if (result.success) return result.data;

  const names = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
  throw new Error(
    `Variáveis de ambiente ausentes ou inválidas: ${names.join(', ')}. ` +
      'Veja apps/api/.env.example.',
  );
}
