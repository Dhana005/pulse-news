import Link from "next/link";

export default function HoroscopeTeaser() {
  return (
    <div className="bg-surface border border-border rounded-[10px] p-5">
      <h3 className="text-[15px] font-bold mb-3.5 m-0">இன்றைய ராசி பலன்</h3>
      <p className="text-[14px] leading-[1.7] text-text-muted m-0 mb-3">
        இன்று நல்ல வாய்ப்புகள் உங்களைத் தேடி வரும். முழு பலனைக் காண முகப்புப் பக்கத்தைப் பார்க்கவும்.
      </p>
      <Link href="/ta" className="text-[13.5px] font-semibold text-accent">
        முகப்பில் காண →
      </Link>
    </div>
  );
}
