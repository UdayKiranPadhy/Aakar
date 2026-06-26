/**
 * Bridge a card-first view's own data-fetch loading state up to the store.
 *
 * Card-first model views (Overview, Research) fetch their content — HF Hub
 * metadata, research context — independently of the architecture introspection
 * call. That loading state lives in the view's local data hook, where the
 * sidebar can't see it. A view calls this with its `loading` flag so the sidebar
 * can spin the tab, mirroring how spec-dependent tabs spin on the global
 * `loading`. Only the active view is mounted, so this always tracks the open tab;
 * the cleanup clears it on unmount (and when the fetch resolves).
 */

import { useEffect } from "react";

import { useArchStore } from "../store/archStore";

export function useReportCardLoading(loading: boolean): void {
  const setCardLoading = useArchStore((s) => s.setCardLoading);
  useEffect(() => {
    setCardLoading(loading);
    return () => setCardLoading(false);
  }, [loading, setCardLoading]);
}
