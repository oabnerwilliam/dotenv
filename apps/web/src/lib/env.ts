import { z } from 'zod';

const httpUrl = z
  .url({ protocol: /^https?$/ })
  // Os caminhos começam com "/": sem isto, uma barra no fim viraria "//".
  .transform((url) => url.replace(/\/+$/, ''));

const envSchema = z.object({
  VITE_API_URL: httpUrl,
  VITE_SUPABASE_URL: httpUrl,
  // A chave publicável é feita para o navegador. A secreta nunca entra aqui.
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export function parseEnv(source: Record<string, unknown>): z.infer<typeof envSchema> {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    // Só os nomes: os valores não vão para a mensagem de erro.
    const names = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(
      `Configuração inválida: defina ${names} (endereços em http(s)). Veja apps/web/.env.example.`,
    );
  }
  return result.data;
}

export const env = parseEnv(import.meta.env);
