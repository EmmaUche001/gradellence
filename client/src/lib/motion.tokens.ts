/**
 * Motion Design Tokens
 * Centralized easing curves and durations for consistent animation across the app.
 * Follows the Gradellence design system for professional SaaS motion.
 */

// ─ Easing Functions ─────────────────────────────────────────────────────────
// Three core easing profiles: smooth (standard), spring (delight), and snap (feedback)

/**
 * Smooth ease-out: Used for standard UI entrances, exits, and transitions.
 * Decelerating curve — feels natural and predictable.
 * cubic-bezier(0, 0, 0.2, 1) ≈ ease-out
 */
export const EASE_OUT_SMOOTH = 'cubic-bezier(0, 0, 0.2, 1)';

/**
 * Spring ease: Used for modals, popovers, and delightful moments.
 * Overshoot curve — bounces slightly past target, then settles.
 * cubic-bezier(0.34, 1.56, 0.64, 1) — produces ~15% overshoot
 */
export const EASE_SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

/**
 * Strong spring ease: Similar to EASE_SPRING but slightly gentler overshoot.
 * cubic-bezier(0.16, 1, 0.3, 1) — produces ~12% overshoot
 * Used for card entrances, stagger animations, and content fades.
 */
export const EASE_SPRING_GENTLE = 'cubic-bezier(0.16, 1, 0.3, 1)';

/**
 * Ease-in: Used for exits, dismiss actions, and motion going off-screen.
 * Accelerating curve — motion speeds up as it exits.
 * cubic-bezier(0.4, 0, 1, 1) ≈ ease-in
 */
export const EASE_IN_STRONG = 'cubic-bezier(0.4, 0, 1, 1)';

/**
 * Power-out: Used for page transitions and major UI state changes.
 * Smooth deceleration, feels more controlled than standard ease-out.
 * Equivalent to GSAP's `power3.out`
 */
export const EASE_OUT_POWER = 'cubic-bezier(0.2, 0.7, 0.3, 1)';

// ─ Duration Scale (4px rhythm: 50ms increments) ─────────────────────────────

/** Micro interactions: checkbox bounce, focus ring, keycap pop. */
export const DURATION_INSTANT = 100; // ms

/** Fast feedback: button press, hover transitions, small state changes. */
export const DURATION_FAST = 120; // ms

/** Standard: micro-interactions, small UI changes. */
export const DURATION_QUICK = 150; // ms

/** Dropdown, tooltip, stagger base: ~180ms between items. */
export const DURATION_SHORT = 180; // ms

/** Modal backdrop, badge pulse, table row entry. */
export const DURATION_BASE = 200; // ms

/** Page entrance, content fade-in, modal panel spring. */
export const DURATION_MEDIUM = 250; // ms

/** Modal spring entrance (overshoot effect). */
export const DURATION_MODAL = 300; // ms

/** Page transition main animation, nav pill movement. */
export const DURATION_LONG = 350; // ms

/** Page transition with stagger cascade. */
export const DURATION_XLARGE = 450; // ms

// ─ Stagger Delays ──────────────────────────────────────────────────────────
// Used for sequential animation of list items, table rows, etc.

/** Base stagger delay between children (40ms). */
export const STAGGER_DELAY_BASE = 40; // ms

/** Faster stagger for dense lists (25ms). */
export const STAGGER_DELAY_FAST = 25; // ms

/** Slower stagger for emphasis (60ms). */
export const STAGGER_DELAY_SLOW = 60; // ms

// ─ GSAP Animation Config ───────────────────────────────────────────────────
// Reusable configs for GSAP animations to prevent duplication.

export const GSAP_CONFIG = {
  // Modal spring entrance with overshoot
  modalSpring: {
    duration: DURATION_MODAL / 1000, // convert to seconds for GSAP
    ease: EASE_SPRING,
  },

  // Standard fade-in for content
  fadeIn: {
    duration: DURATION_QUICK / 1000,
    ease: EASE_OUT_SMOOTH,
  },

  // Page transition (main container)
  pageTransition: {
    duration: DURATION_XLARGE / 1000,
    ease: EASE_OUT_POWER,
  },

  // Toast entrance (reduced from 400ms spring to 250ms smooth)
  toastIn: {
    duration: DURATION_MEDIUM / 1000,
    ease: EASE_OUT_SMOOTH,
  },

  // Toast exit
  toastOut: {
    duration: DURATION_BASE / 1000,
    ease: EASE_IN_STRONG,
  },

  // Nav pill animation
  navPill: {
    duration: 0.3, // 300ms
    ease: `back.out(1.1)`, // Softer spring for sidebar
  },

  // Button press feedback
  buttonPress: {
    duration: DURATION_FAST / 1000,
    ease: EASE_OUT_SMOOTH,
  },

  // Empty state icon float (limited to 2 cycles, not infinite)
  emptyIconFloat: {
    duration: 2.4,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: 1, // 2 cycles total
  },
} as const;

// ─ Transform Values ────────────────────────────────────────────────────────
// Commonly used transform values for consistency.

export const TRANSFORM = {
  // Scale values
  SCALE_DOWN_SM: 0.92,
  SCALE_DOWN_MD: 0.96,
  SCALE_DOWN_LG: 0.98,

  // Translate Y values
  TRANSLATE_Y_SM: -6,
  TRANSLATE_Y_MD: -12,
  TRANSLATE_Y_LG: 24,

  // Translate X values (for drawer, sidebar)
  TRANSLATE_X_FULL: -100, // percentage

  // Card lift on hover
  CARD_LIFT: -2, // pixels
} as const;

// ─ Utility: Dynamic Transform Origin for Popovers ──────────────────────────
/**
 * Calculates the optimal transform-origin for a popover based on its trigger element's position.
 * Prevents dropdowns from scaling off-screen when near screen edges.
 * 
 * Returns CSS string like "right top", "center top", "left top" based on trigger position.
 */
export function getPopoverOrigin(triggerElement: HTMLElement): string {
  const rect = triggerElement.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  
  // Calculate trigger center
  const triggerCenterX = rect.left + rect.width / 2;
  
  // Determine horizontal origin based on position in viewport
  let horizontalOrigin = 'center';
  if (triggerCenterX < viewportWidth * 0.25) {
    horizontalOrigin = 'left';
  } else if (triggerCenterX > viewportWidth * 0.75) {
    horizontalOrigin = 'right';
  }
  
  // Vertical origin is always "top" (popover appears below trigger)
  return `${horizontalOrigin} top`;
}

// ─ Shadow Values ──────────────────────────────────────────────────────────
// Used for elevation feedback.

export const SHADOWS = {
  // KPI card hover lift
  CARD_HOVER: '0 8px 24px rgba(0, 0, 0, 0.08)',

  // Modal/popover
  MODAL: '0 20px 25px rgba(0, 0, 0, 0.1)',

  // Dropdown
  DROPDOWN: '0 10px 15px rgba(0, 0, 0, 0.1)',
} as const;
