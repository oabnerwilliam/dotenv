-- A tabela de controle do Prisma fica no schema public, que o Supabase expõe pela Data API.
-- Com RLS ligado e sem políticas, os papéis públicos não leem nem escrevem nela.
-- IF EXISTS: no banco sombra do `migrate dev` a tabela pode não existir.
ALTER TABLE IF EXISTS "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
