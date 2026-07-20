import PlaceholderMedia from "./PlaceholderMedia";

export default function ArticleMedia({
  imageUrl,
  alt,
  className = "",
}: {
  imageUrl?: string;
  alt: string;
  className?: string;
}) {
  if (!imageUrl) {
    return <PlaceholderMedia className={className} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- images come from
    // many different publisher hosts; not worth a remotePatterns allowlist for v1.
    <img
      src={imageUrl}
      alt={alt}
      loading="lazy"
      className={`object-cover rounded-lg w-full h-full ${className}`}
    />
  );
}
