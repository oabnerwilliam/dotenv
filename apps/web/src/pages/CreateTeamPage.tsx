import { createTeamSchema, meSchema, slugify, type CreateTeamInput } from '@env/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { AuthLayout } from '../app/layout/AuthLayout';
import { SignOutButton } from '../app/layout/SignOutButton';
import { Banner } from '../components/ui/Banner';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { ApiError, apiFetch } from '../lib/api';
import { useSession } from '../lib/auth';
import { applyApiErrors } from '../lib/forms';
import { queryKeys } from '../lib/queryKeys';
import { TERMO_EQUIPE } from '../lib/termos';

const NO_RESPONSE = new ApiError(0, 'INTERNAL', 'Confira sua conexão e tente de novo.');

/** O primeiro campo da tela com erro. O endereço do projeto não aparece: conta o nome dele. */
function firstInvalidField(hasError: (key: string) => boolean) {
  if (hasError('name')) return 'name';
  if (hasError('slug')) return 'slug';
  if (hasError('project.name') || hasError('project.slug')) return 'project.name';
  return undefined;
}

// Os textos desta tela (SCREENS.md) para as recusas do schema. O que vem da API passa direto.
function addressMessage({ slug }: FieldErrors<CreateTeamInput>) {
  if (slug?.type === 'invalid_format') return 'Use só letras minúsculas, números e hífens.';
  return slug?.message;
}

function projectMessage({ project }: FieldErrors<CreateTeamInput>) {
  const { name, slug } = project ?? {};
  if (name) {
    return name.type === 'too_small' ? 'Informe o nome do primeiro projeto.' : name.message;
  }
  // O endereço do projeto é derivado do nome: o erro dele se resolve mudando o nome.
  if (slug && slug.type !== 'api') {
    return 'Use ao menos 2 letras ou números no nome do projeto.';
  }
  return slug?.message;
}

export function CreateTeamPage() {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const { register, handleSubmit, setValue, setError, setFocus, formState } =
    useForm<CreateTeamInput>({
      resolver: zodResolver(createTeamSchema),
      defaultValues: { name: '', slug: '', project: { name: '', slug: '' } },
      // O foco é nosso: o `project.slug` não tem campo na tela.
      shouldFocusError: false,
    });
  const { errors, isSubmitted } = formState;
  // Depois que a pessoa mexe no endereço, ele para de acompanhar o nome.
  const [addressEdited, setAddressEdited] = useState(false);
  // Antes do primeiro envio ninguém vê erro; depois, o valor preenchido sozinho é revalidado.
  const derived = { shouldValidate: isSubmitted };

  const create = useMutation({
    mutationFn: (input: CreateTeamInput) =>
      apiFetch('/team', meSchema, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    // `always`: sem rede o envio deve falhar na hora, não ficar em pausa.
    networkMode: 'always',
    // A resposta já é o novo `/me`. Com ela no cache, o guard da rota leva ao projeto.
    onSuccess: (me) => queryClient.setQueryData(queryKeys.me(userId), me),
    onError: (error) => {
      const failure = error instanceof ApiError ? error : undefined;
      applyApiErrors(failure?.status === 0 ? NO_RESPONSE : error, setError);
      const field = firstInvalidField((key) => Boolean(failure?.fields?.[key]));
      if (field) setFocus(field);
      // A equipe já existe: o `/me` diz para onde esta pessoa vai agora.
      if (failure?.status === 409) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.me(userId) });
      }
    },
  });
  const sending = create.isPending || create.isSuccess;

  const submit = handleSubmit(
    (input) => create.mutate(input),
    (invalid) => {
      const field = firstInvalidField((key) => {
        const [group, child] = key.split('.');
        if (group !== 'project') return Boolean(invalid[group as 'name' | 'slug']);
        return Boolean(invalid.project?.[child as 'name' | 'slug']);
      });
      if (field) setFocus(field);
    },
  );

  return (
    <AuthLayout>
      <div className="flex w-full max-w-[560px] min-w-0 flex-col gap-5 rounded-lg border border-line bg-surface-2 p-5 sm:p-7">
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Crie a {TERMO_EQUIPE}</h1>
          <p className="text-[15px] leading-relaxed text-fg-soft">
            A {TERMO_EQUIPE} reúne os projetos e as pessoas que compartilham os mesmos ambientes.
          </p>
        </div>
        {/* `noValidate`: quem valida é o schema, com as mensagens em português. */}
        <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-5">
          <Field
            label={`Nome da ${TERMO_EQUIPE}`}
            autoComplete="off"
            error={errors.name?.message}
            {...register('name', {
              onChange: (event: { target: { value: string } }) => {
                if (addressEdited) return;
                setValue('slug', slugify(event.target.value), derived);
              },
            })}
          />
          <Field
            label="Endereço"
            mono
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            hint="Letras minúsculas, números e hífens, de 2 a 40 caracteres."
            error={addressMessage(errors)}
            {...register('slug', {
              onChange: () => setAddressEdited(true),
            })}
          />
          <Field
            label="Primeiro projeto"
            autoComplete="off"
            hint="Você pode adicionar outros depois."
            error={projectMessage(errors)}
            {...register('project.name', {
              onChange: (event: { target: { value: string } }) => {
                setValue('project.slug', slugify(event.target.value), derived);
              },
            })}
          />
          {errors.root && (
            <Banner status="bloqueado" title={`Não foi possível criar a ${TERMO_EQUIPE}`}>
              {errors.root.message}
            </Banner>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="submit" variant="accent" prompt disabled={sending} className="flex-auto">
              Criar {TERMO_EQUIPE}
            </Button>
            <SignOutButton />
          </div>
          {/* Existe antes de ter texto, para o leitor de tela anunciar; vazia, não ocupa espaço. */}
          <p role="status" className="text-[13.5px] text-fg-muted empty:-mt-5">
            {sending ? `Criando a ${TERMO_EQUIPE}…` : null}
          </p>
        </form>
      </div>
    </AuthLayout>
  );
}
