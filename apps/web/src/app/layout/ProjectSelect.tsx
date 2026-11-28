import type { Project } from '@env/shared';
import { useNavigate } from 'react-router';
import { Select } from '../../components/ui/Select';

type ProjectSelectProps = {
  projects: Project[] | undefined;
  /** A lista falhou e não há nada para mostrar. */
  failed: boolean;
  current: Project | undefined;
};

function placeholderFor(projects: Project[] | undefined, failed: boolean) {
  if (!projects) return failed ? 'indisponível' : 'carregando…';
  return projects.length === 0 ? 'nenhum' : 'escolher';
}

/** O caminho `~/projetos/atlas` da nav. Escolher outro projeto leva ao board dele. */
export function ProjectSelect({ projects, failed, current }: ProjectSelectProps) {
  const navigate = useNavigate();

  return (
    <div className="flex min-w-0 flex-col max-md:basis-[calc(100%-56px)] md:max-w-[440px]">
      <Select
        label="Projeto"
        hideLabel
        compact
        mono
        prefix="~/projetos/"
        value={current?.slug ?? ''}
        placeholder={placeholderFor(projects, failed)}
        disabled={!projects?.length}
        options={(projects ?? []).map(({ slug }) => ({ value: slug, label: slug }))}
        onValueChange={(slug) => void navigate(`/p/${slug}`)}
      />
    </div>
  );
}
