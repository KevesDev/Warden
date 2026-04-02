/**
 * Centralized color palette for the Warden retro aesthetic.
 * Decoupled into a standalone constant file to prevent circular dependency crashes 
 * during module evaluation in the layout and canvas components.
 */
export const THEME = {
    // Base Backgrounds
    deepVoid: '#211832',
    midnightPurple: '#412B6B',
    synthwaveViolet: '#5C3E94',
    panelHeader: '#1A112A', // Slightly darker shade for sidebar headers
    consoleDark: '#150D22', // Deepest background for text areas and terminal inputs
    
    // Accents & Interactive Elements
    retroPlasma: '#F25912', // Primary accent (Orange)
    neonCrimson: '#FF2A6D', // Destructive actions, Stop Generation, Errors
    cyberCyan: '#05D9E8',   // Secondary buttons, info highlights
    matrixGreen: '#01FF70', // Success states, clean heuristic analysis
    
    // Typography
    textPrimary: '#E0E0E0',
    textSecondary: '#A0A0A0'
} as const;