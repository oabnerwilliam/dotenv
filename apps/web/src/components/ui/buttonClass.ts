import { cn } from '../../lib/cn';

// Classes escritas por inteiro: o Tailwind só gera o que encontra literalmente no código.
// `not-disabled` em vez de `enabled`: um link com cara de botão não é `:enabled`.
const VARIANTS = {
  accent: 'border-accent bg-transparent text-accent not-disabled:hover:bg-accent/12',
  green:
    'border-livre bg-livre/8 text-livre not-disabled:hover:bg-livre not-disabled:hover:text-bg',
  orange:
    'border-bloqueado bg-bloqueado/8 text-bloqueado not-disabled:hover:bg-bloqueado not-disabled:hover:text-bg',
  ghost: 'border-line-strong bg-transparent text-fg-soft not-disabled:hover:bg-surface-hover-2',
};

const SIZES = { md: 'h-12', sm: 'h-11' };

export type ButtonStyle = {
  variant: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  className?: string;
};

/** A aparência de botão, também para as ações que são links (`<a>`). */
export function buttonClass({ variant, size = 'md', className }: ButtonStyle): string {
  return cn(
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-sm border px-[18px] font-sans text-sm font-semibold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}
