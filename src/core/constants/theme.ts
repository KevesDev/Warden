/**
 * Centralized color palette for the Warden retro aesthetic.
 * Decoupled into a standalone constant file to prevent circular dependency crashes 
 * during module evaluation in the layout and canvas components.
 */
export const THEME = {
    deepVoid: '#211832',
    midnightPurple: '#412B6B',
    synthwaveViolet: '#5C3E94',
    retroPlasma: '#F25912',
    textPrimary: '#E0E0E0',
    textSecondary: '#A0A0A0'
} as const;