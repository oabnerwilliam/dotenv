// Partes visuais comuns aos controles de formulário (`Field` e `Select`).
import { TriangleAlert } from 'lucide-react';

export const LABEL_CLASS = 'text-[13px] font-semibold text-fg-soft';

/** Caixa do controle. A cor da borda fica de fora: muda com erro e com o select aberto. */
export const CONTROL_CLASS =
  'w-full rounded-sm border bg-surface-2 px-3 text-sm text-fg disabled:cursor-not-allowed disabled:opacity-50';

export function FieldError({ id, children }: { id: string; children: string }) {
  return (
    <p id={id} className="flex items-center gap-1.5 text-[12.5px] text-uso">
      <TriangleAlert aria-hidden="true" size={14} strokeWidth={1.8} className="shrink-0" />
      {children}
    </p>
  );
}
