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

modelViewRegistry.register({ key: "overview", label: "Overview", order: 1 }, OverviewView);
modelViewRegistry.register({ key: "architecture", label: "Architecture", order: 2 }, ArchitectureView);
modelViewRegistry.register({ key: "journey", label: "Token Journey", order: 2.5 }, JourneyView);
modelViewRegistry.register({ key: "config", label: "Config", order: 3 }, ConfigView);
modelViewRegistry.register({ key: "parameters", label: "Parameters", order: 4 }, ParametersView);
modelViewRegistry.register({ key: "compute", label: "Compute", order: 5 }, ComputeView);
modelViewRegistry.register({ key: "research", label: "Research", order: 6 }, ResearchView);
