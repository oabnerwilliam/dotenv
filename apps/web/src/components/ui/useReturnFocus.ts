import { useRef } from 'react';

/**
 * Devolve o foco a quem abriu a camada (modal ou drawer).
 *
 * Sem `Dialog.Trigger`, o Radix cancela a restauração padrão e tenta focar um gatilho que não
 * existe. Aqui guardamos o elemento focado na abertura e o focamos de novo no fechamento.
 * Espalhe o resultado no `Dialog.Content`.
 */
export function useReturnFocus() {
  const origin = useRef<HTMLElement | null>(null);

  return {
    // Roda antes de o foco entrar na camada. Um `autoFocus` dentro dela o adiantaria.
    onOpenAutoFocus: () => {
      origin.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    },
    onCloseAutoFocus: (event: Event) => {
      event.preventDefault();
      origin.current?.focus();
    },
  };
}
