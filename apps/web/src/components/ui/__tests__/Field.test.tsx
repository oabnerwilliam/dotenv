import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { Field } from '../Field';

describe('Field', () => {
  it('o rótulo nomeia o controle e a dica o descreve', () => {
    render(<Field label="Ticket" hint="Ex.: AC-1234" />);

    const input = screen.getByRole('textbox', { name: 'Ticket' });
    expect(input).toHaveAccessibleDescription('Ex.: AC-1234');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('sem dica nem erro não aponta para descrição nenhuma', () => {
    render(<Field label="Nome" />);

    expect(screen.getByRole('textbox', { name: 'Nome' })).not.toHaveAttribute('aria-describedby');
  });

  it('erro marca o campo', () => {
    render(<Field label="Ticket" error="Ticket inválido" />);

    const input = screen.getByRole('textbox', { name: 'Ticket' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Ticket inválido');
  });

  it('com dica e erro, os dois descrevem o campo', () => {
    render(<Field label="Ticket" hint="Ex.: AC-1234" error="Ticket inválido" />);

    expect(screen.getByRole('textbox', { name: 'Ticket' })).toHaveAccessibleDescription(
      'Ex.: AC-1234 Ticket inválido',
    );
  });

  it('dois campos com o mesmo rótulo não dividem ids', () => {
    render(
      <>
        <Field label="Nome" hint="Primeiro" />
        <Field label="Nome" hint="Segundo" />
      </>,
    );

    const [first, second] = screen.getAllByRole('textbox', { name: 'Nome' });
    expect(first).toHaveAccessibleDescription('Primeiro');
    expect(second).toHaveAccessibleDescription('Segundo');
  });

  it('multiline vira textarea e o ref chega ao controle', () => {
    const textareaRef = createRef<HTMLTextAreaElement>();
    const inputRef = createRef<HTMLInputElement>();
    render(
      <>
        <Field multiline label="Nota" ref={textareaRef} />
        <Field label="Ticket" ref={inputRef} />
      </>,
    );

    const textarea = screen.getByRole('textbox', { name: 'Nota' });
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textareaRef.current).toBe(textarea);
    expect(inputRef.current).toBe(screen.getByRole('textbox', { name: 'Ticket' }));
  });

  it('desativado não aceita digitação', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Field label="Ticket" disabled />
        <Field multiline label="Nota" disabled />
      </>,
    );

    for (const control of screen.getAllByRole('textbox')) {
      await user.type(control, 'abc');
      expect(control).toBeDisabled();
      expect(control).toHaveValue('');
    }
  });
});
