const LINK_COLUMNS = [
  {
    heading: "பிரிவுகள்",
    links: [
      { label: "தமிழகம்", href: "/ta/tamilnadu" },
      { label: "இந்தியா", href: "/ta/india" },
      { label: "உலகம்", href: "/ta/world" },
      { label: "வணிகம்", href: "/ta/business" },
      { label: "தொழில்நுட்பம்", href: "/ta/technology" },
      { label: "விளையாட்டு", href: "/ta/sports" },
      { label: "சினிமா", href: "/ta/cinema" },
      { label: "லைஃப் ஸ்டைல்", href: "/ta/lifestyle" },
    ],
  },
  {
    heading: "நிறுவனம்",
    links: [
      { label: "எங்களை பற்றி", href: "#" },
      { label: "எங்கள் குழு", href: "#" },
      { label: "விளம்பரம் செய்ய", href: "#" },
      { label: "பணியிடங்கள்", href: "#" },
      { label: "தொடர்பு கொள்ள", href: "#" },
    ],
  },
  {
    heading: "உதவி",
    links: [
      { label: "அடிக்கடி கேட்கப்படும் கேள்விகள்", href: "#" },
      { label: "தனியுரிமைக் கொள்கை", href: "/ta/privacy" },
      { label: "பயன்பாட்டு விதிமுறைகள்", href: "#" },
      { label: "தள வரைபடம்", href: "#" },
      { label: "RSS", href: "#" },
    ],
  },
];

const SOCIAL_ICONS = [
  {
    label: "Facebook",
    path: "M14 9h3V6h-3c-1.66 0-3 1.34-3 3v2H9v3h2v6h3v-6h3l1-3h-4v-2c0-.55.45-1 1-1z",
  },
  { label: "X", path: "M4 4l16 16M20 4L4 20" },
  {
    label: "Instagram",
    path: "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm5-1.2a1 1 0 1 0 0 2 1 1 0 0 0 0-2z",
  },
  {
    label: "YouTube",
    path: "M22 12s0-3.2-.4-4.7a2.9 2.9 0 0 0-2-2C17.9 5 12 5 12 5s-5.9 0-7.6.3a2.9 2.9 0 0 0-2 2C2 8.8 2 12 2 12s0 3.2.4 4.7a2.9 2.9 0 0 0 2 2C6.1 19 12 19 12 19s5.9 0 7.6-.3a2.9 2.9 0 0 0 2-2C22 15.2 22 12 22 12zM10 15.5v-7l6 3.5-6 3.5z",
  },
];

export default function Footer() {
  return (
    <footer style={{ background: "#0f2440", color: "rgba(255,255,255,0.85)" }}>
      <div className="max-w-[1240px] w-full mx-auto px-4 md:px-10 pt-10 md:pt-14 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr] gap-8 md:gap-6 mb-10">
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-2">
              <svg
                width="24"
                height="24"
                viewBox="0 0 30 30"
                aria-hidden="true"
              >
                <polyline
                  points="1,15 8,15 11,6 15,24 19,10 22,15 29,15"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="font-brand font-bold text-[17px] text-white">
                PulseNews
              </span>
            </div>
            <p className="text-[13.5px] leading-[1.7] m-0 max-w-[32ch] opacity-80">
              உண்மையான செய்திகள், வேகமான வெளியீடு, உங்கள் மொழியில்.
            </p>
            <div className="flex gap-2.5 mt-1 hidden">
              {SOCIAL_ICONS.map((icon) => (
                <a
                  key={icon.label}
                  href="#"
                  aria-label={icon.label}
                  className="w-8 h-8 rounded-full border flex items-center justify-center shrink-0"
                  style={{ borderColor: "rgba(255,255,255,0.25)" }}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="1.8"
                  >
                    <path d={icon.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {LINK_COLUMNS.map((col) => (
            <div key={col.heading} className="flex flex-col gap-2.5">
              <h3 className="text-[13.5px] font-bold text-white m-0">
                {col.heading}
              </h3>
              {col.links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-[13.5px] opacity-75 hover:opacity-100"
                >
                  {link.label}
                </a>
              ))}
            </div>
          ))}

          <div className="flex flex-col gap-2.5 hidden">
            <h3 className="text-[13.5px] font-bold text-white m-0">
              மொபைல் ஆப்
            </h3>
            <span
              aria-hidden="true"
              className="flex items-center gap-1.5 border rounded-lg px-3 py-2 text-[12px] opacity-70"
              style={{ borderColor: "rgba(255,255,255,0.25)" }}
            >
              GET IT ON Google Play
            </span>
            <span
              aria-hidden="true"
              className="flex items-center gap-1.5 border rounded-lg px-3 py-2 text-[12px] opacity-70"
              style={{ borderColor: "rgba(255,255,255,0.25)" }}
            >
              Download on the App Store
            </span>
          </div>
        </div>

        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 text-[12.5px] opacity-70"
          style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}
        >
          <span>
            © {new Date().getFullYear()} PulseNews. அனைத்து உரிமைகளும்
            பாதுகாக்கப்பட்டவை. · Powered by NexivoTek
          </span>
          <span>தமிழ் | English (விரைவில்)</span>
        </div>
      </div>
    </footer>
  );
}
