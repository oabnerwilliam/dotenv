import { cn } from '../../lib/cn';

/**
 * Fundo transparente de um menu ou lista aberta que bloqueia o resto da página: o clique nele
 * fecha a camada sem acionar o que está atrás. É também por ele que o axe entende que a página
 * está bloqueada, e não acusa os controles escondidos do leitor de tela.
 *
 * Vai dentro de um `Portal` próprio, só enquanto a camada está aberta. O `className` dá o
 * `z-index`, abaixo do da camada.
 */
export function Backdrop({ className }: { className: string }) {
  return <div aria-hidden="true" className={cn('pointer-events-auto fixed inset-0', className)} />;
}
