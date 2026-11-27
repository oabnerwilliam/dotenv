import { Skeleton } from '../../components/ui/Skeleton';
import { AuthLayout } from './AuthLayout';

/** Tela de espera: a sessão está sendo lida, trocada pelo código ou conferida em `/me`. */
export function SessionLoading() {
  return (
    <AuthLayout>
      <h1 className="sr-only">.env</h1>
      <div role="status" aria-busy="true" className="flex w-full justify-center">
        <span className="sr-only">Carregando sua sessão</span>
        <div className="flex min-h-[560px] w-full max-w-content items-center justify-center rounded-lg border border-dashed border-line-strong bg-surface-2 p-8">
          <div className="flex w-full max-w-[520px] flex-col items-start gap-4">
            <Skeleton className="h-10 w-[70%]" />
            <Skeleton className="h-[34px] w-[55%]" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-[80%]" />
            <Skeleton className="h-12 w-24" />
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
