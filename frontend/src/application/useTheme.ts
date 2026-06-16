/**
 * Use case: resolve and apply the colour theme.
 *
 * The store holds a *preference* ("system" | "light" | "dark"); this hook
 * resolves it to the effective `Theme` (reading the OS via matchMedia when the
 * preference is "system") and reflects it on `<html data-theme>`. The inline
 * boot script in index.html sets the attribute before first paint to avoid a
 * flash; this hook keeps it in sync as the preference or the OS setting change.
 *
 * matchMedia is guarded the same way as useJourneyPlayback, so SSR/test
 * environments without it fall back to light.
 */

import { useCallback, useEffect, useState } from "react";

import type { Theme } from "../domain/theme";
import { useArchStore } from "../store/archStore";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function getSystemTheme(): Theme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

/**
 * Resolve the effective theme without touching the DOM. Side-effect-free so
 * consumers that only need the value (e.g. the canvas, which keys React Flow's
 * colour mode + minimap palette off it) don't redundantly write `data-theme`.
 */
export function useResolvedTheme(): Theme {
  const preference = useArchStore((s) => s.themePreference);
  const [systemTheme, setSystemTheme] = useState<Theme>(getSystemTheme);

  // Follow the OS live so a "system" preference updates without a reload.
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mql = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) =>
      setSystemTheme(event.matches ? "dark" : "light");
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return preference === "system" ? systemTheme : preference;
}

export function useTheme() {
  const theme = useResolvedTheme();
  const preference = useArchStore((s) => s.themePreference);
  const setPreference = useArchStore((s) => s.setThemePreference);

  // Reflect the resolved theme on the document root; every token override in
  // tokens.css is scoped to `:root[data-theme="dark"]`.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // A 2-state toggle writes an explicit light/dark, ending system-follow and
  // flipping whatever is currently shown.
  const toggle = useCallback(() => {
    setPreference(theme === "dark" ? "light" : "dark");
  }, [setPreference, theme]);

  return { theme, preference, toggle, setPreference };
}
