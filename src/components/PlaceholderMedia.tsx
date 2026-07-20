export default function PlaceholderMedia({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`placeholder-media ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}
