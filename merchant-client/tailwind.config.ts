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
        // Black primary with modern accents
        background: '#000000', // Pure black
        foreground: '#ffffff',
        primary: '#000000', // Black primary
        secondary: '#8b8b8b', // Muted gray
        accent: '#4285f4', // Bright blue for links/actions
        success: '#30d158',
        warning: '#ff9f0a',
        error: '#ff3b30',
        card: '#1a1a1a', // Dark gray for cards
        'card-hover': '#2a2a2a', // Slightly lighter on hover
        border: '#2a2a2a', // Subtle border color
        input: '#1a1a1a', // Input background
        'input-border': '#333333',
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
        'apple': '0 2px 16px rgba(0, 0, 0, 0.08)',
        'apple-lg': '0 4px 24px rgba(0, 0, 0, 0.12)',
        'apple-xl': '0 8px 40px rgba(0, 0, 0, 0.16)',
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
