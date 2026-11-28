import type { Me, Project } from '@env/shared';
import { PanelLeft } from 'lucide-react';
import { Link } from 'react-router';
import { IconButton } from '../../components/ui/IconButton';
import { useSidebar } from '../../lib/useSidebar';
import { Logo } from './Logo';
import { ProjectSelect } from './ProjectSelect';
import { TeamMenu } from './TeamMenu';

type TopNavProps = {
  member: Extract<Me, { state: 'member' }>;
  projects: Project[] | undefined;
  failed: boolean;
  current: Project | undefined;
};

export function TopNav({ member, projects, failed, current }: TopNavProps) {
  const { collapsed, toggle } = useSidebar();

  return (
    // Na tela estreita a quebra de linha faz as duas fileiras: a ordem na tela é a do Tab.
    <header className="flex min-h-16 flex-wrap items-center gap-3 border-b border-line-subtle px-4 py-2.5 md:px-6">
      <div className="flex items-center gap-1.5">
        <IconButton
          label="Alternar menu lateral"
          title="Menu lateral"
          aria-expanded={!collapsed}
          onClick={toggle}
        >
          <PanelLeft aria-hidden="true" size={20} strokeWidth={1.8} />
        </IconButton>
        <Link
          to="/"
          aria-label=".env, início"
          className="inline-flex h-11 items-center rounded-sm px-1"
        >
          <Logo />
        </Link>
      </div>
      <ProjectSelect projects={projects} failed={failed} current={current} />
      <TeamMenu member={member} projects={projects} failed={failed} current={current} />
    </header>
  );
}
