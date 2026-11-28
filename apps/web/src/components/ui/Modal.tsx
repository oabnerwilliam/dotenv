import { X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import type { ReactNode } from 'react';
import { IconButton } from './IconButton';
import { useReturnFocus } from './useReturnFocus';

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Leva o foco a um campo na abertura. Sem isto, ele vai para o primeiro controle (o X). */
  focusOnOpen?: () => void;
};

export function Modal({ open, onOpenChange, title, children, footer, focusOnOpen }: ModalProps) {
  const returnFocus = useReturnFocus();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay data-scrim="" className="fixed inset-0 z-30 bg-scrim/72" />
        <Dialog.Content
          {...returnFocus}
          onOpenAutoFocus={(event) => {
            // Primeiro guarda quem abriu, depois move o foco.
            returnFocus.onOpenAutoFocus();
            if (!focusOnOpen) return;
            event.preventDefault();
            focusOnOpen();
          }}
          // Sem texto de descrição: avisa o Radix para não procurar um.
          aria-describedby={undefined}
          // A 96px do topo, com 16px de margem; se faltar altura, só o corpo rola.
          className="fixed inset-x-4 top-24 z-30 mx-auto flex max-h-[calc(100dvh-7rem)] max-w-modal flex-col rounded-lg border border-line-strong bg-surface shadow-[0_24px_64px_rgb(0_0_0/.6)]"
        >
          <div className="flex items-center gap-2.5 border-b border-line py-4 pr-4 pl-5">
            <Dialog.Title className="flex min-w-0 flex-wrap items-center gap-2 text-xl font-semibold">
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <IconButton label="Fechar" className="ml-auto">
                <X aria-hidden="true" size={18} strokeWidth={1.8} />
              </IconButton>
            </Dialog.Close>
          </div>
          <div className="flex min-h-0 flex-col gap-[18px] overflow-y-auto p-5">{children}</div>
          {footer && (
            <div className="flex flex-wrap gap-2 border-t border-line px-5 py-4">{footer}</div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
