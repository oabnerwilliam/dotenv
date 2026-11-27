import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ChipRadioGroup } from '../ChipRadioGroup';

const OPTIONS = [
  { value: '4h', label: '4 horas' },
  { value: '1d', label: '1 dia' },
  { value: '3d', label: '3 dias' },
];

type Props = Partial<Parameters<typeof ChipRadioGroup>[0]>;

function Controlled({ onValueChange, ...props }: Props) {
  const [value, setValue] = useState('1d');
  return (
    <ChipRadioGroup
      label="Prazo"
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

const chip = (name: string) => screen.getByRole('radio', { name });
const checked = () =>
  screen.getAllByRole('radio').filter((radio) => radio.getAttribute('aria-checked') === 'true');

describe('ChipRadioGroup', () => {
  it('é um grupo nomeado pelo rótulo, com uma opção marcada', () => {
    render(<Controlled />);

    expect(screen.getByRole('radiogroup', { name: 'Prazo' })).toBeInTheDocument();
    expect(checked()).toEqual([chip('1 dia')]);
  });

  it('setas movem e marcam', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Controlled onValueChange={onValueChange} />);

    await user.tab();
    expect(chip('1 dia')).toHaveFocus();

    // A tecla fica pressionada: o Radix só marca se o foco chegar durante a tecla.
    await user.keyboard('{ArrowRight>}');
    await waitFor(() => expect(chip('3 dias')).toHaveAttribute('aria-checked', 'true'));
    await user.keyboard('{/ArrowRight}');

    expect(chip('3 dias')).toHaveFocus();
    expect(checked()).toEqual([chip('3 dias')]);
    expect(onValueChange).toHaveBeenLastCalledWith('3d');
  });

  it('desativado não muda', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Controlled disabled onValueChange={onValueChange} />);

    await user.click(chip('3 dias'));

    expect(chip('3 dias')).toBeDisabled();
    expect(checked()).toEqual([chip('1 dia')]);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('o ref foca a opção marcada e o onBlur só avisa quando o foco sai do grupo', async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLDivElement>();
    const onBlur = vi.fn();
    render(
      <>
        <Controlled ref={ref} onBlur={onBlur} />
        <button type="button">Depois</button>
      </>,
    );

    ref.current?.focus();
    await waitFor(() => expect(chip('1 dia')).toHaveFocus());

    await user.keyboard('{ArrowRight>}');
    await waitFor(() => expect(chip('3 dias')).toHaveFocus());
    await user.keyboard('{/ArrowRight}');
    expect(onBlur).not.toHaveBeenCalled();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Depois' })).toHaveFocus();
    expect(onBlur).toHaveBeenCalledOnce();
  });
});
