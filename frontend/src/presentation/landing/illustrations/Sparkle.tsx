/** Decorative four-point star (or dot) doodle, coloured via the `color` prop. */

type Props = {
  className?: string;
  color?: string;
  size?: number;
  variant?: "star" | "dot";
};

export function Sparkle({ className, color = "var(--g-blue)", size = 24, variant = "star" }: Props) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {variant === "dot" ? (
        <circle cx="12" cy="12" r="7" style={{ fill: color }} />
      ) : (
        <path
          d="M12 2 L13.6 9.4 L21 11 L13.6 12.6 L12 20 L10.4 12.6 L3 11 L10.4 9.4 Z"
          style={{ fill: color }}
        />
      )}
    </svg>
  );
}
