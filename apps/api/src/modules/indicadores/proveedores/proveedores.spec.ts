import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ProveedorInflacionArgentinaDatos } from './argentina-datos';
import { ClienteHttp } from './cliente-http';
import { ProveedorConRespaldo } from './con-respaldo';
import { FUENTE_DOLARAPI, ProveedorDolarApi } from './dolarapi';
import { ProveedorSeriesTiempo } from './series-tiempo';
import { ErrorFuente } from './tipos';

/** Respuestas reales de cada fuente, guardadas (con fechas en 2099 para los e2e). */
const fixture = (nombre: string): unknown =>
  JSON.parse(
    readFileSync(resolve(__dirname, '../../../../test/fixtures/indicadores', nombre), 'utf8'),
  );

const respuesta = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('proveedores de indicadores', () => {
  const http = new ClienteHttp();
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });
  afterEach(() => fetchMock.mockRestore());

  describe('DolarApi', () => {
    it('mapea oficial, MEP y CCL; ignora otras casas y nulls; fecha en Argentina', async () => {
      fetchMock.mockResolvedValue(respuesta(fixture('dolarapi.json')));
      const valores = await new ProveedorDolarApi(http).obtener();
      expect(valores.map((v) => [v.codigo, v.fecha, v.valor])).toEqual([
        ['DOLAR_OFICIAL_COMPRA', '2099-03-10', '1000'],
        ['DOLAR_OFICIAL_VENTA', '2099-03-10', '1050'],
        ['DOLAR_MEP_COMPRA', '2099-03-10', '1150.5'],
        ['DOLAR_MEP_VENTA', '2099-03-10', '1180.5'],
        // 02:30 UTC del 11 = 23:30 del 10 en Argentina.
        ['DOLAR_CCL_COMPRA', '2099-03-10', '1170'],
        ['DOLAR_CCL_VENTA', '2099-03-10', '1207.5'],
      ]);
      expect(valores[0]).toMatchObject({
        fuente: FUENTE_DOLARAPI,
        urlFuente: 'https://dolarapi.com/v1/dolares/oficial',
      });
    });

    it('si cambia el formato falla de forma explícita', async () => {
      fetchMock.mockResolvedValue(respuesta([{ casa: 'oficial', precio: 1000 }]));
      await expect(new ProveedorDolarApi(http).obtener()).rejects.toThrow(
        /DolarApi: cambió el formato/,
      );
    });

    it('si no viene el oficial, falla', async () => {
      fetchMock.mockResolvedValue(
        respuesta([
          { casa: 'blue', compra: 1, venta: 2, fechaActualizacion: '2099-03-10T18:00:00.000Z' },
        ]),
      );
      await expect(new ProveedorDolarApi(http).obtener()).rejects.toThrow(/dólar oficial/);
    });
  });

  describe('Series de Tiempo (IPC)', () => {
    it('pasa la variación de fracción a % y la fecha al primer día del mes; saltea nulls', async () => {
      fetchMock.mockResolvedValue(respuesta(fixture('series-ipc.json')));
      const valores = await new ProveedorSeriesTiempo(http).obtener();
      expect(valores.map((v) => [v.fecha, v.valor])).toEqual([
        ['2099-01-01', '2.2'],
        ['2099-02-01', '2.4'],
        ['2099-03-01', '3.7'],
      ]);
      expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
        'ids=148.3_INIVELNAL_DICI_M_26:percent_change',
      );
    });
  });

  describe('ArgentinaDatos (IPC de respaldo)', () => {
    it('ya viene en %; normaliza la fecha y filtra por meses', async () => {
      fetchMock.mockResolvedValue(respuesta(fixture('argentinadatos-inflacion.json')));
      const valores = await new ProveedorInflacionArgentinaDatos(
        http,
        () => '2099-04-15',
        13,
      ).obtener();
      expect(valores.map((v) => [v.fecha, v.valor])).toEqual([
        ['2099-01-01', '2.2'],
        ['2099-02-01', '2.4'],
        ['2099-03-01', '3.7'],
      ]);
    });
  });

  describe('fuente caída', () => {
    it('HTTP de error, sin conexión y JSON inválido dan ErrorFuente', async () => {
      const p = new ProveedorDolarApi(http);
      fetchMock.mockResolvedValueOnce(respuesta({ error: 'x' }, 503));
      await expect(p.obtener()).rejects.toThrow('DolarApi: respondió HTTP 503');
      fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
      await expect(p.obtener()).rejects.toThrow(/no se pudo conectar/);
      fetchMock.mockResolvedValueOnce(new Response('<html>', { status: 200 }));
      await expect(p.obtener()).rejects.toBeInstanceOf(ErrorFuente);
    });

    it('timeout: si la fuente no responde, corta', async () => {
      const timeout = new Error('timeout');
      timeout.name = 'TimeoutError';
      fetchMock.mockRejectedValueOnce(timeout);
      await expect(new ProveedorDolarApi(http).obtener()).rejects.toThrow(/no respondió/);
    });

    it('con respaldo: si la principal falla usa la otra; si fallan las dos, falla con ambos motivos', async () => {
      const alFallar = jest.fn();
      const ipc = new ProveedorConRespaldo(
        new ProveedorSeriesTiempo(http),
        new ProveedorInflacionArgentinaDatos(http, () => '2099-04-15'),
        alFallar,
      );
      fetchMock
        .mockResolvedValueOnce(respuesta({}, 500))
        .mockResolvedValueOnce(respuesta(fixture('argentinadatos-inflacion.json')));
      const valores = await ipc.obtener();
      expect(valores).toHaveLength(3);
      expect(valores[0]!.fuente).toBe('ArgentinaDatos');
      expect(alFallar).toHaveBeenCalledTimes(1);

      fetchMock.mockResolvedValueOnce(respuesta({}, 500)).mockResolvedValueOnce(respuesta({}, 502));
      await expect(ipc.obtener()).rejects.toThrow(/HTTP 500 .*\| .*HTTP 502/);
    });
  });
});
