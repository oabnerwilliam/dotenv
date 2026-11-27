import type { ReactNode } from 'react';
import { Logo } from './Logo';

/** Moldura das telas de acesso: logo no topo e conteúdo centralizado, sem a casca do app. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div aria-hidden="true" className="scanline" />
      <div aria-hidden="true" className="accent-line" />
      <header className="px-4 py-4 sm:px-6 sm:py-5">
        <Logo />
      </header>
      <main className="flex min-w-0 flex-1 flex-col items-center gap-5 px-4 pt-4 pb-12 sm:px-6 sm:pt-8 sm:pb-16">
        {children}
      </main>
    </div>
  );
}
