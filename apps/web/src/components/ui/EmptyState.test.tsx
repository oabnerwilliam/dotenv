import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('mostra comando, título, texto, ações e dica', () => {
    render(
      <EmptyState
        command="env list --project=atlas"
        title="Nenhum ambiente ainda"
        actions={<button type="button">Criar ambiente</button>}
        hint="Você pode mudar isso depois."
      >
        Crie um ambiente para começar.
      </EmptyState>,
    );

    expect(screen.getByText('env list --project=atlas')).toBeInTheDocument();
    expect(screen.getByText('$')).toHaveAttribute('aria-hidden', 'true');
    expect(
      screen.getByRole('heading', { level: 2, name: 'Nenhum ambiente ainda' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Crie um ambiente para começar.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar ambiente' })).toBeInTheDocument();
    expect(screen.getByText('Você pode mudar isso depois.')).toBeInTheDocument();
  });

  it('omite os opcionais ausentes', () => {
    const { container } = render(<EmptyState title="Nada aqui">Sem itens.</EmptyState>);

    expect(screen.queryByText('$')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    // Só o título e o texto: nenhuma caixa vazia sobra no lugar dos opcionais.
    expect(container.textContent).toBe('Nada aquiSem itens.');
    expect(container.querySelectorAll(':empty')).toHaveLength(0);
  });
});
