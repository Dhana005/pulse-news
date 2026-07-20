import Link from "next/link";

export default function Logo({ size = 30 }: { size?: number }) {
  return (
    <Link href="/ta" className="flex items-center gap-2.5 shrink-0">
      <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
        <polyline
          points="1,15 8,15 11,6 15,24 19,10 22,15 29,15"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-brand font-extrabold text-[22px] tracking-tight">
        Pulse<span className="text-accent">News</span>
      </span>
    </Link>
  );
}
