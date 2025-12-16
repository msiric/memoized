/**
 * Design Tokens
 * Centralized design system constants for consistent styling across the application
 */

// =============================================================================
// SPACING SYSTEM
// =============================================================================

export const SPACING = {
  // Section Padding - responsive vertical spacing
  section: {
    vertical: 'py-6 sm:py-8 lg:py-12',
    verticalLarge: 'py-16 md:py-20 lg:py-24',
    // Responsive horizontal padding: mobile (16px) -> sm (24px) -> lg (32px)
    horizontal: 'px-4 sm:px-6 lg:px-8',
  },

  // Grid Gaps - responsive
  gap: {
    tight: 'gap-4 sm:gap-6',
    standard: 'gap-6 sm:gap-8',
    loose: 'gap-8 sm:gap-10 lg:gap-12',
  },

  // Generic Margins
  margin: {
    xs: 'mb-3',
    sm: 'mb-4',
    md: 'mb-6',
    lg: 'mb-8',
    xl: 'mb-12',
    '2xl': 'mb-16',
    '3xl': 'mb-20',
  },

  // Heading margins - consistent spacing after each heading level
  headingMargin: {
    h1: 'mb-4 sm:mb-6', // After hero/page titles
    h2: 'mb-3 sm:mb-4', // After section titles
    h3: 'mb-3 sm:mb-4', // After subsection titles
    h4: 'mb-2 sm:mb-3', // After card/feature titles
    h5: 'mb-1.5', // After small headings
  },

  // Description margins - spacing after description text (before content)
  descriptionMargin: {
    large: 'mb-6 sm:mb-8 lg:mb-10', // After large descriptions (section intros)
    base: 'mb-4 sm:mb-6', // After standard descriptions
  },

  // Content spacing (for inner content blocks)
  content: {
    // Responsive inner padding for cards/containers
    padding: 'p-4 sm:p-6 lg:p-8',
    paddingX: 'px-4 sm:px-6 lg:px-8',
    paddingY: 'py-4 sm:py-6 lg:py-8',
  },
} as const

// =============================================================================
// CONTAINER WIDTHS
// =============================================================================

export const CONTAINER = {
  // Max width containers
  narrow: 'max-w-2xl', // Forms, focused content
  medium: 'max-w-4xl', // Hero sections, FAQs
  wide: 'max-w-7xl', // Main content sections

  // With auto centering
  narrowCentered: 'mx-auto max-w-2xl',
  mediumCentered: 'mx-auto max-w-4xl',
  wideCentered: 'mx-auto max-w-7xl',
} as const

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const TYPOGRAPHY = {
  // Headings - Responsive sizing from mobile to desktop
  heading: {
    // Hero/Page titles: 30px -> 36px -> 48px -> 60px
    h1: 'text-3xl sm:text-4xl md:text-5xl xl:text-6xl font-extrabold tracking-tight',
    // Section titles: 24px -> 30px -> 36px
    h2: 'text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight',
    // Subsection titles: 20px -> 24px -> 30px
    h3: 'text-xl sm:text-2xl lg:text-3xl font-bold',
    // Card/Feature titles: 16px -> 18px -> 20px
    h4: 'text-base sm:text-lg lg:text-xl font-semibold',
    // Small headings: 14px -> 16px -> 18px
    h5: 'text-sm sm:text-base lg:text-lg font-semibold',
  },

  // Body text - Responsive sizing
  body: {
    // Large body/lead text: 14px -> 16px -> 18px -> 20px
    large: 'text-sm sm:text-base lg:text-lg xl:text-xl leading-relaxed',
    // Standard body: 13px -> 14px -> 16px
    base: 'text-[13px] sm:text-sm lg:text-base leading-relaxed',
    // Small text: 11px -> 12px -> 14px
    small: 'text-[11px] sm:text-xs lg:text-sm',
  },

  // Display text for hero sections
  display: {
    // Extra large display: 36px -> 48px -> 60px -> 72px
    hero: 'text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight',
  },

  // Text colors
  color: {
    primary: 'text-zinc-900 dark:text-white',
    secondary: 'text-zinc-600 dark:text-zinc-400',
    muted: 'text-zinc-500 dark:text-zinc-500',
    accentLime: 'text-lime-600 dark:text-lime-400',
    accentIndigo: 'text-indigo-600 dark:text-indigo-400',
    accentAmber: 'text-amber-600 dark:text-amber-400',
  },

  // Gradient text presets
  gradient: {
    limeToIndigo: 'bg-gradient-to-r from-lime-400 to-indigo-400 bg-clip-text text-transparent',
    indigoToLime: 'bg-gradient-to-r from-indigo-400 to-lime-400 bg-clip-text text-transparent',
    heroLight: 'bg-gradient-to-r from-indigo-200 via-lime-400 to-indigo-200 bg-clip-text text-transparent',
  },
} as const

