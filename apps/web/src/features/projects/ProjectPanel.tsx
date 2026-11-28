import type { Project } from '@env/shared';
import { Archive } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/Button';
import { focusTitleOn } from '../../lib/titleFocus';
import { ProjectArchiveModal } from './ProjectArchiveModal';
import { ProjectRenameModal } from './ProjectRenameModal';
import { useProject } from './ProjectScope';
import { useProjects } from './useProjects';

const ROW_CLASS =
  'grid min-h-[52px] items-center gap-1 border-t border-line-subtle py-2 md:grid-cols-[120px_minmax(0,1fr)] md:gap-3';

/** O painel "Projeto" das Configurações: dados do projeto, renomear e arquivar. */
export function ProjectPanel() {
  const project = useProject();
  const { data: projects } = useProjects();
  const navigate = useNavigate();
  const titleId = useId();
  const [action, setAction] = useState<'rename' | 'archive' | null>(null);
  const close = () => setAction(null);

  // Diz se a pessoa ainda está nesta tela quando a resposta do arquivamento chega.
  const onScreen = useRef(true);
  useEffect(() => {
    onScreen.current = true;
    return () => {
      onScreen.current = false;
    };
  }, []);

  function leaveArchived(remaining: Project[]) {
    if (!onScreen.current) return;
    const next = remaining[0];
    // `replace`: o "Voltar" do navegador não leva ao arquivado. `flushSync`: a tela nova entra
    // antes de esta reagir à lista e mostrar "Projeto não encontrado".
    const destination = next ? `/p/${next.slug}` : '/';
    focusTitleOn(destination);
    void navigate(destination, { replace: true, flushSync: true });
  }

  return (
    <section
      aria-labelledby={titleId}
      className="flex w-full max-w-[1000px] flex-col gap-4 rounded-lg border border-line bg-surface-2 p-5"
    >
      <h2 id={titleId} className="text-base font-semibold">
        Projeto
      </h2>
      <dl>
        <div className={ROW_CLASS}>
          <dt className="text-[13px] text-fg-muted">Nome</dt>
          <dd className="text-sm wrap-anywhere">{project.name}</dd>
        </div>
        <div className={ROW_CLASS}>
          <dt className="text-[13px] text-fg-muted">Endereço</dt>
          <dd className="font-mono text-sm wrap-anywhere">{project.slug}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => setAction('rename')}>
          Renomear
        </Button>
        <Button variant="orange" size="sm" onClick={() => setAction('archive')}>
          <Archive aria-hidden="true" size={16} strokeWidth={1.8} />
          Arquivar
        </Button>
      </div>
      {action === 'rename' && <ProjectRenameModal project={project} onClose={close} />}
      {action === 'archive' && (
        <ProjectArchiveModal
          project={project}
          isLast={projects?.length === 1}
          onClose={close}
          onArchived={leaveArchived}
        />
      )}
    </section>
  );
}
