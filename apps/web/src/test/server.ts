import { setupServer } from 'msw/node';

// Cada teste declara as respostas da API de que precisa, com `server.use(...)`.
export const server = setupServer();
