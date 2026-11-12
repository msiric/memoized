import headlessuiPlugin from '@headlessui/tailwindcss'
import typographyPlugin from '@tailwindcss/typography'
import { type Config } from 'tailwindcss'
import colors from 'tailwindcss/colors'
import plugin from 'tailwindcss/plugin'
import typographyStyles from './typography'

export default {
  content: ['./src/**/*.{js,mjs,jsx,ts,tsx,mdx}'],
  darkMode: 'selector',
  theme: {
    screens: {
      xs: '375px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    fontSize: {
      '2xs': ['0.75rem', { lineHeight: '1.25rem' }],
      xs: ['0.8125rem', { lineHeight: '1.5rem' }],
      sm: ['0.875rem', { lineHeight: '1.5rem' }],
      base: ['1rem', { lineHeight: '1.75rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      '5xl': ['3rem', { lineHeight: '1' }],
      '6xl': ['3.75rem', { lineHeight: '1' }],
      '7xl': ['4.5rem', { lineHeight: '1' }],
      '8xl': ['6rem', { lineHeight: '1' }],
      '9xl': ['8rem', { lineHeight: '1' }],
    },
    typography: typographyStyles,
    extend: {
      colors: {
        // Lesson visualizations (VIZ-H decision 4): the frame surface
        // (zinc-800/40 over the zinc-900 page) as one opaque color, derived
        // from the palette, for fills that must mask what is under them.
        'vz-frame': `color-mix(in srgb, ${colors.zinc[800]} 40%, ${colors.zinc[900]})`,
      },
      brightness: {
        // Lesson visualizations: press feedback (VIZ-H decision 11).
        98: '.98',
      },
      animation: {
        flipVertical: 'flipVertical 0.3s ease-in-out',
        borderFlash: 'borderFlash 3s ease-in-out',
      },
      keyframes: {
        flipVertical: {
          '0%': { transform: 'rotateX(0deg)' },
          '50%': { transform: 'rotateX(90deg)' },
          '100%': { transform: 'rotateX(0deg)' },
        },
        borderFlash: {
          '0%': {
            'box-shadow': '0 0 0 2px rgba(132, 204, 22, 0.8)',
          },
          '100%': {
            'box-shadow': '0 0 0 0 rgba(132, 204, 22, 0)',
          },
        },
      },
      boxShadow: {
        glow: '0 0 4px rgb(0 0 0 / 0.1)',
      },
      maxWidth: {
        lg: '33rem',
        '2xl': '40rem',
        '3xl': '50rem',
        '5xl': '66rem',
        '8xl': '88rem',
      },
      opacity: {
        1: '0.01',
        2.5: '0.025',
        7.5: '0.075',
        15: '0.15',
      },
      scale: {
        '175': '1.75',
        '200': '2',
      },
      spacing: {
        'sidebar-lg': '18rem', // 72px equivalent
        'sidebar-xl': '20rem', // 80px equivalent
      },
    },
  },
  plugins: [
    typographyPlugin,
    headlessuiPlugin,
    // Hover styles only on devices that can hover (VIZ-H decision 11), so a
    // tap never leaves a control stuck in its hover state.
    plugin(({ addVariant }) => {
      addVariant('can-hover', '@media (hover: hover) { &:hover }')
      addVariant('group-can-hover', '@media (hover: hover) { :merge(.group):hover & }')
      // The visualization dock lays its checkpoint out by its own width, in
      // rem (VIZ-H D19): beside the choices from 37rem (592 px at the default
      // size, the dock at a 768 px viewport), stacked below it or under
      // large text. The dock is the size container (\`vz-dock\`).
      addVariant('dock-wide', '@container vz-dock (min-width: 37rem)')
      addVariant('dock-narrow', '@container vz-dock (max-width: 36.999rem)')
    }),
  ],
} satisfies Config
