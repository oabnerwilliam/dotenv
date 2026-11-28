import { Check, ChevronDown } from 'lucide-react';
import { Select as SelectPrimitive } from 'radix-ui';
import { useId, useState, type Ref } from 'react';
import { cn } from '../../lib/cn';
import { Backdrop } from './Backdrop';
import { CONTROL_CLASS, FieldError, LABEL_CLASS } from './fieldParts';

// Classes próprias, sem a caixa dos campos: fundo, altura e letra são outros.
const COMPACT_CLASS =
  'h-11 w-full min-w-0 rounded-sm border bg-surface pr-2.5 pl-3 text-[13px] font-semibold text-fg disabled:cursor-not-allowed disabled:opacity-50 md:min-w-[220px]';

type SelectProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  /** `value` nunca pode ser `''`: o Radix reserva o texto vazio para "nada escolhido". */
  options: { value: string; label: string }[];
  mono?: boolean;
  /** Esconde o rótulo na tela; o leitor de tela continua lendo. */
  hideLabel?: boolean;
  disabled?: boolean;
  error?: string;
  /** Texto fixo antes do valor, no gatilho. É enfeite: o leitor de tela não o lê. */
  prefix?: string;
  /** Mostrado quando `value` é `''`, ou seja, sem escolha. */
  placeholder?: string;
  /** Gatilho de 44px, mono e do tamanho do valor: o seletor de projeto da nav. */
  compact?: boolean;
  ref?: Ref<HTMLButtonElement>;
  onBlur?: () => void;
};

export function Select({
  label,
  value,
  onValueChange,
  options,
  mono,
  hideLabel,
  disabled,
  error,
  prefix,
  placeholder,
  compact,
  ref,
  onBlur,
}: SelectProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className={cn(LABEL_CLASS, hideLabel && 'sr-only')}>
        {label}
      </label>
      <SelectPrimitive.Root
        value={value}
        onValueChange={onValueChange}
        open={open}
        onOpenChange={setOpen}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger
          id={id}
          ref={ref}
          // Ao abrir, o foco vai para a lista: isso não é "sair do campo".
          onBlur={() => {
            if (!open) onBlur?.();
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            compact ? COMPACT_CLASS : cn(CONTROL_CLASS, 'h-12 gap-2'),
            'group flex cursor-pointer items-center text-left data-[state=open]:border-accent data-[state=open]:ring-[3px] data-[state=open]:ring-accent/15',
            error ? 'border-uso' : 'border-line-strong',
            mono && 'font-mono',
          )}
        >
          {prefix && (
            <span aria-hidden="true" className="shrink-0 font-normal text-fg-muted">
              {prefix}
            </span>
          )}
          <span
            className={cn('min-w-0 flex-1 truncate', value === '' && 'font-normal text-fg-muted')}
          >
            <SelectPrimitive.Value placeholder={placeholder} />
          </span>
          <SelectPrimitive.Icon asChild>
            <ChevronDown
              aria-hidden="true"
              size={16}
              strokeWidth={1.8}
              className="ml-1.5 shrink-0 text-fg-muted group-data-[state=open]:rotate-180 group-data-[state=open]:text-accent"
            />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        {open && (
          <SelectPrimitive.Portal>
            {/* `z-40`: acima do modal, quando o select está dentro de um. */}
            <Backdrop className="z-40" />
          </SelectPrimitive.Portal>
        )}
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            // `popper` põe a lista abaixo do gatilho (o padrão do Radix a sobrepõe).
            position="popper"
            sideOffset={6}
            className={cn(
              // `z-50` fica acima de drawer e modal.
              'z-50 max-h-(--radix-select-content-available-height) w-(--radix-select-trigger-width) overflow-hidden rounded-md border border-line-strong bg-surface p-1.5 text-fg shadow-[0_16px_40px_rgb(0_0_0/.55)]',
              // A lista do seletor compacto é estreita: nomes longos quebram em vez de sumir.
              compact && 'break-all',
              mono && 'font-mono',
            )}
          >
            <SelectPrimitive.Viewport className="flex flex-col gap-0.5">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  // O contorno de foco entra para dentro, senão a lista o corta.
                  className="flex min-h-11 shrink-0 cursor-pointer items-center justify-between gap-3 rounded-sm px-3 py-1.5 text-sm select-none focus-visible:-outline-offset-2 data-highlighted:bg-surface-hover-2 data-[state=checked]:bg-accent/10 data-[state=checked]:font-semibold data-[state=checked]:text-accent"
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator>
                    <Check aria-hidden="true" size={16} strokeWidth={1.8} />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
