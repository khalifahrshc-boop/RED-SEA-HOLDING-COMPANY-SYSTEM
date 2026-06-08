import React, { useMemo } from 'react';
import { BookOpen, Printer, ShieldCheck, FileText, ChevronRight, AlertCircle, HardHat, Briefcase, Calculator, Map, Wrench, Users, History, Settings, CheckCircle2, LayoutGrid } from 'lucide-react';
import { Language } from '../lib/translations';
import { cn } from '../lib/utils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { fixHtml2CanvasOklch } from '../lib/pdfUtils';

interface UserGuideProps {
  language: Language;
  company?: any;
}

export function UserGuide({ language, company }: UserGuideProps) {
  const isRtl = language === 'ar';

  const guideContent = useMemo(() => {
    if (language === 'ar') {
      return {
        title: "دليل إدارة نظام ARES CORE المتكامل",
        subtitle: "الدليل التشغيلي الشامل للمشاريع، المالية، والخدمات اللوجستية",
        version: "إصدار 6.5.0 - الفئة الاحترافية",
        downloadBtn: "طباعة الدليل الكامل",
        sections: [
          {
            id: "architecture",
            title: "1. هيكلية النظام والمفاهيم الجوهرية",
            content: "تم تصميم نظام ARES CORE ليكون حلقة وصل رقمية تربط كافة العمليات الميدانية بالمركز الرئيسي للمؤسسة. يعتمد النظام على مبدأ الحقيقة الموحدة حيث يتم مشاركة البيانات بين الأقسام بشكل لحظي.",
            subsections: [
              { name: "تكامل الأقسام", desc: "ترتبط الموارد البشرية مباشرة بالمالية والمشاريع. أي حركة حضور تؤثر تلقائياً في حسابات التكاليف وكشوف الرواتب." },
              { name: "التدقيق اللحظي", desc: "يتم فحص كافة الإدخالات مقابل الميزانيات المعتمدة، ولا يسمح بأي تجاوز مالي دون موافقة المدير المالي." }
            ]
          },
          {
            id: "users",
            title: "2. إدارة المستخدمين والهوية الرقمية",
            content: "الأمان هو الركيزة الأساسية للنظام. تبدأ عملية إضافة مستخدم جديد من خلال لوحة الإعدادات المركزية.",
            subsections: [
              { name: "إضافة الكوادر", desc: "يتم إدخال البريد الإلكتروني الوظيفي، وسيستلم المستخدم رابط دعوة مؤمن عبر Google Identity." },
              { name: "مصفوفة الصلاحيات", desc: "يتم تعيين 'أدوار' (Roles) محددة. لا يمكن لمشرف ميداني الوصول إلى التحويلات البنكية أو شجرة الحسابات." }
            ]
          },
          {
            id: "approvals",
            title: "3. بروتوكولات الموافقة والارتباط",
            content: "يتبع النظام نموذج (Maker-Checker). أي عملية مالية أو إدارية حساسة تتطلب موافقتين على الأقل.",
            subsections: [
              { name: "طلب الميدان", desc: "يتم رفع الطلب من الموقع (مثال: طلب شراء مواد)." },
              { name: "المراجعة المالية", desc: "يقوم قسم المالية بمراجعة الطلب مقابل الميزانية المتبقية وتوافر السيولة." },
              { name: "الاعتماد النهائي", desc: "يتم إصدار أمر الشراء (PO) فقط بعد التوقيع الإلكتروني للمدير المعني." }
            ]
          },
          {
             id: "workforce",
             title: "4. الموارد البشرية والحضور الذكي",
             content: "تتم إدارة آلاف الموظفين والعمالة الخارجية من خلال مجمع موارد موحد.",
             subsections: [
               { name: "تسجيل الحضور", desc: "يتم إدخال الحضور يومياً. النظام يدعم استيراد البيانات من أجهزة البصمة الميدانية." },
               { name: "الرواتب المؤتمتة", desc: "تتحول ساعات الحضور المعتمدة إلى مبالغ نقدية في كشوف الرواتب بنهاية الشهر تلقائياً." }
             ]
          },
          {
            id: "troubleshooting",
            title: "5. فنيات حل المشكلات (Troubleshooting)",
            content: "تم وضع آليات كشف استباقية للأخطاء التقنية والتشغيلية.",
            subsections: [
              { name: "رفض الوصول", desc: "تأكد من أن بريدك الإلكتروني مفعل في مصفوفة المستخدمين. الأخطاء البرمجية يتم الإبلاغ عنها عبر 'مركز التنبيهات'." },
              { name: "تحديث البيانات", desc: "في حال عدم ظهور التحديثات، تأكد من الضغط على زر 'مزامنة' (Sync) في السايدبار." }
            ]
          }
        ],
        footer: "جميع الحقوق محفوظة لمجموعة Ares Core © 2026. نسخ هذا الدليل غير مسموح به."
      };
    }
    return {
      title: "ARES CORE INTEGRATED MANAGEMENT MANUAL",
      subtitle: "Comprehensive Operational Guide for Projects, Finance, and Logistics",
      version: "Version 6.5.0 Professional Grade",
      downloadBtn: "PRINT FULL MANUAL",
      sections: [
        {
          id: "architecture",
          title: "1. System Architecture & Core Concepts",
          content: "ARES CORE is engineered as a digital nexus that bridges field operations with corporate headquarters. The system operates on the 'Single Source of Truth' principle where data is shared across departments in real-time.",
          subsections: [
            { name: "Departmental Integration", desc: "HR connects directly to Finance and Projects. Any attendance movement automatically affects cost accounting and payroll manifests." },
            { name: "Real-time Auditing", desc: "All entries are cross-checked against approved budgets; no financial overrun is permitted without CFO override." }
          ]
        },
        {
          id: "users",
          title: "2. User Management & Digital Identity",
          content: "Security is our foundational pillar. The process of adding a new user begins through the centralized settings panel.",
          subsections: [
            { name: "Onboarding Personnel", desc: "Input the corporate email; the user will receive a secure invitation link via Google Identity." },
            { name: "Permission Matrix", desc: "Specific 'Roles' are assigned. A site supervisor cannot access bank transfers or the primary General Ledger." }
          ]
        },
        {
          id: "approvals",
          title: "3. Approval Protocols & Linkages",
          content: "The system follows a strict (Maker-Checker) model. Any sensitive financial or administrative operation requires at least two authorizations.",
          subsections: [
            { name: "Field Request", desc: "Requests are raised from the site (e.g., Material Purchase Request)." },
            { name: "Financial Audit", desc: "The Finance Department reviews the request against remaining budget and liquidity availability." },
            { name: "Final Release", desc: "The Purchase Order (PO) is only issued after the digital signature of the authorized Manager." }
          ]
        },
        {
           id: "workforce",
           title: "4. Workforce & Smart Attendance",
           content: "Thousands of employees and external rental labor are managed through a unified resource pool.",
           subsections: [
             { name: "Attendance Logging", desc: "Attendance is input daily. The system supports data imports from field biometric devices." },
             { name: "Automated Payroll", desc: "Approved attendance hours are converted into cash totals in payroll manifests at month-end automatically." }
           ]
        },
        {
          id: "troubleshooting",
          title: "5. Troubleshooting & Technical Resilience",
          content: "Proactive mechanisms for technical and operational error detection were established.",
          subsections: [
            { name: "Access Rejection", desc: "Ensure your email is active in the User Matrix. Software errors are reported via the 'Notification Center'." },
            { name: "Data Synchronization", desc: "If updates do not appear, ensure you click the 'Sync' button in the sidebar panel." }
          ]
        }
      ],
      footer: "All Rights Reserved to Ares Core Group © 2026. Reproduction of this manual is strictly prohibited."
    };
  }, [language]);

  const handlePrint = async () => {
    const element = document.getElementById('ares-manual-printable');
    if (!element) return;

    try {
      const originalDisplay = element.style.display;
      element.style.display = 'block';

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * { 
              font-feature-settings: "kern" 1, "liga" 1, "calt" 1 !important;
              text-rendering: optimizeLegibility !important;
              letter-spacing: normal !important;
            }
            .rtl, [dir="rtl"], .font-arabic {
              direction: rtl !important;
              unicode-bidi: isolate !important;
              font-family: "IBM Plex Sans Arabic", sans-serif !important;
            }
          `;
          clonedDoc.head.appendChild(style);

          // Scrub ALL modern color functions (oklch, oklab, lab, lch, hwb, color-mix)
          fixHtml2CanvasOklch(clonedDoc);
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`ARES_CORE_MANUAL_${language.toUpperCase()}.pdf`);
      element.style.display = originalDisplay;
    } catch (error) {
      console.error('Manual Export Error:', error);
    }
  };

  return (
    <div className={cn("space-y-8 animate-in fade-in duration-700", isRtl ? "font-arabic rtl text-right" : "font-sans ltr text-left")}>
      {/* Header Panel */}
      <div className={cn("flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-white border border-slate-200 rounded-3xl shadow-sm", isRtl ? "md:flex-row-reverse" : "")}>
        <div className={isRtl ? "text-right" : "text-left"}>
          <div className={cn("flex items-center gap-3 mb-2", isRtl ? "flex-row-reverse" : "")}>
             <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                <BookOpen className="w-6 h-6" />
             </div>
             <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{guideContent.title}</h2>
          </div>
          <p className="text-slate-500 font-bold tracking-tight">{guideContent.subtitle}</p>
        </div>
        <button 
          onClick={handlePrint}
          className="group flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl hover:bg-black transition-all active:scale-95"
        >
          <Printer className="w-5 h-5 group-hover:animate-bounce" />
          {guideContent.downloadBtn}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto space-y-12 pb-20">
         {guideContent.sections.map((section) => (
            <section key={section.id} className="bg-white border border-slate-100 rounded-3xl p-10 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-5">
                  <ShieldCheck className="w-48 h-48" />
               </div>
               
               <div className={cn("flex items-center gap-4 mb-8", isRtl ? "flex-row-reverse" : "")}>
                  <h3 className="text-2xl font-black text-slate-900 uppercase border-b-4 border-red-600 pb-2">
                     {section.title}
                  </h3>
               </div>

               <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-12", isRtl ? "text-right" : "text-left")}>
                  <div className="space-y-6">
                     <p className="text-lg text-slate-600 leading-relaxed font-medium">
                        {section.content}
                     </p>
                     <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 italic text-slate-500 font-mono text-sm">
                        {isRtl ? "تنبيه: التغييرات في هذا القسم تتطلب صلاحيات مشرف النظام." : "Note: Changes in this module require System Administrator privileges."}
                     </div>
                  </div>

                  <div className="space-y-4">
                     {section.subsections.map((sub, sIdx) => (
                        <div key={sIdx} className="p-6 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors group">
                           <div className={cn("flex items-center gap-3 mb-2", isRtl ? "flex-row-reverse" : "")}>
                              <div className="w-2 h-2 rounded-full bg-red-600 group-hover:scale-150 transition-transform"></div>
                              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">{sub.name}</h4>
                           </div>
                           <p className="text-xs text-slate-500 leading-relaxed font-bold">{sub.desc}</p>
                        </div>
                     ))}
                  </div>
               </div>
            </section>
         ))}
      </div>

      {/* Hidden Printable Manual */}
      <div id="ares-manual-printable" className="hidden" style={{ width: '210mm', backgroundColor: 'white' }}>
         <div className="p-[20mm] space-y-[15mm]">
            {/* Title Page */}
            <div className="h-[257mm] flex flex-col justify-center items-center text-center border-[8px] border-double border-slate-900 p-20">
               <div className="w-48 h-48 bg-red-600 flex items-center justify-center text-white rounded-full mb-12 shadow-2xl">
                  <ShieldCheck className="w-32 h-32" />
               </div>
               <h1 className="text-7xl font-black text-slate-900 mb-4 tracking-tighter uppercase">ARES MATRIX</h1>
               <h2 className="text-4xl font-bold text-slate-400 mb-20 uppercase tracking-[0.4em]">Integrated Protocol v6</h2>
               
               <div className="w-64 h-2 bg-red-600 mb-20"></div>
               
               <h3 className="text-5xl font-black mb-6 uppercase text-slate-900 leading-none">
                  {language === 'ar' ? "دليل إرشادات النظام المتكامل" : "INTEGRATED SYSTEM OPERATIONS MANUAL"}
               </h3>
               <p className="text-2xl font-mono text-slate-400 font-bold uppercase tracking-widest">{guideContent.version}</p>
               
               <div className="mt-auto pt-24 grid grid-cols-2 w-full gap-20">
                  <div className="text-left">
                     <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest mb-2">Issue Authority</p>
                     <p className="text-sm font-bold">ARES MATRIX OPERATIONAL TECH</p>
                  </div>
                  <div className="text-right">
                     <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest mb-2">Classification</p>
                     <p className="text-sm font-bold text-red-600">CONFIDENTIAL // CONTROLLED ACCESS</p>
                  </div>
               </div>
            </div>

            {/* Content Pages */}
            {guideContent.sections.map((section) => (
               <div key={section.id} className="min-h-[277mm] py-20">
                  <div className="flex items-end justify-between border-b-8 border-slate-900 pb-8 mb-16">
                     <h2 className="text-6xl font-black uppercase tracking-tighter">{section.title}</h2>
                     <p className="text-slate-300 font-mono text-xl">{section.id.toUpperCase()} // SYS_DOC</p>
                  </div>

                  <div className="space-y-16">
                     <p className="text-2xl text-slate-700 leading-relaxed font-bold bg-slate-50 p-12 border-l-[16px] border-red-600">
                        {section.content}
                     </p>

                     <div className="grid grid-cols-1 gap-10">
                        {section.subsections.map((sub, sIdx) => (
                           <div key={sIdx} className="border-4 border-slate-100 p-10 rounded-[40px] flex gap-10 items-start">
                              <div className="w-16 h-16 bg-slate-900 text-white rounded-3xl flex items-center justify-center shrink-0 font-black text-2xl">
                                 {sIdx + 1}
                              </div>
                              <div className="space-y-4">
                                 <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">SUB-PROTOCOL 0{sIdx + 1}: {sub.name}</h4>
                                 <p className="text-xl text-slate-500 font-medium leading-relaxed">
                                    {sub.desc}. Access to this procedure is strictly logged under the user audit ID. Any modification of master data within this nexus must be validated via the central ledger before permanence.
                                 </p>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>

                  <div className="mt-auto pt-24 flex justify-between items-end opacity-30 border-t-2 border-slate-100">
                     <p className="text-xs font-black uppercase tracking-widest">© 2026 ARES CORE INTELLECTUAL PROPERTY</p>
                     <p className="text-xs font-mono font-bold">ARC-AUTO-GEN-{Date.now().toString(36).toUpperCase()}</p>
                  </div>
                  
                  {/* Page Break Indication */}
                  <div className="break-after-page"></div>
               </div>
            ))}
         </div>
      </div>
    </div>
  );
}
