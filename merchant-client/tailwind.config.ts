import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dark Mode Theme
        background: '#000000', // Black background
        foreground: '#ffffff', // White text
        primary: '#ffffff', // White primary
        secondary: '#86868b', // Gray for secondary text
        accent: '#0a84ff', // Bright blue for accents
        success: '#34c759', // Green
        warning: '#ff9f0a', // Orange
        error: '#ff3b30', // Red
        card: '#1c1c1e', // Dark gray for cards
        'card-hover': '#2c2c2e', // Slightly lighter on hover
        border: '#38383a', // Dark border
        input: '#1c1c1e', // Dark input background
        'input-border': '#38383a', // Dark input border
      },
      fontFamily: {
        // Modern sans-serif stack
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        // Apple typography scale
        'xs': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.01em' }],
        'base': ['1rem', { lineHeight: '1.5rem', letterSpacing: '0.01em' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '0.01em' }],
        'xl': ['1.25rem', { lineHeight: '1.875rem', letterSpacing: '0.01em' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '0.005em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '0.005em' }],
        '4xl': ['2.25rem', { lineHeight: '2.75rem', letterSpacing: '0em' }],
        '5xl': ['3rem', { lineHeight: '3.5rem', letterSpacing: '-0.01em' }],
        '6xl': ['3.75rem', { lineHeight: '4.25rem', letterSpacing: '-0.01em' }],
      },
      borderRadius: {
        'apple': '0.875rem',
        'apple-sm': '0.625rem',
        'apple-lg': '1.125rem',
        'pill': '9999px', // Full pill shape for buttons
        'card': '1rem', // Card border radius
      },
      boxShadow: {
        'apple': '0 2px 16px rgba(0, 0, 0, 0.3)',
        'apple-lg': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'apple-xl': '0 8px 40px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
export default config
