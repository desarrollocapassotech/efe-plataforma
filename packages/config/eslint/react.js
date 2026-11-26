// Configuración flat de ESLint para apps React (web y admin).
// Uso:
//   import react from '@efe/config/eslint/react';
//   export default [...react];
import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import base from './base.js';

export default defineConfig(base, {
  files: ['**/*.{ts,tsx}'],
  languageOptions: {
    globals: { ...globals.browser },
  },
  extends: [reactHooks.configs.flat.recommended],
});
