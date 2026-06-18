/**
 * Default Learn-view registrations. Imported once for side effects in main.tsx
 * (next to the model-views / compare-views registers). Adding a Learn section is
 * one line here + the component — order drives the LearnSidebar nav.
 */

import { ArchitectureEvolutionView } from "./ArchitectureEvolutionView";
import { BenchmarksLearnView } from "./BenchmarksLearnView";
import { BlogsLearnView } from "./BlogsLearnView";
import { ConceptsLearnView } from "./ConceptsLearnView";
import { GlossaryLearnView } from "./GlossaryLearnView";
import { learnViewRegistry } from "./LearnViewRegistry";
import { OverviewLearnView } from "./OverviewLearnView";
import { ResearchPapersLearnView } from "./ResearchPapersLearnView";
import { TimelineLearnView } from "./TimelineLearnView";

learnViewRegistry.register({ key: "overview", label: "Overview", order: 1 }, OverviewLearnView);
learnViewRegistry.register({ key: "timeline", label: "Timeline", order: 2 }, TimelineLearnView);
learnViewRegistry.register({ key: "concepts", label: "Concepts", order: 3 }, ConceptsLearnView);
learnViewRegistry.register(
  { key: "architectures", label: "Architecture Evolution", order: 4 },
  ArchitectureEvolutionView,
);
learnViewRegistry.register({ key: "papers", label: "Research Papers", order: 5 }, ResearchPapersLearnView);
learnViewRegistry.register({ key: "blogs", label: "Blogs & Articles", order: 6 }, BlogsLearnView);
learnViewRegistry.register({ key: "benchmarks", label: "Benchmarks", order: 7 }, BenchmarksLearnView);
learnViewRegistry.register({ key: "glossary", label: "Glossary", order: 8 }, GlossaryLearnView);
