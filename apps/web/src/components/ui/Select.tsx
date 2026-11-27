import { Check, ChevronDown } from 'lucide-react';
import { Select as SelectPrimitive } from 'radix-ui';
import { useId, useState, type Ref } from 'react';
import { cn } from '../../lib/cn';
import { CONTROL_CLASS, FieldError, LABEL_CLASS } from './fieldParts';

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
            CONTROL_CLASS,
            'group flex h-12 cursor-pointer items-center justify-between gap-2 text-left data-[state=open]:border-accent data-[state=open]:ring-[3px] data-[state=open]:ring-accent/15',
            error ? 'border-uso' : 'border-line-strong',
            mono && 'font-mono',
          )}
        >
          <span className="min-w-0 truncate">
            <SelectPrimitive.Value />
          </span>
          <SelectPrimitive.Icon asChild>
            <ChevronDown
              aria-hidden="true"
              size={16}
              strokeWidth={1.8}
              className="shrink-0 text-fg-muted group-data-[state=open]:rotate-180 group-data-[state=open]:text-accent"
            />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            // `popper` põe a lista abaixo do gatilho (o padrão do Radix a sobrepõe).
            position="popper"
            sideOffset={6}
            className={cn(
              // `z-50` fica acima de drawer e modal.
              'z-50 max-h-(--radix-select-content-available-height) w-(--radix-select-trigger-width) overflow-hidden rounded-md border border-line-strong bg-surface p-1.5 text-fg shadow-[0_16px_40px_rgb(0_0_0/.55)]',
              mono && 'font-mono',
            )}
          >
            <SelectPrimitive.Viewport className="flex flex-col gap-0.5">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  // O contorno de foco entra para dentro, senão a lista o corta.
                  className="flex min-h-11 shrink-0 cursor-pointer items-center justify-between gap-3 rounded-sm px-3 text-sm select-none focus-visible:-outline-offset-2 data-highlighted:bg-surface-hover-2 data-[state=checked]:bg-accent/10 data-[state=checked]:font-semibold data-[state=checked]:text-accent"
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
