import React from 'react';
import {
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  X,
  Plus,
  ShieldCheck,
  FileText,
  Search,
  Calendar,
  ChevronRight,
  PieChart,
  ArrowDownCircle,
  Trash2,
  Edit3
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/src/lib/utils';
import { Project, DailyExpenditure, BudgetVarianceReport } from '@/src/types';
import { useTranslation, Language } from '../lib/translations';

interface BudgetVarianceProps {
  projects: Project[];
  expenditures: DailyExpenditure[];
  varianceReports: BudgetVarianceReport[];
  setVarianceReports: React.Dispatch<React.SetStateAction<BudgetVarianceReport[]>>;
  onDeleteReport: (id: string) => void;
  language: Language;
  company?: any;
}

const APPROVAL_WORKFLOW = [
  { role: 'Pending Review', label: 'Financial Review' },
  { role: 'Awaiting Manager', label: 'Department Manager' },
  { role: 'Awaiting Official', label: 'Executive Official' },
] as const;

export function BudgetVariance({ projects, expenditures, varianceReports, setVarianceReports, onDeleteReport, language }: BudgetVarianceProps) {
  const { t } = useTranslation(language);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingReport, setEditingReport] = React.useState<BudgetVarianceReport | null>(null);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>(projects[0]?.id || '');
  const [selectedDate, setSelectedDate] = React.useState<string>(new Date().toISOString().split('T')[0]);

  // Mocked reporter info
  const staffName = "Faisal bin Salman";
  const staffId = "ACC-4492";

  const calculateDailySpending = (projectId: string, date: string) => {
    return expenditures
      .filter(exp => exp.projectId === projectId && exp.date === date && exp.status === 'Approved')
      .reduce((sum, exp) => sum + exp.amount, 0);
  };

  const project = projects.find(p => p.id === selectedProjectId);
  const actualSpent = calculateDailySpending(selectedProjectId, selectedDate);
  const variance = project ? project.dailyBudget - actualSpent : 0;
  const isUnderSpent = variance > 0;

  const handleCreateReport = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const newReport: BudgetVarianceReport = {
      id: editingReport ? editingReport.id : `VAR-${Date.now().toString().slice(-6)}`,
      projectId: selectedProjectId,
      date: selectedDate,
      dailyBudget: project?.dailyBudget || 0,
      actualSpent,
      variance,
      reason: formData.get('reason') as string,
      status: editingReport ? editingReport.status : 'Pending Review',
      reportedById: editingReport ? editingReport.reportedById : staffId,
      reportedByName: editingReport ? editingReport.reportedByName : staffName,
      createdAt: editingReport ? editingReport.createdAt : new Date().toISOString(),
    };

    if (editingReport) {
      setVarianceReports(prev => prev.map(r => r.id === editingReport.id ? newReport : r));
    } else {
      setVarianceReports(prev => [newReport, ...prev]);
    }
    
    setIsModalOpen(false);
    setEditingReport(null);
  };

  const handleApprove = (reportId: string) => {
    setVarianceReports(prev => prev.map(report => {
      if (report.id === reportId) {
        const currentIndex = APPROVAL_WORKFLOW.findIndex(w => w.role === report.status);
        if (currentIndex === APPROVAL_WORKFLOW.length - 1) {
          return { ...report, status: 'Approved' };
        } else {
          return { ...report, status: APPROVAL_WORKFLOW[currentIndex + 1].role as any };
        }
      }
      return report;
    }));
  };

  const getStatusStyle = (status: BudgetVarianceReport['status']) => {
    switch (status) {
      case 'Approved': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Rejected': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-amber-50 text-amber-700 border-amber-100';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Daily Budget Utilization</h2>
          <p className="text-slate-500 text-sm italic font-medium">Tracking and justifying budget variances and savings protocols.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Analysis Tool */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Real-time Variance Detector</h3>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Infrastructure Node</label>
                <select 
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Fiscal Date</label>
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none"
                />
              </div>
            </div>

            <div className="p-5 bg-slate-900 rounded-2xl text-white space-y-4">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                 <p className="text-[9px] font-black text-white/50 uppercase tracking-widest">Daily Allocation</p>
                 <p className="text-sm font-black font-mono">{formatCurrency(project?.dailyBudget || 0)}</p>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                 <p className="text-[9px] font-black text-white/50 uppercase tracking-widest">Actual Outflow</p>
                 <p className="text-sm font-black font-mono text-red-400">{formatCurrency(actualSpent)}</p>
              </div>
              <div className="flex justify-between items-center">
                 <p className="text-[9px] font-black text-white/50 uppercase tracking-widest">Savings Variance</p>
                 <p className={cn(
                   "text-sm font-black font-mono",
                   variance > 0 ? "text-emerald-400" : "text-rose-400"
                 )}>
                   {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                 </p>
              </div>
            </div>

            {isUnderSpent && (
              <div className="mt-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
                   <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                   <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                     <span className="font-black uppercase mr-1">Compliance alert:</span> Daily spending is below {((actualSpent / (project?.dailyBudget || 1)) * 100).toFixed(0)}% of allocation. Formal justification is mandatory for auditing.
                   </p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="w-full py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/10 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Submit Non-Spending Report
                </button>
              </div>
            )}
          </div>

          <div className="glass-panel p-6 bg-red-600 text-white rounded-3xl shadow-xl shadow-red-600/20">
             <div className="flex items-center gap-3 mb-4">
                <PieChart className="w-5 h-5 text-red-200" />
                <h4 className="text-[10px] font-black uppercase tracking-widest">Fiscal Health Policy</h4>
             </div>
             <p className="text-[11px] font-medium leading-relaxed opacity-90 italic">
               "Systematic under-spending without approved justification may indicate operational bottlenecks or supply chain failure. All identified variances must be reviewed by executive officials."
             </p>
          </div>
        </div>

        {/* ledger */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Variance Justification Ledger</h3>
            <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
               {varianceReports.length} Reports Logged
            </div>
          </div>

          {varianceReports.length === 0 ? (
            <div className="glass-panel p-20 text-center bg-white border border-slate-200 rounded-3xl">
              <TrendingDown className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clear Budget Utilization</h3>
              <p className="text-xs text-slate-400 mt-2">No significant under-spending events recorded in current fiscal cycle.</p>
            </div>
          ) : (
            <div className="space-y-4">
               {varianceReports.map((report) => {
                 const reportProject = projects.find(p => p.id === report.projectId);
                 const currentIndex = APPROVAL_WORKFLOW.findIndex(w => w.role === report.status);

                 return (
                   <div key={report.id} className="glass-panel bg-white border border-slate-200 overflow-auto resize-y group hover:border-red-200 transition-all shadow-sm rounded-3xl">
                      <div className="flex flex-col md:flex-row items-stretch">
                        <div className="p-6 flex-1 border-b md:border-b-0 md:border-r border-slate-100">
                           <div className="flex items-center justify-between mb-4">
                              <div className="flex items-baseline gap-2">
                                 <h4 className="text-sm font-black text-slate-900">{reportProject?.name}</h4>
                                 <span className="text-[10px] font-mono text-slate-400">/{formatDate(report.date)}</span>
                              </div>
                               <div className="flex gap-2 items-center">
                                  <div className={cn("px-2 py-0.5 rounded-full text-[8px] font-black uppercase border", getStatusStyle(report.status))}>
                                    {(report.status || '').replace('Awaiting ', '')}
                                  </div>
                                  <div className="flex gap-1">
                                    <button 
                                      onClick={() => {
                                        setEditingReport(report);
                                        setSelectedProjectId(report.projectId);
                                        setSelectedDate(report.date);
                                        setIsModalOpen(true);
                                      }}
                                      className="p-1 text-slate-400 hover:text-slate-900 border border-slate-200 rounded transition-colors"
                                      title="Edit Report"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                    <button 
                                      onClick={() => {
                                        if (confirm('Verify report deletion?')) {
                                          onDeleteReport(report.id);
                                        }
                                      }}
                                      className="p-1 text-slate-400 hover:text-rose-600 border border-slate-200 rounded transition-colors"
                                      title="Delete Report"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                               </div>
                           </div>
                           
                           <div className="grid grid-cols-3 gap-4 mb-4">
                              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Untouched Funds</p>
                                <p className="text-sm font-black text-emerald-600 font-mono">{formatCurrency(report.variance)}</p>
                              </div>
                              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Utilization</p>
                                <p className="text-sm font-black text-slate-700 font-mono">{((report.actualSpent / report.dailyBudget) * 100).toFixed(0)}%</p>
                              </div>
                              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-center flex flex-col justify-center">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Analyst</p>
                                <p className="text-[10px] font-bold text-slate-900 truncate">{report.reportedByName}</p>
                              </div>
                           </div>

                           <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                              <p className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                <FileText className="w-3 h-3" />
                                Justification Narrative
                              </p>
                              <p className="text-[11px] text-slate-700 font-medium italic leading-relaxed">
                                {report.reason}
                              </p>
                           </div>
                        </div>

                        <div className="bg-slate-50/50 p-6 flex flex-col justify-center gap-4 md:w-64 border-l border-slate-100">
                           {report.status !== 'Approved' ? (
                             <>
                               <div className="space-y-2">
                                  <div className="flex justify-between items-center px-1">
                                     <p className="text-[8px] font-black text-slate-400 uppercase">Verification Tier</p>
                                     <p className="text-[8px] font-black text-red-600 uppercase">{currentIndex + 1}/3</p>
                                  </div>
                                  <div className="flex gap-1 h-1">
                                     {APPROVAL_WORKFLOW.map((_, idx) => (
                                       <div key={idx} className={cn(
                                         "flex-1 rounded-full",
                                         idx < currentIndex ? "bg-emerald-500" :
                                         idx === currentIndex ? "bg-red-500 animate-pulse" : "bg-slate-200"
                                       )} />
                                     ))}
                                  </div>
                               </div>

                               <button 
                                 onClick={() => handleApprove(report.id)}
                                 className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 active:scale-95"
                               >
                                 <ShieldCheck className="w-4 h-4" />
                                 Approve Justification
                               </button>
                             </>
                           ) : (
                             <div className="flex flex-col items-center gap-2 text-center py-2 animate-in zoom-in duration-500">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mb-1">
                                   <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                </div>
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Variance Verified</p>
                                <p className="text-[8px] font-mono text-slate-400 uppercase">Executive Approval Closed</p>
                             </div>
                           )}
                        </div>
                      </div>
                   </div>
                 );
               })}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 text-slate-900">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg border border-slate-200 flex flex-col max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                 <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 leading-none">{editingReport ? 'Modify Variance Report' : 'Non-Spending Protocol'}</h3>
                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1.5">Identifying causes for budgetary variance</p>
              </div>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingReport(null);
                }} 
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateReport} className="p-8 space-y-6 overflow-y-auto min-h-0 flex-1">
              <div className="p-6 bg-slate-900 rounded-[1.5rem] border border-white/10 text-white space-y-3">
                 <div className="flex items-center gap-3 mb-2">
                    <ArrowDownCircle className="w-5 h-5 text-emerald-400" />
                    <h4 className="text-[11px] font-black uppercase tracking-widest">Discovered Imbalance</h4>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div>
                       <p className="text-[8px] font-black text-white/50 uppercase tracking-widest mb-0.5 text-right">Daily Limit</p>
                       <p className="text-base font-black font-mono text-right">{formatCurrency(project?.dailyBudget || 0)}</p>
                    </div>
                    <div>
                       <p className="text-[8px] font-black text-white/50 uppercase tracking-widest mb-0.5">Budget Saving</p>
                       <p className="text-base font-black font-mono text-emerald-400">{formatCurrency(variance)}</p>
                    </div>
                 </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Analysis of Reasoning <span className="text-rose-500">*</span></label>
                <textarea 
                  name="reason" 
                  required 
                  rows={4} 
                  defaultValue={editingReport?.reason}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-medium text-slate-600 resize-none" 
                  placeholder="Identify specific reasons for non-spending (e.g. logistical delays, site optimization, vendor postponement)..."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                    type="button" 
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingReport(null);
                    }} 
                    className="flex-1 py-4 border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all font-black"
                >
                    Discard
                </button>
                <button 
                    type="submit" 
                    className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-xl shadow-slate-900/20"
                >
                    {editingReport ? 'Update Justification' : 'Submit for Official Consensus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
