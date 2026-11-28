import type { Project } from '@env/shared';
import { Archive, TriangleAlert } from 'lucide-react';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ProjectModalFooter } from './ProjectModalFooter';
import { displayError, useArchiveProject } from './useProjectMutations';

type ProjectArchiveModalProps = {
  project: Project;
  /** É o único projeto ativo da equipe. */
  isLast: boolean;
  onClose: () => void;
  /** Recebe os projetos que sobraram. Roda mesmo se o modal já tiver sido fechado. */
  onArchived: (remaining: Project[]) => void;
};

export function ProjectArchiveModal({
  project,
  isLast,
  onClose,
  onArchived,
}: ProjectArchiveModalProps) {
  const archive = useArchiveProject(project.slug, onArchived);
  const sending = archive.isPending || archive.isSuccess;
  const failure = archive.error ? displayError(archive.error) : null;

  return (
    <Modal
      open
      onOpenChange={onClose}
      title="Arquivar projeto"
      footer={
        <ProjectModalFooter onCancel={onClose} status={sending ? 'Arquivando o projeto…' : null}>
          <Button
            variant="orange"
            disabled={sending}
            className="flex-auto"
            onClick={() => archive.mutate()}
          >
            <Archive aria-hidden="true" size={16} strokeWidth={1.8} />
            Arquivar projeto
          </Button>
        </ProjectModalFooter>
      }
    >
      <p className="text-[15px] leading-relaxed text-fg-soft wrap-anywhere">
        Arquivar o projeto <strong className="text-fg">{project.name}</strong>?
      </p>
      <ul className="flex list-disc flex-col gap-1.5 pl-[18px] text-sm leading-normal text-fg-soft wrap-anywhere">
        <li>Ele some das listas de toda a equipe.</li>
        <li>Não dá para desfazer pelo app.</li>
        <li>
          O endereço <span className="font-mono text-[0.93em]">{project.slug}</span> continua
          reservado e não pode ser usado em outro projeto.
        </li>
      </ul>
      {isLast && (
        <div
          data-status="bloqueado"
          className="flex gap-2.5 rounded-md border border-(--status)/32 bg-(--status)/10 p-3"
        >
          <TriangleAlert
            aria-hidden="true"
            size={16}
            strokeWidth={1.8}
            className="mt-0.5 shrink-0 text-(--status)"
          />
          <p className="text-[13.5px] leading-normal text-fg">
            Este é o último projeto da equipe. Depois de arquivar, será preciso criar outro.
          </p>
        </div>
      )}
      {failure && (
        <Banner status="bloqueado" title="Não foi possível arquivar o projeto">
          {failure.message}
        </Banner>
      )}
    </Modal>
  );
}
