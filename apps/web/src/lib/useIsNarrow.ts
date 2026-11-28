import { useSyncExternalStore } from 'react';

/** O corte do design: estreita abaixo de 768px. É o mesmo do `max-md:` do Tailwind. */
const NARROW = '(max-width: 767.98px)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia(NARROW);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

const isNarrow = () => window.matchMedia(NARROW).matches;

/** Diz se a tela é estreita e redesenha quem usa quando a largura cruza o corte. */
export function useIsNarrow(): boolean {
  return useSyncExternalStore(subscribe, isNarrow);
}
