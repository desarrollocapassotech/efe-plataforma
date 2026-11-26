import react from '@efe/config/eslint/react';
import { defineConfig } from 'eslint/config';

export default defineConfig(react, {
  files: ['**/*.{ts,tsx}'],
  // Reglas relajadas para el código heredado del admin (se endurecen al migrarlo a la API, Fase 11).
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/consistent-type-imports': 'off',
    'no-console': 'off',
    // Patrón de shadcn/ui (interfaces que solo extienden props de HTML).
    '@typescript-eslint/no-empty-object-type': 'off',
    // Reglas del React Compiler (react-hooks 7) que el código heredado no cumple. Quedan como
    // aviso para no tocar lógica que hoy funciona (facturación, alta de clientes); se corrigen
    // al reescribir esas pantallas contra la API en la Fase 11.
    'react-hooks/set-state-in-effect': 'warn',
    'react-hooks/immutability': 'warn',
    'react-hooks/static-components': 'warn',
    'react-hooks/purity': 'warn',
  },
});
