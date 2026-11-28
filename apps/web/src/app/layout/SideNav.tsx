import type { Project } from '@env/shared';
import {
  ChevronsLeft,
  ChevronsRight,
  History,
  LayoutDashboard,
  Plus,
  Settings,
} from 'lucide-react';
import { useRef, useState, type Ref, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { Link, NavLink } from 'react-router';
import { Skeleton } from '../../components/ui/Skeleton';
import { ProjectCreateModal } from '../../features/projects/ProjectCreateModal';
import { cn } from '../../lib/cn';
import { sigla } from '../../lib/sigla';
import { TERMO_EQUIPE_TITULO } from '../../lib/termos';
import { useIsNarrow } from '../../lib/useIsNarrow';
import { useSidebar } from '../../lib/useSidebar';

type SideNavProps = {
  team: { name: string };
  projects: Project[] | undefined;
  /** A lista falhou e não há nada para mostrar. */
  failed: boolean;
  current: Project | undefined;
};

// `end`: o board é o endereço do próprio projeto e não vale para as outras seções.
const SECTIONS = [
  { path: '', label: 'Board', icon: LayoutDashboard, end: true },
  { path: '/historico', label: 'Histórico', icon: History, end: false },
  { path: '/configuracoes', label: 'Configurações', icon: Settings, end: false },
];

const ITEM_CLASS =
  'flex h-11 w-full min-w-0 shrink-0 items-center gap-2 rounded-sm px-2.5 text-sm font-medium text-fg-soft hover:bg-surface-hover aria-[current=page]:bg-surface-hover aria-[current=page]:text-accent';

/** Quadrado de 44px do menu recolhido. A borda e a cor de cada estado ficam por conta do uso. */
const SQUARE_CLASS =
  'flex size-11 shrink-0 items-center justify-center rounded-sm border text-xs font-bold uppercase';

const iconProps = { 'aria-hidden': true, strokeWidth: 1.8, className: 'shrink-0' } as const;

export function SideNav({
  menuButtonRef,
  ...props
}: SideNavProps & {
  /** O botão de alternar da nav, que recebe o foco quando o menu some. */
  menuButtonRef: RefObject<HTMLButtonElement | null>;
}) {
  const { collapsed, toggle } = useSidebar();
  const narrow = useIsNarrow();
  // O botão de recolher ou o de expandir, conforme o que está na tela.
  const ownButton = useRef<HTMLButtonElement>(null);

  /**
   * Alternar troca o menu inteiro, e o botão usado deixa de existir: sem isto o foco cairia no
   * `body`. Só vale para os botões do próprio menu.
   */
  function toggleFromMenu() {
    // Recolhido na tela estreita, o menu não é exibido: resta o botão da nav.
    const hides = narrow && !collapsed;
    // `flushSync`: o botão novo precisa estar na tela antes de receber o foco.
    flushSync(toggle);
    (hides ? menuButtonRef : ownButton).current?.focus();
  }
  // O modal fica aqui para sobreviver à troca entre menu aberto e recolhido.
  const [creating, setCreating] = useState(false);
  const create = () => setCreating(true);

  return (
    <>
      {collapsed ? (
        <CollapsedSideNav
          {...props}
          onCreate={create}
          onExpand={toggleFromMenu}
          toggleRef={ownButton}
        />
      ) : (
        <ExpandedSideNav
          {...props}
          onCreate={create}
          onCollapse={toggleFromMenu}
          toggleRef={ownButton}
        />
      )}
      {creating && <ProjectCreateModal onClose={() => setCreating(false)} />}
    </>
  );
}

function ExpandedSideNav({
  team,
  projects,
  failed,
  current,
  onCreate,
  onCollapse,
  toggleRef,
}: SideNavProps & {
  onCreate: () => void;
  onCollapse: () => void;
  toggleRef: Ref<HTMLButtonElement>;
}) {
  const loading = !projects && !failed;

  return (
    <aside
      aria-label="Menu lateral"
      className="flex shrink-0 flex-col gap-4 border-line-subtle bg-surface-3 p-3 max-md:w-full max-md:border-b md:w-sidebar md:border-r"
    >
      <div
        title={team.name}
        className="flex h-12 shrink-0 items-center gap-2.5 rounded-md border border-line bg-surface px-2 text-sm font-semibold"
      >
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-sm border border-line-strong bg-avatar text-xs font-bold uppercase"
        >
          {sigla(team.name)}
        </span>
        <span className="min-w-0 truncate">{team.name}</span>
      </div>

      <nav aria-label="Projetos" aria-busy={loading || undefined} className="flex flex-col gap-0.5">
        <span aria-hidden="true" className="px-2.5 pb-1.5 text-xs font-semibold text-fg-muted">
          Projetos
        </span>
        {loading && (
          <>
            <span className="sr-only">Carregando projetos</span>
            {['w-[70%]', 'w-1/2', 'w-[60%]'].map((width) => (
              <span key={width} aria-hidden="true" className="flex h-11 items-center pr-2.5 pl-7">
                <Skeleton className={cn('h-3.5', width)} />
              </span>
            ))}
          </>
        )}
        {failed && (
          <p className="px-2.5 text-[13.5px] text-fg-muted">
            Não foi possível carregar os projetos.
          </p>
        )}
        {projects?.length === 0 && (
          <p className="px-2.5 text-[13.5px] text-fg-muted">Nenhum projeto.</p>
        )}
        {projects && projects.length > 0 && (
          <ul className="flex flex-col gap-0.5">
            {projects.map((project) => (
              <li key={project.id} className="flex min-w-0 flex-col gap-0.5">
                {project.id === current?.id ? (
                  <CurrentProject project={project} />
                ) : (
                  <Link to={`/p/${project.slug}`} title={project.name} className={ITEM_CLASS}>
                    <span aria-hidden="true" className="w-2.5 shrink-0" />
                    <span className="min-w-0 truncate">{project.name}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          disabled={!projects}
          onClick={onCreate}
          className={cn(
            ITEM_CLASS,
            'cursor-pointer text-fg-muted disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <span aria-hidden="true" className="flex w-2.5 shrink-0 justify-center">
            <Plus {...iconProps} size={14} />
          </span>
          Novo projeto
        </button>
      </nav>

      <button
        ref={toggleRef}
        type="button"
        aria-label="Recolher menu lateral"
        onClick={onCollapse}
        className="mt-auto flex h-11 shrink-0 cursor-pointer items-center gap-2.5 rounded-sm border border-line px-2.5 text-[13px] font-medium text-fg-muted hover:bg-surface-hover"
      >
        <ChevronsLeft {...iconProps} size={16} />
        Recolher
      </button>
    </aside>
  );
}

/** O projeto aberto não é link: embaixo dele ficam as seções. */
function CurrentProject({ project }: { project: Project }) {
  return (
    <>
      <div
        title={project.name}
        className="flex h-11 min-w-0 shrink-0 items-center gap-2 px-2.5 text-sm font-semibold text-fg"
      >
        <span aria-hidden="true" className="w-2.5 shrink-0 font-mono text-accent">
          ›
        </span>
        <span className="min-w-0 truncate">{project.name}</span>
      </div>
      <ul className="ml-3.5 flex flex-col gap-0.5 border-l border-dashed border-line-dashed pl-2">
        {SECTIONS.map(({ path, label, icon: Icon, end }) => (
          <li key={label}>
            <NavLink to={`/p/${project.slug}${path}`} end={end} className={ITEM_CLASS}>
              <Icon {...iconProps} size={16} />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </>
  );
}

function Rule() {
  return <span aria-hidden="true" className="h-px w-7 shrink-0 bg-line" />;
}

function CollapsedSideNav({
  team,
  projects,
  failed,
  current,
  onCreate,
  onExpand,
  toggleRef,
}: SideNavProps & {
  onCreate: () => void;
  onExpand: () => void;
  toggleRef: Ref<HTMLButtonElement>;
}) {
  const loading = !projects && !failed;
  const teamLabel = `${TERMO_EQUIPE_TITULO} ${team.name}`;
  const idle = 'border-transparent text-fg-soft hover:bg-surface-hover';

  return (
    // Na tela estreita o menu recolhido não ocupa espaço: resta o botão da nav.
    <aside
      aria-label="Menu lateral"
      className="flex w-sidebar-collapsed shrink-0 flex-col items-center gap-3 border-r border-line-subtle bg-surface-3 px-2.5 py-3 max-md:hidden"
    >
      <span
        role="img"
        aria-label={teamLabel}
        title={team.name}
        className={cn(SQUARE_CLASS, 'rounded-md border-line-strong bg-avatar')}
      >
        {sigla(team.name)}
      </span>
      <Rule />
      <nav
        aria-label="Projetos"
        aria-busy={loading || undefined}
        className="flex flex-col items-center gap-1"
      >
        {loading && <span className="sr-only">Carregando projetos</span>}
        {failed && <span className="sr-only">Não foi possível carregar os projetos.</span>}
        {projects && projects.length > 0 && (
          <ul className="flex flex-col gap-1">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  to={`/p/${project.slug}`}
                  title={project.name}
                  // "page" fica só na seção aberta: aqui é "o projeto atual".
                  aria-current={project.id === current?.id ? 'true' : undefined}
                  className={cn(
                    SQUARE_CLASS,
                    project.id === current?.id
                      ? 'border-line-strong bg-surface-hover text-fg'
                      : idle,
                  )}
                >
                  <span aria-hidden="true">{sigla(project.name)}</span>
                  <span className="sr-only">{project.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          aria-label="Novo projeto"
          title="Novo projeto"
          disabled={!projects}
          onClick={onCreate}
          className={cn(
            SQUARE_CLASS,
            idle,
            'cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <Plus {...iconProps} size={16} />
        </button>
      </nav>
      {current && (
        <>
          <Rule />
          <nav aria-label="Seções do projeto">
            <ul className="flex flex-col gap-1">
              {SECTIONS.map(({ path, label, icon: Icon, end }) => (
                <li key={label}>
                  <NavLink
                    to={`/p/${current.slug}${path}`}
                    end={end}
                    aria-label={label}
                    title={label}
                    className={cn(
                      SQUARE_CLASS,
                      idle,
                      'aria-[current=page]:bg-surface-hover aria-[current=page]:text-accent',
                    )}
                  >
                    <Icon {...iconProps} size={16} />
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}
      <button
        ref={toggleRef}
        type="button"
        aria-label="Expandir menu lateral"
        title="Expandir"
        onClick={onExpand}
        className="mt-auto flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-line text-fg-muted hover:bg-surface-hover"
      >
        <ChevronsRight {...iconProps} size={16} />
      </button>
    </aside>
  );
}
