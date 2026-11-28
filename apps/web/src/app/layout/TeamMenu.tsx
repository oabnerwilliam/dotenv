import type { Me, Project } from '@env/shared';
import { LogOut, Settings, Users } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { Link } from 'react-router';
import { Backdrop } from '../../components/ui/Backdrop';
import { defaultProject } from '../../features/projects/useProjects';
import { useSignOut } from '../../lib/auth';
import { sigla } from '../../lib/sigla';
import { TERMO_EQUIPE_TITULO } from '../../lib/termos';

type TeamMenuProps = {
  member: Extract<Me, { state: 'member' }>;
  projects: Project[] | undefined;
  failed: boolean;
  current: Project | undefined;
};

// O contorno de foco entra para dentro, senão o painel o corta.
const ITEM_CLASS =
  'flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-sm px-2.5 text-sm font-medium text-fg-soft select-none focus-visible:-outline-offset-2 data-disabled:cursor-not-allowed data-disabled:text-fg-muted data-highlighted:bg-surface-hover-2';

const icon = {
  'aria-hidden': true,
  size: 18,
  strokeWidth: 1.8,
  className: 'shrink-0 text-fg-muted',
} as const;

function Separator() {
  return <DropdownMenu.Separator className="my-1.5 h-px bg-line" />;
}

/** O menu do avatar da equipe. O Radix cuida de setas, Esc, clique fora e da volta do foco. */
export function TeamMenu({ member, projects, failed, current }: TeamMenuProps) {
  const signOut = useSignOut();
  const { team, user } = member;
  const initials = sigla(team.name);
  const settingsProject = current ?? defaultProject(projects ?? [], member.defaultProjectSlug);
  let unavailable = 'sem projeto';
  if (!projects) unavailable = failed ? 'indisponível' : 'carregando…';

  const settings = (
    <>
      <Settings {...icon} />
      Configurações
    </>
  );

  return (
    <div className="ml-auto">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger className="size-11 cursor-pointer rounded-md bg-accent text-sm font-bold text-bg">
          {/* A sigla é enfeite; o nome do botão é o nome completo da equipe. */}
          <span aria-hidden="true" className="uppercase">
            {initials}
          </span>
          <span className="sr-only">
            {TERMO_EQUIPE_TITULO} {team.name}
          </span>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <Backdrop className="z-30" />
        </DropdownMenu.Portal>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={8}
            collisionPadding={16}
            aria-label={TERMO_EQUIPE_TITULO}
            // Sem isto o Radix usaria o nome do botão como nome do menu.
            aria-labelledby={undefined}
            className="z-40 max-h-(--radix-dropdown-menu-content-available-height) w-80 max-w-[calc(100vw-32px)] overflow-y-auto rounded-md border border-line-strong bg-surface p-1.5 text-fg shadow-[0_16px_40px_rgb(0_0_0/.55)]"
          >
            <div className="flex items-center gap-3 p-2.5">
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-[15px] font-bold text-bg uppercase"
              >
                {initials}
              </span>
              <div className="flex min-w-0 flex-col leading-snug wrap-anywhere">
                <span className="text-[15px] font-semibold">{team.name}</span>
                <span className="font-mono text-[12.5px] text-fg-muted">{team.slug}</span>
              </div>
            </div>
            <Separator />
            <DropdownMenu.Item asChild className={ITEM_CLASS}>
              <Link to="/equipe/membros">
                <Users {...icon} />
                Membros
              </Link>
            </DropdownMenu.Item>
            {settingsProject ? (
              <DropdownMenu.Item asChild className={ITEM_CLASS}>
                <Link to={`/p/${settingsProject.slug}/configuracoes`}>{settings}</Link>
              </DropdownMenu.Item>
            ) : (
              <DropdownMenu.Item disabled className={ITEM_CLASS}>
                {settings}
                <span className="ml-auto text-[12.5px] font-normal">{unavailable}</span>
              </DropdownMenu.Item>
            )}
            <Separator />
            <div className="flex flex-col px-2.5 py-1.5 leading-snug wrap-anywhere">
              <span className="text-sm font-medium">{user.name}</span>
              <span className="text-[12.5px] text-fg-muted">{user.email}</span>
            </div>
            <DropdownMenu.Item className={ITEM_CLASS} onSelect={() => void signOut()}>
              <LogOut {...icon} />
              Sair
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
