import { ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen" dir="rtl">
      {/* Form Side (Content) - Now on the right side in RTL layout flow */}
      <div className="relative flex flex-1 flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24 overflow-hidden">
        {/* Subtle background glow for mobile */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-64 bg-gradient-to-b from-primary/5 to-transparent lg:hidden pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl lg:hidden pointer-events-none" />
        
        <div className="relative mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-12 flex flex-col lg:hidden items-center text-center">
             <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20 mb-4 transition-transform hover:scale-105 duration-300">
              <span className="text-2xl font-bold italic">S</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Skale CRM</h2>
            <p className="text-slate-500 mt-2 font-medium">המערכת החכמה לניהול העסק שלך</p>
          </div>
          <div dir="rtl" className="bg-white/40 backdrop-blur-sm lg:bg-transparent p-2 rounded-3xl">
            {children}
          </div>
        </div>
      </div>

      {/* Visual/Branding (Desktop Only) - Now on the left side in RTL layout flow */}
      <div className="relative hidden w-0 flex-1 lg:block bg-slate-900 overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[100px]" />
        
        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white text-right">
          <div>
            <Link href="/" className="flex items-center gap-3 justify-start">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-xl">
                <span className="text-2xl font-bold italic tracking-tighter">S</span>
              </div>
              <span className="text-3xl font-bold tracking-tight">Skale CRM</span>
            </Link>
          </div>

          <div className="max-w-xl">
            <h2 className="text-5xl font-extrabold leading-tight tracking-tight mb-8 text-right">
              נהל את העסק שלך <br />
              <span className="text-primary-foreground/80 underline decoration-primary/50 underline-offset-8">בצורה חכמה יותר</span>
            </h2>
            
            <div className="space-y-6">
              {[
                { title: "ניהול לידים מתקדם", desc: "מעקב אוטומטי אחר כל פנייה, ניהול סטטוסים ותזכורות חכמות." },
                { title: "אוטומציות חכמות", desc: "חסוך זמן יקר עם אוטומציות מובנות לשליחת הודעות ומשימות." },
                { title: "דוחות ותובנות", desc: "ניתוח נתונים בזמן אמת כדי שתוכל לקבל החלטות מבוססות נתונים." }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 group text-right">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10 group-hover:bg-primary/20 group-hover:border-primary/30 transition-all duration-300">
                    <CheckCircle2 className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold mb-1">{item.title}</h4>
                    <p className="text-slate-400 leading-relaxed text-lg">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 text-right">
            <p className="text-slate-500 text-sm">© 2026 Skale CRM. כל הזכויות שמורות.</p>
          </div>
        </div>

        {/* Abstract Dashboard-like UI element decoration */}
        <div className="absolute bottom-0 left-0 w-[80%] h-[40%] translate-x-[-10%] translate-y-[20%] opacity-20 pointer-events-none rotate-[5deg]">
          <div className="w-full h-full bg-white/10 rounded-2xl border border-white/20 p-6 flex flex-col gap-4">
            <div className="flex gap-4 items-center">
              <div className="h-8 w-24 bg-white/20 rounded-lg"></div>
              <div className="h-8 w-8 bg-white/20 rounded-full ms-auto"></div>
            </div>
            <div className="grid grid-cols-3 gap-4 flex-1">
              <div className="bg-white/5 rounded-xl border border-white/10"></div>
              <div className="bg-white/5 rounded-xl border border-white/10 col-span-2"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
