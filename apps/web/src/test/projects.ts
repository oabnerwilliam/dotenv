// Projetos fictícios e as respostas de `GET /projects` para os testes de tela.
import type { Project } from '@env/shared';
import { http, HttpResponse } from 'msw';
import { server } from './server';

export const PROJECTS_URL = 'http://localhost:3333/projects';

export const ATLAS: Project = { id: 'p1', name: 'Atlas', slug: 'atlas' };
export const HYDRA: Project = { id: 'p2', name: 'Hydra', slug: 'hydra' };
export const LYRA: Project = { id: 'p3', name: 'Lyra', slug: 'lyra' };
export const VEGA: Project = { id: 'p4', name: 'Vega', slug: 'vega' };

/** Faz a lista de projetos responder e devolve quantas vezes foi consultada. */
export function projectsAnswers(body: object, status = 200) {
  const calls = { count: 0 };
  server.use(
    http.get(PROJECTS_URL, () => {
      calls.count += 1;
      return HttpResponse.json(body, { status });
    }),
  );
  return calls;
}

/** Segura a resposta da lista até o teste liberar, para ver o que a tela mostra enquanto isso. */
export function projectsHeld(body: object, status = 200) {
  let release = () => {};
  const gate = new Promise<void>((resolve) => (release = resolve));
  server.use(
    http.get(PROJECTS_URL, async () => {
      await gate;
      return HttpResponse.json(body, { status });
    }),
  );
  return () => release();
}

/** Uma API de projetos de mentira, que guarda a lista e anota o que recebeu para gravar. */
export function projectsBackend(initial: Project[]) {
  let list = [...initial];
  const writes: { method: string; path: string; body: unknown }[] = [];
  const reads = { count: 0 };

  async function record(request: Request) {
    const text = await request.text();
    const body: unknown = text ? JSON.parse(text) : null;
    writes.push({ method: request.method, path: new URL(request.url).pathname, body });
    return body;
  }
  const notFound = () =>
    HttpResponse.json({ code: 'NOT_FOUND', message: 'Projeto não encontrado.' }, { status: 404 });

  server.use(
    http.get(PROJECTS_URL, () => {
      reads.count += 1;
      return HttpResponse.json(list);
    }),
    http.post(PROJECTS_URL, async ({ request }) => {
      const { name, slug } = (await record(request)) as Pick<Project, 'name' | 'slug'>;
      const project = { id: `novo-${slug}`, name, slug };
      list = [...list, project];
      return HttpResponse.json(project, { status: 201 });
    }),
    http.patch(`${PROJECTS_URL}/:slug`, async ({ request, params }) => {
      const { name } = (await record(request)) as Pick<Project, 'name'>;
      const found = list.find((project) => project.slug === params.slug);
      if (!found) return notFound();
      const renamed = { ...found, name };
      list = list.map((project) => (project === found ? renamed : project));
      return HttpResponse.json(renamed);
    }),
    http.post(`${PROJECTS_URL}/:slug/archive`, async ({ request, params }) => {
      await record(request);
      const found = list.find((project) => project.slug === params.slug);
      if (!found) return notFound();
      list = list.filter((project) => project !== found);
      return HttpResponse.json(found);
    }),
  );

  return {
    writes,
    reads,
    /** Muda a lista por fora, como se outra pessoa tivesse mexido. */
    set: (next: Project[]) => {
      list = next;
    },
  };
}
