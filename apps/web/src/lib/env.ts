import { z } from 'zod';

const envSchema = z.object({
  VITE_API_URL: z
    .url({ protocol: /^https?$/ })
    // Os caminhos da API começam com "/": sem isto, uma barra no fim viraria "//".
    .transform((url) => url.replace(/\/+$/, '')),
});

export function parseEnv(source: Record<string, unknown>): z.infer<typeof envSchema> {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(
      'Configuração inválida: defina VITE_API_URL com um endereço http(s). Veja apps/web/.env.example.',
    );
  }
  return result.data;
}

export const env = parseEnv(import.meta.env);
