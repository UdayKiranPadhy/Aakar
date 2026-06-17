/**
 * Inline SVG icon set for the left `LearnSidebar` section nav.
 *
 * Keyed by `LearnView` so each registered section gets a glyph in front of its
 * label. Resolution falls back to a neutral dot for any unmapped key, so a
 * newly-registered section still renders sensibly without touching this file.
 * Line icons on a 24×24 grid inheriting `currentColor`, matching `NavIcons`.
 */

import type { ComponentType, ReactNode, SVGProps } from "react";

import type { LearnView } from "../../domain/navigation";

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

const OverviewIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 11l9-8 9 8" />
    <path d="M5 9.8V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.8" />
    <path d="M9.5 21v-6h5v6" />
  </Svg>
);

const TimelineIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 15.5 14" />
  </Svg>
);

const ConceptsIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l7.5 4.3v8.4L12 20l-7.5-4.3V7.3z" />
    <circle cx="12" cy="12" r="2.4" />
  </Svg>
);

const ArchitecturesIcon = (p: IconProps) => (
  <Svg {...p}>
    <polygon points="12 3 21 7.5 12 12 3 7.5" />
    <polyline points="3 12 12 16.5 21 12" />
    <polyline points="3 16.5 12 21 21 16.5" />
  </Svg>
);

const PapersIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <polyline points="14 3 14 8 19 8" />
    <line x1="9" y1="13" x2="15" y2="13" />
    <line x1="9" y1="17" x2="13" y2="17" />
  </Svg>
);

const BlogsIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <line x1="7" y1="9.5" x2="13" y2="9.5" />
    <line x1="7" y1="13" x2="17" y2="13" />
    <line x1="7" y1="16" x2="14" y2="16" />
  </Svg>
);

const PathsIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="6" cy="19" r="2" />
    <circle cx="18" cy="5" r="2" />
    <path d="M8 19h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6" />
  </Svg>
);

const BenchmarksIcon = (p: IconProps) => (
  <Svg {...p}>
    <line x1="4" y1="20" x2="20" y2="20" />
    <rect x="6" y="11" width="3" height="6" rx="0.5" />
    <rect x="10.5" y="7" width="3" height="10" rx="0.5" />
    <rect x="15" y="13" width="3" height="4" rx="0.5" />
  </Svg>
);

const CompaniesIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 21V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v16" />
    <path d="M13 9h6a1 1 0 0 1 1 1v11" />
    <line x1="3" y1="21" x2="21" y2="21" />
    <line x1="7" y1="8" x2="7" y2="8.01" />
    <line x1="10" y1="8" x2="10" y2="8.01" />
    <line x1="7" y1="12" x2="7" y2="12.01" />
    <line x1="10" y1="12" x2="10" y2="12.01" />
    <line x1="16.5" y1="13" x2="16.5" y2="13.01" />
    <line x1="16.5" y1="17" x2="16.5" y2="17.01" />
  </Svg>
);

const DatasetsIcon = (p: IconProps) => (
  <Svg {...p}>
    <ellipse cx="12" cy="5.5" rx="7.5" ry="2.8" />
    <path d="M4.5 5.5v6c0 1.55 3.36 2.8 7.5 2.8s7.5-1.25 7.5-2.8v-6" />
    <path d="M4.5 11.5v6c0 1.55 3.36 2.8 7.5 2.8s7.5-1.25 7.5-2.8v-6" />
  </Svg>
);

const VisualizationsIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l1.7 4.6L18.5 9.3l-4.8 1.7L12 15.6l-1.7-4.6L5.5 9.3l4.8-1.7z" />
    <path d="M18 15l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z" />
  </Svg>
);

const GlossaryIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z" />
    <path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19" />
    <line x1="9" y1="7.5" x2="15" y2="7.5" />
    <line x1="9" y1="11" x2="15" y2="11" />
  </Svg>
);

const FallbackIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3.5" />
  </Svg>
);

const LEARN_ICONS: Partial<Record<LearnView, ComponentType<IconProps>>> = {
  overview: OverviewIcon,
  timeline: TimelineIcon,
  concepts: ConceptsIcon,
  architectures: ArchitecturesIcon,
  papers: PapersIcon,
  blogs: BlogsIcon,
  paths: PathsIcon,
  benchmarks: BenchmarksIcon,
  companies: CompaniesIcon,
  datasets: DatasetsIcon,
  visualizations: VisualizationsIcon,
  glossary: GlossaryIcon,
};

/** Resolve a section glyph by Learn-view key, falling back to a neutral dot. */
export function LearnIcon({ viewKey, ...props }: IconProps & { viewKey: LearnView }) {
  const Icon = LEARN_ICONS[viewKey] ?? FallbackIcon;
  return <Icon {...props} />;
}
