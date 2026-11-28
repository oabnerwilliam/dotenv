import { PageHeader } from '../../app/layout/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { useProject } from '../projects/ProjectScope';

/** Marcador do board, até os ambientes existirem. */
export function BoardPage() {
  const { name, slug } = useProject();

  return (
    <>
      <PageHeader path={`~/projetos/${slug}`} title="Board" />
      <EmptyState command={`env status --project=${slug}`} title="Board em construção">
        Os ambientes do projeto {name} vão aparecer aqui.
      </EmptyState>
    </>
  );
}
