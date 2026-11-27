import { Navigate } from 'react-router';
import { useMe } from '../lib/auth';
import { ProjectPlaceholderPage } from './ProjectPlaceholderPage';

/** O `/` de quem é membro: leva ao projeto padrão. */
export function HomePage() {
  const { data: me } = useMe();
  if (me?.state !== 'member') return null;
  // Equipe sem projeto ativo: mostra a equipe aqui mesmo, para não redirecionar sem fim.
  if (!me.defaultProjectSlug) return <ProjectPlaceholderPage />;
  return <Navigate to={`/p/${me.defaultProjectSlug}`} replace />;
}
