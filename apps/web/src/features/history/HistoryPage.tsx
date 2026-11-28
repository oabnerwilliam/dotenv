import { PageHeader } from '../../app/layout/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { useProject } from '../projects/ProjectScope';

/** Marcador do histórico, até os eventos existirem. */
export function HistoryPage() {
  const { name, slug } = useProject();

  return (
    <>
      <PageHeader path={`~/projetos/${slug}/historico`} title="Histórico" />
      <EmptyState command={`env log --project=${slug}`} title="Histórico em construção">
        Os eventos do projeto {name} vão aparecer aqui.
      </EmptyState>
    </>
  );
}
