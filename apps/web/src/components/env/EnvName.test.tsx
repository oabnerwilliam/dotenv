import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EnvName } from './EnvName';

describe('EnvName', () => {
  it('mantém a caixa original', () => {
    render(<EnvName name="Vega" size="md" />);

    // O texto no DOM é o nome como veio; as minúsculas são só estilo.
    expect(screen.getByText('Vega')).toHaveClass('lowercase');
  });

  it.each([
    ['lg', '$'],
    ['md', '>'],
    ['sm', '>'],
  ] as const)('prompt por tamanho: %s mostra %s', (size, prompt) => {
    render(<EnvName name="Lyra" size={size} />);

    expect(screen.getByText(prompt)).toHaveAttribute('aria-hidden', 'true');
  });

  it('inline não mostra prompt', () => {
    const { container } = render(<EnvName name="Lyra" size="inline" />);

    expect(container.textContent).toBe('Lyra');
    expect(container.querySelector('[aria-hidden]')).toBeNull();
  });

  it.each(['lg', 'md', 'sm', 'inline'] as const)('com status expõe data-status (%s)', (size) => {
    const { container } = render(<EnvName name="Lyra" size={size} status="reservado" />);

    expect(container.firstElementChild).toHaveAttribute('data-status', 'reservado');
  });

  it('inline com status mostra um ponto decorativo', () => {
    const { container } = render(<EnvName name="Lyra" size="inline" status="livre" />);

    expect(container.querySelector('[aria-hidden="true"]')).toBeEmptyDOMElement();
  });

  it('usa só span, para caber em títulos e links', () => {
    const { container } = render(<EnvName name="Lyra" size="lg" status="uso" />);

    const tags = [...container.querySelectorAll('*')].map((element) => element.tagName);
    expect(new Set(tags)).toEqual(new Set(['SPAN']));
  });
});
