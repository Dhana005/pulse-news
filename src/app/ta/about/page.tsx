import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "எங்களை பற்றி — PulseNews",
  alternates: { canonical: "/ta/about" },
};

export default function AboutPage() {
  return (
    <div className="flex flex-col flex-1">
      <Header activeKey="" />
      <main className="max-w-[820px] w-full mx-auto px-4 md:px-10 pt-8 md:pt-12 pb-14 md:pb-[70px] flex-1">
        <h1 className="text-[26px] md:text-[32px] font-bold m-0 mb-6">எங்களை பற்றி</h1>

        <div className="flex flex-col gap-5 text-[15px] leading-[1.8] text-text-muted">
          <p className="m-0">
            PulseNews (Pulse News Cast) என்பது தமிழகம், இந்தியா, உலகம், வணிகம், தொழில்நுட்பம், விளையாட்டு, சினிமா
            மற்றும் லைஃப் ஸ்டைல் தொடர்பான செய்திகளை பல்வேறு தமிழ் செய்தி வெளியீட்டாளர்களிடமிருந்து ஒரே இடத்தில்
            திரட்டித் தரும் ஒரு தமிழ் செய்தி தளம். உண்மையான செய்திகள், வேகமான வெளியீடு, உங்கள் மொழியில் —
            என்பது எங்கள் நோக்கம்.
          </p>

          <section>
            <h2 className="text-[18px] font-bold text-text m-0 mb-2">நாங்கள் செய்வது என்ன</h2>
            <p className="m-0">
              PulseNews ஒரு திரட்டி (aggregator) தளம் — விகடன், Oneindia Tamil, தினமலர், தினமணி, தந்தி டிவி,
              சன் நியூஸ், போலிமர் நியூஸ் உள்ளிட்ட வெளியீட்டாளர்களிடமிருந்து தலைப்புச் செய்திகளையும்
              சுருக்கங்களையும் ஒரே இடத்தில் தொகுத்துக் காட்டுகிறோம். ஒவ்வொரு செய்தியிலும் அதன் மூல
              வெளியீட்டாளரின் பெயர் தெளிவாகக் காட்டப்பட்டுள்ளது — நாங்கள் அவர்களின் அறிக்கையை எங்கள் சொந்தச்
              செய்தியாகக் காட்டுவதில்லை.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-bold text-text m-0 mb-2">தமிழ்-முதல் அணுகுமுறை</h2>
            <p className="m-0">
              பிற மொழிகளில் மொழிபெயர்க்கப்பட்ட செய்திகளுக்குப் பதிலாக, தமிழ் வாசகர்களுக்காகவே வடிவமைக்கப்பட்ட
              தளமாக PulseNews இயங்குகிறது — தெளிவான தமிழ் எழுத்துரு, எளிய வடிவமைப்பு, மொபைலில் வேகமான
              வாசிப்பு அனுபவம் ஆகியவற்றை முதன்மையாகக் கருதுகிறோம்.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-bold text-text m-0 mb-2">மேலும் விவரங்களுக்கு</h2>
            <p className="m-0">
              PulseNews எவ்வாறு செயல்படுகிறது என்பது குறித்த பொதுவான கேள்விகளுக்கு எங்கள்{" "}
              <Link href="/ta/faq" className="text-accent font-semibold">
                அடிக்கடி கேட்கப்படும் கேள்விகள்
              </Link>{" "}
              பக்கத்தையும், தரவு பயன்பாடு குறித்து எங்கள்{" "}
              <Link href="/ta/privacy" className="text-accent font-semibold">
                தனியுரிமைக் கொள்கையையும்
              </Link>{" "}
              பார்வையிடவும்.
            </p>
          </section>

          <p className="m-0 text-[13px] text-text-faint">Powered by NexivoTek</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
