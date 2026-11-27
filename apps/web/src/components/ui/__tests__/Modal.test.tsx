import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from '../Modal';
import { Select } from '../Select';

/** Como uma tela usa o modal: um botão comum e o `open` guardado no estado. */
function Screen({ children, onOpenChange }: { children?: ReactNode; onOpenChange?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Reservar ambiente
      </button>
      <Modal
        open={open}
        onOpenChange={(next) => {
          onOpenChange?.();
          setOpen(next);
        }}
        title="Reservar Vega"
        footer={<button type="button">Confirmar reserva</button>}
      >
        {children ?? <input aria-label="Ticket" />}
      </Modal>
    </>
  );
}

async function openModal() {
  const user = userEvent.setup();
  render(<Screen />);
  await user.click(screen.getByRole('button', { name: 'Reservar ambiente' }));
  return user;
}

function renderOpen() {
  const onOpenChange = vi.fn();
  render(
    <Modal open onOpenChange={onOpenChange} title="Reservar Vega">
      Corpo
    </Modal>,
  );
  return { user: userEvent.setup(), onOpenChange };
}

describe('Modal', () => {
  it('é um diálogo nomeado pelo título', async () => {
    await openModal();

    expect(screen.getByRole('dialog', { name: 'Reservar Vega' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Reservar Vega' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar reserva' })).toBeInTheDocument();
  });

  it('fechado não está na tela', () => {
    render(<Screen />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Esc pede para fechar', async () => {
    const { user, onOpenChange } = renderOpen();

    await user.keyboard('{Escape}');

    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('o X pede para fechar', async () => {
    const { user, onOpenChange } = renderOpen();

    await user.click(screen.getByRole('button', { name: 'Fechar' }));

    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('clique no scrim pede para fechar, clique dentro não', async () => {
    const { user, onOpenChange } = renderOpen();

    await user.click(screen.getByText('Corpo'));
    expect(onOpenChange).not.toHaveBeenCalled();

    // O scrim é só visual (sem papel nem nome): o teste o acha pelo atributo.
    await user.click(document.querySelector('[data-scrim]')!);
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it.each(['{Escape}', 'Fechar'])('o foco volta ao botão que abriu (%s)', async (way) => {
    const user = await openModal();

    if (way === 'Fechar') await user.click(screen.getByRole('button', { name: 'Fechar' }));
    else await user.keyboard(way);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Reservar ambiente' })).toHaveFocus(),
    );
  });

  it('Tab e Shift+Tab ficam presos dentro', async () => {
    const user = await openModal();
    const dialog = screen.getByRole('dialog');
    const close = screen.getByRole('button', { name: 'Fechar' });
    const confirm = screen.getByRole('button', { name: 'Confirmar reserva' });
    await waitFor(() => expect(close).toHaveFocus());

    await user.tab({ shift: true });
    expect(confirm).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();

    for (let i = 0; i < 6; i++) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('Esc com o select aberto fecha só o select', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Screen onOpenChange={onOpenChange}>
        <Select
          label="Motivo"
          value="outro"
          onValueChange={() => {}}
          options={[{ value: 'outro', label: 'Outro' }]}
        />
      </Screen>,
    );
    await user.click(screen.getByRole('button', { name: 'Reservar ambiente' }));

    screen.getByRole('combobox', { name: 'Motivo' }).focus();
    await user.keyboard('{Enter}');
    const option = await screen.findByRole('option', { name: 'Outro' });
    await waitFor(() => expect(option).toHaveFocus());
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Reservar Vega' })).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Motivo' })).toHaveFocus());
  });
});
