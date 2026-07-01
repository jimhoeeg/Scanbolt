import type { Config } from 'tailwindcss';

/**
 * Rugged industrial palette: steel greys, a hi-vis "safety amber" accent for
 * primary dealer actions, and generous data-density defaults.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        steel: {
          50: '#f5f6f7',
          100: '#e2e5e9',
          200: '#c5cbd3',
          300: '#9aa4b1',
          400: '#6b7684',
          500: '#4a5563',
          600: '#374151',
          700: '#28303b',
          800: '#1b2129',
          900: '#11161c',
        },
        safety: {
          400: '#ffc233',
          500: '#f5a300', // primary accent (hi-vis amber)
          600: '#c98400',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
