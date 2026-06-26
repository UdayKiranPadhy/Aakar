/**
 * Resolves the active `modelView` to its registered component and renders it
 * in the dashboard content area (mirrors how DetailPanel resolves a node type).
 * Centralizes the "no model loaded yet" empty state for every view.
 */

import type { Spec } from "../../domain/spec";
import { useArchStore } from "../../store/archStore";
import { ErrorState } from "../components/ErrorState";
import { ModelGatedState } from "../components/ModelGatedState";
import { ModelIntrospectionErrorState } from "../components/ModelIntrospectionErrorState";
import { ModelLoadingState } from "../components/ModelLoadingState";
import { ModelNotFoundState } from "../components/ModelNotFoundState";
import { ModelServerErrorState } from "../components/ModelServerErrorState";
import { ModelUnsupportedState } from "../components/ModelUnsupportedState";
import { PlaceholderScreen } from "../components/PlaceholderScreen";
import { ModelLanding } from "./landing/ModelLanding";
import { modelViewRegistry } from "./ModelViewRegistry";

// Minimal spec used when we know the model_id but introspection failed.
// Only Overview and Research use this — both access spec.model_id exclusively.
function stubSpec(modelId: string): Spec {
  return { model_id: modelId, model_type: "", config_summary: {}, graph: [] };
}

export function ModelViewHost({
  onRetryWithToken,
  onSubmit,
}: {
  /** Re-run a load with a just-entered HF token (used by the gated page). */
  onRetryWithToken?: (modelId: string, token: string) => void;
  /** Load a model from the empty-state landing's in-page search / chips. */
  onSubmit?: (modelId: string) => void;
} = {}) {
  const spec = useArchStore((s) => s.spec);
  const error = useArchStore((s) => s.error);
  const loading = useArchStore((s) => s.loading);
  const modelInput = useArchStore((s) => s.modelInput);
  const modelView = useArchStore((s) => s.modelView);
  const requestedModelId = useArchStore((s) => s.requestedModelId);

  // Mid-fetch the store is reset (spec + error both null). Card-first views
  // (`needsSpec: false` — Overview, Research) need only the model id: they fetch
  // Hub metadata independently of introspection, so render them from a stub the
  // instant the load starts. The model card then paints in ~a Hub round-trip
  // instead of waiting on the full (slow) introspection; the spec-dependent views
  // fill in once the real spec lands and keep the loading illustration until then.
  if (loading) {
    if (requestedModelId && modelViewRegistry.meta(modelView)?.needsSpec === false) {
      const View = modelViewRegistry.resolve(modelView);
      if (View) return <View spec={stubSpec(requestedModelId)} />;
    }
    return <ModelLoadingState modelId={requestedModelId ?? (modelInput.trim() || undefined)} />;
  }

  if (!spec) {
    if (error?.kind === "not_found") return <ModelNotFoundState error={error} />;

    // For unsupported/gated errors we still know the model_id, so the card-first
    // views can fetch from the HF Hub independently of introspection.
    if ((error?.kind === "unsupported" || error?.kind === "gated") && error.modelId) {
      if (modelViewRegistry.meta(modelView)?.needsSpec === false) {
        const View = modelViewRegistry.resolve(modelView);
        if (View) return <View spec={stubSpec(error.modelId)} />;
      }
    }

    if (error?.kind === "unsupported") return <ModelUnsupportedState error={error} />;
    if (error?.kind === "gated")
      return <ModelGatedState error={error} onRetryWithToken={onRetryWithToken} />;
    if (error?.kind === "timeout" || error?.kind === "failed")
      return <ModelIntrospectionErrorState error={error} />;
    if (error?.kind === "server_error") return <ModelServerErrorState error={error} />;
    if (error) return <ErrorState error={error} />;
    // No model, no error: the landing hero. Falls back to the plain placeholder
    // only if no loader was wired (the in-page search/chips need `onSubmit`).
    return onSubmit ? (
      <ModelLanding onSubmit={onSubmit} />
    ) : (
      <PlaceholderScreen
        title="No model loaded"
        message="Enter a HuggingFace model id in the search bar above to explore its architecture."
      />
    );
  }

  const View = modelViewRegistry.resolve(modelView);
  if (!View) {
    return (
      <PlaceholderScreen
        title="Unknown view"
        message={`No view is registered for '${modelView}'.`}
      />
    );
  }
  return <View spec={spec} />;
}
