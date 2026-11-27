import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { CONTROL_CLASS, FieldError, LABEL_CLASS } from './fieldParts';

type OwnProps = {
  label: string;
  hint?: ReactNode;
  error?: string;
  /** Fonte mono, para dados (ticket, regex). */
  mono?: boolean;
};

// `multiline` escolhe o controle, e o TypeScript escolhe junto as props aceitas (e o `ref`).
type FieldProps = OwnProps &
  (
    | ({ multiline?: false } & ComponentProps<'input'>)
    | ({ multiline: true } & ComponentProps<'textarea'>)
  );

/** Tira o `multiline`, que é só nosso: o navegador não conhece esse atributo. */
function domProps<T extends { multiline?: boolean }>(props: T): Omit<T, 'multiline'> {
  const copy = { ...props };
  delete copy.multiline;
  return copy;
}

export function Field(props: FieldProps) {
  const generatedId = useId();
  // Separa o que é do campo do que vai para o `input` ou `textarea`. O `className` é de layout
  // e vai para a caixa externa, que leva junto rótulo, dica e erro.
  const { label, hint, error, mono, className, id = generatedId, ...control } = props;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  // O que os dois controles recebem por cima das props de quem usa o campo.
  const shared = {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': cn(Boolean(hint) && hintId, Boolean(error) && errorId) || undefined,
  };
  const controlClass = cn(
    CONTROL_CLASS,
    'placeholder:text-fg-muted',
    error ? 'border-uso' : 'border-line-strong',
    mono && 'font-mono',
  );

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      {control.multiline ? (
        <textarea
          rows={3}
          {...domProps(control)}
          {...shared}
          className={cn(controlClass, 'min-h-24 resize-y py-2.5')}
        />
      ) : (
        <input {...domProps(control)} {...shared} className={cn(controlClass, 'h-12')} />
      )}
      {hint && (
        <p id={hintId} className="text-[12.5px] text-fg-muted">
          {hint}
        </p>
      )}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
