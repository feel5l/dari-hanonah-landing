"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Heart, Shield, Camera, Utensils, Award, BookOpen, 
  ChevronRight, Star, Clock, CheckCircle2, Menu, X, ArrowRight 
} from "lucide-react";

// --- Mock Data ---
const programs = [
  {
    id: "infants",
    title: "الرضع (من 3 أشهر إلى سنة)",
    description: "رعاية حنونة تضمن بيئة آمنة وهادئة لنمو طفلك السليم مع رعاية فردية فائقة.",
    features: ["تتبع دقيق للنوم والتغذية", "ألعاب تحفيز حسي وبصري", "ممرضة مقيمة على مدار الساعة"],
    color: "bg-orange-50 border-orange-200 text-orange-600"
  },
  {
    id: "toddlers",
    title: "الشنابل / الصغار (1 - 3 سنوات)",
    description: "استكشاف وتنمية مهارات الكلام والحركة من خلال اللعب التفاعلي والأنشطة الجماعية.",
    features: ["تطوير المهارات اللغوية والتعبيرية", "أنشطة حركية وألعاب خارجية", "بداية التدريب على الاعتماد على النفس"],
    color: "bg-teal-50 border-teal-200 text-teal-600"
  },
  {
    id: "preschool",
    title: "التمهيدي (3 - 5 سنوات)",
    description: "تجهيز متكامل للمرحلة المدرسية عبر منهج ذكي يدمج بين العلوم، الفنون، والقيم الأخلاقية.",
    features: ["منهج STEAM التأسيسي المبكر", "القرآن الكريم والآداب الإسلامية", "أنشطة الذكاء الاجتماعي والعاطفي"],
    color: "bg-yellow-50 border-yellow-200 text-yellow-700"
  }
];

const timeline = [
  { time: "07:30 ص - 08:30 ص", title: "الاستقبال والترحيب", desc: "بدء يوم مشرق بأنشطة هادئة وموسيقا تربوية." },
  { time: "08:30 ص - 09:15 ص", title: "وجبة الإفطار الصحية", desc: "تناول وجبة متكاملة ومعدة من مكونات عضوية طازجة." },
  { time: "09:15 ص - 10:30 ص", title: "حلقة الاستكشاف والتعليم (STEAM)", desc: "تجارب علمية مبسطة، مكعبات ذكية، وتطوير المهارات المعرفية." },
  { time: "10:30 ص - 11:30 ص", title: "اللعب الحر والأنشطة الحركية", desc: "تفريغ طاقات الأطفال في الساحة الخارجية الآمنة والمجهزة." },
  { time: "11:30 ص - 12:30 م", title: "وجبة الغداء وقصة ما قبل القيلولة", desc: "تعزيز آداب الطعام يليها سرد قصص ملهمة هادفة." }
];

