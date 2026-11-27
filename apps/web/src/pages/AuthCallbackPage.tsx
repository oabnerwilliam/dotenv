import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { SessionLoading } from '../app/layout/SessionLoading';
import { useSession } from '../lib/auth';
import { clearReturnPath, readReturnPath } from '../lib/returnPath';

// O Supabase devolve a falha na query ou no fragmento (`#error=...`).
function hasError(params: string): boolean {
  return new URLSearchParams(params).has('error');
}

/** Volta do Google. A troca do código pela sessão é do `supabase-js`; aqui só se espera. */
export function AuthCallbackPage() {
  const session = useSession();
  const { search, hash } = useLocation();
  const [destination] = useState(readReturnPath);
  const failed = hasError(search) || hasError(hash.slice(1));
  const done = !failed && session.status === 'signed_in';

  useEffect(() => {
    if (done) clearReturnPath();
  }, [done]);

  if (failed || session.status === 'signed_out') {
    return <Navigate to="/login" replace state={{ loginFailed: true }} />;
  }
  if (session.status === 'loading') return <SessionLoading />;
  return <Navigate to={destination} replace />;
}
