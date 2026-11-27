import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn';

type IconButtonProps = Omit<ComponentProps<'button'>, 'aria-label'> & {
  /** Nome acessível: o botão só tem um ícone. */
  label: string;
};

export function IconButton({ label, type = 'button', className, ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        'inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md border border-line-strong bg-transparent text-fg-soft enabled:hover:bg-surface-hover-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
