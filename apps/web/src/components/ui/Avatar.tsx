import type { EnvStatus } from '@env/shared';
import { useState } from 'react';
import { cn } from '../../lib/cn';

const SIZES = { 32: 'size-8 text-[11px]', 44: 'size-11 text-[13px]' };

type AvatarProps = {
  name: string;
  src?: string;
  status?: EnvStatus;
  size?: keyof typeof SIZES;
};

/** Primeira letra do primeiro e do último nome. Quem deixa maiúscula é a classe. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  const ends = words.length > 1 ? [words[0], words.at(-1)] : words;
  // `Array.from` separa por caractere inteiro, sem partir acentos compostos ou emojis ao meio.
  return ends.map((word) => Array.from(word ?? '')[0] ?? '').join('');
}

/** Sempre decorativo: o nome da pessoa aparece ao lado. */
export function Avatar({ name, src, status, size = 32 }: AvatarProps) {
  // Guarda qual endereço falhou: se o `src` mudar, a imagem nova é tentada.
  const [failedSrc, setFailedSrc] = useState<string>();

  return (
    <span
      aria-hidden="true"
      data-status={status}
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-sm border bg-avatar font-bold text-fg uppercase',
        status ? 'border-(--status)/45' : 'border-line-strong',
        SIZES[size],
      )}
    >
      {src && src !== failedSrc ? (
        <img
          src={src}
          alt=""
          // O site da imagem não fica sabendo em qual página ela foi aberta.
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
          className="size-full object-cover"
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}
