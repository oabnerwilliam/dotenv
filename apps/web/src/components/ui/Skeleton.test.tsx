import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('é ignorado pelo leitor de tela', () => {
    const { container } = render(<Skeleton className="h-7 w-24" />);

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.firstElementChild).toHaveClass('animate-skeleton', 'h-7', 'w-24');
  });
});
