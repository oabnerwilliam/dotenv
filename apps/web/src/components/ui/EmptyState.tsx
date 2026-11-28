import type { LucideIcon } from 'lucide-react';
import type { ReactNode, Ref } from 'react';

type EmptyStateProps = {
  /** Linha de comando ilustrativa, sem o `$`. */
  command?: string;
  /** Ícone decorativo; entra no lugar da linha de comando. */
  icon?: LucideIcon;
  title: string;
  /** `h1` quando o painel é a página inteira. */
  headingLevel?: 'h1' | 'h2';
  /** Para pôr o foco no título quando a tela chega depois de uma ação. */
  headingRef?: Ref<HTMLHeadingElement>;
  children: ReactNode;
  actions?: ReactNode;
  hint?: ReactNode;
};

export function EmptyState({
  command,
  icon: Icon,
  title,
  headingLevel: Heading = 'h2',
  headingRef,
  children,
  actions,
  hint,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[560px] w-full max-w-content items-center justify-center rounded-lg border border-dashed border-line-strong bg-surface-2 p-5 md:p-8">
      <div className="flex w-full max-w-[520px] min-w-0 flex-col items-start gap-4">
        {Icon && (
          <span className="flex size-14 items-center justify-center rounded-lg border border-line-strong bg-surface text-fg-muted">
            <Icon aria-hidden="true" size={24} strokeWidth={1.8} />
          </span>
        )}
        {command && !Icon && (
          <p className="max-w-full rounded-md border border-line-strong bg-bg px-3.5 py-2 font-mono text-[15px] font-medium wrap-anywhere text-fg-muted">
            <span aria-hidden="true" className="text-accent">
              ${' '}
            </span>
            <span>{command}</span>
          </p>
        )}
        <Heading
          ref={headingRef}
          // `-1`: aceita o foco do programa sem virar uma parada do Tab.
          tabIndex={Heading === 'h1' ? -1 : undefined}
          className="max-w-full text-[28px] font-semibold tracking-[-0.02em] wrap-anywhere"
        >
          {title}
        </Heading>
        <div className="max-w-full text-[15px] leading-relaxed wrap-anywhere text-fg-soft">
          {children}
        </div>
        {actions && <div className="flex flex-wrap gap-2 pt-1">{actions}</div>}
        {hint && <p className="text-[13.5px] text-fg-muted">{hint}</p>}
      </div>
    </div>
  );
}
