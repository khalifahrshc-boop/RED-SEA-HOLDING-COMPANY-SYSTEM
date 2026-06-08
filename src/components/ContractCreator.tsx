import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Edit2, 
  Download, 
  ChevronRight, 
  ChevronLeft, 
  ChevronDown,
  Save, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Languages
} from 'lucide-react';
import { cn, createAuditLog, triggerSystemNotification } from '../lib/utils';
import { ContractDraft, CompanyData } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface ContractCreatorProps {
  company: CompanyData;
  language: 'en' | 'ar';
}

export function ContractCreator({ company, language }: ContractCreatorProps) {
  const [drafts, setDrafts] = useLocalStorage<ContractDraft[]>('ares_contract_drafts', []);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isTranslating, setIsTranslating] = useState(false);
  
  const [formData, setFormData] = useState<Partial<ContractDraft>>({
    partyTwo: { name: '', phone: '', email: '', crNumber: '', taxId: '', address: '' },
    content: {
      preamble: { en: '', ar: '' },
      duration: { en: '', ar: '' },
      terms: { en: '', ar: '' },
      paymentTerms: { en: '', ar: '' },
      termination: { en: '', ar: '' },
      obligations: { en: '', ar: '' },
      notes: { en: '', ar: '' }
    },
    type: 'Service Agreement',
    status: 'Draft'
  });

  const steps = [
    { id: 1, title: 'Counterparty Info' },
    { id: 2, title: 'Contract Preamble' },
    { id: 3, title: 'Term & Type' },
    { id: 4, title: 'Terms & Conditions' },
    { id: 5, title: 'Payment & termination' },
    { id: 6, title: 'Review & Export' }
  ];

  const handleTranslate = async (field: keyof ContractDraft['content'], sourceLang: 'en' | 'ar') => {
    const textToTranslate = formData.content?.[field]?.[sourceLang];
    if (!textToTranslate) return;

    setIsTranslating(true);
    try {
      const targetLangName = sourceLang === 'en' ? 'Arabic' : 'English';
      
      const response = await fetch('/api/contracts/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToTranslate, targetLang: targetLangName })
      });

      if (!response.ok) throw new Error("Translation failed");
      const { translatedText } = await response.json();

      const targetKey = sourceLang === 'en' ? 'ar' : 'en';

      setFormData(prev => ({
        ...prev,
        content: {
          ...prev.content!,
          [field]: {
            ...prev.content![field],
            [targetKey]: translatedText
          }
        }
      }));
    } catch (error) {
      console.error('Translation error:', error);
      alert('Failed to translate. Please check your connection or try manual input.');
    } finally {
      setIsTranslating(false);
    }
  };

    const handleSaveDraft = () => {
    // Collect draft data with absolute safety fallbacks
    const safeContent = {
      preamble: { en: '', ar: '', ...(formData.content?.preamble || {}) },
      duration: { en: '', ar: '', ...(formData.content?.duration || {}) },
      terms: { en: '', ar: '', ...(formData.content?.terms || {}) },
      paymentTerms: { en: '', ar: '', ...(formData.content?.paymentTerms || {}) },
      termination: { en: '', ar: '', ...(formData.content?.termination || {}) },
      obligations: { en: '', ar: '', ...(formData.content?.obligations || {}) },
      notes: { en: '', ar: '', ...(formData.content?.notes || {}) }
    };

    const newDraft: ContractDraft = {
      partyTwo: {
        name: '', phone: '', email: '', crNumber: '', taxId: '', address: '',
        ...(formData.partyTwo || {})
      },
      content: safeContent,
      type: formData.type || 'Service Agreement',
      id: formData.id || `CON-${Date.now()}`,
      date: formData.date || new Date().toISOString().split('T')[0],
      status: formData.status || 'Draft'
    };
    
    if (formData.id) {
       setDrafts(drafts.map(d => d.id === formData.id ? newDraft : d));
       createAuditLog({
         id: `LOG-${Date.now()}`,
         userId: 'user', // Simplified
         userName: 'Authorized User',
         action: 'Update Contract',
         target: `Contract ${newDraft.id}`,
         details: `Modified contract draft for ${newDraft.partyTwo.name}`,
         timestamp: new Date().toISOString()
       });
    } else {
       setDrafts([...drafts, newDraft]);
       createAuditLog({
         id: `LOG-${Date.now()}`,
         userId: 'user',
         userName: 'Authorized User',
         action: 'Create Contract',
         target: `Contract ${newDraft.id}`,
         details: `Created new contract draft for ${newDraft.partyTwo.name}`,
         timestamp: new Date().toISOString()
       });
       
       triggerSystemNotification({
         id: `NOT-${Date.now()}`,
         type: 'Info',
         title: 'Contract Draft Created',
         message: `A new contract draft for ${newDraft.partyTwo.name} has been generated.`,
         department: 'Legal',
         read: false,
         createdAt: new Date().toISOString()
       });
    }
    
    setIsWizardOpen(false);
    resetFormState();
  };

  const resetFormState = () => {
    setFormData({
      partyTwo: { name: '', phone: '', email: '', crNumber: '', taxId: '', address: '' },
      content: {
        preamble: { en: '', ar: '' },
        duration: { en: '', ar: '' },
        terms: { en: '', ar: '' },
        paymentTerms: { en: '', ar: '' },
        termination: { en: '', ar: '' },
        obligations: { en: '', ar: '' },
        notes: { en: '', ar: '' }
      },
      type: 'Service Agreement',
      status: 'Draft'
    });
    setCurrentStep(1);
  };

  const handleOpenNewWizard = () => {
    resetFormState();
    setIsWizardOpen(true);
  };

  const handleOpenEditWizard = (draft: ContractDraft) => {
    const safeContent = {
      preamble: { en: '', ar: '', ...(draft.content?.preamble || {}) },
      duration: { en: '', ar: '', ...(draft.content?.duration || {}) },
      terms: { en: '', ar: '', ...(draft.content?.terms || {}) },
      paymentTerms: { en: '', ar: '', ...(draft.content?.paymentTerms || {}) },
      termination: { en: '', ar: '', ...(draft.content?.termination || {}) },
      obligations: { en: '', ar: '', ...(draft.content?.obligations || {}) },
      notes: { en: '', ar: '', ...(draft.content?.notes || {}) }
    };

    setFormData({
      id: draft.id,
      date: draft.date,
      type: draft.type || 'Service Agreement',
      status: draft.status || 'Draft',
      partyTwo: {
        name: '', phone: '', email: '', crNumber: '', taxId: '', address: '',
        ...(draft.partyTwo || {})
      },
      content: safeContent
    });
    setCurrentStep(1);
    setIsWizardOpen(true);
  };

  const handleExportPDF = (draft: ContractDraft) => {
    import('../lib/pdfUtils').then(async ({ generateStandardPDF, applyAutoTable, loadArabicFont, reshapeArabic }) => {
      const { doc, startY } = generateStandardPDF(`${draft.type.toUpperCase()} CONTRACT`, company || {});
      
      const fontLoaded = await loadArabicFont(doc);

      let y = startY;

      // Parties Info Table
      const partiesData = [
          ['PART ONE (THE COMPANY)', fontLoaded ? reshapeArabic('الطرف الأول (الشركة)') : 'PART ONE (THE COMPANY)'],
          [company.name, fontLoaded ? reshapeArabic(company.name) : company.name],
          [`CR: ${company.crNumber}`, fontLoaded ? reshapeArabic(`سجل تجاري: ${company.crNumber}`) : `CR: ${company.crNumber}`],
          [`VAT: ${company.vatNumber}`, fontLoaded ? reshapeArabic(`ضريبة: ${company.vatNumber}`) : `VAT: ${company.vatNumber}`],
          [company.headquarters, fontLoaded ? reshapeArabic(company.headquarters) : company.headquarters],
          ['', ''],
          ['PART TWO (SECOND PARTY)', fontLoaded ? reshapeArabic('الطرف الثاني (الطرف الثاني)') : 'PART TWO (SECOND PARTY)'],
          [draft.partyTwo.name, fontLoaded ? reshapeArabic(draft.partyTwo.name) : draft.partyTwo.name],
          [`CR: ${draft.partyTwo.crNumber}`, fontLoaded ? reshapeArabic(`سجل تجاري: ${draft.partyTwo.crNumber}`) : `CR: ${draft.partyTwo.crNumber}`],
          [`VAT: ${draft.partyTwo.taxId}`, fontLoaded ? reshapeArabic(`ضريبة: ${draft.partyTwo.taxId}`) : `VAT: ${draft.partyTwo.taxId}`],
          [draft.partyTwo.address, fontLoaded ? reshapeArabic(draft.partyTwo.address) : draft.partyTwo.address],
      ];

      applyAutoTable(doc, {
          startY: y,
          body: partiesData,
          theme: 'plain',
          styles: { font: fontLoaded ? 'Amiri' : 'courier', fontSize: 10, cellPadding: 2 },
          columnStyles: {
              0: { halign: 'left' },
              1: { halign: 'right' } 
          }
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // Section drawing helper
      const drawSection = (titleEn: string, titleAr: string, contentEn: string, contentAr: string) => {
          if (y > 250) { doc.addPage(); y = 20; }
          
          doc.setFontSize(12);
          doc.setFont(fontLoaded ? 'Amiri' : 'courier', 'bold');
          doc.text(titleEn, 20, y);
          if (fontLoaded) doc.text(reshapeArabic(titleAr), 190, y, { align: 'right' });
          y += 8;
          
          doc.setFontSize(9);
          doc.setFont(fontLoaded ? 'Amiri' : 'courier', 'normal');
          
          const enLines = doc.splitTextToSize(contentEn, 80);
          const arLines = fontLoaded ? doc.splitTextToSize(reshapeArabic(contentAr), 80) : [contentAr];
          
          const maxLines = Math.max(enLines.length, arLines.length);
          for(let i=0; i<maxLines; i++) {
              if (enLines[i]) doc.text(enLines[i], 20, y);
              if (arLines[i]) doc.text(arLines[i], 190, y, { align: 'right' });
              y += 5;
              if (y > 275) { doc.addPage(); y = 20; }
          }
          y += 5;
      };

      drawSection('PREAMBLE', 'تمهيد', draft.content?.preamble?.en || '', draft.content?.preamble?.ar || '');
      drawSection('DURATION', 'مدة العقد', draft.content?.duration?.en || '', draft.content?.duration?.ar || '');
      drawSection('TERMS', 'شروط العقد', draft.content?.terms?.en || '', draft.content?.terms?.ar || '');
      drawSection('PAYMENT', 'شروط الدفع', draft.content?.paymentTerms?.en || '', draft.content?.paymentTerms?.ar || '');
      drawSection('OBLIGATIONS', 'التزامات الطرفين', draft.content?.obligations?.en || '', draft.content?.obligations?.ar || '');
      drawSection('TERMINATION', 'إنهاء العقد', draft.content?.termination?.en || '', draft.content?.termination?.ar || '');

      doc.save(`Contract_${(draft.partyTwo?.name || '').replace(/\s+/g, '_')}.pdf`);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Contract Generator</h2>
          <p className="text-sm text-slate-500 mt-1">Create legally sound, bilingual professional contracts</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <button 
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold uppercase tracking-widest hover:bg-slate-50 transition shadow-sm"
            >
              <Download className="w-4 h-4" /> Print Contracts <ChevronDown className="w-3 h-3 ml-1" />
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-1 group-hover:translate-y-0">
                <button 
                  onClick={() => {
                    import('../lib/pdfUtils').then(({ generateStandardPDF, applyAutoTable }) => {
                      const { doc, startY } = generateStandardPDF('CONTRACT LOG & DRAFT SUMMARY', company || {});
                      const tableData = drafts.map(d => [d.id, d.partyTwo.name, d.type, d.date, d.status]);
                      applyAutoTable(doc, {
                        startY,
                        head: [['ID', 'Counterparty', 'Type', 'Date', 'Status']],
                        body: tableData,
                      });
                      doc.save('Contract_Summary_Report.pdf');
                    });
                  }}
                  className="w-full text-left px-4 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2 uppercase tracking-widest"
                >
                  <FileText className="w-3.5 h-3.5" /> All Drafts
                </button>
                <button 
                  onClick={() => {
                    import('../lib/pdfUtils').then(({ generateStandardPDF, applyAutoTable }) => {
                      const { doc, startY } = generateStandardPDF('FINALIZED CONTRACTS SUMMARY', company || {});
                      const tableData = drafts.filter(d => d.status === 'Finalized').map(d => [d.id, d.partyTwo.name, d.type, d.date, d.status]);
                      applyAutoTable(doc, {
                        startY,
                        head: [['ID', 'Counterparty', 'Type', 'Date', 'Status']],
                        body: tableData,
                      });
                      doc.save('Finalized_Contracts_Report.pdf');
                    });
                  }}
                  className="w-full text-left px-4 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2 uppercase tracking-widest"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Finalized Only
                </button>
            </div>
          </div>
          <button 
            onClick={handleOpenNewWizard}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold uppercase tracking-widest hover:bg-red-700 transition shadow-lg"
          >
            <Plus className="w-4 h-4" /> Create Contract
          </button>
        </div>
      </div>

      {/* List of Drafts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {drafts.map(draft => (
          <div key={draft.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider">{draft.status}</span>
            </div>
            
            <div>
              <h3 className="font-bold text-slate-800 line-clamp-1">{draft.partyTwo.name}</h3>
              <p className="text-xs text-slate-400 mt-1">{draft.type} • {draft.date}</p>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
              <button 
                onClick={() => handleOpenEditWizard(draft)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-100 transition"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
              <button 
                onClick={() => handleExportPDF(draft)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-red-100 transition"
              >
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
              <button 
                onClick={() => setDrafts(drafts.filter(d => d.id !== draft.id))}
                className="p-2 text-slate-300 hover:text-red-500 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {drafts.length === 0 && !isWizardOpen && (
          <div className="md:col-span-2 lg:col-span-3 py-20 text-center bg-white border-2 border-dashed border-slate-200 rounded-2xl">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-600">No contract drafts yet</h3>
            <p className="text-sm text-slate-400 mt-1">Click the "Create Contract" button to start your first agreement.</p>
          </div>
        )}
      </div>

      {/* Wizard Modal */}
      {isWizardOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Wizard Header */}
            <div className="bg-slate-900 text-white p-6 shrink-0">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-red-500" />
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">Contract Wizard</h2>
                    <p className="text-xs text-slate-400 uppercase tracking-widest">Step {currentStep} of {steps.length}: {steps[currentStep-1].title}</p>
                  </div>
                </div>
                <button onClick={() => setIsWizardOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition">&times;</button>
              </div>

              <div className="flex items-center justify-between relative px-2">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/10 -translate-y-1/2 -z-10" />
                {steps.map(step => (
                  <div key={step.id} className="flex flex-col items-center gap-2">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2",
                      currentStep === step.id ? "bg-red-600 border-red-600 text-white scale-110 shadow-[0_0_15px_rgba(220,38,38,0.5)]" :
                      currentStep > step.id ? "bg-emerald-500 border-emerald-500 text-white" :
                      "bg-slate-800 border-slate-700 text-slate-500"
                    )}>
                      {currentStep > step.id ? "✓" : step.id}
                    </div>
                    <span className={cn(
                      "text-[9px] uppercase font-bold tracking-wider hidden sm:block",
                      currentStep === step.id ? "text-red-500" : "text-slate-500"
                    )}>{step.title}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Wizard Body */}
            <div className="flex-1 overflow-y-auto p-8">
              {currentStep === 1 && (
                <div className="space-y-6 max-w-2xl mx-auto">
                    <h4 className="text-lg font-bold text-slate-800 border-b pb-2">Information of Part Two</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Company Name</label>
                        <input 
                          value={formData.partyTwo?.name} 
                          onChange={e => setFormData({...formData, partyTwo: {...formData.partyTwo!, name: e.target.value}})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" 
                          placeholder="Legal name of counterparty"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Commercial Reg. (CR)</label>
                        <input 
                          value={formData.partyTwo?.crNumber} 
                          onChange={e => setFormData({...formData, partyTwo: {...formData.partyTwo!, crNumber: e.target.value}})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact Phone</label>
                        <input 
                          value={formData.partyTwo?.phone} 
                          onChange={e => setFormData({...formData, partyTwo: {...formData.partyTwo!, phone: e.target.value}})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</label>
                        <input 
                          value={formData.partyTwo?.email} 
                          onChange={e => setFormData({...formData, partyTwo: {...formData.partyTwo!, email: e.target.value}})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" 
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Address</label>
                        <input 
                          value={formData.partyTwo?.address} 
                          onChange={e => setFormData({...formData, partyTwo: {...formData.partyTwo!, address: e.target.value}})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" 
                        />
                      </div>
                    </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6 max-w-2xl mx-auto">
                    <div className="flex items-center justify-between border-b pb-2">
                        <h4 className="text-lg font-bold text-slate-800">Contract Preamble</h4>
                        <button 
                            disabled={isTranslating}
                            onClick={() => handleTranslate('preamble', 'en')}
                            className="text-[10px] font-bold text-red-600 uppercase tracking-widest flex items-center gap-1 hover:text-red-700 transition disabled:opacity-50"
                        >
                            <Languages className="w-3 h-3" /> {isTranslating ? 'Translating...' : 'Auto-Translate to Arabic'}
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><span className="w-4 h-4 bg-slate-100 flex items-center justify-center rounded text-[8px]">EN</span> English Version</label>
                            <textarea 
                                value={formData.content?.preamble?.en || ''}
                                onChange={e => setFormData({
                                    ...formData, 
                                    content: {
                                        ...(formData.content || {}),
                                        preamble: { ...(formData.content?.preamble || {}), en: e.target.value }
                                    }
                                })}
                                rows={8}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:ring-1 focus:ring-red-500 outline-none resize-none leading-relaxed" 
                                placeholder="Write the introductory preamble here..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-end gap-1 items-center"><span className="w-4 h-4 bg-slate-100 flex items-center justify-center rounded text-[8px]">AR</span> النسخة العربية</label>
                            <textarea 
                                value={formData.content?.preamble?.ar || ''}
                                onChange={e => setFormData({
                                    ...formData, 
                                    content: {
                                        ...(formData.content || {}),
                                        preamble: { ...(formData.content?.preamble || {}), ar: e.target.value }
                                    }
                                })}
                                dir="rtl"
                                rows={8}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:ring-1 focus:ring-red-500 outline-none resize-none font-arabic leading-loose" 
                                placeholder="اكتب التمهيد بالعربية هنا..."
                            />
                        </div>
                    </div>
                </div>
              )}

              {/* Step 3: Term & Type */}
              {currentStep === 3 && (
                <div className="space-y-6 max-w-2xl mx-auto">
                    <div className="border-b pb-2">
                        <h4 className="text-lg font-bold text-slate-800 font-sans">Agreement Type & Duration Framework</h4>
                        <p className="text-xs text-slate-500 mt-1">Select the classification framework and define active timeline bounds</p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Contract Framework Category</label>
                            <select 
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-red-500 outline-none font-semibold text-slate-700"
                            >
                                <option value="Service Agreement">Service Agreement</option>
                                <option value="Employment Contract">Employment Contract</option>
                                <option value="NDA">NDA (Non-Disclosure Agreement)</option>
                                <option value="Supply Agreement">Supply Agreement</option>
                            </select>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 pt-4 pb-1">
                            <span className="text-sm font-bold text-slate-700">Contract Duration Terms</span>
                            <button 
                                type="button"
                                disabled={isTranslating}
                                onClick={() => handleTranslate('duration', 'en')}
                                className="text-[10px] font-bold text-red-600 uppercase tracking-widest flex items-center gap-1 hover:text-red-700 transition disabled:opacity-50"
                            >
                                <Languages className="w-3 h-3" /> {isTranslating ? 'Translating...' : 'Auto-Translate to Arabic'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <span className="w-4 h-4 bg-slate-100 flex items-center justify-center rounded text-[8px] font-bold text-slate-500">EN</span> English Duration Description
                                </label>
                                <textarea 
                                    value={formData.content?.duration?.en || ''}
                                    onChange={e => setFormData({
                                        ...formData,
                                        content: {
                                            ...(formData.content || {}),
                                            duration: { ...(formData.content?.duration || {}), en: e.target.value }
                                        }
                                    })}
                                    rows={4}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-1 focus:ring-red-500 outline-none resize-none leading-relaxed font-medium"
                                    placeholder="e.g. This Agreement shall commence on the Effective Date and remain active for twelve (12) consecutive months."
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-end gap-1 items-center">
                                    <span className="w-4 h-4 bg-slate-100 flex items-center justify-center rounded text-[8px] font-bold text-slate-500">AR</span> مدة العقد (باللغة العربية)
                                </label>
                                <textarea 
                                    value={formData.content?.duration?.ar || ''}
                                    onChange={e => setFormData({
                                        ...formData,
                                        content: {
                                            ...(formData.content || {}),
                                            duration: { ...(formData.content?.duration || {}), ar: e.target.value }
                                        }
                                    })}
                                    dir="rtl"
                                    rows={4}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-1 focus:ring-red-500 outline-none resize-none font-arabic leading-loose"
                                    placeholder="مثال: يسري هذا العقد ببدء تاريخ النفاذ المعتمد ويبقى سارياً لمدة اثني عشر (12) شهراً متتالية."
                                />
                            </div>
                        </div>
                    </div>
                </div>
              )}

              {/* Step 4: Terms & Conditions */}
              {currentStep === 4 && (
                <div className="space-y-6 max-w-2xl mx-auto">
                    <div className="border-b pb-2 flex items-center justify-between">
                        <div>
                            <h4 className="text-lg font-bold text-slate-800 font-sans">Scope, Terms & Obligations</h4>
                            <p className="text-xs text-slate-500 mt-1">Specify operational procedures and legal obligations of parties</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Obligations Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between border-b border-dashed border-slate-100 pb-1">
                                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-widest">1. Obligations of Parties</span>
                                <button 
                                    type="button"
                                    disabled={isTranslating}
                                    onClick={() => handleTranslate('obligations', 'en')}
                                    className="text-[9px] font-bold text-red-600 uppercase tracking-widest flex items-center gap-1 hover:text-red-700 transition disabled:opacity-50"
                                >
                                    <Languages className="w-3 h-3" /> Auto-Translate Section
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <span className="w-4 h-4 bg-slate-100 flex items-center justify-center rounded text-[8px] font-bold text-slate-500">EN</span> Specific Responsibilities
                                    </label>
                                    <textarea 
                                        value={formData.content?.obligations?.en || ''}
                                        onChange={e => setFormData({
                                            ...formData,
                                            content: {
                                                ...(formData.content || {}),
                                                obligations: { ...(formData.content?.obligations || {}), en: e.target.value }
                                            }
                                        })}
                                        rows={4}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-1 focus:ring-red-500 outline-none resize-none leading-relaxed font-medium text-slate-700"
                                        placeholder="e.g. The Contractor commits to performing standard technical installation according to the specifications set out in Schedule A."
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-end gap-1 items-center">
                                        <span className="w-4 h-4 bg-slate-100 flex items-center justify-center rounded text-[8px] font-bold text-slate-500">AR</span> التزامات ومسؤوليات الطرفين
                                    </label>
                                    <textarea 
                                        value={formData.content?.obligations?.ar || ''}
                                        onChange={e => setFormData({
                                            ...formData,
                                            content: {
                                                ...(formData.content || {}),
                                                obligations: { ...(formData.content?.obligations || {}), ar: e.target.value }
                                            }
                                        })}
                                        dir="rtl"
                                        rows={4}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-1 focus:ring-red-500 outline-none resize-none font-arabic leading-loose"
                                        placeholder="مثال: يلتزم الطرف الثاني بتنفيذ وبناء تركيبات المواصفات الفنية الواردة بملحق الشروط المرفق أ."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* General Terms Section */}
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between border-b border-dashed border-slate-100 pb-1">
                                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-widest">2. General Terms & Conditions</span>
                                <button 
                                    type="button"
                                    disabled={isTranslating}
                                    onClick={() => handleTranslate('terms', 'en')}
                                    className="text-[9px] font-bold text-red-600 uppercase tracking-widest flex items-center gap-1 hover:text-red-700 transition disabled:opacity-50"
                                >
                                    <Languages className="w-3 h-3" /> Auto-Translate Section
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <span className="w-4 h-4 bg-slate-100 flex items-center justify-center rounded text-[8px] font-bold text-slate-500">EN</span> Legal & Arbitration Clauses
                                    </label>
                                    <textarea 
                                        value={formData.content?.terms?.en || ''}
                                        onChange={e => setFormData({
                                            ...formData,
                                            content: {
                                                ...(formData.content || {}),
                                                terms: { ...(formData.content?.terms || {}), en: e.target.value }
                                            }
                                        })}
                                        rows={4}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-1 focus:ring-red-500 outline-none resize-none leading-relaxed font-medium text-slate-700"
                                        placeholder="e.g. This contract is governed by and construed according to the regulations of the Kingdom of Saudi Arabia."
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-end gap-1 items-center">
                                        <span className="w-4 h-4 bg-slate-100 flex items-center justify-center rounded text-[8px] font-bold text-slate-500">AR</span> الشروط والبنود العامة للتعاقد
                                    </label>
                                    <textarea 
                                        value={formData.content?.terms?.ar || ''}
                                        onChange={e => setFormData({
                                            ...formData,
                                            content: {
                                                ...(formData.content || {}),
                                                terms: { ...(formData.content?.terms || {}), ar: e.target.value }
                                            }
                                        })}
                                        dir="rtl"
                                        rows={4}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-1 focus:ring-red-500 outline-none resize-none font-arabic leading-loose"
                                        placeholder="مثال: يخضع هذا العقد ويفسر بموجب الأنظمة والقوانين السارية في المملكة العربية السعودية."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
              )}

              {/* Step 5: Payment & termination */}
              {currentStep === 5 && (
                <div className="space-y-6 max-w-2xl mx-auto">
                    <div className="border-b pb-2">
                        <h4 className="text-lg font-bold text-slate-800 font-sans">Payment Frameworks & Termination Conditions</h4>
                        <p className="text-xs text-slate-500 mt-1">Specify financial disbursements, billing schedules, and exit procedures</p>
                    </div>

                    <div className="space-y-6">
                        {/* Payment Terms Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between border-b border-dashed border-slate-100 pb-1">
                                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-widest">1. Financial Payment Terms</span>
                                <button 
                                    type="button"
                                    disabled={isTranslating}
                                    onClick={() => handleTranslate('paymentTerms', 'en')}
                                    className="text-[9px] font-bold text-red-600 uppercase tracking-widest flex items-center gap-1 hover:text-red-700 transition disabled:opacity-50"
                                >
                                    <Languages className="w-3 h-3" /> Auto-Translate Section
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <span className="w-4 h-4 bg-slate-100 flex items-center justify-center rounded text-[8px] font-bold text-slate-500">EN</span> Payment Milestones & Invoicing
                                    </label>
                                    <textarea 
                                        value={formData.content?.paymentTerms?.en || ''}
                                        onChange={e => setFormData({
                                            ...formData,
                                            content: {
                                                ...(formData.content || {}),
                                                paymentTerms: { ...(formData.content?.paymentTerms || {}), en: e.target.value }
                                            }
                                        })}
                                        rows={4}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-1 focus:ring-red-500 outline-none resize-none leading-relaxed font-medium text-slate-700"
                                        placeholder="e.g. Payments shall be disbursed in installments against verified progress reports submitted by the contractor."
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-end gap-1 items-center">
                                        <span className="w-4 h-4 bg-slate-100 flex items-center justify-center rounded text-[8px] font-bold text-slate-500">AR</span> شروط الدفع والجدولة المالية
                                    </label>
                                    <textarea 
                                        value={formData.content?.paymentTerms?.ar || ''}
                                        onChange={e => setFormData({
                                            ...formData,
                                            content: {
                                                ...(formData.content || {}),
                                                paymentTerms: { ...(formData.content?.paymentTerms || {}), ar: e.target.value }
                                            }
                                        })}
                                        dir="rtl"
                                        rows={4}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-1 focus:ring-red-500 outline-none resize-none font-arabic leading-loose"
                                        placeholder="مثال: يتم صرف الدفعات المستحقة على أقساط بناء على تقارير الإنجاز الميدانية المعتمدة."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Termination Section */}
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between border-b border-dashed border-slate-100 pb-1">
                                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-widest">2. Contract Termination Protocol</span>
                                <button 
                                    type="button"
                                    disabled={isTranslating}
                                    onClick={() => handleTranslate('termination', 'en')}
                                    className="text-[9px] font-bold text-red-600 uppercase tracking-widest flex items-center gap-1 hover:text-red-700 transition disabled:opacity-50"
                                >
                                    <Languages className="w-3 h-3" /> Auto-Translate Section
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <span className="w-4 h-4 bg-slate-100 flex items-center justify-center rounded text-[8px] font-bold text-slate-500">EN</span> Termination Notices & Liquidation
                                    </label>
                                    <textarea 
                                        value={formData.content?.termination?.en || ''}
                                        onChange={e => setFormData({
                                            ...formData,
                                            content: {
                                                ...(formData.content || {}),
                                                termination: { ...(formData.content?.termination || {}), en: e.target.value }
                                            }
                                        })}
                                        rows={4}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-1 focus:ring-red-500 outline-none resize-none leading-relaxed font-medium text-slate-700"
                                        placeholder="e.g. Either party may terminate this agreement by providing thirty (30) days prior written notice to the other party."
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-end gap-1 items-center">
                                        <span className="w-4 h-4 bg-slate-100 flex items-center justify-center rounded text-[8px] font-bold text-slate-500">AR</span> شروط إنهاء وفسخ التعاقد
                                    </label>
                                    <textarea 
                                        value={formData.content?.termination?.ar || ''}
                                        onChange={e => setFormData({
                                            ...formData,
                                            content: {
                                                ...(formData.content || {}),
                                                termination: { ...(formData.content?.termination || {}), ar: e.target.value }
                                            }
                                        })}
                                        dir="rtl"
                                        rows={4}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-1 focus:ring-red-500 outline-none resize-none font-arabic leading-loose"
                                        placeholder="مثال: يجوز لأي من الطرفين إنهاء هذا الاتفاق بموجب إخطار خطي مسبق مدته ثلاثون (30) يوماً."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
              )}

              {currentStep === 6 && (
                <div className="space-y-8">
                    <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-emerald-500 shadow-sm">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-emerald-900">Contract Ready for Export</h4>
                            <p className="text-sm text-emerald-700 opacity-80">Review all sections before finalizing. You can still go back and edit.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Part One</span>
                            <div className="font-bold text-slate-800">{company.name}</div>
                            <div className="text-xs text-slate-500 mt-1">{company.crNumber} • {company.vatNumber}</div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Part Two</span>
                            <div className="font-bold text-slate-800">{formData.partyTwo?.name || 'Unspecified'}</div>
                            <div className="text-xs text-slate-500 mt-1">{formData.partyTwo?.crNumber || 'N/A'} • {formData.partyTwo?.taxId || 'N/A'}</div>
                        </div>
                    </div>

                    <div className="flex justify-center pt-8">
                        <button 
                            onClick={() => handleExportPDF(formData as ContractDraft)}
                            className="flex items-center gap-3 px-10 py-5 bg-red-600 text-white rounded-2xl font-bold uppercase tracking-[0.2em] hover:bg-red-700 transition shadow-[0_10px_20px_rgba(220,38,38,0.2)]"
                        >
                            <Download className="w-6 h-6" /> Export Final PDF
                        </button>
                    </div>
                </div>
              )}
            </div>

            {/* Wizard Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0 flex items-center justify-between">
              <button 
                disabled={currentStep === 1}
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="flex items-center gap-2 px-4 py-2 text-slate-400 disabled:opacity-30 font-bold text-xs uppercase tracking-widest hover:text-slate-700 transition"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleSaveDraft}
                  className="px-4 py-2 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-slate-700 transition"
                >
                  Save Draft
                </button>
                {currentStep < steps.length ? (
                  <button 
                    onClick={() => setCurrentStep(prev => prev + 1)}
                    className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition shadow-lg"
                  >
                    Next Step <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button 
                    onClick={handleSaveDraft}
                    className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition shadow-lg"
                  >
                    <Save className="w-4 h-4" /> Finalize & Save
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
