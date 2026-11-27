import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from './api';

const UNKNOWN_FAILURE = 'Não foi possível concluir. Tente de novo.';

/**
 * Mostra no formulário o que a API recusou. Cada item de `fields` vai para o campo de mesmo
 * nome (`project.name` é um campo aninhado). Sem campo para apontar, ou na chave `_`, a mensagem
 * vira o erro do formulário inteiro, em `errors.root`.
 */
export function applyApiErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): void {
  const apiError = error instanceof ApiError ? error : undefined;
  const { _: general, ...fields } = apiError?.fields ?? {};
  const entries = Object.entries(fields);

  for (const [name, message] of entries) {
    setError(name as Path<T>, { type: 'api', message });
  }

  const fallback = entries.length === 0 ? (apiError?.message ?? UNKNOWN_FAILURE) : undefined;
  const message = general ?? fallback;
  if (message) setError('root', { type: 'api', message });
}
