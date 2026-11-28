// O que as telas da casca mostram enquanto a lista de projetos não chega, ou quando ela falha.
import { RefreshCw } from 'lucide-react';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';

export function ProjectsLoading() {
  return (
    <>
      <h1 className="sr-only">Projeto</h1>
      <div role="status" aria-busy="true" className="flex flex-col gap-5">
        <span className="sr-only">Carregando projetos</span>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3.5 w-40 max-w-[60%]" />
          <Skeleton className="h-[34px] w-[220px] max-w-[80%]" />
        </div>
        <div className="flex min-h-[560px] w-full items-center justify-center rounded-lg border border-dashed border-line-strong bg-surface-2 p-5 md:p-8">
          <div className="flex w-full max-w-[520px] flex-col items-start gap-4">
            <Skeleton className="h-10 w-[70%]" />
            <Skeleton className="h-[34px] w-[55%]" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-[80%]" />
          </div>
        </div>
      </div>
    </>
  );
}

type RetryProps = { retrying: boolean; onRetry: () => void };

function RetryButton({ retrying, onRetry }: RetryProps) {
  return (
    <Button variant="orange" size="sm" disabled={retrying} onClick={onRetry}>
      <RefreshCw aria-hidden="true" size={16} strokeWidth={1.8} />
      Tentar de novo
    </Button>
  );
}

/** Falhou e não há nada para mostrar: a faixa é a página. */
export function ProjectsError(props: RetryProps) {
  return (
    <>
      <h1 className="sr-only">Falha ao carregar os projetos</h1>
      <Banner
        status="bloqueado"
        title="Não foi possível carregar os projetos"
        actions={<RetryButton {...props} />}
      >
        Confira sua conexão e tente de novo.
      </Banner>
    </>
  );
}

/** Falhou ao atualizar: a tela continua com o que já tinha, e a faixa avisa. */
export function ProjectsStale(props: RetryProps) {
  return (
    <Banner
      status="bloqueado"
      title="Não foi possível atualizar os projetos"
      actions={<RetryButton {...props} />}
    >
      Mostrando os últimos dados carregados. Confira sua conexão e tente de novo.
    </Banner>
  );
}
