/**
 * App-level keyboard shortcuts, mounted once from `App`. Keeping the global
 * bindings in one place makes them discoverable (and is the natural home for
 * future shortcuts). Today: `?` toggles the help dialog, `Escape` closes it.
 */

import { useEffect } from "react";

import { useArchStore } from "../store/archStore";

/** True for elements where a bare keystroke is the user typing, not a shortcut. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export function useKeyboardShortcuts(): void {
  const toggleHelp = useArchStore((s) => s.toggleHelp);
  const closeHelp = useArchStore((s) => s.closeHelp);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      // `?` (Shift+/) — but never while typing in a field (search, filter, token).
      if (e.key === "?" && !isEditableTarget(e.target)) {
        e.preventDefault();
        toggleHelp();
      } else if (e.key === "Escape" && useArchStore.getState().helpOpen) {
        // Safety net for focus-outside cases; the dialog also handles its own Escape.
        closeHelp();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [toggleHelp, closeHelp]);
}
