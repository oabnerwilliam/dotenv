import type { EnvStatus } from '@env/shared';
import { cn } from '../../lib/cn';

const BOX = 'inline-flex max-w-full items-center border bg-bg font-mono text-fg';

const BOXES = {
  lg: { box: 'gap-2 rounded-md px-4 py-2 text-[26px] font-bold', prompt: '$' },
  md: { box: 'gap-1.5 rounded-sm px-2.5 py-[5px] text-base font-semibold', prompt: '>' },
  sm: { box: 'gap-1.5 rounded-sm px-2 py-[3px] text-[13px] font-semibold', prompt: '>' },
};

type EnvNameProps = {
  /** Nome na caixa original. As minúsculas são só estilo. */
  name: string;
  size: keyof typeof BOXES | 'inline';
  status?: EnvStatus;
};

// Só `span`: o componente vai dentro de títulos, links e frases.
export function EnvName({ name, size, status }: EnvNameProps) {
  const label = <span className="min-w-0 wrap-anywhere lowercase">{name}</span>;

  if (size === 'inline') {
    return (
      <span
        data-status={status}
        className="inline-flex items-center gap-1.5 font-mono font-semibold"
      >
        {status && <span aria-hidden="true" className="size-[7px] rounded-full bg-(--status)" />}
        {label}
      </span>
    );
  }

  const { box, prompt } = BOXES[size];

  return (
    <span
      data-status={status}
      className={cn(
        BOX,
        box,
        size === 'lg' && status ? 'border-(--status)/40' : 'border-line-strong',
      )}
    >
      <span
        aria-hidden="true"
        className={size === 'lg' ? 'font-medium text-fg-muted' : 'text-accent'}
      >
        {prompt}
      </span>
      {label}
    </span>
  );
}
