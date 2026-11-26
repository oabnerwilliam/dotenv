import { healthSchema } from '@env/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';

export function StatusPage() {
  const health = useQuery({
    queryKey: queryKeys.health,
    queryFn: ({ signal }) => apiFetch('/health', healthSchema, { signal }),
  });

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-6">
      <h1 className="font-mono text-2xl font-semibold">.env</h1>

      {/* A região fica sempre na tela: assim o leitor de tela anuncia a troca de texto. */}
      <div role="status">
        {health.isPending && <p>Consultando a API…</p>}
        {health.isSuccess && (
          <>
            <p className="font-semibold">API no ar</p>
            <p>{health.data.database === 'up' ? 'Banco conectado' : 'Banco indisponível'}</p>
          </>
        )}
      </div>

      {health.isError && (
        <div className="flex flex-col items-start gap-3">
          <p role="alert">Não foi possível consultar a API.</p>
          <button
            type="button"
            className="min-h-11 cursor-pointer rounded-md border px-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
            onClick={() => void health.refetch()}
          >
            Tentar de novo
          </button>
        </div>
      )}
    </main>
  );
}
