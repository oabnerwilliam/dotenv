/**
 * Junta classes, ignorando o que for falso. Não resolve conflitos do Tailwind: o `className`
 * recebido por um componente serve para layout (`flex-1`, `w-full`), não para trocar o estilo.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
