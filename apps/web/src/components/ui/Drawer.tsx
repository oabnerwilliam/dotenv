import type { EnvStatus } from '@env/shared';
import { X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { IconButton } from './IconButton';
import { useReturnFocus } from './useReturnFocus';

type DrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Nome do painel para o leitor de tela. */
  label: string;
  /** Cor do cabeçalho e, por herança, das seções do corpo. */
  status?: EnvStatus;
  header: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function Drawer({
  open,
  onOpenChange,
  label,
  status,
  header,
  children,
  footer,
}: DrawerProps) {
  const returnFocus = useReturnFocus();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* z-20: um modal aberto por cima do drawer (z-30) fica na frente. */}
        <Dialog.Overlay data-scrim="" className="fixed inset-0 z-20 bg-scrim/62" />
        <Dialog.Content
          {...returnFocus}
          aria-describedby={undefined}
          data-status={status}
          className="fixed inset-y-0 right-0 z-20 flex w-full max-w-drawer flex-col border-l border-line-strong bg-surface-2 shadow-[-24px_0_64px_rgb(0_0_0/.5)]"
        >
          <Dialog.Title className="sr-only">{label}</Dialog.Title>
          <div
            className={cn(
              'flex items-start gap-2.5 border-b border-line px-5 pt-5 pb-4',
              status && 'bg-linear-to-b from-(--status)/8 to-transparent',
            )}
          >
            <div className="flex min-w-0 flex-1 flex-col items-start gap-2.5">{header}</div>
            <Dialog.Close asChild>
              <IconButton label="Fechar painel">
                <X aria-hidden="true" size={18} strokeWidth={1.8} />
              </IconButton>
            </Dialog.Close>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-5 py-6">
            {children}
          </div>
          {footer && (
            <div className="flex flex-wrap gap-2 border-t border-line bg-bg px-5 py-4">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
