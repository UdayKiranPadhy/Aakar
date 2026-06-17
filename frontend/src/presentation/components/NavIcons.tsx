/**
 * Inline SVG icon set for the left ModelSidebar's section nav.
 *
 * Keyed by `ModelView` so each registered view gets a glyph in front of its
 * label. Resolution falls back to a neutral dot for any unmapped key, so a
 * newly-registered view still renders sensibly without touching this file.
 */

import type { ComponentType, ReactNode, SVGProps } from "react";

import type { CompareView, ModelView } from "../../domain/navigation";

type IconProps = SVGProps<SVGSVGElement>;

/** Shared SVG frame — line icons on a 24×24 grid, inheriting `currentColor`. */
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
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
  </Svg>
);

const ArchitectureIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </Svg>
);

const JourneyIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="5" cy="19" r="2" />
    <circle cx="19" cy="5" r="2" />
    <path d="M6.4 17.6c2-2.2 3.4-4.2 5.6-5.6 2.2-1.4 3.6-3.4 5.6-5.6" />
    <path d="M12 12h.01" />
  </Svg>
);

const ConfigIcon = (p: IconProps) => (
  <Svg {...p}>
    <line x1="21" y1="4" x2="14" y2="4" />
    <line x1="10" y1="4" x2="3" y2="4" />
    <line x1="21" y1="12" x2="12" y2="12" />
    <line x1="8" y1="12" x2="3" y2="12" />
    <line x1="21" y1="20" x2="16" y2="20" />
    <line x1="12" y1="20" x2="3" y2="20" />
    <line x1="14" y1="2" x2="14" y2="6" />
    <line x1="8" y1="10" x2="8" y2="14" />
    <line x1="16" y1="18" x2="16" y2="22" />
  </Svg>
);

const ParametersIcon = (p: IconProps) => (
  <Svg {...p}>
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" />
    <line x1="16" y1="3" x2="14" y2="21" />
  </Svg>
);

const ComputeIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <rect x="9" y="9" width="6" height="6" />
    <line x1="9" y1="1" x2="9" y2="4" />
    <line x1="15" y1="1" x2="15" y2="4" />
    <line x1="9" y1="20" x2="9" y2="23" />
    <line x1="15" y1="20" x2="15" y2="23" />
    <line x1="20" y1="9" x2="23" y2="9" />
    <line x1="20" y1="14" x2="23" y2="14" />
    <line x1="1" y1="9" x2="4" y2="9" />
    <line x1="1" y1="14" x2="4" y2="14" />
  </Svg>
);

const ResearchIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </Svg>
);

const TokensIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="9" width="5" height="6" rx="1.5" />
    <rect x="9.5" y="9" width="5" height="6" rx="1.5" />
    <rect x="16" y="9" width="5" height="6" rx="1.5" />
  </Svg>
);

const FilesIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <polyline points="14 3 14 8 19 8" />
    <line x1="9" y1="13" x2="15" y2="13" />
    <line x1="9" y1="17" x2="13" y2="17" />
  </Svg>
);

/** Neutral fallback for any view key without a bespoke glyph. */
const FallbackIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3.5" />
  </Svg>
);

const VIEW_ICONS: Partial<Record<ModelView, ComponentType<IconProps>>> = {
  overview: OverviewIcon,
  architecture: ArchitectureIcon,
  journey: JourneyIcon,
  config: ConfigIcon,
  parameters: ParametersIcon,
  compute: ComputeIcon,
  research: ResearchIcon,
};

/** Resolve a section glyph by view key, falling back to a neutral dot. */
export function ViewIcon({ viewKey, ...props }: IconProps & { viewKey: ModelView }) {
  const Icon = VIEW_ICONS[viewKey] ?? FallbackIcon;
  return <Icon {...props} />;
}

const COMPARE_VIEW_ICONS: Partial<Record<CompareView, ComponentType<IconProps>>> = {
  overview: OverviewIcon,
  architecture: ArchitectureIcon,
  parameters: ParametersIcon,
  compute: ComputeIcon,
  tokens: TokensIcon,
  files: FilesIcon,
  research: ResearchIcon,
};

/** Resolve a Compare-tab glyph by view key, falling back to a neutral dot. */
export function CompareViewIcon({ viewKey, ...props }: IconProps & { viewKey: CompareView }) {
  const Icon = COMPARE_VIEW_ICONS[viewKey] ?? FallbackIcon;
  return <Icon {...props} />;
}

/** Chevrons for the collapse/expand toggle (points left; flipped when collapsed). */
export function PanelToggleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <polyline points="11 17 6 12 11 7" />
      <polyline points="18 17 13 12 18 7" />
    </Svg>
  );
}