const faqs = [
  { q: "هل يمكنني مراقبة طفلي خلال اليوم؟", a: "نعم تماماً، نوفر بثاً حياً ومباشراً ومشفراً عبر كاميرات ذكية من خلال تطبيقنا الخاص للاطمئنان على طفلك في أي وقت." },
  { q: "ما هي معايير السلامة والأمان لديكم؟", a: "جميع زوايا المركز مغطاة بمطاط واقٍ لحماية الأطفال، الأبواب تعمل بنظام دخول ذكي، وموظفاتنا مدربات بالكامل على الإسعافات الأولية للأطفال." },
  { q: "ما هي سياسة الوجبات المتبعة؟", a: "جميع الوجبات تُطهى يومياً داخل المركز بإشراف أخصائية تغذية، ونعتمد بنسبة 100% على مكونات طازجة وعضوية خالية من المواد الحافظة والسكر المكرر." }
];

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState("infants");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const activeProgram = programs.find((program) => program.id === activeTab) ?? programs[0];

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans antialiased text-slate-800 selection:bg-teal-100 dir-rtl" dir="rtl">
      
      {/* 1. NAVIGATION */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-orange-400 to-amber-300 p-2.5 rounded-2xl shadow-sm text-white">
              <Heart className="w-6 h-6 fill-white" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-l from-slate-900 to-slate-700 bg-clip-text text-transparent">
              دار الحنونة
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-teal-600 transition">المميزات</a>
            <a href="#programs" className="hover:text-teal-600 transition">البرامج التعليمية</a>
            <a href="#schedule" className="hover:text-teal-600 transition">الجدول اليومي</a>
            <a href="#faqs" className="hover:text-teal-600 transition">الأسئلة الشائعة</a>
          </nav>

          <div className="hidden md:block">
            <button className="bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm px-5 py-2.5 rounded-full transition shadow-sm hover:shadow-teal-100 active:scale-95">
              احجز جولة تعريفية
            </button>
          </div>

          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-slate-600">
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed top-20 left-0 right-0 bg-white border-b border-slate-100 p-6 z-40 flex flex-col gap-4 shadow-lg text-center"
          >
            <a href="#features" onClick={() => setIsMenuOpen(false)}>المميزات</a>
            <a href="#programs" onClick={() => setIsMenuOpen(false)}>البرامج التعليمية</a>
            <a href="#schedule" onClick={() => setIsMenuOpen(false)}>الجدول اليومي</a>
            <a href="#faqs" onClick={() => setIsMenuOpen(false)}>الأسئلة الشائعة</a>
            <button className="bg-teal-600 text-white px-5 py-3 rounded-full font-medium mt-2">احجز جولة تعريفية</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          <motion.div 
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-right space-y-6"
          >
            <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-600 text-xs font-semibold px-4 py-1.5 rounded-full border border-orange-100">
              <Star className="w-3.5 h-3.5 fill-orange-500 text-orange-500" /> بيئة تربوية ذكية وآمنة لأطفالك
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.15]">
              حيث تبدأ <span className="text-teal-600 relative">الخطوات الصغيرة</span> بنجاحات عظيمة!
            </h1>
            <p className="text-slate-600 text-lg leading-relaxed max-w-xl">
              في مركز <strong>دار الحنونة</strong>، ندمج بين الرعاية العاطفية الفائقة وأحدث مناهج التعليم المبكر القائمة على الاكتشاف، لنمو بدني وعقلي متوازن لطفلك.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-start">
              <button className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-4 rounded-2xl transition shadow-lg shadow-orange-100 flex items-center justify-center gap-2 group">
                سجل طفلك الآن
                <ArrowRight className="w-4 h-4 group-hover:-translate-x-1 transition" />
              </button>
              <button className="bg-white hover:bg-slate-50 text-slate-700 font-semibold px-8 py-4 rounded-2xl border border-slate-200 transition flex items-center justify-center gap-2">
                شاهد الجولة الافتراضية
              </button>
            </div>
          </motion.div>

          {/* Right Side Playful Grid Graphics */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative grid grid-cols-12 gap-4 h-[450px]"
          >
            {/* Visual placeholder box simulating child photos creatively */}
            <div className="col-span-8 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-[2.5rem] shadow-xl relative overflow-hidden flex flex-col justify-end p-8 text-white">
              <div className="absolute top-6 right-6 bg-white/20 backdrop-blur-md rounded-full p-3 text-white">
                <Heart className="w-6 h-6 fill-white" />
              </div>
              <h3 className="text-2xl font-bold">أنشطة ترفيهية تفاعلية</h3>
              <p className="text-white/80 text-sm mt-1">تطور الخيال والعمل الجماعي</p>
            </div>
            <div className="col-span-4 bg-orange-400 rounded-3xl shadow-lg relative overflow-hidden flex items-center justify-center text-white">
              <BookOpen className="w-12 h-12" />
            </div>
            <div className="col-span-4 bg-amber-300 rounded-3xl shadow-lg flex items-center justify-center text-slate-800">
              <Star className="w-12 h-12 fill-slate-800" />
            </div>
            <div className="col-span-8 bg-slate-900 rounded-[2rem] shadow-xl relative overflow-hidden flex flex-col justify-end p-8 text-white">
              <h3 className="text-xl font-bold">كادر تعليمي متخصص</h3>
              <p className="text-slate-400 text-xs mt-1">حاصلات على شهادات تربية الطفل المبكرة</p>
            </div>
          </motion.div>

        </div>
      </section>

      {/* 3. BENTO FEATURE GRID */}
      <section id="features" className="py-20 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl font-bold text-slate-900">لماذا يثق الآباء بدار الحنونة؟</h2>
            <p className="text-slate-600">مزايا حصرية صُممت بعناية لتمنحك راحة البال التامة طوال فترة وجود طفلك معنا.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: Large - Live Cam */}
            <motion.div 
              whileHover={{ scale: 1.01, y: -4 }}
              className="md:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group"
            >
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-teal-50 rounded-full blur-2xl opacity-70 group-hover:opacity-100 transition" />
              <div className="relative flex items-start justify-between">
                <div className="bg-teal-600 text-white p-3 rounded-2xl shadow-sm">
                  <Camera className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold text-teal-600 bg-teal-50 px-3 py-1 rounded-full">مباشر 24/7</span>
              </div>
              <div className="relative mt-8 space-y-2">
                <h3 className="text-2xl font-bold text-slate-900">بث حيّ ومشفّر لكاميرات المركز</h3>
                <p className="text-slate-600 leading-relaxed max-w-lg">
                  اطمئن على طفلك في أي لحظة عبر تطبيقنا الخاص، مع بثٍّ آمن ومشفّر من كل الصفوف والساحات.
                </p>
              </div>
            </motion.div>

            {/* Card 2: Safety */}
            <motion.div 
              whileHover={{ scale: 1.01, y: -4 }}
              className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-sm flex flex-col justify-between"
            >
              <div className="bg-white/10 p-3 rounded-2xl w-fit">
                <Shield className="w-6 h-6" />
              </div>
              <div className="mt-8 space-y-2">
                <h3 className="text-xl font-bold">سلامة وأمان بلا حدود</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  دخول ذكي، زوايا مبطّنة، وكادر مدرَّب على الإسعافات الأولية.
                </p>
              </div>
            </motion.div>

            {/* Card 3: Meals */}
            <motion.div 
              whileHover={{ scale: 1.01, y: -4 }}
              className="bg-orange-50 border border-orange-100 p-8 rounded-[2rem] shadow-sm flex flex-col justify-between"
            >
              <div className="bg-orange-500 text-white p-3 rounded-2xl w-fit">
                <Utensils className="w-6 h-6" />
              </div>
              <div className="mt-8 space-y-2">
                <h3 className="text-xl font-bold text-slate-900">وجبات عضوية طازجة</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  تُطهى يومياً بإشراف أخصائية تغذية، دون مواد حافظة أو سكر مكرر.
                </p>
              </div>
            </motion.div>

            {/* Card 4: Certified staff */}
            <motion.div 
              whileHover={{ scale: 1.01, y: -4 }}
              className="md:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="bg-amber-400 text-white p-3 rounded-2xl">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">كادر تعليمي معتمد ومتخصص</h3>
              </div>
              <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {["شهادات في تربية الطفل المبكرة", "تدريب دوري على أحدث المناهج", "نسبة إشراف عالية لكل طفل", "متابعة فردية لتطور كل طفل"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-slate-600 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

          </div>
        </div>
      </section>

      {/* 4. PROGRAMS (tabbed) */}
      <section id="programs" className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <h2 className="text-3xl font-bold text-slate-900">برامجنا التعليمية</h2>
            <p className="text-slate-600">مسارات مصمّمة حسب كل مرحلة عمرية لتلبية احتياجات طفلك بدقة.</p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {programs.map((program) => (
              <button
                key={program.id}
                onClick={() => setActiveTab(program.id)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium border transition ${
                  activeTab === program.id
                    ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-teal-300"
                }`}
              >
                {program.title}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeProgram.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
              className={`max-w-4xl mx-auto rounded-[2rem] border p-8 lg:p-12 ${activeProgram.color}`}
            >
              <h3 className="text-2xl font-bold text-slate-900">{activeProgram.title}</h3>
              <p className="text-slate-600 mt-3 leading-relaxed">{activeProgram.description}</p>
              <ul className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {activeProgram.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 bg-white/70 rounded-2xl p-4 text-slate-700 text-sm">
                    <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button className="mt-8 inline-flex items-center gap-2 text-teal-700 font-semibold hover:gap-3 transition-all">
                اعرف المزيد عن هذا البرنامج
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* 5. DAILY SCHEDULE (timeline) */}
      <section id="schedule" className="py-20 bg-slate-50/50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <h2 className="text-3xl font-bold text-slate-900">جدول يومٍ نموذجي</h2>
            <p className="text-slate-600">يومٌ متوازن بين التعلّم واللعب والتغذية والراحة.</p>
          </div>

          <div className="relative space-y-6">
            {timeline.map((slot, index) => (
              <motion.div
                key={slot.title}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="flex gap-4 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm"
              >
                <div className="bg-teal-50 text-teal-600 rounded-2xl p-3 h-fit">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-teal-600">{slot.time}</span>
                  <h3 className="text-lg font-bold text-slate-900">{slot.title}</h3>
                  <p className="text-slate-600 text-sm mt-1">{slot.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FAQ (accordion) */}
      <section id="faqs" className="py-20">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <h2 className="text-3xl font-bold text-slate-900">الأسئلة الشائعة</h2>
            <p className="text-slate-600">كل ما يهمّك معرفته قبل تسجيل طفلك معنا.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={faq.q} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full flex items-center justify-between gap-4 p-5 text-right"
                  >
                    <span className="font-semibold text-slate-900">{faq.q}</span>
                    <ChevronRight
                      className={`w-5 h-5 text-teal-600 flex-shrink-0 transition-transform ${isOpen ? "-rotate-90" : "rotate-180"}`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="px-5 pb-5 text-slate-600 leading-relaxed text-sm"
                      >
                        {faq.a}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. CTA + FOOTER */}
      <footer className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black">جاهزون لاستقبال طفلك في دار الحنونة</h2>
          <p className="text-slate-400 max-w-xl mx-auto">احجز جولة تعريفية اليوم وتعرّف على بيئتنا التربوية الآمنة عن قرب.</p>
          <button className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-4 rounded-2xl transition inline-flex items-center gap-2">
            احجز جولة تعريفية
            <ArrowRight className="w-4 h-4" />
          </button>
          <div className="pt-10 border-t border-white/10 text-slate-500 text-sm">
            © {new Date().getFullYear()} دار الحنونة. جميع الحقوق محفوظة.
          </div>
        </div>
      </footer>

    </div>
  );
}
