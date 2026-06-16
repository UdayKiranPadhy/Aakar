/**
 * The home/landing experience — a lens.google-style scroll-snap story:
 * hero, four feature panels (each with a self-animating illustration), a
 * coverage galaxy, and a try-it CTA. Rendered as a fragment so the panels are
 * direct children of App's scroll container (required for CSS scroll-snap).
 */

import { CoverageSection } from "./CoverageSection";
import { CtaSection } from "./CtaSection";
import { Hero } from "./Hero";
import { Section } from "./Section";
import { AttentionFan } from "./illustrations/AttentionFan";
import { ModuleTree } from "./illustrations/ModuleTree";
import { WeightMatrix } from "./illustrations/WeightMatrix";
import { ZoomLadder } from "./illustrations/ZoomLadder";

type Props = {
  onSubmit: (modelId: string) => void;
};

export function LandingPage({ onSubmit }: Props) {
  return (
    <>
      <Hero />

      <Section
        tone="blue"
        eyebrow=""
        title="Find What's inside your model"
        art={<ModuleTree />}
      >
        See a model capability that's caught your eye? Or a model you want to use? 
        Paste its HuggingFace model id and watch the architecture unfold as a clickable diagram.
      </Section>

      <Section
        flip
        tone="red"
        eyebrow="Levels"
        title="Zoom from the whole model down to a single matmul"
        art={<ZoomLadder />}
      >
        Four levels of depth — the root model, the backbone, one decoder block, and the operations
        inside attention. Layer stacks stay compact; block internals open into forward-pass diagrams
        with residual paths.
      </Section>

      <Section
        tone="yellow"
        eyebrow="Attention"
        title="Q, K, V come together as a fan-in"
        art={<AttentionFan />}
      >
        Attention views expose the score matrix, softmax, value mixing, and grouped-query head
        shapes — tokens converging into context, drawn as it actually flows.
      </Section>

      <Section
        flip
        tone="green"
        eyebrow="Scale"
        title="Parameters have visual weight"
        art={<WeightMatrix />}
      >
        Matrix-heavy modules show shape glyphs, memory, FLOPs, and child-parameter breakdowns in the
        detail panel — so the size of a model is something you can see.
      </Section>

      <CoverageSection />

      <CtaSection onSubmit={onSubmit} />
    </>
  );
}
