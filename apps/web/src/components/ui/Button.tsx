import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn';

// Classes escritas por inteiro: o Tailwind só gera o que encontra literalmente no código.
const VARIANTS = {
  accent: 'border-accent bg-transparent text-accent enabled:hover:bg-accent/12',
  green: 'border-livre bg-livre/8 text-livre enabled:hover:bg-livre enabled:hover:text-bg',
  orange:
    'border-bloqueado bg-bloqueado/8 text-bloqueado enabled:hover:bg-bloqueado enabled:hover:text-bg',
  ghost: 'border-line-strong bg-transparent text-fg-soft enabled:hover:bg-surface-hover-2',
};

const SIZES = { md: 'h-12', sm: 'h-11' };

type ButtonProps = ComponentProps<'button'> & {
  variant: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  /** Glifo `>` das ações principais. */
  prompt?: boolean;
};

export function Button({
  variant,
  size = 'md',
  prompt = false,
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-sm border px-[18px] font-sans text-sm font-semibold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {prompt && (
        <span aria-hidden="true" className="font-mono">
          &gt;
        </span>
      )}
      {children}
    </button>
  );
}
