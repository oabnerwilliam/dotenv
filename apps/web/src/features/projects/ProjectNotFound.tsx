import { Link } from 'react-router';
import { Prompt } from '../../components/ui/Button';
import { buttonClass } from '../../components/ui/buttonClass';
import { EmptyState } from '../../components/ui/EmptyState';
import { useMember } from '../../lib/auth';
import { defaultProject, useProjects } from './useProjects';

/** O texto é o mesmo para projeto inexistente, arquivado ou de outra equipe. */
export function ProjectNotFound({ slug }: { slug: string }) {
  const member = useMember();
  const { data } = useProjects();
  const target = defaultProject(data ?? [], member?.defaultProjectSlug);

  return (
    <EmptyState
      headingLevel="h1"
      command={`env status --project=${slug}`}
      title="Projeto não encontrado"
      actions={
        <Link
          to={target ? `/p/${target.slug}` : '/'}
          className={buttonClass({ variant: 'accent' })}
        >
          <Prompt />
          Voltar ao início
        </Link>
      }
    >
      O endereço pode estar errado, ou o projeto foi arquivado.
    </EmptyState>
  );
}
