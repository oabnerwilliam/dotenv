import type { VerifiedToken } from '../auth/token-verifier';
import type { Prisma } from '../generated/prisma/client';

// Cria ou atualiza a pessoa com o e-mail verificado. Procura primeiro pelo e-mail (a conta no
// Supabase pode ter sido recriada, com outro id) e depois pelo id (o e-mail pode ter mudado).
export async function saveUser(tx: Prisma.TransactionClient, auth: VerifiedToken, email: string) {
  const data = {
    supabaseId: auth.supabaseId,
    email,
    name: auth.name,
    avatarUrl: auth.avatarUrl,
  };
  const existing =
    (await tx.user.findUnique({ where: { email } })) ??
    (await tx.user.findUnique({ where: { supabaseId: auth.supabaseId } }));

  return existing ? tx.user.update({ where: { id: existing.id }, data }) : tx.user.create({ data });
}
