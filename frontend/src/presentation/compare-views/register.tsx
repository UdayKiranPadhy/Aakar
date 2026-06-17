/**
 * Default Compare-view registrations. Imported once for side effects in main.tsx
 * (next to the model-views register). Adding a Compare tab is one line here +
 * the component.
 */

import { ArchitectureCompareView } from "./ArchitectureCompareView";
import { compareViewRegistry } from "./CompareViewRegistry";
import { ComputeCompareView } from "./ComputeCompareView";
import { FilesCompareView } from "./FilesCompareView";
import { OverviewCompareView } from "./OverviewCompareView";
import { ParametersCompareView } from "./ParametersCompareView";
import { ResearchCompareView } from "./ResearchCompareView";
import { TokensCompareView } from "./TokensCompareView";

compareViewRegistry.register({ key: "overview", label: "Overview", order: 1 }, OverviewCompareView);
compareViewRegistry.register({ key: "architecture", label: "Architecture", order: 2 }, ArchitectureCompareView);
compareViewRegistry.register({ key: "parameters", label: "Parameters", order: 3 }, ParametersCompareView);
compareViewRegistry.register({ key: "compute", label: "Compute", order: 4 }, ComputeCompareView);
compareViewRegistry.register({ key: "tokens", label: "Tokens & Context", order: 5 }, TokensCompareView);
compareViewRegistry.register({ key: "files", label: "Files", order: 6 }, FilesCompareView);
compareViewRegistry.register({ key: "research", label: "Research", order: 7 }, ResearchCompareView);
