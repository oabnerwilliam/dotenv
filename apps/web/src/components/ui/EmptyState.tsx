import type { ReactNode } from 'react';

type EmptyStateProps = {
  /** Linha de comando ilustrativa, sem o `$`. */
  command?: string;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  hint?: ReactNode;
};

export function EmptyState({ command, title, children, actions, hint }: EmptyStateProps) {
  return (
    <div className="flex min-h-[560px] items-center justify-center rounded-lg border border-dashed border-line-strong bg-surface-2 p-8">
      <div className="flex max-w-[520px] min-w-0 flex-col items-start gap-4">
        {command && (
          <p className="max-w-full rounded-md border border-line-strong bg-bg px-3.5 py-2 font-mono text-[15px] font-medium wrap-anywhere text-fg-muted">
            <span aria-hidden="true" className="text-accent">
              ${' '}
            </span>
            <span>{command}</span>
          </p>
        )}
        <h2 className="text-[28px] font-semibold tracking-[-0.02em]">{title}</h2>
        <div className="text-[15px] leading-relaxed text-fg-soft">{children}</div>
        {actions && <div className="flex flex-wrap gap-2 pt-1">{actions}</div>}
        {hint && <p className="text-[13.5px] text-fg-muted">{hint}</p>}
      </div>
    </div>
  );
}
