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
import { WeightMatrix } from "./illustrations/WeightMatrix";
import { ZoomLadder } from "./illustrations/ZoomLadder";
import illo from "./illustrations/illustrations.module.css";

type Props = {
  onSubmit: (modelId: string) => void;
};

export function LandingPage({ onSubmit }: Props) {
  return (
    <>
      <Hero />

      {/* Illustration removed: the hero's bottom-left image (TravelingImage)
       * scrolls in and lands in this section's empty slot. */}
      <Section
        tone="blue"
        eyebrow=""
        title="Find What's inside your model"
        art={<div data-travel-target className={illo.travelTarget} aria-hidden="true" />}
      >
        See a model capability that's caught your eye? Or a model you want to use? 
        Paste its HuggingFace model id and watch the architecture unfold as a clickable diagram.
      </Section>

      <Section
        flip
        tone="red"
        eyebrow=""
        title="Zoom in, see the Math"
        art={<ZoomLadder />}
      >
        Zoom inside the model architecture upto unit math — the actual operations and data flow.
        Block internals open into forward-pass diagrams
        with residual paths.
      </Section>

      <Section
        tone="yellow"
        eyebrow=""
        title="Is Attention all you need?"
        art={<AttentionFan />}
      >
        Attention views expose the score matrix, softmax, value mixing, and grouped-query head
        shapes — tokens converging into context, drawn as it actually flows.
      </Section>

      <Section
        flip
        tone="green"
        eyebrow=""
        title="Journey of a token"
        art={<WeightMatrix />}
      >
        Follow a token's journey through the model, as it transforms from input to output.
        See how it interacts with other tokens, and how its representation evolves across layers.
      </Section>

      <CoverageSection />

      <CtaSection onSubmit={onSubmit} />
    </>
  );
}
