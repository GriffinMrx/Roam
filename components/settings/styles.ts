/*
 * Settings card controls (prompts/settings-sidebar-cards.md): small dark-gray rectangles,
 * both themes via tokens. Plain strings in a non-client module, so server and client
 * components can share them.
 */

export const CARD_BUTTON_BASE =
  "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-[6px] px-3 text-[13px] font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50";
export const CARD_BUTTON = `${CARD_BUTTON_BASE} bg-neutral-200 text-foreground hover:bg-neutral-300`;
/** Primary card action (submit). */
export const CARD_BUTTON_PRIMARY = `${CARD_BUTTON_BASE} bg-primary-500 text-white hover:bg-primary-600`;
/** Quiet secondary action next to a card button. */
export const CARD_BUTTON_GHOST = `${CARD_BUTTON_BASE} text-muted hover:bg-neutral-200 hover:text-foreground`;
/** Armed confirm step: same shape, red (complete list: cn() doesn't merge conflicting utilities). */
export const CARD_BUTTON_DANGER = `${CARD_BUTTON_BASE} bg-red-500/20 text-red-200 hover:bg-red-500/30 light:text-red-700`;

export const FIELD_LABEL = "block text-[13px] font-medium text-foreground";
/** Input without the label gap, for inline rows. */
export const INPUT_BARE =
  "block h-9 w-full rounded-[6px] border border-border bg-neutral-50 px-3 text-[13px] text-foreground placeholder:text-subtle focus:border-primary-400 focus:outline-none";
export const INPUT = `mt-1.5 ${INPUT_BARE}`;
export const TEXTAREA =
  "mt-1.5 block w-full rounded-[6px] border border-border bg-neutral-50 px-3 py-2 text-[13px] leading-5 text-foreground placeholder:text-subtle focus:border-primary-400 focus:outline-none";
export const FIELD_HINT = "mt-1 text-small text-subtle";
export const FIELD_ERROR = "mt-1 text-small text-red-300 light:text-red-600";
