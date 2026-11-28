import { useTitleFocus } from '../../lib/titleFocus';

/** Cabeçalho das páginas da casca: o caminho em mono e o título. */
export function PageHeader({ path, title }: { path: string; title: string }) {
  const heading = useTitleFocus();

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-xs wrap-anywhere text-fg-muted">{path}</span>
      {/* `-1`: aceita o foco do programa sem virar uma parada do Tab. */}
      <h1
        ref={heading}
        tabIndex={-1}
        className="text-[28px] font-semibold tracking-[-0.02em] wrap-anywhere"
      >
        {title}
      </h1>
    </div>
  );
}
