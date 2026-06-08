import React from 'react';
import { FileText, ClipboardCheck, ArrowLeftRight } from 'lucide-react';
import { ContractCreator } from './ContractCreator';
import { SirManager } from './SirManager';
import { Project, CompanyData } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface DocumentCenterProps {
  projects: Project[];
  company: CompanyData;
  language: 'en' | 'ar';
}

export function DocumentCenter({ projects, company, language }: DocumentCenterProps) {
  const [activeTab, setActiveTab] = useLocalStorage<'sir' | 'contracts'>('ares_doc_center_active_tab', 'sir');

  const isRtl = language === 'ar';

  return (
    <div className="space-y-6">
      
      {/* Tab Switcher at the top of Document Center - Hidden when printing */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 print:hidden">
        <div className="flex gap-1.5 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setActiveTab('sir')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'sir'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            {isRtl ? 'طلب فحص الموقع (SIR)' : 'Site Inspection Request (SIR)'}
          </button>
          <button
            onClick={() => setActiveTab('contracts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'contracts'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            {isRtl ? 'صانع العقود والمواصفات' : 'Smart Contract Editor'}
          </button>
        </div>

        {/* Quick Context Tip */}
        <div className="hidden md:flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>{isRtl ? 'نظام المعاملات والامتثال الموحد' : 'Unified Document Workspace'}</span>
        </div>
      </div>

      {/* Render selected workspace */}
      <div className="transition-all duration-300">
        {activeTab === 'sir' ? (
          <SirManager projects={projects} company={company} language={language} />
        ) : (
          <ContractCreator company={company} language={language} />
        )}
      </div>

    </div>
  );
}
