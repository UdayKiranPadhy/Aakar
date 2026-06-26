/**
 * The home/landing experience — a lens.google-style scroll-snap story:
 * hero, four feature panels (each with a self-animating illustration), a
 * coverage galaxy, and a try-it CTA. Rendered as a fragment so the panels are
 * direct children of App's scroll container (required for CSS scroll-snap).
 */

import { useArchStore } from "../../store/archStore";
import { CoverageSection } from "./CoverageSection";
import { CtaSection } from "./CtaSection";
import { Hero } from "./Hero";
import { Section } from "./Section";
import { AttentionFan } from "./illustrations/AttentionFan";
import { CompareDiagram } from "./illustrations/CompareDiagram";
import { LearnConstellation } from "./illustrations/LearnConstellation";
import { WeightMatrix } from "./illustrations/WeightMatrix";
import { ZoomLadder } from "./illustrations/ZoomLadder";
import {
  CompareGlyph,
  EyeGlyph,
  LearnGlyph,
  RouteGlyph,
  SearchGlyph,
  ZoomGlyph,
} from "./illustrations/sealGlyphs";
import illo from "./illustrations/illustrations.module.css";

type Props = {
  onSubmit: (modelId: string) => void;
};

export function LandingPage({ onSubmit }: Props) {
  // Compare and Learn are top-level destinations; the landing's only path into
  // them (the nav's SectionTabs appear only off-home), so these sections double
  // as their entry points.
  const setAppMode = useArchStore((s) => s.setAppMode);
  return (
    <>
      <Hero />

      {/* Illustration removed: the hero's bottom-left image (TravelingImage)
       * scrolls in and lands in this section's empty slot. */}
      <Section
        tone="blue"
        eyebrow=""
        title="Find What's inside your model"
        badge={<SearchGlyph />}
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
        badge={<ZoomGlyph />}
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
        badge={<EyeGlyph />}
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
        badge={<RouteGlyph />}
        art={<WeightMatrix />}
      >
        Follow a token's journey through the model, as it transforms from input to output.
        See how it interacts with other tokens, and how its representation evolves across layers.
      </Section>

      <Section
        tone="blue"
        eyebrow=""
        title="Compare two models, side by side"
        badge={<CompareGlyph />}
        art={<CompareDiagram />}
        actionLabel="Compare models"
        onAction={() => setAppMode("compare")}
      >
        Put any two HuggingFace models head to head — layers, parameters, attention shape,
        compute and context window, lined up so the differences jump out at a glance.
      </Section>

      <Section
        flip
        tone="purple"
        eyebrow=""
        title="Learn the ideas behind the models"
        badge={<LearnGlyph />}
        art={<LearnConstellation />}
        actionLabel="Start learning"
        onAction={() => setAppMode("learn")}
      >
        A built-in library of the concepts, papers and architecture milestones that shaped modern
        LLMs — attention, RoPE, MoE, KV caching and more, mapped out and cross-linked.
      </Section>

      <CoverageSection />

      <CtaSection onSubmit={onSubmit} />
    </>
  );
}
