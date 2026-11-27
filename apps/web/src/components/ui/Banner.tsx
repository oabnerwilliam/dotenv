import type { EnvStatus } from '@env/shared';
import { TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

type BannerProps = {
  /** Define a cor da faixa. */
  status: EnvStatus;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function Banner({ status, title, children, actions }: BannerProps) {
  return (
    <div
      role="alert"
      data-status={status}
      className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-md border border-(--status)/40 bg-(--status)/10 p-4"
    >
      <TriangleAlert aria-hidden="true" size={18} strokeWidth={1.8} className="text-(--status)" />
      <div className="flex min-w-0 flex-1 basis-80 flex-col gap-0.5">
        <p className="text-[14.5px] font-semibold text-(--status)">{title}</p>
        <div className="text-[13.5px] leading-normal text-fg-soft">{children}</div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
