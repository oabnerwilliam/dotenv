// Guards de rota. Eles só decidem o que mostrar: quem protege os dados é a API.
import type { Me } from '@env/shared';
import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useMe, useSession } from '../lib/auth';
import { saveReturnPath } from '../lib/returnPath';
import { SessionError } from './layout/SessionError';
import { SessionLoading } from './layout/SessionLoading';

const HOME_BY_STATE: Record<Me['state'], string> = {
  member: '/',
  needs_team: '/onboarding/equipe',
  not_invited: '/sem-permissao',
};

/** Guarda o endereço pedido e leva ao login. */
function GoToLogin() {
  const { pathname, search, hash } = useLocation();
  // Lido uma vez: durante a troca de rota o endereço já pode ser o do login.
  const [destination] = useState(() => `${pathname}${search}${hash}`);
  useEffect(() => saveReturnPath(destination), [destination]);
  return <Navigate to="/login" replace />;
}

type GuardProps = { children: ReactNode };

/** Mostra o conteúdo só a quem está no estado pedido; os demais vão para a tela deles. */
export function RequireState({ state, children }: GuardProps & { state: Me['state'] }) {
  const session = useSession();
  const me = useMe();

  if (session.status === 'loading') return <SessionLoading />;
  if (session.status === 'signed_out') return <GoToLogin />;
  if (!me.data) {
    // `errorUpdateCount` continua acima de zero durante a nova tentativa, então a faixa fica na
    // tela com o botão desativado. Com dados em mãos, uma falha posterior não tira a tela.
    if (me.errorUpdateCount === 0) return <SessionLoading />;
    return <SessionError retrying={me.isFetching} onRetry={() => void me.refetch()} />;
  }
  if (me.data.state !== state) return <Navigate to={HOME_BY_STATE[me.data.state]} replace />;
  return children;
}

export function RequireMember({ children }: GuardProps) {
  return <RequireState state="member">{children}</RequireState>;
}
