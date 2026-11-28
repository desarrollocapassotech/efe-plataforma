import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Markdown } from './Markdown';

describe('Markdown', () => {
  it('renderiza títulos, párrafos, listas, citas y negrita', () => {
    render(
      <Markdown
        texto={'# Título\n\n> **Borrador**\n\n## Sección\n\nUn **párrafo**.\n\n- uno\n- dos'}
      />,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Título' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Sección' })).toBeInTheDocument();
    expect(screen.getByText('párrafo').tagName).toBe('STRONG');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Borrador').closest('blockquote')).not.toBeNull();
  });
});
