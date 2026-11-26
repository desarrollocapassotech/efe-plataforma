import preset from '@efe/config/tailwind';
import type { Config } from 'tailwindcss';

export default {
  presets: [preset],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '2rem', screens: { '2xl': '1400px' } },
    extend: {
      // El admin es cuadrado: todos los rounded-* (incluidos xl, 2xl y 3xl) usan --radius (2px).
      borderRadius: {
        DEFAULT: 'var(--radius)',
        '3xl': 'var(--radius)',
        '2xl': 'var(--radius)',
        xl: 'var(--radius)',
      },
    },
  },
} satisfies Config;
