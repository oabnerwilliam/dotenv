import { updateProjectSchema, type Project, type UpdateProjectInput } from '@env/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { ApiError } from '../../lib/api';
import { applyApiErrors } from '../../lib/forms';
import { ProjectModalFooter } from './ProjectModalFooter';
import { displayError, useRenameProject } from './useProjectMutations';

type ProjectRenameModalProps = { project: Project; onClose: () => void };

/** Salvar é a confirmação. Montado só enquanto aberto: cada abertura começa do nome atual. */
export function ProjectRenameModal({ project, onClose }: ProjectRenameModalProps) {
  const formId = useId();
  // Se a pessoa fechou durante o envio, o sucesso não pode fechar o que ela abrir depois.
  const dismissed = useRef(false);
  const dismiss = () => {
    dismissed.current = true;
    onClose();
  };
  const { register, handleSubmit, setError, setFocus, formState } = useForm<UpdateProjectInput>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: { name: project.name },
  });
  const { errors } = formState;

  const rename = useRenameProject(project.slug, () => {
    if (!dismissed.current) onClose();
  });
  const sending = rename.isPending || rename.isSuccess;

  const submit = handleSubmit((input) => {
    if (sending) return;
    rename.mutate(input, {
      onError: (error) => {
        applyApiErrors(displayError(error), setError);
        if (error instanceof ApiError && error.fields?.name) setFocus('name');
      },
    });
  });

  return (
    <Modal
      open
      onOpenChange={dismiss}
      title="Renomear projeto"
      focusOnOpen={() => setFocus('name')}
      footer={
        <ProjectModalFooter onCancel={dismiss} status={sending ? 'Salvando o nome…' : null}>
          <Button
            type="submit"
            form={formId}
            variant="accent"
            prompt
            disabled={sending}
            className="flex-auto"
          >
            Salvar
          </Button>
        </ProjectModalFooter>
      }
    >
      <form id={formId} noValidate onSubmit={(event) => void submit(event)}>
        <Field
          label="Nome do projeto"
          autoComplete="off"
          hint={
            <span className="wrap-anywhere">
              O endereço <span className="font-mono text-[0.93em]">{project.slug}</span> não muda.
            </span>
          }
          error={errors.name?.message}
          {...register('name')}
        />
      </form>
      {errors.root && (
        <Banner status="bloqueado" title="Não foi possível renomear o projeto">
          {errors.root.message}
        </Banner>
      )}
    </Modal>
  );
}
