import { render, screen } from '@testing-library/react';
import { X } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { IconButton } from '../IconButton';

describe('IconButton', () => {
  it('o nome acessível é o label', () => {
    render(
      <IconButton label="Fechar">
        <X aria-hidden="true" />
      </IconButton>,
    );

    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveAttribute('type', 'button');
  });
});
