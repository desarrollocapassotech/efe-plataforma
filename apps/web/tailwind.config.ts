import preset from '@efe/config/tailwind';
import type { Config } from 'tailwindcss';

export default {
  presets: [preset],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
} satisfies Config;