// =============================================================================
// BORDER RADIUS
// =============================================================================

export const RADIUS = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  xl: 'rounded-3xl',
  full: 'rounded-full',
} as const

// =============================================================================
// BACKGROUNDS
// =============================================================================

export const BACKGROUND = {
  // Solid backgrounds
  solid: {
    white: 'bg-white dark:bg-zinc-900',
    lime: 'bg-lime-50 dark:bg-lime-900/20',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20',
    amber: 'bg-amber-50 dark:bg-amber-900/20',
  },

  // Gradient backgrounds
  gradient: {
    limeToIndigo: 'bg-gradient-to-r from-lime-100 to-indigo-100 dark:from-lime-900/30 dark:to-indigo-900/30',
    limeToWhite: 'bg-gradient-to-br from-lime-50 to-white dark:from-lime-900/10 dark:to-zinc-800/50',
    indigoToWhite: 'bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/10 dark:to-zinc-800/50',
    amberToWhite: 'bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/10 dark:to-zinc-800/50',
  },
} as const

// =============================================================================
// RINGS & BORDERS
// =============================================================================

export const RING = {
  lime: 'ring-1 ring-lime-200/50 dark:ring-lime-500/20',
  indigo: 'ring-1 ring-indigo-200/50 dark:ring-indigo-500/20',
  amber: 'ring-1 ring-amber-200/50 dark:ring-amber-500/20',
} as const

// =============================================================================
// SHADOWS
// =============================================================================

export const SHADOW = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',

  // Hover shadows with color
  hoverLime: 'hover:shadow-lg hover:shadow-lime-500/20 dark:hover:shadow-lime-500/10',
  hoverIndigo: 'hover:shadow-lg hover:shadow-indigo-500/20 dark:hover:shadow-indigo-500/10',
  hoverAmber: 'hover:shadow-lg hover:shadow-amber-500/20 dark:hover:shadow-amber-500/10',
} as const

// =============================================================================
// TRANSITIONS & ANIMATIONS
// =============================================================================

export const TRANSITION = {
  standard: 'transition-all duration-300',
  fast: 'transition-all duration-200',
  slow: 'transition-all duration-500',
} as const

export const HOVER = {
  scale: {
    sm: 'hover:scale-105',
    md: 'hover:scale-[1.02]',
    lg: 'hover:scale-110',
  },
} as const

// =============================================================================
// GRADIENT TEXT
// =============================================================================

export const GRADIENT_TEXT = {
  limeToIndigo: 'bg-gradient-to-r from-lime-600 to-indigo-600 bg-clip-text text-transparent dark:from-lime-400 dark:to-indigo-400',
  indigoToLime: 'bg-gradient-to-r from-indigo-600 to-lime-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-lime-400',
  amberGradient: 'bg-gradient-to-r from-amber-600 to-amber-800 bg-clip-text text-transparent dark:from-amber-300 dark:to-amber-100',
} as const

// =============================================================================
// ICON SIZES
// =============================================================================

export const ICON_SIZE = {
  xs: 'h-4 w-4',
  sm: 'h-5 w-5',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-10 w-10',
} as const

// =============================================================================
// GRID PATTERNS
// =============================================================================

