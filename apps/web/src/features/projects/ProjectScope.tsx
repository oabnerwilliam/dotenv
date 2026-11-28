import type { Project } from '@env/shared';
import { createContext, Fragment, useContext } from 'react';
import { Outlet, useParams } from 'react-router';
import { ProjectNotFound } from './ProjectNotFound';
import { ProjectsLoading } from './ProjectsStates';
import { useProjects } from './useProjects';

const ProjectContext = createContext<Project | null>(null);

/**
 * Rota de `/p/:projeto`: acha o projeto do endereço na lista da equipe e o entrega às páginas
 * filhas. Quem mostra o carregando e a falha da primeira consulta é a casca (`AppShell`).
 */
export function ProjectScope() {
  const { projeto = '' } = useParams();
  const { data, isFetching } = useProjects();
  if (!data) return null;

  const project = data.find((candidate) => candidate.slug === projeto);
  if (!project) {
    // A lista está sendo atualizada: o projeto ainda pode aparecer.
    return isFetching ? <ProjectsLoading /> : <ProjectNotFound slug={projeto} />;
  }

  return (
    <ProjectContext value={project}>
      {/* A `key` recria a página ao trocar de projeto: nada aberto num passa para o outro. */}
      <Fragment key={project.id}>
        <Outlet />
      </Fragment>
    </ProjectContext>
  );
}

/** O projeto da página. Só vale dentro das rotas de `/p/:projeto`. */
export function useProject(): Project {
  const project = useContext(ProjectContext);
  if (!project) throw new Error('useProject precisa estar dentro do ProjectScope.');
  return project;
}
