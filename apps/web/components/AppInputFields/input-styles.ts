// Central place to control input field border styling across all AppInputFields components.
// To change the border color: update --app-input-border in globals.css (:root block). ONE line.

export const INPUT_BORDER_COLOR = "app-input-border-color"; // defined in globals.css — border-color: var(--app-input-border)
export const INPUT_BORDER_HEX = "var(--app-input-border)"; // works in react-select inline styles too

export const INPUT_BORDER_HOVER = "hover:border-primary/20";
export const INPUT_BORDER_FOCUS = "focus:border-primary/40";
export const INPUT_BORDER_FOCUS_VISIBLE = "focus-visible:border-primary/40";
/** @public */
export const INPUT_FOCUS_RING = "focus:ring-1 focus:ring-primary/10";
/** @public */
export const INPUT_SHADOW = "shadow-none";
export const INPUT_ICON_SIZE = "size-5"; // use size-* (not h-*/w-*) — shadcn Button overrides h-4 w-4 on SVGs
export const INPUT_ICON_COLOR = "app-input-icon"; // defined in globals.css — color: var(--app-input-border)
export const INPUT_PLACEHOLDER_COLOR = "app-input-placeholder"; // defined in globals.css — ::placeholder color: var(--app-input-border)
