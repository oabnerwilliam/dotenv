import { projectListSchema, type Project } from '@env/shared';
import { useQuery } from '@tanstack/react-query';
import { useMatch } from 'react-router';
import { apiFetch } from '../../lib/api';
import { useSession } from '../../lib/auth';
import { queryKeys } from '../../lib/queryKeys';

/** Os projetos ativos da equipe. A casca, o seletor e as páginas leem a mesma consulta. */
export function useProjects() {
  const { userId } = useSession();
  const query = useQuery({
    queryKey: queryKeys.projects(userId),
    queryFn: ({ signal }) => apiFetch('/projects', projectListSchema, { signal }),
    enabled: userId !== null,
    // Vários componentes leem a lista e aparecem em momentos diferentes: sem este prazo, cada
    // um que surge a pediria de novo. Criar, renomear e arquivar a invalidam na hora.
    staleTime: 30_000,
  });
  // `errorUpdateCount` continua acima de zero durante a nova tentativa, então a faixa de erro
  // fica na tela com o botão desativado.
  return { ...query, failedToLoad: !query.data && query.errorUpdateCount > 0 };
}

/** O projeto do endereço aberto, se houver um e ele estiver na lista. */
export function useCurrentProject(): Project | undefined {
  const slug = useMatch('/p/:projeto/*')?.params.projeto;
  const { data } = useProjects();
  return data?.find((project) => project.slug === slug);
}

/** Para onde ir quando nenhum projeto foi escolhido: o padrão, se existir, senão o primeiro. */
export function defaultProject(
  projects: Project[],
  defaultSlug: string | null | undefined,
): Project | undefined {
  return projects.find((project) => project.slug === defaultSlug) ?? projects[0];
}
