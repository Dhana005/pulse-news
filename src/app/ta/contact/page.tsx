import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "தொடர்பு கொள்ள — PulseNews",
};

const CONTACT_EMAIL = "pulsenewscast@gmail.com";

export default function ContactPage() {
  return (
    <div className="flex flex-col flex-1">
      <Header activeKey="" />
      <main className="max-w-[820px] w-full mx-auto px-4 md:px-10 pt-8 md:pt-12 pb-14 md:pb-[70px] flex-1">
        <h1 className="text-[26px] md:text-[32px] font-bold m-0 mb-6">தொடர்பு கொள்ள</h1>

        <div className="flex flex-col gap-5 text-[15px] leading-[1.8] text-text-muted">
          <p className="m-0">
            PulseNews தொடர்பாக ஏதேனும் கேள்விகள், கருத்துகள் அல்லது பிரச்சினைகள் இருந்தால் கீழே உள்ள மின்னஞ்சல்
            முகவரி வழியாக எங்களைத் தொடர்பு கொள்ளலாம்.
          </p>

          <section>
            <h2 className="text-[18px] font-bold text-text m-0 mb-2">மின்னஞ்சல்</h2>
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent font-semibold text-[16px]">
              {CONTACT_EMAIL}
            </a>
          </section>

          <section>
            <h2 className="text-[18px] font-bold text-text m-0 mb-2">செய்தியில் தவறு கண்டீர்களா?</h2>
            <p className="m-0">
              ஒரு செய்தியில் தவறு இருப்பதாகக் கருதினால், மேலே உள்ள மின்னஞ்சலில் செய்தியின் இணைப்பையும்
              (URL) தவறின் விவரத்தையும் குறிப்பிட்டு அனுப்பவும். மூல வெளியீட்டாளரின் கட்டுரையிலிருந்து அப்படியே
              எடுக்கப்பட்ட தவறுகள் தொடர்பாக, திருத்தத்திற்கு மூல வெளியீட்டாளரையும் தொடர்பு கொள்ளுமாறு பரிந்துரைக்கிறோம்.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-bold text-text m-0 mb-2">மேலும் விவரங்களுக்கு</h2>
            <p className="m-0">
              PulseNews குறித்த பொதுவான கேள்விகளுக்கு எங்கள்{" "}
              <Link href="/ta/faq" className="text-accent font-semibold">
                அடிக்கடி கேட்கப்படும் கேள்விகள்
              </Link>{" "}
              பக்கத்தையும், PulseNews பற்றிய மேலும் தகவல்களுக்கு{" "}
              <Link href="/ta/about" className="text-accent font-semibold">
                எங்களை பற்றி
              </Link>{" "}
              பக்கத்தையும் பார்வையிடவும்.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
