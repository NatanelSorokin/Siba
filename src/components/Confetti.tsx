import { useMemo } from 'react';

const BRAND_DOTS = ['var(--color-brand-400)', 'var(--color-sun-400)', 'var(--color-lagoon-400)'];

/** Small seeded PRNG so the dot layout is stable between renders and builds. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type ConfettiProps = {
  count?: number;
  seed?: number;
  minRadius?: number;
  maxRadius?: number;
  colors?: string[];
  /** Stagger the dots in on mount (used once, in the hero). */
  animate?: boolean;
  className?: string;
};

/**
 * The scattered polka-dot confetti from the logo, drawn as SVG.
 * Positions are percentages, so it fills any box without stretching the dots.
 */
export default function Confetti({
  count = 48,
  seed = 7,
  minRadius = 2,
  maxRadius = 9,
  colors = BRAND_DOTS,
  animate = false,
  className = '',
}: ConfettiProps) {
  const dots = useMemo(() => {
    const rand = seeded(seed);
    return Array.from({ length: count }, (_, i) => ({
      key: i,
      cx: `${(rand() * 100).toFixed(2)}%`,
      cy: `${(rand() * 100).toFixed(2)}%`,
      // square the random value so most dots are small, a few are large
      r: +(minRadius + rand() ** 2 * (maxRadius - minRadius)).toFixed(1),
      fill: colors[Math.floor(rand() * colors.length)],
      delay: Math.round(rand() * 700),
    }));
  }, [count, seed, minRadius, maxRadius, colors]);

  return (
    <svg aria-hidden="true" focusable="false" className={className} width="100%" height="100%">
      {dots.map((d) => (
        <circle
          key={d.key}
          cx={d.cx}
          cy={d.cy}
          r={d.r}
          fill={d.fill}
          className={animate ? 'confetti-dot' : undefined}
          style={animate ? { animationDelay: `${d.delay}ms` } : undefined}
        />
      ))}
    </svg>
  );
}
