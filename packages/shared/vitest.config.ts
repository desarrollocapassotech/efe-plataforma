import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Los cálculos no deben depender de la zona horaria del proceso: los tests
    // corren en una zona con DST y lejos de UTC para detectarlo.
    env: { TZ: 'America/Sao_Paulo' },
  },
});
