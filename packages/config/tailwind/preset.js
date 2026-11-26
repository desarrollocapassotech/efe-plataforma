// Preset de Tailwind compartido por apps/web y apps/admin: tokens de EFE Capital.
// Paleta del logo: negro/blanco, barra dorada degradé (#FADC5C → #9E7C00) y azul marino
// institucional (#22345E → #739EE6). Todos los colores en HSL como variables CSS.
//
// Uso en tailwind.config.ts:
//   import preset from '@efe/config/tailwind';
//   export default { presets: [preset], content: ['./index.html', './src/**/*.{ts,tsx}'] };
//
// Cada app define su propio --radius en su CSS (la web es más redondeada que el admin).
// Nunca usar colores fijos de Tailwind (bg-blue-500, etc.): siempre estos tokens.
import animate from 'tailwindcss-animate';
import plugin from 'tailwindcss/plugin';

const CLARO = {
  '--background': '220 14% 97%',
  '--foreground': '222 30% 10%',
  '--card': '0 0% 100%',
  '--card-foreground': '222 30% 10%',
  '--popover': '0 0% 100%',
  '--popover-foreground': '222 30% 10%',
  // Azul marino institucional
  '--primary': '222 47% 22%',
  '--primary-foreground': '0 0% 100%',
  '--primary-hover': '222 47% 17%',
  '--secondary': '220 16% 94%',
  '--secondary-foreground': '222 47% 22%',
  '--muted': '220 14% 95%',
  '--muted-foreground': '220 9% 42%',
  '--accent': '220 20% 93%',
  '--accent-foreground': '222 47% 22%',
  // Dorado de marca (acento, con moderación)
  '--gold': '46 100% 31%',
  '--gold-light': '49 94% 67%',
  '--gold-foreground': '222 30% 10%',
  '--success': '152 55% 32%',
  '--success-foreground': '0 0% 100%',
  '--warning': '40 90% 42%',
  '--warning-foreground': '0 0% 100%',
  '--destructive': '0 65% 46%',
  '--destructive-foreground': '0 0% 100%',
  '--border': '220 13% 88%',
  '--input': '220 13% 84%',
  '--ring': '222 47% 22%',
  // Sidebar / barras oscuras (azul marino profundo)
  '--sidebar-background': '222 50% 13%',
  '--sidebar-foreground': '220 20% 78%',
  '--sidebar-primary': '46 100% 31%',
  '--sidebar-primary-foreground': '0 0% 100%',
  '--sidebar-accent': '222 40% 19%',
  '--sidebar-accent-foreground': '0 0% 100%',
  '--sidebar-border': '222 35% 22%',
  '--sidebar-ring': '46 100% 31%',
};

const OSCURO = {
  '--background': '222 50% 7%',
  '--foreground': '220 20% 96%',
  '--card': '222 45% 10%',
  '--card-foreground': '220 20% 96%',
  '--popover': '222 45% 10%',
  '--popover-foreground': '220 20% 96%',
  '--primary': '218 60% 68%',
  '--primary-foreground': '222 50% 10%',
  '--primary-hover': '218 60% 62%',
  '--secondary': '222 35% 16%',
  '--secondary-foreground': '220 20% 96%',
  '--muted': '222 35% 16%',
  '--muted-foreground': '220 15% 65%',
  '--accent': '222 35% 18%',
  '--accent-foreground': '220 20% 96%',
  '--gold': '49 94% 60%',
  '--gold-light': '49 94% 72%',
  '--gold-foreground': '222 50% 10%',
  '--destructive': '0 62% 45%',
  '--destructive-foreground': '0 0% 100%',
  '--border': '222 30% 20%',
  '--input': '222 30% 22%',
  '--ring': '49 94% 60%',
  '--sidebar-background': '222 50% 9%',
  '--sidebar-foreground': '220 20% 78%',
  '--sidebar-primary': '49 94% 60%',
  '--sidebar-primary-foreground': '222 50% 10%',
  '--sidebar-accent': '222 40% 15%',
  '--sidebar-accent-foreground': '0 0% 100%',
  '--sidebar-border': '222 35% 18%',
  '--sidebar-ring': '49 94% 60%',
};

const color = (nombre) => `hsl(var(--${nombre}))`;

const tokensEfe = plugin(({ addBase, addComponents, theme }) => {
  addBase({
    ':root': CLARO,
    '.dark': OSCURO,
    '*': { borderColor: color('border') },
    body: {
      backgroundColor: color('background'),
      color: color('foreground'),
      fontFamily: theme('fontFamily.sans'),
      '-webkit-font-smoothing': 'antialiased',
      '-moz-osx-font-smoothing': 'grayscale',
    },
    'h1, h2, h3, h4': { fontFamily: theme('fontFamily.display'), letterSpacing: '-0.025em' },
  });
  addComponents({
    // Barra dorada del logo: acento de marca (línea fina de 2–3px).
    '.brand-bar': {
      backgroundImage: 'linear-gradient(90deg, #FADC5C 0%, #D4B032 50%, #9E7C00 100%)',
    },
    // Rótulo de sección: chico, mayúsculas, espaciado.
    '.eyebrow': {
      fontFamily: theme('fontFamily.display'),
      fontSize: '11px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.14em',
      color: color('muted-foreground'),
    },
  });
});

/** @type {Omit<import('tailwindcss').Config, 'content'>} */
const preset = {
  darkMode: ['class'],
  theme: {
    container: { center: true, padding: '1rem', screens: { '2xl': '1400px' } },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: color('border'),
        input: color('input'),
        ring: color('ring'),
        background: color('background'),
        foreground: color('foreground'),
        primary: {
          DEFAULT: color('primary'),
          foreground: color('primary-foreground'),
          hover: color('primary-hover'),
        },
        secondary: { DEFAULT: color('secondary'), foreground: color('secondary-foreground') },
        destructive: {
          DEFAULT: color('destructive'),
          foreground: color('destructive-foreground'),
        },
        muted: { DEFAULT: color('muted'), foreground: color('muted-foreground') },
        accent: { DEFAULT: color('accent'), foreground: color('accent-foreground') },
        success: { DEFAULT: color('success'), foreground: color('success-foreground') },
        warning: { DEFAULT: color('warning'), foreground: color('warning-foreground') },
        popover: { DEFAULT: color('popover'), foreground: color('popover-foreground') },
        card: { DEFAULT: color('card'), foreground: color('card-foreground') },
        gold: {
          DEFAULT: color('gold'),
          light: color('gold-light'),
          foreground: color('gold-foreground'),
        },
        sidebar: {
          DEFAULT: color('sidebar-background'),
          foreground: color('sidebar-foreground'),
          primary: color('sidebar-primary'),
          'primary-foreground': color('sidebar-primary-foreground'),
          accent: color('sidebar-accent'),
          'accent-foreground': color('sidebar-accent-foreground'),
          border: color('sidebar-border'),
          ring: color('sidebar-ring'),
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [animate, tokensEfe],
};

export default preset;
