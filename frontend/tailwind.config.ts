import type { Config } from 'tailwindcss';

/**
 * Scanbolt brand theme — afledt af det rigtige site.
 *  - brand.red   : logoets "Bolt", UNDERVOGN-label, nyhedsbrev-knap (mursten-rød)
 *  - brand.green : aktiv navigation, kurv, "FIND PRODUKTER" (græsgrøn)
 *  - brand.dark  : footer / mørke sektioner (næsten sort)
 * Skrift: Roboto (brødtekst) + Roboto Condensed (nav/overskrifter i versaler).
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#b0261c',
          'red-dark': '#8e1e16',
          green: '#6cb33f',
          'green-dark': '#579a2e',
          dark: '#141414',
          darker: '#0d0d0d',
          bar: '#f2f2f2',
        },
      },
      fontFamily: {
        sans: ['Roboto', 'system-ui', 'Arial', 'sans-serif'],
        display: ['"Roboto Condensed"', 'Roboto', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
