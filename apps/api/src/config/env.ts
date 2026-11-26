import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3333),
  DATABASE_URL: z.string().min(1),
  // Reduzida à origem (sem barra final nem caminho): é o que o navegador compara no CORS.
  WEB_ORIGIN: z.url({ protocol: /^https?$/ }).transform((url) => new URL(url).origin),
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
