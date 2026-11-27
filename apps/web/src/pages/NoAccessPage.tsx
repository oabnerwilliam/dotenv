import { Lock } from 'lucide-react';
import { AuthLayout } from '../app/layout/AuthLayout';
import { SignOutButton } from '../app/layout/SignOutButton';
import { EmptyState } from '../components/ui/EmptyState';
import { useMe } from '../lib/auth';
import { TERMO_EQUIPE } from '../lib/termos';

/** Quem não é membro nem convidado. Nada daqui revela dados de quem está dentro. */
export function NoAccessPage() {
  const { data: me } = useMe();
  if (me?.state !== 'not_invited') return null;

  return (
    <AuthLayout>
      <EmptyState
        headingLevel="h1"
        icon={Lock}
        title={`Você não tem acesso a esta ${TERMO_EQUIPE}`}
        actions={<SignOutButton />}
      >
        <div className="flex flex-col gap-4">
          <p>
            Só entra quem faz parte da {TERMO_EQUIPE} ou recebeu um convite. Se esperava ter acesso,
            peça um convite para o e-mail abaixo ou saia e entre com outra conta.
          </p>
          <dl className="flex max-w-full flex-col gap-1">
            <dt className="text-[13px] font-semibold text-fg-muted">E-mail em uso</dt>
            <dd className="text-sm wrap-anywhere text-fg">{me.email}</dd>
          </dl>
        </div>
      </EmptyState>
    </AuthLayout>
  );
}
