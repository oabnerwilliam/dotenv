import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

// Fora do `state` do histórico de propósito: ele sobrevive ao recarregar, e a página voltaria a
// roubar o foco. Aqui o pedido vale uma vez só.
let pending: string | null = null;

/**
 * Para quando o botão usado deixa de existir (arquivar, criar o primeiro projeto): a tela que
 * chega em `pathname` põe o foco no título, em vez de deixá-lo perdido. Chamar antes de navegar.
 */
export function focusTitleOn(pathname: string) {
  pending = pathname;
}

/** Ref para o `h1` da página. */
export function useTitleFocus() {
  const ref = useRef<HTMLHeadingElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    if (pending !== pathname) return;
    pending = null;
    ref.current?.focus();
  }, [pathname]);

  return ref;
}
