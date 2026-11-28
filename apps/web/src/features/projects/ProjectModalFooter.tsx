import type { ReactNode } from 'react';
import { Button } from '../../components/ui/Button';

type ProjectModalFooterProps = {
  /** O botão principal, que fica desativado durante o envio. */
  children: ReactNode;
  onCancel: () => void;
  /** Linha de situação do envio; `null` quando não há envio. */
  status: string | null;
};

export function ProjectModalFooter({ children, onCancel, status }: ProjectModalFooterProps) {
  return (
    <>
      {children}
      <Button variant="ghost" onClick={onCancel}>
        Cancelar
      </Button>
      {/* Existe antes de ter texto, para o leitor de tela anunciar; vazia, não ocupa espaço. */}
      <p role="status" className="w-full text-[13.5px] text-fg-muted empty:-mt-2">
        {status}
      </p>
    </>
  );
}
