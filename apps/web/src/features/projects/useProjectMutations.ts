// Criar, renomear e arquivar projeto. Cada um grava a resposta da API no cache da lista (a tela
// muda na hora) e depois pede a lista e o `/me` de novo, que são a palavra final.
import {
  projectSchema,
  type CreateProjectInput,
  type Project,
  type UpdateProjectInput,
} from '@env/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiFetch } from '../../lib/api';
import { useSession } from '../../lib/auth';
import { queryKeys } from '../../lib/queryKeys';

const NO_RESPONSE = new ApiError(0, 'INTERNAL', 'Confira sua conexão e tente de novo.');

/** O erro como a tela o mostra: sem resposta, o texto é o do design. */
export function displayError<T>(error: T): T | ApiError {
  return error instanceof ApiError && error.status === 0 ? NO_RESPONSE : error;
}

// A mesma ordem da API: por nome, nas regras do português.
const byName = (a: Project, b: Project) => a.name.localeCompare(b.name, 'pt-BR');

const withBody = (method: string, body: object): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

function useProjectsCache() {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.projects(userId);

  return {
    async write(change: (list: Project[]) => Project[]) {
      // Uma consulta em andamento traria a lista de antes e apagaria o que vamos gravar.
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData<Project[]>(queryKey, (list) => list && change(list));
    },
    refresh() {
      void queryClient.invalidateQueries({ queryKey });
      // O projeto padrão do `/me` pode ter mudado.
      void queryClient.invalidateQueries({ queryKey: queryKeys.me(userId) });
    },
  };
}

/** Grava o projeto na lista, no lugar que o nome dele pede. */
const upsert = (project: Project) => (list: Project[]) =>
  [...list.filter(({ id }) => id !== project.id), project].sort(byName);

/** 404: outra pessoa arquivou o projeto. Atualizar a lista leva a tela a "não encontrado". */
const isGone = (error: unknown) => error instanceof ApiError && error.status === 404;

// `networkMode: 'always'`: sem rede o envio deve falhar na hora, não ficar em pausa.
// `done` roda com o cache já gravado, mesmo que quem pediu tenha saído da tela.

export function useCreateProject(done: (project: Project) => void) {
  const cache = useProjectsCache();
  return useMutation({
    mutationFn: (input: CreateProjectInput) =>
      apiFetch('/projects', projectSchema, withBody('POST', input)),
    networkMode: 'always',
    onSuccess: async (project) => {
      await cache.write(upsert(project));
      done(project);
      cache.refresh();
    },
  });
}

export function useRenameProject(slug: string, done: (project: Project) => void) {
  const cache = useProjectsCache();
  return useMutation({
    mutationFn: (input: UpdateProjectInput) =>
      apiFetch(`/projects/${slug}`, projectSchema, withBody('PATCH', input)),
    networkMode: 'always',
    onSuccess: async (project) => {
      await cache.write(upsert(project));
      done(project);
      cache.refresh();
    },
    onError: (error) => {
      if (isGone(error)) cache.refresh();
    },
  });
}

/** `done` recebe os projetos que sobraram. */
export function useArchiveProject(slug: string, done: (remaining: Project[]) => void) {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const cache = useProjectsCache();
  return useMutation({
    mutationFn: () => apiFetch(`/projects/${slug}/archive`, projectSchema, { method: 'POST' }),
    networkMode: 'always',
    onSuccess: async (archived) => {
      await cache.write((list) => list.filter(({ id }) => id !== archived.id));
      done(queryClient.getQueryData<Project[]>(queryKeys.projects(userId)) ?? []);
      cache.refresh();
    },
    onError: (error) => {
      if (isGone(error)) cache.refresh();
    },
  });
}
