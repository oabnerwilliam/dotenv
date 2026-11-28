import type { ReactNode } from 'react';
import {
  ProjectsError,
  ProjectsLoading,
  ProjectsStale,
} from '../../features/projects/ProjectsStates';
import { useCurrentProject, useProjects } from '../../features/projects/useProjects';
import { useMember } from '../../lib/auth';
import { SideNav } from './SideNav';
import { TopNav } from './TopNav';

/**
 * A moldura das telas de membro: nav no topo, menu lateral e conteúdo. Não depende de haver um
 * projeto aberto. O conteúdo só aparece depois que a lista de projetos chega.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const member = useMember();
  const projects = useProjects();
  const current = useCurrentProject();
  if (!member) return null;

  const retry = { retrying: projects.isFetching, onRetry: () => void projects.refetch() };

  return (
    <div className="flex min-h-dvh flex-col">
      <div aria-hidden="true" className="scanline" />
      <div aria-hidden="true" className="accent-line" />
      <TopNav
        member={member}
        projects={projects.data}
        failed={projects.failedToLoad}
        current={current}
      />
      <div className="flex flex-1 flex-col md:flex-row">
        <SideNav
          team={member.team}
          projects={projects.data}
          failed={projects.failedToLoad}
          current={current}
        />
        <main className="min-w-0 flex-1 px-4 pt-5 pb-12 md:px-6">
          <div className="mx-auto flex w-full max-w-content flex-col gap-5">
            {projects.data && projects.isError && <ProjectsStale {...retry} />}
            {projects.data && children}
            {!projects.data && projects.failedToLoad && <ProjectsError {...retry} />}
            {!projects.data && !projects.failedToLoad && <ProjectsLoading />}
          </div>
        </main>
      </div>
    </div>
  );
}
