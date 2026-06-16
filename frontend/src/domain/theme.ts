/**
 * Theme types.
 *
 * `ThemePreference` is what the user picks (and what we persist): "system"
 * defers to the OS, "light"/"dark" are explicit overrides. `Theme` is the
 * resolved palette actually applied to the DOM. Resolution (reading the OS via
 * matchMedia) lives in the `useTheme` hook — these types stay pure.
 */

export type Theme = "light" | "dark";

export type ThemePreference = Theme | "system";
