# Fuentes de indicadores (propuesta para el paso 5.1)

Esta es una **propuesta para que Elías confirme**. La ingesta no está implementada: el plan pide confirmar las fuentes antes.

**Hay que saber cómo se investigó.** La red de la sesión remota bloqueaba `dolarapi.com`, `argentinadatos.com`, `api.argentinadatos.com`, `datos.gob.ar`, `apis.datos.gob.ar` y `datosgobar.github.io`. Por eso no se pudo hacer ningún request de prueba ni leer la documentación en vivo. Lo de abajo sale de los repositorios de GitHub de los proyectos (legibles), de búsquedas web y de la documentación espejada en readthedocs. Cada dato dice si está **verificado** (leído en una fuente primaria) o si es **a verificar** (sale de un buscador o de un espejo). Antes de implementar, conviene correr los `curl` de la última sección desde la máquina local.

---

## 1. Dólar: oficial, MEP y CCL → DolarApi (propuesta)

| Tema | Dato | Estado |
|---|---|---|
| Base URL | `https://dolarapi.com/v1/` (Argentina). Otros países: `https://{region}.dolarapi.com/v1/` | Verificado (repo `docs/index.md`) |
| Contrato | OpenAPI en `https://dolarapi.com/openapi.json` (es la fuente de verdad de rutas y schemas) | Verificado (repo) |
| Endpoints | `GET /v1/dolares` (todas) y `GET /v1/dolares/{casa}` con `oficial`, `bolsa` (MEP), `contadoconliqui` (CCL), `blue`, `tarjeta`, `mayorista`, `cripto`. También hay variantes por medio, como `/v1/ambito/dolares/{casa}` | A verificar (buscador + docs de Ámbito) |
| Respuesta | Objeto (o lista) con `moneda`, `casa`, `nombre`, `compra`, `venta`, `fechaActualizacion` (ISO 8601 con zona) | A verificar: en la doc de Ámbito aparecen `casa`, `nombre`, `moneda`, `venta` y `fechaActualizacion`, pero `compra` no apareció en el fragmento |
| Histórico | DolarApi no tiene histórico documentado en el repo. El histórico por casa lo da ArgentinaDatos (mismo autor; ver §2) | Verificado que el repo no lo menciona. El reemplazo está a verificar |
| Autenticación | Ninguna mencionada | Verificado que no se menciona |
| Límites | "No hay un máximo numérico de consultas. Conviene conservar una copia local y no repetir la misma consulta en un bucle. Una consulta cada 3 horas y por serie es una medida adecuada." | Verificado (repo `docs/uso.md`, actualizado al 15/10/2026) |
| Disponibilidad | Puede "modificar, suspender o interrumpir" el servicio "sin previo aviso", sin garantía. Es "exclusivamente informativo" y no garantiza la exactitud | Verificado (`docs/legal.md`) |
| Licencia | El código es MIT. Los datos se rigen por `docs/uso.md`: se pueden consultar, guardar una copia local y publicar trabajos basados en ellos, **citando "DolarApi https://dolarapi.com"**. Para series de terceros se recomienda citar también la fuente original. No habla explícitamente de uso comercial | Verificado (repo) |
| Origen de los datos | El README dice que consulta DolarHoy (dolarhoy.com) | Verificado (README) |

