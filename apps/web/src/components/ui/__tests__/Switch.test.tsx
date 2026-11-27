import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Switch } from '../Switch';

type Props = Partial<Parameters<typeof Switch>[0]>;

function Controlled(props: Props) {
  const [checked, setChecked] = useState(false);
  return (
    <Switch label="Validar branches" {...props} checked={checked} onCheckedChange={setChecked} />
  );
}

const control = () => screen.getByRole('switch', { name: 'Validar branches' });

describe('Switch', () => {
  it('alterna com espaço e Enter', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    expect(control()).toHaveAttribute('aria-checked', 'false');

    await user.tab();
    await user.keyboard(' ');
    expect(control()).toHaveAttribute('aria-checked', 'true');

    await user.keyboard('{Enter}');
    expect(control()).toHaveAttribute('aria-checked', 'false');
  });

  it('o rótulo faz parte do alvo de clique', async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.click(screen.getByText('Validar branches'));

    expect(control()).toHaveAttribute('aria-checked', 'true');
  });

  it('desativado não alterna', async () => {
    const user = userEvent.setup();
    render(<Controlled disabled />);

    await user.click(control());
    control().focus();
    await user.keyboard(' ');
    await user.keyboard('{Enter}');

    expect(control()).toBeDisabled();
    expect(control()).toHaveAttribute('aria-checked', 'false');
  });

  it('aceita ref e onBlur', async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLButtonElement>();
    const onBlur = vi.fn();
    render(<Controlled ref={ref} onBlur={onBlur} />);

    ref.current?.focus();
    expect(control()).toHaveFocus();
    await user.tab();

    expect(onBlur).toHaveBeenCalledOnce();
  });
});
