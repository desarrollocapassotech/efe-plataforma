import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { MoneyInput } from './MoneyInput';

function Prueba({ inicial = '', negativo = false }: { inicial?: string; negativo?: boolean }) {
  const [valor, setValor] = useState(inicial);
  return (
    <>
      <MoneyInput
        aria-describedby="x"
        value={valor}
        onChange={setValor}
        permitirNegativo={negativo}
      />
      <output data-testid="valor">{valor}</output>
    </>
  );
}

describe('MoneyInput', () => {
  it('formatea en es-AR mientras se escribe y devuelve el decimal para la API', async () => {
    const user = userEvent.setup();
    render(<Prueba />);
    const campo = screen.getByRole('textbox');
    await user.type(campo, '1234,5');
    expect(campo).toHaveValue('1.234,5');
    expect(screen.getByTestId('valor')).toHaveTextContent('1234.5');
  });

  it('abre el teclado numérico y muestra el símbolo de la moneda', () => {
    render(<MoneyInput value="" onChange={() => undefined} moneda="USD" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('inputmode', 'decimal');
    expect(screen.getByText('US$')).toBeInTheDocument();
  });

  it('muestra un valor existente formateado y permite negativos si se pide', async () => {
    const user = userEvent.setup();
    render(<Prueba inicial="-1500.50" negativo />);
    const campo = screen.getByRole('textbox');
    expect(campo).toHaveValue('-1.500,50');
    await user.clear(campo);
    await user.type(campo, '-20');
    expect(screen.getByTestId('valor')).toHaveTextContent('-20');
  });
});
