import { execSync } from 'node:child_process';

export interface SupabaseStatus {
  API_URL: string;
  DB_URL: string;
  PUBLISHABLE_KEY: string;
  SECRET_KEY: string;
}

const NAMES = ['API_URL', 'DB_URL', 'PUBLISHABLE_KEY', 'SECRET_KEY'] as const;

let cached: SupabaseStatus | undefined;

// Lê os endereços e as chaves do Supabase local direto da CLI, para nenhuma chave precisar
// ser escrita no repositório (o `gitleaks` poderia acusá-la).
export function supabaseStatus(): SupabaseStatus {
  if (cached) return cached;

  const output = execSync('pnpm exec supabase status -o env', {
    encoding: 'utf8',
    // A CLI escreve avisos no stderr; só a saída padrão interessa.
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  // Cada linha útil tem o formato NOME="valor".
  const values = new Map(
    [...output.matchAll(/^([A-Z_]+)="(.*)"\r?$/gm)].map((match) => [match[1], match[2]]),
  );

  // A mensagem cita só os nomes, nunca os valores.
  const missing = NAMES.filter((name) => !values.get(name));
  if (missing.length > 0) {
    throw new Error(
      `\`supabase status\` não devolveu: ${missing.join(', ')}. ` +
        'O Supabase local está ligado? Rode `pnpm db:start`.',
    );
  }

  cached = Object.fromEntries(
    NAMES.map((name) => [name, values.get(name)]),
  ) as unknown as SupabaseStatus;
  return cached;
}
