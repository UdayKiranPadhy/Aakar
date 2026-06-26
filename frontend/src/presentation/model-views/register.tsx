/**
 * Default model-view registrations. Imported once for side effects in main.tsx
 * (next to the Block / Layout / Detail registers).
 *
 * "research" is still a placeholder pending its Phase-5 UI; everything else is
 * a real view. Adding/replacing a view is one line here + the component.
 */

import { ArchitectureView } from "./ArchitectureView";
import { ComputeView } from "./compute/ComputeView";
import { ConfigView } from "./config/ConfigView";
import { JourneyView } from "./journey/JourneyView";
import { modelViewRegistry } from "./ModelViewRegistry";
import { OverviewView } from "./overview/OverviewView";
import { ParametersView } from "./parameters/ParametersView";
import { ResearchView } from "./research/ResearchView";

// `needsSpec`: card-first views (Overview, Research) render from just the model
// id, so they paint immediately and skip the tab spinner; the rest wait on the
// introspection call (loading illustration + spinner) until the Spec lands.
modelViewRegistry.register({ key: "overview", label: "Overview", order: 1, needsSpec: false }, OverviewView);
modelViewRegistry.register({ key: "architecture", label: "Architecture", order: 2, needsSpec: true }, ArchitectureView);
modelViewRegistry.register({ key: "journey", label: "Token Journey", order: 2.5, needsSpec: true }, JourneyView);
modelViewRegistry.register({ key: "config", label: "Config", order: 3, needsSpec: true }, ConfigView);
modelViewRegistry.register({ key: "parameters", label: "Parameters", order: 4, needsSpec: true }, ParametersView);
modelViewRegistry.register({ key: "compute", label: "Compute", order: 5, needsSpec: true }, ComputeView);
modelViewRegistry.register({ key: "research", label: "Research", order: 6, needsSpec: false }, ResearchView);
