import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../Button';

describe('Button', () => {
  it('prompt é decorativo', () => {
    render(
      <Button variant="green" prompt>
        Reservar
      </Button>,
    );

    expect(screen.getByRole('button', { name: 'Reservar' })).toBeInTheDocument();
    expect(screen.getByText('>')).toHaveAttribute('aria-hidden', 'true');
  });

  it('é type button e responde a Enter e espaço', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button variant="accent" onClick={onClick}>
        Salvar
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Salvar' });
    expect(button).toHaveAttribute('type', 'button');

    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('desativado não dispara clique nem teclado', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button variant="ghost" disabled onClick={onClick}>
        Cancelar
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Cancelar' });
    await user.click(button);
    button.focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(button).toBeDisabled();
    expect(onClick).not.toHaveBeenCalled();
  });
});
