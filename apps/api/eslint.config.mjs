import base from '@efe/config/eslint';
import { defineConfig } from 'eslint/config';
import globals from 'globals';

export default defineConfig(base, {
  languageOptions: {
    globals: { ...globals.jest },
  },
  rules: {
    // Con emitDecoratorMetadata, un `import type` de una clase inyectada rompe la DI de Nest.
    '@typescript-eslint/consistent-type-imports': 'off',
    // Nest usa clases vacías para módulos.
    '@typescript-eslint/no-extraneous-class': 'off',
  },
});
