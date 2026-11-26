// Preset de Tailwind compartido por apps/web y apps/admin.
// Los tokens de EFE (colores HSL, fuentes, radius) se completan en el paso 1.6 del plan.
// Uso en tailwind.config.ts:
//   import preset from '@efe/config/tailwind';
//   export default { presets: [preset], content: [...] };

/** @type {Partial<import('tailwindcss').Config>} */
const preset = {
  theme: {
    extend: {},
  },
  plugins: [],
};

export default preset;
