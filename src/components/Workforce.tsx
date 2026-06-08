import React from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  MapPin, 
  Utensils,
  Printer,
  X,
  Edit3,
  Trash2,
  Download,
  CheckCircle2,
  ShieldCheck,
  UserCheck,
  DollarSign
} from 'lucide-react';
import { cn, createAuditLog } from '@/src/lib/utils';
import { Worker, Project } from '@/src/types';
import { useTranslation, Language } from '../lib/translations';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { notificationService } from '../lib/notificationService';

import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db, storage } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface WorkforceProps {
  projects: Project[];
  workers: Worker[];
  setWorkers: React.Dispatch<React.SetStateAction<Worker[]>>;
  language: Language;
  company?: any;
}

export function Workforce({ projects, workers, setWorkers, language, company }: WorkforceProps) {
  const { t, d } = useTranslation(language);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingWorker, setEditingWorker] = React.useState<Worker | null>(null);
  const [selectedWorkerIds, setSelectedWorkerIds] = React.useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = React.useState<string[]>([]);

  const handleApproval = (id: string, nextStatus: Worker['approvalStatus']) => {
    setWorkers(prev => prev.map(w => {
      if (w.id === id) {
        notificationService.send({
          type: nextStatus === 'Approved' ? 'Success' : 'Request',
          title: `Personnel ${id}: ${nextStatus}`,
          message: `Personnel record for ${w.name} is now ${nextStatus}. Role: ${w.role}`,
          department: nextStatus === 'Pending Manager' ? 'Administrator' : 
                     nextStatus === 'Approved' ? 'Administrator' : 'HR',
          relatedId: id,
          relatedType: 'hr'
        });
        return { ...w, approvalStatus: nextStatus };
      }
      return w;
    }));
  };

  const filteredWorkers = workers.filter(w => 
    (w.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
    (w.role || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    w.id.includes(searchTerm)
  );

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    let currentId = formData.get('id') as string;
    if (!currentId) {
      currentId = editingWorker?.id || '';
    }

    if (!/^\d{5}$/.test(currentId)) {
      alert("Badge number must be exactly 5 digits.");
      return;
    }
    
    if (!editingWorker && workers.some(w => w.id === currentId)) {
      alert("Badge number already exists. Please enter a different one.");
      return;
    }

    const workerData: any = {
      name: formData.get('name') as string,
      role: formData.get('role') as string,
      campus: formData.get('campus') as string,
      room: formData.get('room') as string,
      meals: formData.get('meals') as any,
      status: formData.get('status') as any,
      employmentType: formData.get('employmentType') as any || 'Internal',
      approvalStatus: editingWorker?.approvalStatus || 'Pending HR', // Default to Pending HR for new
      projectId: editingWorker?.projectId || null,
      dailyRate: Number(formData.get('dailyRate')) || 0,
      equipmentDailyRate: Number(formData.get('equipmentDailyRate')) || 0,
      monthlySalary: Number(formData.get('monthlySalary')) || 0,
      totalAllowances: Number(formData.get('totalAllowances')) || 0,
      housingAllowance: Number(formData.get('housingAllowance')) || 0,
      transportationAllowance: Number(formData.get('transportationAllowance')) || 0,
      incentives: Number(formData.get('incentives')) || 0,
      department: formData.get('department') as string,
      idExpiryDate: formData.get('idExpiryDate') as string,
      insuranceStartDate: formData.get('insuranceStartDate') as string,
      insuranceExpiryDate: formData.get('insuranceExpiryDate') as string,
      attachmentUrls: uploadedFiles,
      updatedAt: new Date().toISOString()
    };

    if (!editingWorker) {
      workerData.createdAt = new Date().toISOString();
    }

    try {
      await setDoc(doc(db, 'workers', currentId), workerData, { merge: true });
      
      if (!editingWorker) {
        notificationService.send({
          type: 'Request',
          title: `New Personnel Enrolled: ${workerData.name}`,
          message: `Personnel ${workerData.name} (${currentId}) has been enrolled and is pending HR verification.`,
          department: 'HR',
          relatedId: currentId,
          relatedType: 'hr'
        });
      }

      createAuditLog({
        id: `LOG-${Date.now()}`,
        userId: 'user',
        userName: 'Authorized User',
        action: editingWorker ? 'Update Employee' : 'Enroll Employee',
        target: `Workforce`,
        details: `${editingWorker ? 'Updated' : 'Enrolled'} employee: ${workerData.name} (${currentId})`,
        timestamp: new Date().toISOString()
      });

      setIsModalOpen(false);
      setEditingWorker(null);
      setUploadedFiles([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `workers/${currentId}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Permanently remove this personnel record?')) {
      try {
        await deleteDoc(doc(db, 'workers', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `workers/${id}`);
      }
    }
  };

  const handlePrint = async () => {
    const { generateStandardPDF } = await import('../lib/pdfUtils');
    const { PDFDocument } = await import('pdf-lib');
    
    const workersToPrint = selectedWorkerIds.length > 0 
      ? workers.filter(w => selectedWorkerIds.includes(w.id))
      : workers;

    if (workersToPrint.length === 0) return;

    const { doc, startY } = generateStandardPDF(`WORKFORCE PROFILES`, company || {});
    let y = startY;
    let pdfAttachments: string[] = [];
    const imageAttachmentsToAppend: { workerName: string; index: number; data: string }[] = [];

    workersToPrint.forEach((w) => {
      // Check for page break (Each panel is 45mm tall; A4 height is 297mm. Leave 20mm margin: 277mm)
      if (y + 45 > 277) {
        doc.addPage();
        y = 20;
      }

      // Draw light gray-blue background for the header bar ("dropdown accordion-like header")
      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, 182, 8, 'F');
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59); // slate-800
      
      // Accordion dropdown dropdown arrow indicator '▼'
      doc.text(`▼ #${w.id} - ${w.name} | ${w.role}`, 17, y + 5.5);
      
      y += 8; // Advance to details box

      // Draw border box for details
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.rect(14, y, 182, 32, 'D');

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42); // slate-900

      const col1X = 18;
      const col2X = 105;

      // Row 1
      doc.setFont("helvetica", "bold");
      doc.text("ID Badge:", col1X, y + 5);
      doc.setFont("helvetica", "normal");
      doc.text(w.id, col1X + 18, y + 5);

      doc.setFont("helvetica", "bold");
      doc.text("Daily Rate:", col2X, y + 5);
      doc.setFont("helvetica", "normal");
      doc.text(`SAR ${w.dailyRate}`, col2X + 35, y + 5);

      // Row 2
      doc.setFont("helvetica", "bold");
      doc.text("Full Name:", col1X, y + 10);
      doc.setFont("helvetica", "normal");
      doc.text(w.name, col1X + 18, y + 10);

      doc.setFont("helvetica", "bold");
      doc.text("Monthly Salary:", col2X, y + 10);
      doc.setFont("helvetica", "normal");
      doc.text(`SAR ${w.monthlySalary || 0}`, col2X + 35, y + 10);

      // Row 3
      doc.setFont("helvetica", "bold");
      doc.text("Role/Trade:", col1X, y + 15);
      doc.setFont("helvetica", "normal");
      doc.text(w.role, col1X + 18, y + 15);

      doc.setFont("helvetica", "bold");
      doc.text("Housing Allow.:", col2X, y + 15);
      doc.setFont("helvetica", "normal");
      doc.text(`SAR ${w.housingAllowance || 0}`, col2X + 35, y + 15);

      // Row 4
      doc.setFont("helvetica", "bold");
      doc.text("Status:", col1X, y + 20);
      doc.setFont("helvetica", "normal");
      doc.text(w.status, col1X + 18, y + 20);

      doc.setFont("helvetica", "bold");
      doc.text("Transport Allow.:", col2X, y + 20);
      doc.setFont("helvetica", "normal");
      doc.text(`SAR ${w.transportationAllowance || 0}`, col2X + 35, y + 20);

      // Row 5
      doc.setFont("helvetica", "bold");
      doc.text("Dept/Group:", col1X, y + 25);
      doc.setFont("helvetica", "normal");
      doc.text(`${w.department || 'General'}`, col1X + 22, y + 25);

      doc.setFont("helvetica", "bold");
      doc.text("Other Allowances:", col2X, y + 25);
      doc.setFont("helvetica", "normal");
      doc.text(`SAR ${(w.totalAllowances || 0) + (w.incentives || 0)}`, col2X + 35, y + 25);

      // Row 6
      doc.setFont("helvetica", "bold");
      doc.text("Campus & Room:", col1X, y + 30);
      doc.setFont("helvetica", "normal");
      doc.text(`${w.campus || 'N/A'} - Room ${w.room || 'N/A'}`, col1X + 30, y + 30);

      doc.setFont("helvetica", "bold");
      doc.text("Project Node:", col2X, y + 30);
      doc.setFont("helvetica", "normal");
      doc.text(w.projectId || 'Unassigned', col2X + 35, y + 30);

      y += 38; // Advanced y space (32 box + 6 gap)

      // Collect attachments to draw later
      if (w.attachmentUrls && w.attachmentUrls.length > 0) {
         w.attachmentUrls.forEach((fileStr, i) => {
            if (fileStr.startsWith('data:image/')) {
               imageAttachmentsToAppend.push({ workerName: w.name, index: i + 1, data: fileStr });
            } else if (fileStr.startsWith('data:application/pdf')) {
               pdfAttachments.push(fileStr);
            }
         });
      }
    });

    // Render image attachments on separate pages at the end of text profiles list
    if (imageAttachmentsToAppend.length > 0) {
      imageAttachmentsToAppend.forEach((attachment) => {
        doc.addPage();
        y = 20;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.text(`Image Attachment ${attachment.index} for ${attachment.workerName}`, 14, y);
        try {
          doc.addImage(attachment.data, 'JPEG', 15, y + 8, 180, 240, undefined, 'FAST');
        } catch (e) {
          console.warn('Could not add image attachment to PDF', e);
        }
      });
    }

    try {
        const primaryPdfBytes = doc.output('arraybuffer');
        const mergedPdf = await PDFDocument.load(primaryPdfBytes);
        
        for (const pdfDataStr of pdfAttachments) {
            try {
                const base64Data = pdfDataStr.split(',')[1];
                const pdfToMergeBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                const pdfToMerge = await PDFDocument.load(pdfToMergeBuffer);
                const copiedPages = await mergedPdf.copyPages(pdfToMerge, pdfToMerge.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            } catch (err) {
                console.warn('Failed to merge appended PDF', err);
            }
        }
        
        const mergedPdfFile = await mergedPdf.save();
        const blob = new Blob([mergedPdfFile as Uint8Array], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = workersToPrint.length === 1 ? `WorkerProfile_${workersToPrint[0].id}.pdf` : `Workforce_Profiles.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error('Error generating final PDF', err);
        // Fallback
        doc.save(workersToPrint.length === 1 ? `WorkerProfile_${workersToPrint[0].id}.pdf` : `Workforce_Profiles.pdf`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">{t.hr}</h2>
          <p className="text-slate-500 text-sm italic font-medium">Deployment tracking for {workers.length} operational personnel.</p>
        </div>
        <div className="flex gap-3 print:hidden">
          <button 
            onClick={() => {
              setWorkers(prev => prev.map(w => {
                 if (w.approvalStatus === 'Pending HR') return { ...w, approvalStatus: 'Pending Manager' };
                 if (w.approvalStatus === 'Pending Manager') return { ...w, approvalStatus: 'Approved' };
                 return w;
              }));
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 border border-emerald-600 text-white rounded-md text-[10px] font-bold uppercase tracking-widest shadow-sm hover:bg-emerald-700 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            Bulk Process Pipeline
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-md text-[10px] font-bold uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-colors"
            title={selectedWorkerIds.length > 0 ? `Print ${selectedWorkerIds.length} Selected` : 'Print All Profiles'}
          >
            <Printer className="w-4 h-4" />
            {selectedWorkerIds.length > 0 ? `Selected (${selectedWorkerIds.length})` : 'All Profiles'}
          </button>
          <button 
            onClick={() => { setEditingWorker(null); setUploadedFiles([]); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md text-[10px] font-bold uppercase tracking-widest shadow-sm hover:bg-red-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t.common.add}
          </button>
        </div>
      </div>

      <div className="flex gap-4 print:hidden items-center">
        <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
          <input 
            type="checkbox"
            checked={selectedWorkerIds.length > 0 && selectedWorkerIds.length === filteredWorkers.length}
            onChange={(e) => {
              if (e.target.checked) setSelectedWorkerIds(filteredWorkers.map(w => w.id));
              else setSelectedWorkerIds([]);
            }}
            className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
          />
          <span className="text-xs font-medium text-slate-600">All</span>
        </label>
        <div className="flex-1 glass-panel px-4 py-2 rounded-lg flex items-center gap-3 bg-white border border-slate-200">
          <Search className="w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t.search} 
            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400"
          />
        </div>
        <button className="glass-panel p-2 rounded-lg text-slate-600 hover:bg-slate-50 border border-slate-200">
          <Filter className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredWorkers.map((worker) => (
          <div key={worker.id} className="glass-panel p-6 group hover:border-red-200 transition-all bg-white border border-slate-100">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-400 font-mono text-lg font-bold">
                {worker.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex gap-1 items-center">
                <input 
                  type="checkbox"
                  checked={selectedWorkerIds.includes(worker.id)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedWorkerIds(prev => [...prev, worker.id]);
                    else setSelectedWorkerIds(prev => prev.filter(id => id !== worker.id));
                  }}
                  className="w-4 h-4 mr-2 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                />
                <button 
                  onClick={() => {
                    setSelectedWorkerIds([worker.id]);
                    setTimeout(handlePrint, 50); // call the generic print handler for just this worker
                  }}
                  className="p-1.5 text-slate-300 hover:text-emerald-600 transition-colors"
                  title="Print PDF Profile"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => { setEditingWorker(worker); setUploadedFiles(worker.attachmentUrls || []); setIsModalOpen(true); }}
                  className="p-1.5 text-slate-300 hover:text-red-600 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(worker.id)}
                  className="p-1.5 text-slate-300 hover:text-rose-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="mb-4">
              <h3 className="font-bold text-slate-900 group-hover:text-red-700 transition-colors">{d(worker.name)}</h3>
              <p className="text-[10px] font-mono font-bold text-red-600 bg-red-50 inline-block px-1.5 py-0.5 rounded border border-red-100 mb-1">ID: {worker.id}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{d(worker.role)}</p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <MapPin className="w-4 h-4 text-slate-300" />
                <span className="font-medium">{worker.campus} · <span className="text-slate-400">Rm {worker.room}</span></span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Utensils className="w-4 h-4 text-slate-300" />
                <span className="capitalize">{worker.meals} Logistics Tier</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 pt-1">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span className="font-mono font-bold text-slate-900">{worker.dailyRate}</span>
                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-tighter">Budget Impact / Day</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className={cn(
                  "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border",
                  worker.status === 'Working' ? "bg-red-50 text-red-700 border-red-100" :
                  worker.status === 'On Site' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                  worker.status === 'Off Duty' ? "bg-slate-100 text-slate-500 border-slate-200" :
                  worker.status === 'Vacation' ? "bg-amber-50 text-amber-700 border-amber-100" :
                  worker.status === 'On Leave' ? "bg-rose-50 text-rose-700 border-rose-100" :
                  "bg-rose-50 text-rose-700 border-rose-100"
                )}>
                  {d(worker.status)}
                </span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border",
                  worker.approvalStatus === 'Approved' ? "bg-emerald-500 text-white border-emerald-600" :
                  worker.approvalStatus === 'Pending Manager' ? "bg-amber-500 text-white border-amber-600" :
                  "bg-slate-500 text-white border-slate-600"
                )}>
                  {worker.approvalStatus}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {worker.approvalStatus === 'Pending HR' && (
                  <button 
                    onClick={() => handleApproval(worker.id, 'Pending Manager')}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-red-50 text-red-700 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-red-100 transition-all shadow-sm"
                  >
                    <ShieldCheck className="w-3 h-3" />
                    HR Sequential Approval
                  </button>
                )}
                {worker.approvalStatus === 'Pending Manager' && (
                  <button 
                    onClick={() => handleApproval(worker.id, 'Approved')}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all shadow-sm border border-emerald-100"
                  >
                    <UserCheck className="w-3 h-3" />
                    Manager Linked Sign-off
                  </button>
                )}
                {worker.approvalStatus === 'Approved' && (
                  <div className="flex items-center justify-center gap-2 py-2 text-emerald-600 font-bold text-[10px] uppercase tracking-widest bg-emerald-50/30 rounded border border-dashed border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    Deployment Authorized
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">
                {editingWorker ? 'Update Personnel Parameters' : 'Onboard Operational Personnel'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto min-h-0 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Badge Number (5 Digits)</label>
                  <input name="id" required={!editingWorker} disabled={!!editingWorker} defaultValue={editingWorker?.id} pattern="\d{5}" maxLength={5} minLength={5} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none disabled:opacity-50" placeholder="e.g. 10045" title="Badge number must be exactly 5 digits" />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Full Legal Name</label>
                  <input name="name" required defaultValue={editingWorker?.name} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Operational Role</label>
                  <input name="role" required defaultValue={editingWorker?.role} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Employment Track</label>
                  <select name="employmentType" defaultValue={editingWorker?.employmentType} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none">
                    <option value="Internal">Company Internal</option>
                    <option value="Seconded">Seconded / External</option>
                  </select>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Department</label>
                  <input name="department" defaultValue={editingWorker?.department} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" placeholder="e.g. Engineering, Maintenance..." />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">ID Expiry Date</label>
                  <input name="idExpiryDate" type="date" defaultValue={editingWorker?.idExpiryDate} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Insurance Start</label>
                  <input name="insuranceStartDate" type="date" defaultValue={editingWorker?.insuranceStartDate} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Insurance Expiry</label>
                  <input name="insuranceExpiryDate" type="date" defaultValue={editingWorker?.insuranceExpiryDate} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Duty Status</label>
                  <select name="status" defaultValue={editingWorker?.status} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none">
                    <option value="Working">Working</option>
                    <option value="On Site">On Site</option>
                    <option value="Off Duty">Off Duty</option>
                    <option value="Vacation">Vacation</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Sick Leave">Sick Leave</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Housing Campus (Optional)</label>
                  <input name="campus" defaultValue={editingWorker?.campus} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Room Node (Optional)</label>
                  <input name="room" defaultValue={editingWorker?.room} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Meal Plan Allocation</label>
                  <select name="meals" defaultValue={editingWorker?.meals} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none">
                    <option>Standard</option>
                    <option>Premium</option>
                    <option>Vip</option>
                  </select>
                </div>
                <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Daily Operational Cost ($)</label>
                    <input name="dailyRate" type="number" required defaultValue={editingWorker?.dailyRate} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-mono" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Daily Equipment Cost ($)</label>
                    <input name="equipmentDailyRate" type="number" required defaultValue={editingWorker?.equipmentDailyRate} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-mono" />
                  </div>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-2 border-b-2 border-slate-900 pb-1">Compensation Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Monthly Salary</label>
                      <input name="monthlySalary" type="number" defaultValue={editingWorker?.monthlySalary || 0} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Housing Allowance</label>
                      <input name="housingAllowance" type="number" defaultValue={editingWorker?.housingAllowance || 0} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Transportation Allowance</label>
                      <input name="transportationAllowance" type="number" defaultValue={editingWorker?.transportationAllowance || 0} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Other Allowances</label>
                      <input name="totalAllowances" type="number" defaultValue={editingWorker?.totalAllowances || 0} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Incentives (Variable)</label>
                      <input name="incentives" type="number" defaultValue={editingWorker?.incentives || 0} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-mono" />
                    </div>
                  </div>
                </div>
                
                <div className="col-span-2">
                  <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-2 border-b-2 border-slate-900 pb-1">Attachments & Documents</h4>
                  <div className="bg-slate-50 border border-slate-200 border-dashed rounded p-4 text-center">
                    <input 
                      type="file" 
                      accept=".pdf,image/*"
                      multiple
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []) as File[];
                        e.target.value = ''; // Reset input
                        for (const file of files) {
                          try {
                            const storageRef = ref(storage, `workforce/${Date.now()}_${file.name}`);
                            const snapshot = await uploadBytes(storageRef, file);
                            const downloadUrl = await getDownloadURL(snapshot.ref);
                            setUploadedFiles(prev => [...prev, downloadUrl]);
                          } catch (err) {
                            console.error("Upload error", err);
                            alert("Failed to upload document");
                          }
                        }
                      }}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center gap-2">
                      <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                        <Plus className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Add Documents</span>
                      <span className="text-[10px] text-slate-400">PDF or Images (Max 5MB total)</span>
                    </label>
                  </div>
                  {uploadedFiles.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {uploadedFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded px-2 py-1">
                          <span className="text-[10px] font-mono text-slate-600 truncate max-w-[100px]">Doc_{idx + 1}</span>
                          <button 
                            type="button" 
                            onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors">Abort</button>
                 <button type="submit" className="flex-1 px-4 py-2 bg-red-600 text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-colors shadow-lg">Commit Personnel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