export const GRID = {
  stats: 'grid grid-cols-1 sm:grid-cols-3',
  features: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  featuresLarge: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  faq: 'grid grid-cols-1 md:grid-cols-2',
  faqWide: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  twoColumn: 'grid grid-cols-1 lg:grid-cols-2',
} as const

// =============================================================================
// BADGE STYLES
// =============================================================================

export const BADGE = {
  base: 'inline-flex items-center gap-1.5 sm:gap-2 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold',

  variant: {
    lime: 'bg-gradient-to-r from-lime-100 to-indigo-100 text-lime-700 ring-1 ring-lime-200/50 dark:from-lime-900/30 dark:to-indigo-900/30 dark:text-lime-300 dark:ring-lime-500/20',
    indigo: 'bg-gradient-to-r from-indigo-100 to-lime-100 text-indigo-700 ring-1 ring-indigo-200/50 dark:from-indigo-900/30 dark:to-lime-900/30 dark:text-indigo-300 dark:ring-indigo-500/20',
    amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/50 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-500/20',
    limeSolid: 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300',
  },
} as const

// =============================================================================
// CARD STYLES
// =============================================================================

export const CARD = {
  base: 'rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200/50 dark:bg-zinc-800/50 dark:ring-zinc-700',
  baseLarge: 'rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200/50 dark:bg-zinc-800/50 dark:ring-zinc-700',

  interactive: 'rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg dark:bg-zinc-800/50 dark:ring-zinc-700',

  // Feature cards with color variants
  featureLime: 'rounded-2xl sm:rounded-3xl bg-gradient-to-br from-lime-50 to-white p-4 sm:p-6 lg:p-8 shadow-sm ring-1 ring-zinc-200/50 dark:from-lime-900/10 dark:to-zinc-800/50 dark:ring-zinc-700',
  featureIndigo: 'rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-50 to-white p-4 sm:p-6 lg:p-8 shadow-sm ring-1 ring-zinc-200/50 dark:from-indigo-900/10 dark:to-zinc-800/50 dark:ring-zinc-700',
  featureAmber: 'rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-50 to-white p-4 sm:p-6 lg:p-8 shadow-sm ring-1 ring-zinc-200/50 dark:from-amber-900/10 dark:to-zinc-800/50 dark:ring-zinc-700',

  // Stats cards
  statLime: 'rounded-xl sm:rounded-2xl bg-lime-50 px-2 py-3 sm:p-4 ring-1 ring-lime-200/50 dark:bg-lime-900/20 dark:ring-lime-500/20',
  statIndigo: 'rounded-xl sm:rounded-2xl bg-indigo-50 px-2 py-3 sm:p-4 ring-1 ring-indigo-200/50 dark:bg-indigo-900/20 dark:ring-indigo-500/20',
  statAmber: 'rounded-xl sm:rounded-2xl bg-amber-50 px-2 py-3 sm:p-4 ring-1 ring-amber-200/50 dark:bg-amber-900/20 dark:ring-amber-500/20',
} as const

// =============================================================================
// PROBLEM CARD STYLES
// =============================================================================

export const PROBLEM_CARD = {
  // Base card styles
  base: 'relative rounded-xl border-l-4 bg-white p-4 sm:p-5 shadow-sm ring-1 ring-zinc-200/50 transition-all duration-300 dark:bg-zinc-800/80 dark:ring-zinc-700/50',
  
  // Type-specific variants (left border accent) - lime for theory, indigo for coding
  coding: 'border-l-indigo-500 dark:border-l-indigo-400',
  theory: 'border-l-lime-500 dark:border-l-lime-400',
  
  // Hover states
  hover: 'hover:shadow-md hover:ring-zinc-300/50 dark:hover:ring-zinc-600/50',
  
  // Expanded state
  expanded: 'ring-2 ring-zinc-300 dark:ring-zinc-600 shadow-lg',
  
  // Interactive elements within card - smaller buttons
  revealButton: 'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200',
  revealButtonSecondary: 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600',
  // Button variants
  revealButtonCoding: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50',
  revealButtonTheory: 'bg-lime-100 text-lime-700 hover:bg-lime-200 dark:bg-lime-900/30 dark:text-lime-300 dark:hover:bg-lime-900/50',
  
  // Section labels
  sectionLabel: 'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold',
  questionLabel: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300',
  // Type-specific answer labels
  answerLabelCoding: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  answerLabelTheory: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300',
} as const

