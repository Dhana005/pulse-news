export default function Footer() {
  return (
    <footer className="border-t border-border px-4 md:px-10 py-7 md:py-9 flex flex-col md:flex-row items-center justify-between gap-5 text-center md:text-left">
      <div className="flex items-center gap-2">
        <svg width="22" height="22" viewBox="0 0 30 30" aria-hidden="true">
          <polyline
            points="1,15 8,15 11,6 15,24 19,10 22,15 29,15"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="font-brand font-bold text-[15px]">PulseNews</span>
      </div>
      <div className="flex gap-5 text-[13.5px] text-text-muted">
        <a href="#">எங்களை பற்றி</a>
        <a href="#">தொடர்பு</a>
        <a href="#">தனியுரிமைக் கொள்கை</a>
      </div>
      <span className="text-[13px] text-text-faint">தமிழ் · English (விரைவில்)</span>
    </footer>
  );
}
