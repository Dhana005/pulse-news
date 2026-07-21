import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "பயன்பாட்டு விதிமுறைகள் — PulseNews",
};

export default function TermsPage() {
  return (
    <div className="flex flex-col flex-1">
      <Header activeKey="" />
      <main className="max-w-[820px] w-full mx-auto px-4 md:px-10 pt-8 md:pt-12 pb-14 md:pb-[70px] flex-1">
        <h1 className="text-[26px] md:text-[32px] font-bold m-0 mb-6">பயன்பாட்டு விதிமுறைகள்</h1>

        <div className="flex flex-col gap-5 text-[15px] leading-[1.8] text-text-muted">
          <p className="m-0">
            PulseNews தளத்தைப் பயன்படுத்துவதன் மூலம், கீழே கூறப்பட்டுள்ள விதிமுறைகள் மற்றும் நிபந்தனைகளை நீங்கள்
            ஏற்றுக்கொள்கிறீர்கள். இந்தத் தளத்தைப் பயன்படுத்தும் முன் இவற்றை கவனமாகப் படிக்கவும்.
          </p>

          <section>
            <h2 className="text-[18px] font-bold text-text m-0 mb-2">தளத்தின் தன்மை</h2>
            <p className="m-0">
              PulseNews ஒரு செய்தி திரட்டி (aggregator) தளம். இங்கு காட்டப்படும் தலைப்புச் செய்திகள், சுருக்கங்கள்,
              படங்கள் மற்றும் வீடியோக்கள் பல்வேறு மூல வெளியீட்டாளர்களிடமிருந்து பெறப்பட்டு, அவர்களின் பெயருடன்
              காட்டப்படுகின்றன. முழு உள்ளடக்கத்திற்கான உரிமை அந்தந்த மூல வெளியீட்டாளர்களையே சேரும்.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-bold text-text m-0 mb-2">உள்ளடக்கத்தின் துல்லியம்</h2>
            <p className="m-0">
              செய்திகளை துல்லியமாகவும் சரியான நேரத்திலும் காட்ட நாங்கள் முயற்சிக்கிறோம். எனினும், மூல
              வெளியீட்டாளரிடமிருந்து பெறப்படும் உள்ளடக்கத்தின் துல்லியம், முழுமை அல்லது சரியான தன்மைக்கு PulseNews
              பொறுப்பேற்காது. எந்தவொரு செய்தியின் திருத்தத்திற்கும் மூல வெளியீட்டாளரைத் தொடர்பு கொள்ளுமாறு
              பரிந்துரைக்கிறோம்.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-bold text-text m-0 mb-2">மூன்றாம் தரப்பு இணைப்புகள்</h2>
            <p className="m-0">
              இந்தத் தளத்தில் உள்ள செய்திகள் மூல வெளியீட்டாளரின் தளத்திற்கான இணைப்புகளைக் கொண்டுள்ளன. அந்தத்
              தளங்களின் உள்ளடக்கம், தனியுரிமைக் கொள்கைகள் அல்லது நடைமுறைகளுக்கு PulseNews பொறுப்பாகாது.
              மூன்றாம் தரப்பு தளங்களைப் பயன்படுத்தும்போது ஏற்படும் எந்தவொரு பாதிப்புக்கும் பயனரே பொறுப்பு.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-bold text-text m-0 mb-2">அறிவுசார் சொத்துரிமை</h2>
            <p className="m-0">
              PulseNews-இன் பெயர், லோகோ மற்றும் தள வடிவமைப்பு PulseNews-க்கு சொந்தமானவை. மூல வெளியீட்டாளர்களின்
              கட்டுரைகள், படங்கள் மற்றும் வீடியோக்களுக்கான அறிவுசார் சொத்துரிமை அந்தந்த வெளியீட்டாளர்களுக்கே
              உரியது.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-bold text-text m-0 mb-2">பொறுப்பு வரம்பு</h2>
            <p className="m-0">
              இந்தத் தளத்தைப் பயன்படுத்துவதால் ஏற்படும் நேரடி அல்லது மறைமுக இழப்புகளுக்கு PulseNews பொறுப்பேற்காது.
              தளம் தடையின்றி இயங்கும் என்றோ, எப்போதும் கிடைக்கும் என்றோ உத்தரவாதம் அளிக்கப்படவில்லை.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-bold text-text m-0 mb-2">விதிமுறை மாற்றங்கள்</h2>
            <p className="m-0">
              இந்த பயன்பாட்டு விதிமுறைகள் அவ்வப்போது புதுப்பிக்கப்படலாம். தொடர்ந்து இந்தத் தளத்தைப் பயன்படுத்துவது,
              புதுப்பிக்கப்பட்ட விதிமுறைகளை நீங்கள் ஏற்றுக்கொள்கிறீர்கள் என்பதைக் குறிக்கும்.
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
