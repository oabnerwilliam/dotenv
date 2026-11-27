// Roda antes de cada arquivo de teste. Sempre sobrescreve o ambiente: o CI não tem `.env`
// e teste nunca pode tocar o banco de desenvolvimento.
const DEFAULT_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/env_test';

const testUrl = process.env.TEST_DATABASE_URL || DEFAULT_URL;

// Mesma trava do `db:test:setup`. A mensagem não cita a URL, que carrega a senha.
if (!new URL(testUrl).pathname.endsWith('_test')) {
  throw new Error('TEST_DATABASE_URL precisa apontar para um banco terminado em _test.');
}

process.env.DATABASE_URL = testUrl;
process.env.WEB_ORIGIN = 'http://localhost:5173';
// Valores fictícios fixos: os testes assinam os próprios tokens (`test/support/auth.ts`) e não
// dependem do Supabase nem do Google para entrar.
process.env.SUPABASE_URL = 'https://supabase.acme.example';
process.env.SUPABASE_SECRET_KEY = 'chave-secreta-ficticia';
process.env.OWNER_EMAIL = 'dono@acme.example';
process.env.AUTH_TEST_MODE = 'false';
// Alto para um teste não receber 429 por causa de outro; o teste do limite define o seu.
process.env.RATE_LIMIT_PER_MINUTE = '10000';
