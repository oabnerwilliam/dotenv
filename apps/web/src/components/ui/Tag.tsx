import type { ReactNode } from 'react';

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-sm border border-line-strong px-2 py-0.5 font-sans text-xs font-medium whitespace-nowrap text-fg-muted">
      {children}
    </span>
  );
}
