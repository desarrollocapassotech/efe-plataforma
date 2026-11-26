import { AppException } from '../errors/app.exception';
import { armarPagina, codificarCursor, decodificarCursor, despuesDe } from './cursor';

const pos = (fecha: string, creadoEn: string, id: string) => ({
  fecha: new Date(fecha),
  creadoEn: new Date(creadoEn),
  id,
});

describe('cursor de paginación', () => {
  it('codifica y decodifica la posición', () => {
    const p = pos('2026-11-26T00:00:00Z', '2026-11-26T15:30:00.123Z', 'cmabc');
    expect(decodificarCursor(codificarCursor(p))).toEqual(p);
  });

  it('cursor inválido → 400 CURSOR_INVALIDO', () => {
    for (const malo of ['basura', Buffer.from('[1,2]').toString('base64url'), '']) {
      expect(() => decodificarCursor(malo)).toThrow(AppException);
    }
  });

  it('despuesDe arma el keyset fecha desc, creadoEn desc, id desc', () => {
    const p = pos('2026-11-26T00:00:00Z', '2026-11-26T15:00:00Z', 'x');
    expect(despuesDe(p)).toEqual({
      OR: [
        { fecha: { lt: p.fecha } },
        { fecha: p.fecha, creadoEn: { lt: p.creadoEn } },
        { fecha: p.fecha, creadoEn: p.creadoEn, id: { lt: 'x' } },
      ],
    });
  });

  it('armarPagina corta en limit y da cursor solo si hay más', () => {
    const filas = [1, 2, 3].map((n) =>
      pos(`2026-11-0${n}T00:00:00Z`, '2026-11-01T00:00:00Z', `id${n}`),
    );
    const conMas = armarPagina(filas, 2, (f) => f.id);
    expect(conMas.items).toEqual(['id1', 'id2']);
    expect(decodificarCursor(conMas.nextCursor!).id).toBe('id2');
    expect(armarPagina(filas, 3, (f) => f.id).nextCursor).toBeNull();
  });
});