**Consecuencias para el diseño:**
- **Frecuencia:** el plan decía "cada hora en horario de mercado", pero el pedido explícito de la fuente es como máximo **una consulta cada 3 horas por serie**. Propongo un cron cada 3 horas en días hábiles, de 10 a 18 (Argentina). Con una sola llamada a `/v1/dolares` se traen todas las casas, así que alcanza con un request por corrida. Además, el cache de 5 minutos de `GET /indicadores` evita pegarle a la fuente desde los usuarios.
- **Atribución:** cada tarjeta de la web tiene que mostrar "Fuente: DolarApi (dolarhoy.com)", algo que el producto ya pide (fecha y fuente visibles).
- **Uso comercial:** los términos no lo prohíben ni lo autorizan de forma explícita. **Decisión de Elías/Flor:** aceptar el riesgo citando la fuente, o escribirle al autor (Enzo Notario) para confirmar. Recomiendo escribirle antes del lanzamiento público.
- **Alternativa oficial para el dólar oficial:** la API de Estadísticas Cambiarias del BCRA (catálogo en bcra.gob.ar/BCRAyVos/catalogo-de-APIs-banco-central.asp) publica la cotización oficial. MEP y CCL no son oficiales y el BCRA no los publica. Propuesta: oficial desde el BCRA y MEP/CCL desde DolarApi, o todo desde DolarApi por simplicidad. **A verificar:** endpoints, autenticación y formato de la API del BCRA (no se pudo leer).

## 2. Histórico de dólares e IPC → ArgentinaDatos (propuesta para la carga inicial)

| Tema | Dato | Estado |
|---|---|---|
| Base URL | `https://api.argentinadatos.com/v1/` | A verificar (buscador) |
| IPC mensual | `GET /v1/finanzas/indices/inflacion` → lista de `{ fecha, valor }`. También existe `/v1/finanzas/indices/inflacionInteranual` | A verificar (buscador). Falta confirmar si `valor` viene en porcentaje (2.7) o en fracción, y si `fecha` es el último día del mes |
| Histórico de dólar | `GET /v1/cotizaciones/dolares`, `/v1/cotizaciones/dolares/{casa}` y `/v1/cotizaciones/dolares/{casa}/{fecha}`. Hay una página de doc "get-cotizaciones-dolares" | A verificar: la página existe, pero no se pudo leer |
| Licencia | Código MIT ("Copyright (c) 2023-present Enzo Notario"). Es una "API pública, no oficial". No se encontró una licencia aparte para los datos | Verificado (repo) |
| Límites y estabilidad | No se pudieron leer | A verificar |

**Propuesta de uso:** ArgentinaDatos **solo para el script de histórico inicial** (los últimos 90 días de dólares y 24 meses de IPC, paso 5.1 punto 7), y DolarApi para el día a día. Si ArgentinaDatos resulta estable, también puede ser la fuente diaria del IPC (un request por día alcanza: INDEC publica una vez por mes).

## 3. IPC oficial → API de Series de Tiempo (datos.gob.ar) (propuesta como fuente principal del IPC)

| Tema | Dato | Estado |
|---|---|---|
| Base URL | `https://apis.datos.gob.ar/series/api/series/` | A verificar (doc espejada en readthedocs y buscador) |
| Parámetros | `ids` (separados por coma), `start_date`, `end_date`, `limit`, `last`, `collapse`, `format` (`json`/`csv`), `representation_mode`: `value` (default), `change`, `percent_change` (variación t contra t−1), `percent_change_a_year_ago`. Se puede aplicar por serie: `ids=ID:percent_change` | A verificar (doc espejada) |
| Serie del IPC | `148.3_INIVELNAL_DICI_M_26` (IPC nacional, nivel general, índice base dic-2016 = 100) es el candidato | **No verificado**: ningún resultado confirmó el ID. Buscarlo en el catálogo de datos.gob.ar |
| Variación mensual | `?ids=148.3_INIVELNAL_DICI_M_26:percent_change&last=24&format=json` devolvería la inflación mensual como fracción (0.027 = 2,7 %) | A verificar |
| Respuesta | `{ data: [[fecha, valor], ...], meta: [...], count, params }` | A verificar |
| Licencia | Datos públicos del Estado; probablemente CC-BY 4.0 con atribución a la fuente (INDEC) | **No verificado** |

**Por qué la propongo como fuente principal del IPC:** es la fuente oficial (INDEC, a través del Ministerio de Economía) y la trazabilidad es lo que pide la arquitectura. Si el formato o la latencia complican, ArgentinaDatos queda de respaldo (con la interfaz `ProveedorIndicadores` es cambiar un adaptador).

