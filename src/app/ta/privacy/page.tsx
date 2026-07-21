import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "தனியுரிமைக் கொள்கை — PulseNews",
};

export default function PrivacyPage() {
  return (
    <div className="flex flex-col flex-1">
      <Header activeKey="" />
      <main className="max-w-[820px] w-full mx-auto px-4 md:px-10 pt-8 md:pt-12 pb-14 md:pb-[70px] flex-1">
        <h1 className="text-[26px] md:text-[32px] font-bold m-0 mb-6">தனியுரிமைக் கொள்கை</h1>

        <div className="flex flex-col gap-5 text-[15px] leading-[1.8] text-text-muted">
          <p className="m-0">
            PulseNews (&quot;நாங்கள்&quot;) இந்த தளத்தைப் பயன்படுத்தும் பயனர்களின் தனியுரிமையை மதிக்கிறது. இந்தக்
            கொள்கை, உங்கள் தரவை நாங்கள் எவ்வாறு சேகரிக்கிறோம், பயன்படுத்துகிறோம் மற்றும் பாதுகாக்கிறோம் என்பதை
            விளக்குகிறது.
          </p>

          <section>
            <h2 className="text-[18px] font-bold text-text m-0 mb-2">விளம்பரங்கள் மற்றும் குக்கீகள்</h2>
            <p className="m-0">
              விளம்பரங்களை வழங்க இந்தத் தளம் Google AdSense-ஐப் பயன்படுத்துகிறது. Google உள்ளிட்ட மூன்றாம் தரப்பு
              விற்பனையாளர்கள், இந்தத் தளத்திலும் இணையத்தில் உள்ள பிற தளங்களிலும் உங்கள் முந்தைய வருகைகளின்
              அடிப்படையில் விளம்பரங்களைக் காட்ட குக்கீகளைப் பயன்படுத்துகின்றனர். Google-இன் விளம்பர குக்கீ
              பயன்பாட்டின் காரணமாக, Google மற்றும் அதன் பங்குதாரர்கள் இந்தத் தளத்திற்கான உங்கள் வருகைகள் மற்றும்/
              அல்லது இணையத்தில் உள்ள பிற தளங்களுக்கான உங்கள் வருகைகளின் அடிப்படையில் விளம்பரங்களை உங்களுக்குக்
              காட்டலாம்.
            </p>
            <p className="m-0 mt-2.5">
              தனிப்பயனாக்கப்பட்ட விளம்பரங்களிலிருந்து விலக (opt out) விரும்பினால்,{" "}
              <a
                href="https://adssettings.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent font-semibold"
              >
                Google Ad Settings
              </a>{" "}
              பக்கத்தைப் பார்வையிடவும்.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-bold text-text m-0 mb-2">நாங்கள் சேகரிக்கும் தகவல்கள்</h2>
            <p className="m-0">
              நீங்கள் எங்கள் செய்திமடல் (newsletter) சந்தா பதிவுக்கு உங்கள் மின்னஞ்சல் முகவரியை உள்ளிடும்போது
              மட்டுமே அதை நேரடியாகச் சேகரிக்கிறோம். மேலும், எந்தெந்தச் செய்திகள் அதிகம் படிக்கப்படுகின்றன என்பதை
              அறிய, தளத்தின் பயன்பாட்டைக் கண்காணிக்கும் அடிப்படைப் புள்ளிவிவரங்களை (page views) சேகரிக்கிறோம் —
              இதில் தனிப்பட்ட அடையாளம் காணக்கூடிய தகவல் எதுவும் இல்லை.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-bold text-text m-0 mb-2">மூன்றாம் தரப்பு உள்ளடக்கம்</h2>
            <p className="m-0">
              இந்தத் தளத்தில் உள்ள செய்திகள் பல்வேறு தமிழ் செய்தி வெளியீட்டாளர்களிடமிருந்து திரட்டப்படுகின்றன.
              ஒவ்வொரு செய்தியிலும் அதன் மூல வெளியீட்டாளரின் இணைப்பு தரப்பட்டுள்ளது; முழு செய்தியையும் படிக்க
              அவர்களின் தளத்திற்குச் செல்லும்போது, அந்தந்தத் தளங்களின் தனியுரிமைக் கொள்கைகள் பொருந்தும்.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-bold text-text m-0 mb-2">கொள்கை மாற்றங்கள்</h2>
            <p className="m-0">
              இந்தத் தனியுரிமைக் கொள்கை அவ்வப்போது புதுப்பிக்கப்படலாம். புதுப்பிப்புகள் இந்தப் பக்கத்தில்
              வெளியிடப்படும்.
            </p>
          </section>

          <p className="m-0 text-[13px] text-text-faint">
            கடைசியாகப் புதுப்பிக்கப்பட்டது: {new Date().toLocaleDateString("ta-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
