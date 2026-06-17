/**
 * Topic glyphs for Learn content cards (concepts, visualizations, …).
 *
 * `TopicGlyph` matches a free-text topic / category string against a small set
 * of keyword buckets and renders the matching line icon, falling back to a
 * neutral sparkle. Keeping the match keyword-based (not an exact map) means a
 * concept name, a category, or a tool's subject all resolve sensibly.
 */

import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

const AttentionGlyph = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="2.2" />
    <path d="M5 5l5 5M19 5l-5 5M5 19l5-5M19 19l-5-5" />
  </Svg>
);

const TransformerGlyph = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="4.5" rx="1" />
    <rect x="4" y="15.5" width="16" height="4.5" rx="1" />
    <path d="M8 8.5v7M16 8.5v7" />
  </Svg>
);

const EmbeddingGlyph = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="6" cy="8" r="1.4" />
    <circle cx="17" cy="6" r="1.4" />
    <circle cx="9" cy="17" r="1.4" />
    <circle cx="18" cy="16" r="1.4" />
    <path d="M7.4 8.4l8.2-1.8M9.6 15.7l6.8-1.4M7 9.4l1.6 6.2" />
  </Svg>
);

const ModelGlyph = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
    <path d="M8 10h8M8 13h5" />
  </Svg>
);

const TrainingGlyph = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 12a8 8 0 1 1-2.3-5.6" />
    <polyline points="20 4 20 8 16 8" />
  </Svg>
);

const OptimizationGlyph = (p: IconProps) => (
  <Svg {...p}>
    <polygon points="13 2 4 14 11 14 10 22 20 9 13 9 13 2" />
  </Svg>
);

const DecodingGlyph = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="6" cy="12" r="2" />
    <circle cx="18" cy="6" r="2" />
    <circle cx="18" cy="18" r="2" />
    <path d="M8 11l8-4M8 13l8 4" />
  </Svg>
);

const AlignmentGlyph = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l7 3v5c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6z" />
    <polyline points="9 12 11.2 14 15 9.5" />
  </Svg>
);

const VisionGlyph = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="9" cy="11" r="1.6" />
    <path d="M4 17l5-4 4 3 3-2.5 4 3.5" />
  </Svg>
);

const GenerativeGlyph = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l1.7 4.6L18.5 9.3l-4.8 1.7L12 15.6l-1.7-4.6L5.5 9.3l4.8-1.7z" />
    <path d="M18 15l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z" />
  </Svg>
);

const TokenGlyph = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="9" width="5" height="6" rx="1.5" />
    <rect x="9.5" y="9" width="5" height="6" rx="1.5" />
    <rect x="16" y="9" width="5" height="6" rx="1.5" />
  </Svg>
);

const NetworkGlyph = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="5" cy="6" r="1.8" />
    <circle cx="5" cy="18" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="19" cy="6" r="1.8" />
    <circle cx="19" cy="18" r="1.8" />
    <path d="M6.6 6.8L10.4 11M6.6 17.2L10.4 13M13.6 11l3.8-4.2M13.6 13l3.8 4.2" />
  </Svg>
);

const SparkleGlyph = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4v16M4 12h16" />
    <path d="M7 7l10 10M17 7L7 17" opacity="0.5" />
  </Svg>
);

type Glyph = (p: IconProps) => ReactNode;

/** Ordered keyword → glyph rules. First match wins. */
const RULES: ReadonlyArray<readonly [RegExp, Glyph]> = [
  [/atten/i, AttentionGlyph],
  [/transform|rope|positional/i, TransformerGlyph],
  [/embed|vector|semantic/i, EmbeddingGlyph],
  [/token/i, TokenGlyph],
  [/diffus|generat|gan|image-to|text-to-image/i, GenerativeGlyph],
  [/vision|cnn|convolu|image/i, VisionGlyph],
  [/align|safety|guard|rlhf/i, AlignmentGlyph],
  [/train|fine|backprop|learning/i, TrainingGlyph],
  [/optim|quant|cache|efficien|inference/i, OptimizationGlyph],
  [/decod|beam|search|sampling/i, DecodingGlyph],
  [/moe|expert|network|neural|architecture/i, NetworkGlyph],
  [/model|llm|language/i, ModelGlyph],
];

/** Render the glyph that best matches `topic` (a category, concept name, …). */
export function TopicGlyph({ topic, ...props }: IconProps & { topic: string }) {
  const Glyph = RULES.find(([re]) => re.test(topic))?.[1] ?? SparkleGlyph;
  return <Glyph {...props} />;
}
