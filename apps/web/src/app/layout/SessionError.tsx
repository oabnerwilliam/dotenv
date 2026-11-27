import { RefreshCw } from 'lucide-react';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { AuthLayout } from './AuthLayout';
import { SignOutButton } from './SignOutButton';

/** O `/me` falhou por um motivo que não é a sessão: dá para tentar de novo. */
export function SessionError({ retrying, onRetry }: { retrying: boolean; onRetry: () => void }) {
  return (
    <AuthLayout>
      <h1 className="sr-only">Falha ao carregar a conta</h1>
      <div className="w-full max-w-[560px]">
        <Banner
          status="bloqueado"
          title="Não foi possível carregar sua conta"
          actions={
            <>
              <Button variant="orange" size="sm" disabled={retrying} onClick={onRetry}>
                <RefreshCw aria-hidden="true" size={16} strokeWidth={1.8} />
                Tentar de novo
              </Button>
              {/* Saída para quem não consegue carregar a conta, ou quer entrar com outra. */}
              <SignOutButton size="sm" />
            </>
          }
        >
          Confira sua conexão e tente de novo.
        </Banner>
      </div>
    </AuthLayout>
  );
}
