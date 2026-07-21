import PlaceholderMedia from "./PlaceholderMedia";

export default function ArticleMedia({
  imageUrl,
  alt,
  className = "",
  rounded = true,
}: {
  imageUrl?: string;
  alt: string;
  className?: string;
  // Off for images that are already clipped by a rounded ancestor (e.g. a
  // card with overflow-hidden) — an inner radius there would leave a visible
  // gap at the corners instead of following the ancestor's curve.
  rounded?: boolean;
}) {
  if (!imageUrl) {
    return <PlaceholderMedia className={className} style={rounded ? undefined : { borderRadius: 0 }} />;
  }
  return (
    // Sizing/positioning classes (className) go on this wrapper, never on the
    // <img> itself — the img always just fills it. Putting a fixed size like
    // "w-[92px]" directly on the img would compete in specificity with the
    // img's own hardcoded w-full/h-full, and which one wins depends on
    // Tailwind's generated CSS order, not on the classes' position in the
    // string — unreliable. This way there's no competition to lose.
    <div className={`overflow-hidden ${rounded ? "rounded-lg" : ""} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- images come from
      many different publisher hosts; not worth a remotePatterns allowlist for v1. */}
      <img src={imageUrl} alt={alt} loading="lazy" className="block object-cover w-full h-full" />
    </div>
  );
}
