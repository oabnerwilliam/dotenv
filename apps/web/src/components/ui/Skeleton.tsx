import { cn } from '../../lib/cn';

/** Barra de carregamento. Largura e altura vêm do `className`, imitando o conteúdo real. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('block animate-skeleton rounded bg-avatar', className)}
    />
  );
}