// =============================================================================
// PROBLEM TYPE BADGES
// =============================================================================

export const PROBLEM_TYPE_BADGE = {
  base: 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
  
  // Type variants
  coding: 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200/50 dark:bg-indigo-900/30 dark:text-indigo-300 dark:ring-indigo-500/30',
  theory: 'bg-lime-100 text-lime-700 ring-1 ring-lime-200/50 dark:bg-lime-900/30 dark:text-lime-300 dark:ring-lime-500/30',
} as const

// =============================================================================
// DIFFICULTY BADGES
// =============================================================================

export const DIFFICULTY_BADGE = {
  base: 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300',
  
  // Dot indicator styles
  dotContainer: 'flex items-center gap-0.5',
  dotFilled: 'w-1.5 h-1.5 rounded-full bg-zinc-500 dark:bg-zinc-300',
  dotEmpty: 'w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-500',
} as const

// =============================================================================
// SELF-ASSESSMENT BUTTONS
// =============================================================================

export const SELF_ASSESSMENT = {
  container: 'flex items-center justify-center gap-3 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50',
  prompt: 'text-sm font-medium text-zinc-600 dark:text-zinc-400',
  
  button: 'flex flex-col items-center gap-1 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 hover:scale-105',
  // Using neutral colors for assessment buttons
  buttonDidntKnow: 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600',
  buttonPartially: 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600',
  buttonGotIt: 'bg-lime-50 text-lime-600 hover:bg-lime-100 dark:bg-lime-900/20 dark:text-lime-400 dark:hover:bg-lime-900/30',
  
  buttonSelected: 'ring-2 ring-lime-500 ring-offset-2 dark:ring-lime-400 dark:ring-offset-zinc-900',
} as const

// =============================================================================
// SLIDE-OVER PANEL
// =============================================================================

export const SLIDE_OVER = {
  overlay: 'fixed inset-0 z-40 bg-black/20 backdrop-blur-sm',
  
  panel: 'fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto bg-white shadow-2xl dark:bg-zinc-900',
  
  // h-14 + box-content ensures border adds to height, matching main header (56px content + 1px border)
  header: 'sticky top-0 z-10 flex h-14 box-content items-center justify-between border-b px-4 sm:px-6 backdrop-blur',
  // Type-specific header backgrounds
  headerTheory: 'border-lime-200 bg-lime-50/95 dark:border-lime-800 dark:bg-lime-900/50',
  headerCoding: 'border-indigo-200 bg-indigo-50/95 dark:border-indigo-800 dark:bg-indigo-900/50',
  headerDefault: 'border-zinc-200 bg-white/95 dark:border-zinc-700 dark:bg-zinc-900/95',
  
  content: 'p-6',
  footer: 'sticky bottom-0 border-t border-zinc-200 bg-white/95 px-6 py-4 backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95',
} as const

// =============================================================================
// THINKING PROMPT (before reveal)
// =============================================================================

export const THINKING_PROMPT = {
  container: 'rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50/50 p-3 sm:p-4 text-center dark:border-zinc-600 dark:bg-zinc-800/30',
  icon: 'mx-auto mb-2 h-6 w-6 sm:h-7 sm:w-7 text-zinc-400 dark:text-zinc-500',
  text: 'text-xs sm:text-sm text-zinc-600 dark:text-zinc-400',
  hint: 'mt-1 text-2xs sm:text-xs text-zinc-400 dark:text-zinc-500',
} as const

// =============================================================================
// TYPE EXPORTS FOR BETTER DX
// =============================================================================

export type SpacingKey = keyof typeof SPACING
export type ContainerKey = keyof typeof CONTAINER
export type TypographyKey = keyof typeof TYPOGRAPHY
export type RadiusKey = keyof typeof RADIUS
export type BackgroundKey = keyof typeof BACKGROUND
