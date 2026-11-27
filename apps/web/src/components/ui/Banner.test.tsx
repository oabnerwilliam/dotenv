import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Banner } from './Banner';

describe('Banner', () => {
  it('anuncia como alerta com título, detalhe e ações', () => {
    render(
      <Banner
        status="bloqueado"
        title="Não foi possível carregar"
        actions={<button type="button">Tentar de novo</button>}
      >
        Mostrando os últimos dados.
      </Banner>,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('data-status', 'bloqueado');
    expect(within(alert).getByText('Não foi possível carregar')).toBeInTheDocument();
    expect(within(alert).getByText('Mostrando os últimos dados.')).toBeInTheDocument();
    expect(within(alert).getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
    expect(alert.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
