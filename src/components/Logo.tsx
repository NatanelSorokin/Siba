type LogoProps = {
  className?: string;
  /** Crop tighter to the pink disc when the logo is small. */
  compact?: boolean;
  eager?: boolean;
  alt?: string;
};

/**
 * The round brand mark, cropped from /2.png (a square with confetti around the disc).
 * The disc's centre sits at ~48.5% / 52% of the source image.
 */
export default function Logo({ className = '', compact = false, eager = false, alt = 'סיבה למסיבה' }: LogoProps) {
  return (
    <span
      className={`relative block shrink-0 overflow-hidden rounded-full bg-white shadow-[0_6px_18px_-10px_rgb(216_27_106/0.55)] ${className}`}
    >
      <img
        src="/2.png"
        alt={alt}
        width={564}
        height={560}
        decoding="async"
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : 'auto'}
        className={`absolute left-1/2 top-1/2 max-w-none -translate-x-[48.5%] -translate-y-[52%] transition-[width,height] duration-500 ease-out-expo ${
          compact ? 'h-[185%] w-[185%]' : 'h-[145%] w-[145%]'
        }`}
      />
    </span>
  );
}
