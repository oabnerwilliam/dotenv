import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Drawer } from './Drawer';

function Screen() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Ver Lyra
      </button>
      <Drawer
        open={open}
        onOpenChange={setOpen}
        label="Ambiente Lyra"
        status="uso"
        header={<p>Em uso há 3 dias</p>}
        footer={<button type="button">Editar</button>}
      >
        <a href="#ticket">AC-1234</a>
      </Drawer>
    </>
  );
}

async function openDrawer() {
  const user = userEvent.setup();
  render(<Screen />);
  await user.click(screen.getByRole('button', { name: 'Ver Lyra' }));
  return user;
}

function renderOpen() {
  const onOpenChange = vi.fn();
  render(
    <Drawer open onOpenChange={onOpenChange} label="Ambiente Vega" header="Cabeçalho">
      Corpo
    </Drawer>,
  );
  return { user: userEvent.setup(), onOpenChange };
}

describe('Drawer', () => {
  it('é um diálogo nomeado pelo label e expõe data-status', async () => {
    await openDrawer();

    const dialog = screen.getByRole('dialog', { name: 'Ambiente Lyra' });
    expect(dialog).toHaveAttribute('data-status', 'uso');
    expect(screen.getByRole('heading', { name: 'Ambiente Lyra' })).toHaveClass('sr-only');
    expect(screen.getByText('Em uso há 3 dias')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
  });

  it('sem status não há data-status', () => {
    renderOpen();

    expect(screen.getByRole('dialog')).not.toHaveAttribute('data-status');
  });

  it('Esc fecha', async () => {
    const { user, onOpenChange } = renderOpen();

    await user.keyboard('{Escape}');

    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('o X fecha', async () => {
    const { user, onOpenChange } = renderOpen();

    await user.click(screen.getByRole('button', { name: 'Fechar painel' }));

    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('clique no scrim fecha, clique dentro não', async () => {
    const { user, onOpenChange } = renderOpen();

    await user.click(screen.getByText('Corpo'));
    expect(onOpenChange).not.toHaveBeenCalled();

    // O scrim é só visual (sem papel nem nome): o teste o acha pelo atributo.
    await user.click(document.querySelector('[data-scrim]')!);
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('o foco volta ao botão que abriu', async () => {
    const user = await openDrawer();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ver Lyra' })).toHaveFocus());
  });

  it('Tab fica preso dentro', async () => {
    const user = await openDrawer();
    const close = screen.getByRole('button', { name: 'Fechar painel' });
    const edit = screen.getByRole('button', { name: 'Editar' });
    await waitFor(() => expect(close).toHaveFocus());

    await user.tab();
    expect(screen.getByRole('link', { name: 'AC-1234' })).toHaveFocus();
    await user.tab();
    expect(edit).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(edit).toHaveFocus();
  });
});
