import { useParams } from 'react-router';
import { AuthLayout } from '../app/layout/AuthLayout';
import { SignOutButton } from '../app/layout/SignOutButton';
import { EmptyState } from '../components/ui/EmptyState';
import { useMe } from '../lib/auth';
import { TERMO_EQUIPE } from '../lib/termos';

/** Página provisória do projeto, até o board existir. */
export function ProjectPlaceholderPage() {
  const { projeto } = useParams();
  const { data: me } = useMe();
  if (me?.state !== 'member') return null;

  return (
    <AuthLayout>
      <EmptyState
        headingLevel="h1"
        command={projeto && `env status --project=${projeto}`}
        title={me.team.name}
        actions={<SignOutButton />}
      >
        <p>
          Você já faz parte desta {TERMO_EQUIPE}. O board
          {projeto && (
            <>
              {' '}
              do projeto <span className="font-mono text-[0.93em] wrap-anywhere">{projeto}</span>
            </>
          )}{' '}
          ainda está em construção.
        </p>
      </EmptyState>
    </AuthLayout>
  );
}
