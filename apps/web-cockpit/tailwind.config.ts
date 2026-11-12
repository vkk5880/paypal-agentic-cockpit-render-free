import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
          900: '#164e63',
        },
        emerald: {
          400: '#34d399',
          500: '#10b981',
        },
        brand: {
          paypal: '#0070ba',
          card: '#0d1527',
          border: '#1f293d',
        },
        pp: {
          navy: 'var(--pp-navy)',
          blue: {
            DEFAULT: 'var(--pp-blue)',
            dark: 'var(--pp-blue-dark)',
          },
          sky: 'var(--pp-sky)',
          highlight: 'var(--pp-highlight)',
          canvas: 'var(--pp-canvas)',
          surface: 'var(--pp-surface)',
          border: 'var(--pp-border)',
          gridline: 'var(--pp-gridline)',
          ink: 'var(--pp-ink)',
          muted: 'var(--pp-muted)',
          success: 'var(--pp-success)',
          warning: 'var(--pp-warning)',
          danger: 'var(--pp-danger)',
        }
      },
      fontFamily: {
        paypal: ['var(--pp-font)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
