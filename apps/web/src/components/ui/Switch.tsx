import { Switch as SwitchPrimitive } from 'radix-ui';
import type { Ref } from 'react';

type SwitchProps = {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  ref?: Ref<HTMLButtonElement>;
  onBlur?: () => void;
};

export function Switch({ label, ...props }: SwitchProps) {
  return (
    // A linha inteira é o botão: só o trilho teria 26px de altura, abaixo do alvo mínimo.
    <SwitchPrimitive.Root
      {...props}
      className="group flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-sm text-left text-sm text-fg disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="min-w-0">{label}</span>
      <span className="flex h-[26px] w-11 shrink-0 items-center rounded-full bg-avatar px-[3px] group-data-[state=checked]:bg-livre/25">
        <SwitchPrimitive.Thumb className="block size-5 rounded-full bg-fg-muted transition-transform data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-livre" />
      </span>
    </SwitchPrimitive.Root>
  );
}
