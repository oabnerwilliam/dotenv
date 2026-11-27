import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it.each(['Marina Teste Lima', '  Marina   Teste  Lima  '])(
    'usa a primeira letra do primeiro e do último nome de "%s"',
    (name) => {
      const { container } = render(<Avatar name={name} />);

      expect(container.textContent).toBe('ML');
    },
  );

  it('com nome único usa a primeira letra', () => {
    const { container } = render(<Avatar name="marina" />);

    // A letra fica como veio; a maiúscula é só a classe.
    expect(container.textContent).toBe('m');
    expect(container.firstElementChild).toHaveClass('uppercase');
  });

  it('é decorativo', () => {
    const { container } = render(<Avatar name="Marina Lima" />);

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.firstElementChild).not.toHaveAttribute('data-status');
  });

  it('status e imagem', () => {
    const { container } = render(
      <Avatar name="Marina Lima" status="uso" src="https://exemplo.test/m.png" />,
    );

    expect(container.firstElementChild).toHaveAttribute('data-status', 'uso');
    const image = container.querySelector('img');
    expect(image).toHaveAttribute('src', 'https://exemplo.test/m.png');
    expect(image).toHaveAttribute('alt', '');
    expect(image).toHaveAttribute('referrerpolicy', 'no-referrer');
    expect(screen.queryByText('ML')).not.toBeInTheDocument();

    fireEvent.error(image!);

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('ML')).toBeInTheDocument();
  });

  it('tenta de novo quando a imagem muda', () => {
    const { container, rerender } = render(
      <Avatar name="Marina Lima" src="https://exemplo.test/quebrada.png" />,
    );
    fireEvent.error(container.querySelector('img')!);

    rerender(<Avatar name="Marina Lima" src="https://exemplo.test/nova.png" />);

    expect(container.querySelector('img')).toHaveAttribute('src', 'https://exemplo.test/nova.png');
  });
});
