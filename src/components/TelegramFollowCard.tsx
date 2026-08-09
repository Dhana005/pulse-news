import { TELEGRAM_CHANNELS, getCategoryLabel } from "@/lib/categories";

export default function TelegramFollowCard({ category }: { category: string }) {
  const href = TELEGRAM_CHANNELS[category];
  if (!href) return null;

  return (
    <div className="bg-surface border border-border rounded-[10px] p-5">
      <h3 className="text-[15px] font-bold mb-3.5 m-0">
        {getCategoryLabel(category)} அப்டேட்கள்
      </h3>
      <p className="text-[14px] leading-[1.7] text-text-muted m-0 mb-3.5">
        இந்தப் பிரிவின் சமீபத்திய செய்திகளை Telegram-இல் உடனுக்குடன் பெற எங்கள் சேனலைப் பின்தொடருங்கள்.
      </p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-[13.5px] text-white"
        style={{ background: "#26A5E4" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M21.5 3.5 2.7 10.9c-1.2.5-1.2 1.2-.2 1.5l4.8 1.5 1.8 5.6c.2.6.4.8.8.8.4 0 .6-.2.9-.5l2.2-2.1 4.6 3.4c.8.5 1.4.2 1.6-.8L22.8 5c.3-1.3-.5-1.9-1.3-1.5z" />
        </svg>
        Telegram-இல் பின்தொடர
      </a>
    </div>
  );
}
