import { useState } from 'react';
import { Navigate } from 'react-router';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ProjectCreateModal } from '../features/projects/ProjectCreateModal';
import { defaultProject, useProjects } from '../features/projects/useProjects';
import { useMember } from '../lib/auth';
import { TERMO_EQUIPE } from '../lib/termos';
import { useTitleFocus } from '../lib/titleFocus';

/** O `/` de quem é membro: leva a um projeto, ou convida a criar o primeiro. */
export function HomePage() {
  const member = useMember();
  const { data: projects } = useProjects();
  const [creating, setCreating] = useState(false);
  const heading = useTitleFocus();
  if (!member || !projects) return null;

  // A lista manda: o padrão do `/me` pode ser um projeto que acabou de ser arquivado.
  const target = defaultProject(projects, member.defaultProjectSlug);
  if (target) return <Navigate to={`/p/${target.slug}`} replace />;

  return (
    <>
      <EmptyState
        headingLevel="h1"
        headingRef={heading}
        command="env project list"
        title="Nenhum projeto ainda"
        actions={
          <Button variant="accent" prompt onClick={() => setCreating(true)}>
            Criar projeto
          </Button>
        }
      >
        Crie um projeto para organizar os ambientes de homologação da {TERMO_EQUIPE}.
      </EmptyState>
      {creating && <ProjectCreateModal onClose={() => setCreating(false)} />}
    </>
  );
}
