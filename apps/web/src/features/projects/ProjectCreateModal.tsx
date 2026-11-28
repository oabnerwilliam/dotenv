import { createProjectSchema, slugify, type CreateProjectInput } from '@env/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { ApiError } from '../../lib/api';
import { applyApiErrors } from '../../lib/forms';
import { focusTitleOn } from '../../lib/titleFocus';
import { ProjectModalFooter } from './ProjectModalFooter';
import { displayError, useCreateProject } from './useProjectMutations';

/** Quem usa monta o modal só enquanto ele está aberto: assim cada abertura começa limpa. */
export function ProjectCreateModal({ onClose }: { onClose: () => void }) {
  const formId = useId();
  const navigate = useNavigate();
  // Fechar não cancela o pedido enviado, mas quem fechou não é levado ao projeto novo.
  const dismissed = useRef(false);
  const dismiss = () => {
    dismissed.current = true;
    onClose();
  };
  const { register, handleSubmit, setValue, setError, setFocus, formState } =
    useForm<CreateProjectInput>({
      resolver: zodResolver(createProjectSchema),
      defaultValues: { name: '', slug: '' },
    });
  const { errors, isSubmitted } = formState;
  // Depois que a pessoa mexe no endereço, ele para de acompanhar o nome.
  const [addressEdited, setAddressEdited] = useState(false);

  const create = useCreateProject((project) => {
    if (dismissed.current) return;
    onClose();
    // `flushSync`: a tela nova entra antes de a antiga reagir à lista que acabou de mudar.
    const board = `/p/${project.slug}`;
    focusTitleOn(board);
    void navigate(board, { flushSync: true });
  });
  const sending = create.isPending || create.isSuccess;

  const submit = handleSubmit((input) => {
    if (sending) return;
    create.mutate(input, {
      onError: (error) => {
        applyApiErrors(displayError(error), setError);
        const fields = error instanceof ApiError ? error.fields : undefined;
        if (fields?.name) setFocus('name');
        else if (fields?.slug) setFocus('slug');
      },
    });
  });

  // O texto da tela (SCREENS.md) para o formato recusado; os demais vêm do schema ou da API.
  const addressError =
    errors.slug?.type === 'invalid_format'
      ? 'Use só letras minúsculas, números e hífens.'
      : errors.slug?.message;

  return (
    <Modal
      open
      onOpenChange={dismiss}
      title="Novo projeto"
      focusOnOpen={() => setFocus('name')}
      footer={
        <ProjectModalFooter onCancel={dismiss} status={sending ? 'Criando o projeto…' : null}>
          {/* Fica fora do `<form>`, no rodapé: o atributo `form` liga um ao outro. */}
          <Button
            type="submit"
            form={formId}
            variant="accent"
            prompt
            disabled={sending}
            className="flex-auto"
          >
            Criar projeto
          </Button>
        </ProjectModalFooter>
      }
    >
      {/* `noValidate`: quem valida é o schema, com as mensagens em português. */}
      <form
        id={formId}
        noValidate
        onSubmit={(event) => void submit(event)}
        className="flex flex-col gap-[18px]"
      >
        <Field
          label="Nome do projeto"
          autoComplete="off"
          error={errors.name?.message}
          {...register('name', {
            onChange: (event: { target: { value: string } }) => {
              if (addressEdited) return;
              // Antes do primeiro envio ninguém vê erro; depois, o valor é revalidado.
              setValue('slug', slugify(event.target.value), { shouldValidate: isSubmitted });
            },
          })}
        />
        <Field
          label="Endereço"
          mono
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          hint="Letras minúsculas, números e hífens, de 2 a 40 caracteres. Não dá para mudar depois."
          error={addressError}
          {...register('slug', { onChange: () => setAddressEdited(true) })}
        />
      </form>
      {errors.root && (
        <Banner status="bloqueado" title="Não foi possível criar o projeto">
          {errors.root.message}
        </Banner>
      )}
    </Modal>
  );
}
