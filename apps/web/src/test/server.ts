import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Cada teste declara as respostas da API de que precisa, com `server.use(...)`. A exceção é a
// lista de projetos: toda tela de membro a consulta, então ela tem uma resposta padrão (só o
// Atlas), que `projectsAnswers` troca. O `resetHandlers` volta sempre para esta.
export const server = setupServer(
  http.get('http://localhost:3333/projects', () =>
    HttpResponse.json([{ id: 'p1', name: 'Atlas', slug: 'atlas' }]),
  ),
);
