import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../test/server';
import { StatusPage } from './StatusPage';

const HEALTH_URL = 'http://localhost:3333/health';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <StatusPage />
    </QueryClientProvider>,
  );
}

function apiAnswers(database: 'up' | 'down') {
  server.use(http.get(HEALTH_URL, () => HttpResponse.json({ status: 'ok', database })));
}

describe('StatusPage', () => {
  it('mostra a API no ar e o banco conectado', async () => {
    apiAnswers('up');

    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Consultando a API…');
    expect(await screen.findByText('API no ar')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Banco conectado');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('mostra banco indisponível quando database é down', async () => {
    apiAnswers('down');

    renderPage();

    expect(await screen.findByText('Banco indisponível')).toBeInTheDocument();
    expect(screen.getByText('API no ar')).toBeInTheDocument();
    expect(screen.queryByText('Banco conectado')).not.toBeInTheDocument();
  });

  it('com a API fora, mostra alerta e Tentar de novo refaz a consulta', async () => {
    server.use(http.get(HEALTH_URL, () => HttpResponse.error()));
    const user = userEvent.setup();

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível consultar a API.');

    apiAnswers('up');
    await user.tab();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(await screen.findByText('API no ar')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
