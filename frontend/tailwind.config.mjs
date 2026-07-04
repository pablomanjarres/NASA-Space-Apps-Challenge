/** @type {import('tailwindcss').Config} */

// ============================================================================
// GRIT-X-AWA — unified cosmic design system
// Deep-space observatory / mission-control. One palette:
//   void (base navy)  ·  nebula (indigo/violet mid-tones)
//   stellar (refined cyan accent)  ·  signal (warm amber, CTAs only)
// Semantic surface/text tokens are CSS-var-backed (see src/styles/global.css)
// so they flip with the .dark theme class. Fixed hues live here as scales.
// ============================================================================

export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ---- unified cosmic palette (fixed hues) ----
        void: {
          DEFAULT: '#070b16',
          950: '#04060d',
          900: '#070b16',
          800: '#0b1122',
          700: '#111a30',
          600: '#1a2440',
          500: '#243156',
        },
        nebula: {
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c5cf0',
          700: '#5b4bd6',
          800: '#4634a8',
          900: '#2e2170',
          DEFAULT: '#8b5cf6',
        },
        stellar: {
          200: '#a5f0fb',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          DEFAULT: '#22d3ee',
        },
        signal: {
          300: '#ffd28a',
          400: '#f7b23f',
          500: '#f5a524',
          600: '#d98a1a',
          700: '#b06d12',
          DEFAULT: '#f5a524',
        },

        // ---- semantic aliases (CSS-var-backed, theme-aware) ----
        surface: {
          DEFAULT: 'var(--surface)',
          raised: 'var(--surface-raised)',
          sunken: 'var(--surface-sunken)',
        },
        hairline: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
        },
        ink: {
          DEFAULT: 'var(--text-primary)',
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },

        // ---- legacy scales kept so existing markup does not lose its classes.
        // Prefer void/nebula/stellar/signal for all NEW work. ----
        space: {
          50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc',
          400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1',
          800: '#075985', 900: '#0c4a6e', 950: '#082f49',
        },
        cosmic: {
          50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe',
          400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7c3aed',
          800: '#6b21a8', 900: '#581c87', 950: '#3b0764',
        },
      },

      fontFamily: {
        // 3 roles: display (headlines), sans (body/UI), mono (telemetry/data)
        display: ['Chakra Petch', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'Monaco', 'ui-monospace', 'monospace'],
      },

      fontSize: {
        // additive display scale (fluid); base body scale is Tailwind's default
        'eyebrow': ['0.75rem', { lineHeight: '1', letterSpacing: '0.2em' }],
        'display-lg': ['clamp(1.5rem, 2.5vw, 2rem)', { lineHeight: '1.1', letterSpacing: '-0.01em' }],
        'display-xl': ['clamp(2rem, 4vw, 3rem)', { lineHeight: '1.05', letterSpacing: '-0.015em' }],
        'display-2xl': ['clamp(2.75rem, 6vw, 4.5rem)', { lineHeight: '1.02', letterSpacing: '-0.02em' }],
      },

      borderRadius: {
        // semantic radius scale (additive; Tailwind defaults kept)
        control: '10px',
        card: '16px',
        panel: '20px',
        pill: '999px',
      },

      boxShadow: {
        // THE soft shadow for panels/cards (one shadow, not gradient-on-everything)
        panel: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 18px 40px -24px rgba(2,4,10,0.9)',
        elevated: '0 24px 60px -28px rgba(2,4,10,0.95)',
        // accent glows — use sparingly, on focus/active only
        'glow-stellar': '0 0 0 1px rgba(34,211,238,0.25), 0 0 28px -6px rgba(34,211,238,0.45)',
        'glow-signal': '0 0 0 1px rgba(245,165,36,0.30), 0 0 30px -6px rgba(245,165,36,0.50)',
      },

      backgroundImage: {
        'nebula-veil':
          'radial-gradient(1100px 640px at 50% -8%, rgba(124,92,240,0.14), transparent 60%), radial-gradient(820px 560px at 92% 4%, rgba(34,211,238,0.08), transparent 55%)',
        'hud-grid':
          'linear-gradient(rgba(148,170,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,170,255,0.05) 1px, transparent 1px)',
      },

      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(34, 211, 238, 0.4)' },
          '100%': { boxShadow: '0 0 22px rgba(34, 211, 238, 0.75)' },
        },
      },
    },
  },
  plugins: [],
}
