import { PartyPopper } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Confetti from './Confetti';

type SmartImageProps = {
  src: string;
  alt: string;
  className?: string;
  /** Above-the-fold images load eagerly; everything else is lazy. */
  eager?: boolean;
  width?: number;
  height?: number;
  seed?: number;
};

/**
 * <img> that lazy-loads by default and, if the source fails, falls back to a
 * branded confetti placeholder instead of the browser's broken-image icon.
 */
export default function SmartImage({ src, alt, className = '', eager = false, width, height, seed = 3 }: SmartImageProps) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // An image that errored before React attached onError still needs the fallback.
  useEffect(() => {
    setFailed(false);
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, [src]);

  if (failed) {
    return (
      <div
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        className={`relative flex items-center justify-center overflow-hidden bg-brand-50 ${className}`}
      >
        <Confetti count={34} seed={seed} maxRadius={7} className="absolute inset-0 opacity-80" />
        <span className="relative flex size-16 items-center justify-center rounded-full bg-white text-brand-600 shadow-[0_6px_18px_-8px_rgb(216_27_106/0.5)]">
          <PartyPopper className="size-7" aria-hidden="true" />
        </span>
      </div>
    );
  }

  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
