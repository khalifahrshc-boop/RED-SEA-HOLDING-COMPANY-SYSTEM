import React from 'react';
import {
  Plus,
  History,
  TrendingUp,
  Clock,
  ShieldCheck,
  FileText,
  AlertCircle,
  Download,
  X,
  CheckCircle2,
  Ban,
  ChevronRight,
  Trash2,
  Edit3
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/src/lib/utils';
import { Project, AdditionalCost } from '@/src/types';
import { useTranslation, Language } from '../lib/translations';
import * as XLSX from 'xlsx';
import { notificationService } from '../lib/notificationService';

interface AdditionalCostsProps {
  projects: Project[];
  additionalCosts: AdditionalCost[];
  setAdditionalCosts: React.Dispatch<React.SetStateAction<AdditionalCost[]>>;
  onDeleteCost: (id: string) => void;
  language: Language;
  onUpdateProject: (p: Project) => void;
  company?: any;
}

const APPROVAL_WORKFLOW = [
  { role: 'Pending HR', label: 'Human Resources' },
  { role: 'Pending Accounting', label: 'Accounting' },
  { role: 'Pending Management', label: 'Management' },
  { role: 'Pending Project Manager', label: 'Project Manager' },
] as const;

export function AdditionalCosts({ projects, additionalCosts, setAdditionalCosts, onDeleteCost, language, onUpdateProject, company }: AdditionalCostsProps) {
  const { t } = useTranslation(language);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingCost, setEditingCost] = React.useState<AdditionalCost | null>(null);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>(projects[0]?.id || '');
  
  const handleSaveCost = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const startDate = new Date(formData.get('startDate') as string);
    const endDate = new Date(formData.get('endDate') as string);
    const totalAmount = Number(formData.get('totalAmount'));
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const dailyDistribution = totalAmount / diffDays;

    const newCost: AdditionalCost = {
      id: editingCost ? editingCost.id : `AC-${Date.now().toString().slice(-6)}`,
      projectId: formData.get('projectId') as string,
      description: formData.get('description') as string,
      category: formData.get('category') as string,
      totalAmount,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      dailyDistribution,
      reason: formData.get('reason') as string,
      status: editingCost ? editingCost.status : 'Pending HR',
      createdAt: editingCost ? editingCost.createdAt : new Date().toISOString(),
    };

    if (editingCost) {
      setAdditionalCosts(prev => prev.map(c => c.id === editingCost.id ? newCost : c));
    } else {
      setAdditionalCosts(prev => [newCost, ...prev]);
      notificationService.send({
        type: 'Request',
        title: `New Additional Cost: ${newCost.id}`,
        message: `Additional cost request for ${newCost.description} pending HR approval.`,
        department: 'HR',
        relatedId: newCost.id,
        relatedType: 'finance'
      });
    }

    setIsModalOpen(false);
    setEditingCost(null);
  };

  const handleApprove = (costId: string) => {
    setAdditionalCosts(prev => prev.map(cost => {
      if (cost.id === costId) {
        const currentIndex = APPROVAL_WORKFLOW.findIndex(w => w.role === cost.status);
        let nextStatus: any;
        if (currentIndex === APPROVAL_WORKFLOW.length - 1) {
          const project = projects.find(p => p.id === cost.projectId);
          if (project) {
            onUpdateProject({ ...project, spent: project.spent + cost.totalAmount });
          }
          nextStatus = 'Approved';
        } else {
          nextStatus = APPROVAL_WORKFLOW[currentIndex + 1].role;
        }
        return { ...cost, status: nextStatus };
      }
      return cost;
    }));
  };

  const handleReject = (costId: string) => {
    setAdditionalCosts(prev => prev.map(cost => 
      cost.id === costId ? { ...cost, status: 'Rejected' } : cost
    ));
  };

  const exportLedger = () => {
    const data = additionalCosts.map(cost => ({
      'Cost ID': cost.id,
      'Description': cost.description,
      'Amount': cost.totalAmount,
      'Status': cost.status,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Costs");
    XLSX.writeFile(wb, "Additional_Costs.xlsx");
  };

  const getStatusStyle = (status: AdditionalCost['status']) => {
    switch (status) {
      case 'Approved': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Rejected': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-red-50 text-red-700 border-red-100';
    }
  };

  return (
    <div className="space-y-8 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Additional Cost Center</h2>
          <p className="text-sm text-slate-500">Budget adjustments and approval flow.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportLedger} className="px-4 py-2 border rounded-md text-xs font-bold uppercase tracking-widest">Export</button>
          <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-slate-900 text-white rounded-md text-xs font-bold uppercase tracking-widest hover:bg-black transition-all">Add Cost</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {additionalCosts.length === 0 ? (
          <div className="p-12 text-center border rounded-lg bg-slate-50">
            <p className="text-slate-400">No costs recorded.</p>
          </div>
        ) : (
          additionalCosts.map((cost) => {
            const project = projects.find(p => p.id === cost.projectId);
            const currentIndex = APPROVAL_WORKFLOW.findIndex(w => w.role === cost.status);
            
            return (
              <div key={cost.id} className="bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col md:flex-row">
                <div className="p-6 flex-1 border-b md:border-b-0 md:border-r">
                   <div className="flex justify-between items-start mb-4">
                     <div>
                       <h3 className="font-bold">{cost.description}</h3>
                       <p className="text-xs text-slate-400">{cost.id} • {project?.name}</p>
                     </div>
                     <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase border", getStatusStyle(cost.status))}>
                       {cost.status}
                     </span>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Amount</p>
                        <p className="font-bold">{formatCurrency(cost.totalAmount)}</p>
                      </div>
                      <div className="flex gap-1 justify-end items-center">
                        <button onClick={() => { setEditingCost(cost); setIsModalOpen(true); }} className="p-1 border rounded hover:bg-slate-50"><Edit3 className="w-3 h-3" /></button>
                        <button onClick={() => onDeleteCost(cost.id)} className="p-1 border rounded hover:bg-rose-50 text-rose-500"><Trash2 className="w-3 h-3" /></button>
                      </div>
                   </div>
                </div>

                <div className="p-6 bg-slate-50 md:w-64 flex flex-col justify-center gap-3">
                  {cost.status !== 'Approved' && cost.status !== 'Rejected' ? (
                    <>
                      <button onClick={() => handleApprove(cost.id)} className="w-full py-2 bg-slate-900 text-white rounded text-xs font-bold uppercase">Approve ({APPROVAL_WORKFLOW[currentIndex]?.label})</button>
                      <button onClick={() => handleReject(cost.id)} className="w-full py-2 border rounded text-xs font-bold uppercase">Reject</button>
                    </>
                  ) : (
                    <p className="text-center text-xs font-bold uppercase">{cost.status}</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="font-bold uppercase tracking-tight">{editingCost ? 'Edit Cost' : 'Add Cost'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveCost} className="p-6 space-y-4 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Project</label>
                  <select name="projectId" required value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className="w-full border rounded p-2">
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Description</label>
                  <input name="description" required defaultValue={editingCost?.description} className="w-full border rounded p-2" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Category</label>
                    <select name="category" required defaultValue={editingCost?.category || 'Material Delta'} className="w-full border rounded p-2">
                      <option>Material Delta</option>
                      <option>Labor Delta</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Amount</label>
                    <input type="number" name="totalAmount" required defaultValue={editingCost?.totalAmount} className="w-full border rounded p-2" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Start Date</label>
                    <input type="date" name="startDate" required defaultValue={editingCost?.startDate} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">End Date</label>
                    <input type="date" name="endDate" required defaultValue={editingCost?.endDate} className="w-full border rounded p-2" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Reason</label>
                  <textarea name="reason" required rows={2} defaultValue={editingCost?.reason} className="w-full border rounded p-2" />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border rounded font-bold uppercase text-xs">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-slate-900 text-white rounded font-bold uppercase text-xs hover:bg-black">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
