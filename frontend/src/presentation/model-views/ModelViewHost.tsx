/**
 * Resolves the active `modelView` to its registered component and renders it
 * in the dashboard content area (mirrors how DetailPanel resolves a node type).
 * Centralizes the "no model loaded yet" empty state for every view.
 */

import { useArchStore } from "../../store/archStore";
import { ErrorState } from "../components/ErrorState";
import { ModelNotFoundState } from "../components/ModelNotFoundState";
import { ModelServerErrorState } from "../components/ModelServerErrorState";
import { ModelUnsupportedState } from "../components/ModelUnsupportedState";
import { PlaceholderScreen } from "../components/PlaceholderScreen";
import { modelViewRegistry } from "./ModelViewRegistry";

export function ModelViewHost() {
  const spec = useArchStore((s) => s.spec);
  const error = useArchStore((s) => s.error);
  const modelView = useArchStore((s) => s.modelView);

  if (!spec) {
    // A failed load takes over the whole content area with a detailed,
    // illustrated error — not the neutral "nothing here yet" placeholder.
    // "Model not found" and "Architecture not supported" each get their own
    // richer, guidance-led page; everything else uses the compact ErrorState.
    if (error?.kind === "not_found") return <ModelNotFoundState error={error} />;
    if (error?.kind === "unsupported") return <ModelUnsupportedState error={error} />;
    if (error?.kind === "server_error") return <ModelServerErrorState error={error} />;
    if (error) return <ErrorState error={error} />;
    return (
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
