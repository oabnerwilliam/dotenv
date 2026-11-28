import { meSchema } from '@env/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiFetch } from './api';
import { queryKeys } from './queryKeys';
import { endLocalSession, supabase } from './supabase';

export type Session =
  | { status: 'loading'; userId: null }
  | { status: 'signed_out'; userId: null }
  | { status: 'signed_in'; userId: string };

const SessionContext = createContext<Session | null>(null);

/** Acompanha a sessão do Supabase. O token continua com o `supabase-js`; aqui fica só o id. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  // `undefined`: o Supabase ainda não respondeu. `null`: ninguém entrou.
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let previous: string | null | undefined;
    // Nada de chamar o Supabase aqui dentro: ele espera este retorno e os dois travariam.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const next = session?.user.id ?? null;
      // Saiu, a sessão expirou ou outra pessoa entrou (nesta ou em outra aba): o que estava em
      // cache era de quem saiu.
      const changedUser = previous !== undefined && previous !== next;
      if (event === 'SIGNED_OUT' || changedUser) queryClient.clear();
      previous = next;
      setUserId(next);
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  let session: Session;
  if (userId === undefined) session = { status: 'loading', userId: null };
  else if (userId === null) session = { status: 'signed_out', userId };
  else session = { status: 'signed_in', userId };

  return <SessionContext value={session}>{children}</SessionContext>;
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession precisa estar dentro do AuthProvider.');
  return session;
}

/** Quem é a pessoa para o app: membro, dona sem equipe ou sem convite. */
export function useMe() {
  const { userId } = useSession();
  return useQuery({
    queryKey: queryKeys.me(userId),
    queryFn: ({ signal }) => apiFetch('/me', meSchema, { signal }),
    enabled: userId !== null,
  });
}

/** Leva o navegador ao Google. Na volta, o `supabase-js` troca o código pela sessão. */
export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) throw error;
}

/** É um hook porque sair também precisa esvaziar o cache do React Query. */
export function useSignOut() {
  const queryClient = useQueryClient();
  return useCallback(async () => {
    try {
      await endLocalSession();
    } finally {
      queryClient.clear();
    }
  }, [queryClient]);
}

/** Os dados de quem já é membro (equipe, usuário, projeto padrão). Para as telas da casca. */
export function useMember() {
  const { data: me } = useMe();
  return me?.state === 'member' ? me : undefined;
}
