import { defineConfig } from 'tsup';

// ESM para los front (Vite) y CJS para la API (Nest compila a CommonJS y Jest no
// carga ESM sin configuración extra). Un entry por subpath exportado.
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'dinero/index': 'src/dinero/index.ts',
    'fechas/index': 'src/fechas/index.ts',
    'features/index': 'src/features/index.ts',
    'schemas/index': 'src/schemas/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  splitting: true,
  treeshake: true,
});
