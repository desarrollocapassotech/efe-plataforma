import { describe, expect, it } from 'vitest';
import { totalDesdeCuota, vistaPrevia } from './vista-previa';

describe('vista previa de cuotas', () => {
  const visa = { diaCierre: 25, diaVencimiento: 5 };

  it('primer resumen con fechas y último período', () => {
    const v = vistaPrevia({ fecha: '2026-11-26', montoTotal: '100', cantidadCuotas: 3 }, visa);
    expect(v?.primera).toEqual({
      periodo: '2027-01',
      fechaCierre: '2026-12-25',
      fechaVencimiento: '2027-01-05',
    });
    expect(v?.ultimoPeriodo).toBe('2027-03');
    expect(v?.cuotas.map((c) => c.monto)).toEqual(['33.33', '33.33', '33.34']);
  });

  it('sin monto no hay vista previa', () => {
    expect(
      vistaPrevia({ fecha: '2026-11-26', montoTotal: '', cantidadCuotas: 3 }, visa),
    ).toBeNull();
    expect(
      vistaPrevia({ fecha: '2026-11-26', montoTotal: '0', cantidadCuotas: 3 }, visa),
    ).toBeNull();
  });

  it('total desde el valor de la cuota', () => {
    expect(totalDesdeCuota('15333.33', 6)).toBe('91999.98');
  });
});