## 4. Propuesta por indicador

| Código | Fuente principal | Respaldo | Frecuencia del job |
|---|---|---|---|
| `DOLAR_OFICIAL_COMPRA/VENTA` | DolarApi `/v1/dolares/oficial` (o BCRA, a decidir) | ArgentinaDatos | Cada 3 h en días hábiles |
| `DOLAR_MEP_COMPRA/VENTA` | DolarApi `/v1/dolares/bolsa` | ArgentinaDatos | Cada 3 h en días hábiles |
| `DOLAR_CCL_COMPRA/VENTA` | DolarApi `/v1/dolares/contadoconliqui` | ArgentinaDatos | Cada 3 h en días hábiles |
| `IPC_MENSUAL` | Series de Tiempo (INDEC) | ArgentinaDatos | Una vez por día |
| Histórico inicial | ArgentinaDatos (dólares 90 días) + Series de Tiempo (IPC 24 meses) | — | Una sola vez (script) |

Detalles para el adaptador:
- `fecha` del dólar: el día (en Argentina) de `fechaActualizacion`, con `@efe/shared/fechas`. Se guarda un valor por día y código: el upsert por `(codigo, fecha)` deja el último del día.
- `fecha` del IPC: el primer día del mes del dato (la convención de Series de Tiempo). Hay que definirla y documentarla en ARCHITECTURE §7.
- Validar cada respuesta externa con zod. Si el formato cambia, el adaptador falla de forma explícita y se mantiene el último valor.
- Fuente guardada: `"DolarApi (dolarhoy.com)"`, `"INDEC vía datos.gob.ar"`, `"ArgentinaDatos"`, con `urlFuente`.

## 5. Para confirmar (Elías y Flor)

1. ¿DolarApi para MEP y CCL, aceptando que no hay una autorización comercial explícita? ¿O le escribimos al autor antes?
2. ¿Dólar oficial desde el BCRA (oficial, más trabajo) o desde DolarApi (una sola fuente)?
3. ¿IPC desde Series de Tiempo (oficial) con ArgentinaDatos de respaldo?
4. ¿Frecuencia de cada 3 horas, en lugar de cada hora, respetando lo que pide DolarApi?

## 6. Requests para verificar desde la máquina local

```bash
curl -s https://dolarapi.com/v1/dolares | head -c 800
curl -s https://dolarapi.com/v1/dolares/bolsa
curl -s https://dolarapi.com/openapi.json | head -c 2000
curl -s https://api.argentinadatos.com/v1/finanzas/indices/inflacion | tail -c 300
curl -s https://api.argentinadatos.com/v1/cotizaciones/dolares/bolsa | tail -c 300
curl -s "https://apis.datos.gob.ar/series/api/series/?ids=148.3_INIVELNAL_DICI_M_26:percent_change&last=3&format=json"
```

## Fuentes consultadas

- Repo de DolarApi: https://github.com/enzonotario/esjs-dolar-api (README, LICENSE, `docs/index.md`, `docs/uso.md`, `docs/legal.md`)
- Repo de ArgentinaDatos: https://github.com/enzonotario/esjs-argentina-datos-api (README, LICENSE)
- Doc de DolarApi (rutas de Ámbito, vista en el buscador): https://dolarapi.com/docs/argentina/ambito
- Doc de ArgentinaDatos (vista en el buscador): https://argentinadatos.com/docs/operations/get-finanzas-indices-uva.html, https://argentinadatos.com/docs/operations/get-cotizaciones-dolares.html
- API de Series de Tiempo (doc espejada): https://series-tiempo-ar-api-english.readthedocs.io/en/latest/reference/api_reference/ y https://series-tiempo-ar-api-english.readthedocs.io/en/latest/additional_parameters/
- Catálogo de APIs del BCRA: https://www.bcra.gob.ar/BCRAyVos/catalogo-de-APIs-banco-central.asp
