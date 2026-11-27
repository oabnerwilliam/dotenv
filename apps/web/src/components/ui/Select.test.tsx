import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Select } from './Select';

const OPTIONS = [
  { value: 'migracao', label: 'Migração de banco' },
  { value: 'deploy', label: 'Deploy quebrado' },
  { value: 'infra', label: 'Manutenção de infra' },
];

type Props = Partial<Parameters<typeof Select>[0]>;

/** O `Select` é controlado: o teste guarda o valor como a tela faria. */
function Controlled({ onValueChange, ...props }: Props) {
  const [value, setValue] = useState('deploy');
  return (
    <Select
      label="Motivo"
      options={OPTIONS}
      {...props}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onValueChange?.(next);
      }}
    />
  );
}

const trigger = () => screen.getByRole('combobox', { name: 'Motivo' });

describe('Select', () => {
  it('abre com Enter, escolhe com setas e Enter', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Controlled onValueChange={onValueChange} />);
    expect(trigger()).toHaveTextContent('Deploy quebrado');

    await user.tab();
    await user.keyboard('{Enter}');
    const current = await screen.findByRole('option', { name: 'Deploy quebrado' });
    await waitFor(() => expect(current).toHaveFocus());

    await user.keyboard('{ArrowDown}');
    await waitFor(() =>
      expect(screen.getByRole('option', { name: 'Manutenção de infra' })).toHaveFocus(),
    );
    await user.keyboard('{Enter}');

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith('infra');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger()).toHaveTextContent('Manutenção de infra');
  });

  it('a opção atual vem marcada', async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.tab();
    await user.keyboard('{Enter}');
    const current = await screen.findByRole('option', { name: 'Deploy quebrado' });

    await waitFor(() => expect(current).toHaveAttribute('aria-selected', 'true'));
    expect(screen.getByRole('option', { name: 'Migração de banco' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('Esc fecha sem mudar e devolve o foco ao gatilho', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Controlled onValueChange={onValueChange} />);

    await user.tab();
    await user.keyboard('{Enter}');
    const current = await screen.findByRole('option', { name: 'Deploy quebrado' });
    await waitFor(() => expect(current).toHaveFocus());
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await waitFor(() => expect(trigger()).toHaveFocus());
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('o rótulo nomeia o combobox mesmo escondido', () => {
    render(<Controlled hideLabel />);

    expect(trigger()).toBeInTheDocument();
    expect(screen.getByText('Motivo')).toHaveClass('sr-only');
  });

  it('erro marca e descreve o campo', () => {
    render(<Controlled error="Escolha um motivo" />);

    expect(trigger()).toHaveAttribute('aria-invalid', 'true');
    expect(trigger()).toHaveAccessibleDescription('Escolha um motivo');
  });

  it('sem erro não há aria-invalid nem descrição', () => {
    render(<Controlled />);

    expect(trigger()).not.toHaveAttribute('aria-invalid');
    expect(trigger()).not.toHaveAttribute('aria-describedby');
  });

  it('desativado não abre', async () => {
    const user = userEvent.setup();
    render(<Controlled disabled />);

    await user.click(trigger());
    trigger().focus();
    await user.keyboard('{Enter}');

    expect(trigger()).toBeDisabled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('o ref foca o gatilho e o onBlur só avisa quando o foco sai do controle', async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLButtonElement>();
    const onBlur = vi.fn();
    render(<Controlled ref={ref} onBlur={onBlur} />);

    ref.current?.focus();
    expect(trigger()).toHaveFocus();

    // Abrir a lista leva o foco para dentro dela: o campo ainda está em uso.
    await user.keyboard('{Enter}');
    const current = await screen.findByRole('option', { name: 'Deploy quebrado' });
    await waitFor(() => expect(current).toHaveFocus());
    expect(onBlur).not.toHaveBeenCalled();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(trigger()).toHaveFocus());
    await user.tab();
    expect(onBlur).toHaveBeenCalledOnce();
  });
});
