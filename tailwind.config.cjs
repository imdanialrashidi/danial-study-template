/** @type {import('tailwindcss').Config} */

/*
 * Every color maps to a role in src/styles/theme.css (the canonical token
 * source). Components must reference roles, never raw hex. A course override
 * in src/config/course.ts only rewrites --color-primary / --color-accent, so
 * the whole system follows without forking this file.
 */

const withOpacity = (variable) => `rgb(var(${variable}) / <alpha-value>)`;

module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}', './content/**/*.{md,mdx}'],
  theme: {
    screens: {
      xs: '360px',
      sm: '480px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        canvas: withOpacity('--rgb-canvas'),
        surface: {
          DEFAULT: withOpacity('--rgb-surface'),
          sunken: withOpacity('--rgb-surface-sunken'),
        },
        ink: {
          DEFAULT: withOpacity('--rgb-ink'),
          muted: withOpacity('--rgb-ink-muted'),
          faint: withOpacity('--rgb-ink-faint'),
        },
        primary: {
          DEFAULT: withOpacity('--rgb-primary'),
          deep: withOpacity('--rgb-primary-deep'),
          on: withOpacity('--rgb-on-primary'),
          wash: withOpacity('--rgb-primary-wash'),
        },
        accent: {
          DEFAULT: withOpacity('--rgb-accent'),
          deep: withOpacity('--rgb-accent-deep'),
          wash: withOpacity('--rgb-accent-wash'),
        },
        line: {
          DEFAULT: withOpacity('--rgb-border'),
          control: withOpacity('--rgb-border-control'),
        },
        success: {
          DEFAULT: withOpacity('--rgb-success'),
          soft: withOpacity('--rgb-success-soft'),
        },
        warning: {
          DEFAULT: withOpacity('--rgb-warning'),
          soft: withOpacity('--rgb-warning-soft'),
        },
        danger: {
          DEFAULT: withOpacity('--rgb-danger'),
          soft: withOpacity('--rgb-danger-soft'),
        },
      },
      fontFamily: {
        display: ['Estedad Variable', 'Vazirmatn Variable', 'system-ui', 'Tahoma', 'sans-serif'],
        sans: ['Vazirmatn Variable', 'system-ui', 'Tahoma', 'sans-serif'],
        mono: ['ui-monospace', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['var(--text-2xs)', { lineHeight: '1.5' }],
        xs: ['var(--text-xs)', { lineHeight: '1.6' }],
        sm: ['var(--text-sm)', { lineHeight: '1.7' }],
        base: ['var(--text-base)', { lineHeight: '1.8' }],
        body: ['var(--text-body)', { lineHeight: 'var(--leading-body)' }],
        lg: ['var(--text-lg)', { lineHeight: '1.7' }],
        xl: ['var(--text-xl)', { lineHeight: '1.45' }],
        '2xl': ['var(--text-2xl)', { lineHeight: '1.35' }],
        '3xl': ['var(--text-3xl)', { lineHeight: '1.25' }],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        pill: 'var(--radius-pill)',
      },
      maxWidth: {
        measure: 'var(--measure)',
        shell: 'var(--shell-max)',
      },
      boxShadow: {
        plate: 'var(--shadow-plate)',
        float: 'var(--shadow-float)',
      },
      transitionDuration: {
        fast: 'var(--motion-fast)',
        base: 'var(--motion-base)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
      },
      keyframes: {
        'plate-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'sweep': {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'plate-in': 'plate-in var(--motion-base) var(--ease-out) both',
        sweep: 'sweep 900ms var(--ease-out) 1',
      },
    },
  },
  plugins: [],
};