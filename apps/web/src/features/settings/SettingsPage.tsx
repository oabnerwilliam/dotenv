import { PageHeader } from '../../app/layout/PageHeader';
import { ProjectPanel } from '../projects/ProjectPanel';
import { useProject } from '../projects/ProjectScope';

export function SettingsPage() {
  const { slug } = useProject();

  return (
    <>
      <PageHeader path={`~/projetos/${slug}/configuracoes`} title="Configurações" />
      <ProjectPanel />
      <p className="text-[13.5px] text-fg-muted">Ambientes, serviços e regras chegam em breve.</p>
    </>
  );
}
