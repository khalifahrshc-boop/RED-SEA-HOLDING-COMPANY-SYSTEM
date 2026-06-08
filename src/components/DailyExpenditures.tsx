import React from 'react';
import {
  Plus,
  Receipt,
  Calculator,
  Calendar,
  ShieldCheck,
  FileSpreadsheet,
  Download,
  X,
  CheckCircle2,
  Ban,
  Filter,
  Search,
  UserCheck,
  Edit3,
  Trash2
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/src/lib/utils';
import { Project, DailyExpenditure } from '@/src/types';
import { useTranslation, Language } from '../lib/translations';
import * as XLSX from 'xlsx';

import { notificationService } from '../lib/notificationService';

interface DailyExpendituresProps {
  projects: Project[];
  expenditures: DailyExpenditure[];
  setExpenditures: React.Dispatch<React.SetStateAction<DailyExpenditure[]>>;
  onDeleteExpenditure: (id: string) => void;
  language: Language;
  onUpdateProject: (p: Project) => void;
  company?: any;
}

const APPROVAL_WORKFLOW = [
  { role: 'Pending HR', label: 'Human Resources' },
  { role: 'Pending Accounting', label: 'Accounting' },
  { role: 'Pending Operations', label: 'Operations' },
  { role: 'Pending Project Manager', label: 'Project Manager' },
] as const;

export function DailyExpenditures({ projects, expenditures, setExpenditures, onDeleteExpenditure, language, onUpdateProject }: DailyExpendituresProps) {
  const { t } = useTranslation(language);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingExpenditure, setEditingExpenditure] = React.useState<DailyExpenditure | null>(null);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>(projects[0]?.id || '');
  const [searchTerm, setSearchTerm] = React.useState('');

  // Accounting staff info (Mocked for demo)
  const staffName = "Faisal bin Salman";
  const staffId = "ACC-4492";

  const handleCreateExpenditure = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const amount = Number(formData.get('amount'));
    const projectId = formData.get('projectId') as string;

    const newExpenditure: DailyExpenditure = {
      id: editingExpenditure ? editingExpenditure.id : `EXP-${Date.now().toString().slice(-6)}`,
      projectId,
      date: formData.get('date') as string,
      amount,
      description: formData.get('description') as string,
      category: formData.get('category') as string,
      status: editingExpenditure ? editingExpenditure.status : 'Pending HR',
      accountingStaffId: editingExpenditure ? editingExpenditure.accountingStaffId : staffId,
      accountingStaffName: editingExpenditure ? editingExpenditure.accountingStaffName : staffName,
      createdAt: editingExpenditure ? editingExpenditure.createdAt : new Date().toISOString(),
    };

    if (editingExpenditure) {
      setExpenditures(prev => prev.map(e => e.id === editingExpenditure.id ? newExpenditure : e));
    } else {
      setExpenditures(prev => [newExpenditure, ...prev]);

      // Send notification for new request
      notificationService.send({
        type: 'Request',
        title: `New Expenditure: ${newExpenditure.id}`,
        message: `Daily expenditure for ${newExpenditure.description} is pending HR approval. Amount: ${formatCurrency(newExpenditure.amount)}`,
        department: 'HR',
        relatedId: newExpenditure.id,
        relatedType: 'daily-expenditures'
      });
    }

    setIsModalOpen(false);
    setEditingExpenditure(null);
  };

  const handleApprove = (expId: string) => {
    setExpenditures(prev => prev.map(exp => {
      if (exp.id === expId) {
        const currentIndex = APPROVAL_WORKFLOW.findIndex(w => w.role === exp.status);
        let nextStatus: any;
        if (currentIndex === APPROVAL_WORKFLOW.length - 1) {
          // Final Approval - deduct from expenditure budget
          const project = projects.find(p => p.id === exp.projectId);
          if (project) {
            onUpdateProject({
              ...project,
              expenditureBudget: project.expenditureBudget - exp.amount,
              spent: project.spent + exp.amount
            });
          }
          nextStatus = 'Approved';
        } else {
          nextStatus = APPROVAL_WORKFLOW[currentIndex + 1].role;
        }

        notificationService.send({
          type: nextStatus === 'Approved' ? 'Success' : 'Request',
          title: `Expenditure ${exp.id}: ${nextStatus}`,
          message: `Daily expenditure for ${exp.description} is now ${nextStatus}.`,
          department: nextStatus === 'Pending Accounting' ? 'Finance' : 
                     nextStatus === 'Pending Operations' ? 'Administrator' : 
                     nextStatus === 'Pending Project Manager' ? 'Administrator' : 
                     nextStatus === 'Approved' ? 'All' : 'HR',
          relatedId: exp.id,
          relatedType: 'daily-expenditures'
        });

        return { ...exp, status: nextStatus };
      }
      return exp;
    }));
  };

  const handleReject = (expId: string) => {
    setExpenditures(prev => prev.map(exp => 
      exp.id === expId ? { ...exp, status: 'Rejected' } : exp
    ));
  };

  const exportLedger = () => {
    const data = expenditures.map(exp => {
      const project = projects.find(p => p.id === exp.projectId);
      return {
        'Expenditure ID': exp.id,
        'Project': project?.name || 'N/A',
        'Date': exp.date,
        'Amount (SAR)': exp.amount,
        'Description': exp.description,
        'Category': exp.category,
        'Status': exp.status,
        'Staff': exp.accountingStaffName,
        'Staff ID': exp.accountingStaffId,
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Expenditures");
    XLSX.writeFile(wb, "Project_Daily_Expenditures.xlsx");
  };

  const getStatusColor = (status: DailyExpenditure['status']) => {
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
          <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Daily Project Expenditures</h2>
          <p className="text-slate-500 text-sm italic font-medium">Accounting-led fiscal tracking with multi-stage verification.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              setExpenditures(prev => prev.map(exp => {
                if (exp.status !== 'Approved' && exp.status !== 'Rejected') {
                  const project = projects.find(p => p.id === exp.projectId);
                  if (project) {
                    onUpdateProject({
                      ...project,
                      spent: project.spent + exp.amount
                    });
                  }
                  return { ...exp, status: 'Approved' };
                }
                return exp;
              }));
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 border border-emerald-600 text-white rounded-md text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-emerald-700 transition-all"
          >
            <CheckCircle2 className="w-3 h-3" />
            Bulk Authorize Pending
          </button>
          <button 
            onClick={exportLedger}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all"
          >
            <Download className="w-3 h-3" />
            Export Data
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-black transition-all active:scale-95"
          >
            <Plus className="w-3 h-3" />
            Record Expenditure
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {expenditures.length === 0 ? (
          <div className="glass-panel p-20 text-center bg-white border border-slate-200">
            <Receipt className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Expenditures Logged</h3>
            <p className="text-xs text-slate-400 mt-2">Daily costs determined by accounting must pass consensus approval.</p>
          </div>
        ) : (
          expenditures.map((exp) => {
            const project = projects.find(p => p.id === exp.projectId);
            const currentIndex = APPROVAL_WORKFLOW.findIndex(w => w.role === exp.status);
            
            return (
              <div key={exp.id} className="glass-panel bg-white border border-slate-200 overflow-auto resize-y group hover:border-slate-300 transition-all shadow-sm">
                <div className="flex flex-col lg:flex-row items-stretch">
                  <div className="p-6 flex-1 border-b lg:border-b-0 lg:border-r border-slate-100">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-lg shadow-slate-900/20">
                          {formatCurrency(exp.amount).charAt(1)}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">{exp.description}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">{formatDate(exp.date)}</span>
                            <span className="text-slate-300 mx-1">•</span>
                            <span className="text-[10px] font-mono text-slate-400 uppercase leading-none">{exp.id}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase border tracking-tighter", getStatusColor(exp.status))}>
                          {(exp.status || '').replace('Pending ', '')}
                        </span>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => {
                              setEditingExpenditure(exp);
                              setSelectedProjectId(exp.projectId);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors border border-slate-200 rounded"
                            title="Edit Expenditure"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => {
                              if (confirm('Verify expenditure deletion?')) {
                                onDeleteExpenditure(exp.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors border border-slate-200 rounded"
                            title="Delete Expenditure"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Monetary Outflow</p>
                        <p className="text-lg font-black text-slate-900 font-mono tracking-tight">{formatCurrency(exp.amount)}</p>
                      </div>
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Project Hub</p>
                        <p className="text-[11px] font-bold text-slate-700 truncate">{project?.name || 'Unassigned'}</p>
                      </div>
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Expense Category</p>
                        <p className="text-[11px] font-bold text-slate-700 uppercase tracking-tighter">{exp.category}</p>
                      </div>
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fiscal Author</p>
                         <div className="flex items-center gap-2">
                           <UserCheck className="w-3 h-3 text-red-500" />
                           <p className="text-[11px] font-bold text-slate-700">{exp.accountingStaffName}</p>
                         </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50/50 p-6 flex flex-col justify-center gap-4 lg:w-72 border-l border-slate-100">
                    {exp.status !== 'Approved' && exp.status !== 'Rejected' ? (
                      <>
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Departmental Consensus</p>
                          <div className="flex gap-1">
                            {APPROVAL_WORKFLOW.map((tier, idx) => (
                              <div 
                                key={tier.role} 
                                className={cn(
                                  "h-1.5 flex-1 rounded-full",
                                  idx < currentIndex ? "bg-emerald-500" : 
                                  idx === currentIndex ? "bg-red-500 animate-pulse" : "bg-slate-200"
                                )}
                                title={tier.label}
                              />
                            ))}
                          </div>
                          <p className="text-[8px] font-bold text-red-600 uppercase mt-1">Awaiting: {APPROVAL_WORKFLOW[currentIndex]?.label}</p>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <button 
                            onClick={() => handleApprove(exp.id)}
                            className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 active:scale-95"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            Finalize Tier
                          </button>
                          <button 
                            onClick={() => handleReject(exp.id)}
                            className="w-full py-2.5 border border-slate-200 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-rose-600 hover:border-rose-200 transition-all flex items-center justify-center gap-2 active:scale-95"
                          >
                            <Ban className="w-3 h-3" />
                            Reject Data
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        {exp.status === 'Approved' ? (
                          <div className="animate-in zoom-in duration-500">
                            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3">
                              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                            </div>
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Fiscal Consensus Reached</p>
                            <p className="text-[8px] text-slate-400 font-mono mt-1">PROCESSED & LOCKED</p>
                          </div>
                        ) : (
                          <div className="animate-in zoom-in duration-500">
                             <Ban className="w-10 h-10 text-rose-500 mx-auto mb-2" />
                             <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Expenditure Denied</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 text-slate-900">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-200 flex flex-col max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">{editingExpenditure ? 'Modify Fiscal Entry' : 'Fiscal Entry Entry'}</h3>
                <p className="text-[10px] text-red-600 font-black uppercase tracking-widest mt-0.5">Accounting Authorization Mode</p>
              </div>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingExpenditure(null);
                }} 
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateExpenditure} className="p-8 space-y-6 overflow-y-auto min-h-0 flex-1">
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Project Reference Node</label>
                    <select 
                      name="projectId" 
                      required
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold text-slate-700"
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Fiscal Date</label>
                    <input type="date" name="date" required defaultValue={editingExpenditure?.date || new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-red-500/10 transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Expenditure Value (SAR)</label>
                    <input type="number" name="amount" required step="0.01" defaultValue={editingExpenditure?.amount} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-black text-slate-900 font-mono outline-none focus:ring-4 focus:ring-red-500/10 transition-all" placeholder="0.00" />
                  </div>
                </div>

                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Classification Category</label>
                   <select name="category" required defaultValue={editingExpenditure?.category || 'Operational Logistics'} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-red-500/10 transition-all">
                      <option>Operational Logistics</option>
                      <option>Site Maintenance</option>
                      <option>Utility Provisions</option>
                      <option>Administrative Overhead</option>
                      <option>Emergency Repairs</option>
                      <option>Miscellaneous Site Cost</option>
                   </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Detailed Expenditure Description</label>
                  <textarea 
                    name="description" 
                    required 
                    rows={3} 
                    defaultValue={editingExpenditure?.description}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-medium text-slate-600 resize-none" 
                    placeholder="Provide precise details of the cost outflow..."
                  />
                </div>
                
                <div className="p-4 bg-slate-900 rounded-2xl flex items-center gap-4 text-white shadow-xl shadow-slate-900/20">
                   <div className="p-3 bg-white/10 rounded-xl">
                      <UserCheck className="w-5 h-5 text-red-400" />
                   </div>
                   <div>
                      <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-0.5">Active Accountant</p>
                      <p className="text-xs font-black">{staffName} <span className="text-red-400 opacity-80 text-[10px] ml-2 tracking-tighter">#{staffId}</span></p>
                   </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-50">
                <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="flex-1 py-4 border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                    Discard
                </button>
                <button 
                    type="submit" 
                    className="flex-1 py-4 bg-slate-100 text-slate-900 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all active:scale-95 shadow-sm"
                >
                    {editingExpenditure ? 'Update Fiscal Entry' : 'Submit for Multi-Tier Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
