import type { CreateTeamInput } from '@env/shared';
import { act, renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../api';
import { applyApiErrors } from '../forms';

/** Um formulário de verdade; devolve os erros depois de aplicar o que a API respondeu. */
function errorsAfter(error: unknown) {
  const { result } = renderHook(() => {
    const form = useForm<CreateTeamInput>();
    // Ler `errors` durante a renderização é o que faz o hook avisar das mudanças.
    return { setError: form.setError, errors: form.formState.errors };
  });
  act(() => applyApiErrors(error, result.current.setError));
  return result.current.errors;
}

const refusal = (fields?: Record<string, string>) =>
  new ApiError(400, 'VALIDATION', 'Dados inválidos.', fields);

describe('applyApiErrors', () => {
  it('leva cada item de fields ao seu campo, inclusive os aninhados', () => {
    const errors = errorsAfter(
      refusal({ name: 'Nome recusado.', 'project.name': 'Projeto recusado.' }),
    );

    expect(errors.name?.message).toBe('Nome recusado.');
    expect(errors.project?.name?.message).toBe('Projeto recusado.');
    expect(errors.root).toBeUndefined();
  });

  it.each([
    ['sem fields', refusal()],
    ['com fields vazio', refusal({})],
  ])('%s, a mensagem vira erro do formulário', (_name, error) => {
    expect(errorsAfter(error).root?.message).toBe('Dados inválidos.');
  });

  it('a chave _ é do formulário, não de um campo', () => {
    const errors = errorsAfter(refusal({ _: 'Algo geral.', slug: 'Endereço recusado.' }));

    expect(errors.root?.message).toBe('Algo geral.');
    expect(errors.slug?.message).toBe('Endereço recusado.');
  });

  it('erro que não veio da API também vira erro do formulário', () => {
    expect(errorsAfter(new Error('detalhe interno')).root?.message).toBe(
      'Não foi possível concluir. Tente de novo.',
    );
  });
});
