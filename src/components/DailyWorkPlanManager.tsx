import React from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Save, 
  Edit2, 
  Search, 
  Printer, 
  FileDown, 
  CheckCircle2, 
  AlertCircle,
  Briefcase,
  Clock,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Settings,
  User,
  Users
} from 'lucide-react';
import { cn, getCleanLogoBase64 } from '../lib/utils';
import { Project, DailyWorkPlan, WorkPlanTask, CompanyData, ExecutionStep } from '../types';
import { db } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firebase';

interface DailyWorkPlanManagerProps {
  onClose: () => void;
  company?: CompanyData;
  projects: Project[];
}

export function DailyWorkPlanManager({ onClose, company, projects }: DailyWorkPlanManagerProps) {
  const [plans, setPlans] = React.useState<DailyWorkPlan[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isEditing, setIsEditing] = React.useState(false);
  const [currentPlan, setCurrentPlan] = React.useState<Partial<DailyWorkPlan> | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [message, setMessage] = React.useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [selectedPlanIds, setSelectedPlanIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    const q = query(collection(db, 'dailyWorkPlans'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pList = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as DailyWorkPlan));
      setPlans(pList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'dailyWorkPlans');
    });
    return () => unsubscribe();
  }, []);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAddNew = () => {
    setCurrentPlan({
      projectId: '',
      projectType: 'internal',
      projectName: '',
      externalLocation: '',
      planDate: new Date().toISOString().split('T')[0],
      shift: 'Morning',
      planSupervisor: '',
      projectManager: '',
      planNumber: `DWP-${Date.now().toString().slice(-4)}`,
      tasks: [],
      operationsManagerName: ''
    });
    setIsEditing(true);
  };

  const handleEdit = (plan: DailyWorkPlan) => {
    setCurrentPlan({ 
      ...plan,
      projectType: plan.projectType || 'internal',
      shift: plan.shift || 'Morning' // Default for legacy plans
    });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    try {
      await deleteDoc(doc(db, 'dailyWorkPlans', id));
      showMessage('success', 'Plan deleted successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `dailyWorkPlans/${id}`);
      showMessage('error', 'Failed to delete plan');
    }
  };

  const validatePlan = (plan: Partial<DailyWorkPlan>) => {
    if (currentPlan.projectType === 'internal' && !currentPlan.projectId) {
      return "Main plan information (Project, Date, Plan Number) is required";
    }
    if (currentPlan.projectType === 'external' && !currentPlan.projectName) {
      return "Project Name is required for external projects";
    }
    if (!currentPlan.planDate || !currentPlan.planNumber) {
      return "Date and Plan Number are required";
    }
    if (!plan.planSupervisor || !plan.projectManager) {
      return "Supervisor and Project Manager names are required";
    }
    if (!plan.tasks || plan.tasks.length === 0) {
      return "At least one task is required";
    }
    for (const task of plan.tasks) {
      if (!task.itemType || !task.workerCount || !task.workerJobType || !task.itemLocation || !task.requiredMeters) {
        return "All required fields in tasks must be filled (Type, Count, Job, Location, Required Meters)";
      }
      if (task.executionMethod === 'Combined execution' && (!task.executionSteps || task.executionSteps.length === 0)) {
        return "Combined execution requires at least one step";
      }
    }
    return null;
  };

  const handleSave = async () => {
    if (!currentPlan) return;
    
    // Auto-fill project name if only ID is present
    if (currentPlan.projectId && !currentPlan.projectName) {
      const proj = projects.find(p => p.id === currentPlan.projectId);
      if (proj) currentPlan.projectName = proj.name;
    }

    const error = validatePlan(currentPlan);
    if (error) {
      showMessage('error', error);
      return;
    }

    try {
      const data: any = {
        projectId: currentPlan.projectType === 'internal' ? currentPlan.projectId : 'external',
        projectType: currentPlan.projectType || 'internal',
        projectName: currentPlan.projectName,
        externalLocation: currentPlan.externalLocation || '',
        planDate: currentPlan.planDate,
        shift: currentPlan.shift,
        planSupervisor: currentPlan.planSupervisor,
        projectManager: currentPlan.projectManager,
        planNumber: currentPlan.planNumber,
        tasks: (currentPlan.tasks || []).map(t => ({
          ...t,
          isExpanded: false // Ensure consistency
        })),
        operationsManagerName: currentPlan.operationsManagerName || '',
        updatedAt: serverTimestamp(),
      };
      
      if (currentPlan.id) {
        await updateDoc(doc(db, 'dailyWorkPlans', currentPlan.id), data);
        showMessage('success', 'Plan updated successfully');
      } else {
        await addDoc(collection(db, 'dailyWorkPlans'), {
          ...data,
          createdAt: serverTimestamp()
        });
        showMessage('success', 'Plan created successfully');
      }
      setIsEditing(false);
      setCurrentPlan(null);
    } catch (err) {
      console.error("Save Error:", err);
      handleFirestoreError(err, currentPlan.id ? OperationType.UPDATE : OperationType.CREATE, currentPlan.id ? `dailyWorkPlans/${currentPlan.id}` : 'dailyWorkPlans');
      showMessage('error', 'Failed to save plan. Please check your connection and fields.');
    }
  };

  const addTask = () => {
    if (!currentPlan) return;
    const newTask: WorkPlanTask = {
      id: Math.random().toString(36).substr(2, 9),
      itemType: '',
      workerCount: 0,
      workerJobType: '',
      workerSelectionType: 'Random',
      workerList: [],
      totalMeters: 0,
      requiredMeters: 0,
      itemLocation: '',
      detailedLocation: '',
      executionMethod: 'Individual execution',
      isExpanded: true
    };
    setCurrentPlan({
      ...currentPlan,
      tasks: [...(currentPlan.tasks || []), newTask]
    });
  };

  const removeTask = (taskId: string) => {
    if (!currentPlan) return;
    setCurrentPlan({
      ...currentPlan,
      tasks: currentPlan.tasks?.filter(t => t.id !== taskId)
    });
  };

  const updateTask = (taskId: string, updates: Partial<WorkPlanTask>) => {
    if (!currentPlan) return;
    setCurrentPlan({
      ...currentPlan,
      tasks: currentPlan.tasks?.map(t => t.id === taskId ? { ...t, ...updates } : t)
    });
  };

  const addExecutionStep = (taskId: string) => {
    if (!currentPlan) return;
    const task = currentPlan.tasks?.find(t => t.id === taskId);
    if (!task) return;
    
    const newStep: ExecutionStep = {
      id: Math.random().toString(36).substr(2, 9),
      step: ''
    };
    
    updateTask(taskId, {
      executionSteps: [...(task.executionSteps || []), newStep]
    });
  };

  const removeExecutionStep = (taskId: string, stepId: string) => {
    if (!currentPlan) return;
    const task = currentPlan.tasks?.find(t => t.id === taskId);
    if (!task) return;
    
    updateTask(taskId, {
      executionSteps: task.executionSteps?.filter(s => s.id !== stepId)
    });
  };

  const updateExecutionStep = (taskId: string, stepId: string, value: string) => {
    if (!currentPlan) return;
    const task = currentPlan.tasks?.find(t => t.id === taskId);
    if (!task) return;
    
    updateTask(taskId, {
      executionSteps: task.executionSteps?.map(s => s.id === stepId ? { ...s, step: value } : s)
    });
  };

  const addWorkerToTask = (taskId: string) => {
    if (!currentPlan) return;
    const task = currentPlan.tasks?.find(t => t.id === taskId);
    if (!task) return;
    
    const newWorker = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      badgeNumber: '',
      occupation: task.workerJobType || ''
    };
    
    updateTask(taskId, {
      workerList: [...(task.workerList || []), newWorker]
    });
  };

  const removeWorkerFromTask = (taskId: string, workerId: string) => {
    if (!currentPlan) return;
    const task = currentPlan.tasks?.find(t => t.id === taskId);
    if (!task) return;
    
    updateTask(taskId, {
      workerList: task.workerList?.filter(w => w.id !== workerId)
    });
  };

  const updateWorkerInTask = (taskId: string, workerId: string, updates: any) => {
    if (!currentPlan) return;
    const task = currentPlan.tasks?.find(t => t.id === taskId);
    if (!task) return;
    
    updateTask(taskId, {
      workerList: task.workerList?.map(w => w.id === workerId ? { ...w, ...updates } : w)
    });
  };

  const handleExportPDF = async (plansToPrint: DailyWorkPlan | DailyWorkPlan[]) => {
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const { loadArabicFont, reshapeArabic } = await import('../lib/pdfUtils');

    const doc = new jsPDF();
    const plansArray = Array.isArray(plansToPrint) ? plansToPrint : [plansToPrint];

    // Load Arabic Font
    const fontLoaded = await loadArabicFont(doc);
    const mainFont = fontLoaded ? 'Amiri' : 'helvetica';

    plansArray.forEach((plan, planIdx) => {
      const planTotalWorkers = plan.tasks.reduce((acc, task) => {
        if (task.workerSelectionType === 'Selective') {
          return acc + (task.workerList?.length || 0);
        }
        return acc + (task.workerCount || 0);
      }, 0);

      if (planIdx > 0) doc.addPage();

      // Header Branding
      const logoBase64 = getCleanLogoBase64(company?.logo);
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', 14, 10, 25, 25);
        } catch (e) {
          console.error("Could not draw logo in daily work plan PDF:", e);
        }
      }

      const headerX = logoBase64 ? 45 : 14;
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59); // slate-800
      doc.setFont(mainFont, 'bold');
      doc.text(reshapeArabic('DAILY WORK PLAN'), headerX, 22);
      
      doc.setFontSize(10);
      doc.setFont(mainFont, 'normal');
      doc.setTextColor(100);
      doc.text(reshapeArabic(`${company?.name || 'ARES Operational Report'}`), headerX, 28);
      doc.text(reshapeArabic(`PROJECT PLANNING SYSTEM | OFFICIAL RECORD`), headerX, 33);

      // Metadata Section
      autoTable(doc, {
        startY: 40,
        head: [[
          reshapeArabic('PLAN METADATA'), 
          reshapeArabic('VALUE'), 
          reshapeArabic('CONTROL FIELD'), 
          reshapeArabic('VALUE')
        ]],
        body: [
          [reshapeArabic('Plan ID'), reshapeArabic(plan.planNumber), reshapeArabic('Project Name'), reshapeArabic(plan.projectName)],
          [reshapeArabic('Shift Type'), reshapeArabic(plan.shift), reshapeArabic('Project Location'), reshapeArabic(plan.projectType === 'external' ? (plan.externalLocation || 'External Site') : 'Main Site')],
          [reshapeArabic('Supervisor'), reshapeArabic(plan.planSupervisor), reshapeArabic('Total Workforce'), planTotalWorkers.toString()],
          [reshapeArabic('Project Manager'), reshapeArabic(plan.projectManager), reshapeArabic('Report Date'), reshapeArabic(plan.planDate)]
        ],
        theme: 'grid',
        styles: { font: mainFont, fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          0: { fillColor: [248, 250, 252], fontStyle: 'bold', cellWidth: 30 },
          2: { fillColor: [248, 250, 252], fontStyle: 'bold', cellWidth: 30 }
        }
      });

      let currentY = (doc as any).lastAutoTable.finalY + 12;

      // Sector Header
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.setFont(mainFont, 'bold');
      doc.text(reshapeArabic('EXECUTION TASK SEQUENCE'), 14, currentY);
      currentY += 8;

      plan.tasks.forEach((task, idx) => {
        if (currentY + 60 > 280) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(10);
        doc.setTextColor(220, 38, 38); // red-600
        doc.text(reshapeArabic(`TASK #${idx + 1}: ${task.itemType.toUpperCase()}`), 14, currentY);
        currentY += 4;

        // Task Table
        const workforceText = task.workerSelectionType === 'Selective' 
          ? `${task.workerList?.length || 0} ${task.workerJobType} (Selective)`
          : `${task.workerCount} ${task.workerJobType}`;

        autoTable(doc, {
          startY: currentY,
          head: [[
            reshapeArabic('General Location'), 
            reshapeArabic('Specific Detail'), 
            reshapeArabic('Workforce'), 
            reshapeArabic('Target Meters'), 
            reshapeArabic('Method')
          ]],
          body: [[
            reshapeArabic(task.itemLocation),
            reshapeArabic(task.detailedLocation || 'N/A'),
            reshapeArabic(workforceText),
            reshapeArabic(`${task.requiredMeters} / ${task.totalMeters} m`),
            reshapeArabic(task.executionMethod)
          ]],
          theme: 'grid',
          styles: { font: mainFont, fontSize: 7, cellPadding: 2 },
          headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold' },
          margin: { left: 14 },
          columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 45 },
            2: { cellWidth: 35 },
            3: { cellWidth: 30 },
            4: { cellWidth: 35 }
          }
        });

        currentY = (doc as any).lastAutoTable.finalY + 5;

        // Selective Workers List if applicable
        if (task.workerSelectionType === 'Selective' && task.workerList && task.workerList.length > 0) {
          doc.setFontSize(7);
          doc.setFont(mainFont, 'bold');
          doc.setTextColor(71, 85, 105);
          doc.text(reshapeArabic('Assigned Personnel:'), 14, currentY);
          currentY += 4;
          
          autoTable(doc, {
            startY: currentY,
            head: [[
              reshapeArabic('#'), 
              reshapeArabic('Worker Name'), 
              reshapeArabic('Badge Number'), 
              reshapeArabic('Occupation')
            ]],
            body: task.workerList.map((w, wIdx) => [
              (wIdx + 1).toString(),
              reshapeArabic(w.name),
              reshapeArabic(w.badgeNumber),
              reshapeArabic(w.occupation)
            ]),
            theme: 'striped',
            styles: { font: mainFont, fontSize: 6, cellPadding: 1.5 },
            headStyles: { fillColor: [248, 250, 252], textColor: [100, 116, 139] },
            margin: { left: 18 }
          });
          currentY = (doc as any).lastAutoTable.finalY + 6;
        }

        // Details below table
        doc.setFontSize(8);
        doc.setFont(mainFont, 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text(reshapeArabic('Execution Methodology & Protocol:'), 14, currentY);
        currentY += 4;

        doc.setFont(mainFont, 'normal');
        doc.setTextColor(100);
        if (task.executionMethod === 'Individual execution') {
          const desc = task.individualDescription || 'Standard implementation process as per onsite supervisor instructions.';
          const reshapedDesc = reshapeArabic(desc);
          const lines = doc.splitTextToSize(reshapedDesc, 180);
          doc.text(lines, 14, currentY);
          currentY += (lines.length * 4) + 6;
        } else {
          (task.executionSteps || []).forEach((step, sIdx) => {
            const stepText = reshapeArabic(`Step ${sIdx + 1}: ${step.step}`);
            const stepLines = doc.splitTextToSize(stepText, 175);
            doc.text(stepLines, 18, currentY);
            currentY += (stepLines.length * 4);
            if (currentY > 280) {
               doc.addPage();
               currentY = 20;
            }
          });
          currentY += 6;
        }

        // Separator
        doc.setDrawColor(241, 245, 249);
        doc.line(14, currentY, 196, currentY);
        currentY += 8;
      });

      // Signatures Block
      if (currentY + 50 > 290) {
        doc.addPage();
        currentY = 20;
      }

      currentY += 15;
      doc.setDrawColor(200);
      doc.line(14, currentY, 60, currentY);
      doc.line(80, currentY, 126, currentY);
      doc.line(145, currentY, 191, currentY);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(plan.planSupervisor.toUpperCase(), 14, currentY + 4);
      doc.text(plan.projectManager.toUpperCase(), 80, currentY + 4);
      doc.text((plan.operationsManagerName || 'Operations Manager').toUpperCase(), 145, currentY + 4);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('Plan Supervisor', 14, currentY + 8);
      doc.text('Project Manager', 80, currentY + 8);
      doc.text('Operations Approval', 145, currentY + 8);
      
      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(7);
      doc.text(`Page ${(doc as any).internal.pages.length - 1} of ${pageCount} | Generated on ${new Date().toLocaleString()}`, 105, 290, { align: 'center' });
    });

    const fileName = plansArray.length === 1 
      ? `Daily_Work_Plan_${plansArray[0].planNumber}.pdf`
      : `Daily_Work_Plans_Batch_${new Date().toISOString().split('T')[0]}.pdf`;
      
    doc.save(fileName);
  };

  const filteredPlans = plans.filter(p => 
    (p.projectName || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (p.planNumber || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (p.planSupervisor || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-7xl h-[92vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200"
      >
        {/* Header */}
        <div className="bg-slate-900 px-8 py-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            {isEditing && (
              <button 
                onClick={() => {setIsEditing(false); setCurrentPlan(null);}}
                className="mr-2 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all group"
                title="Back to List"
              >
                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
              </button>
            )}
            <div className="p-3 bg-red-600 rounded-xl shadow-lg shadow-red-600/20">
              <LayoutGrid className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white uppercase tracking-tight">
                {isEditing ? (currentPlan?.id ? 'Edit Execution Plan' : 'Create New Plan') : 'Daily Work Plan Management'}
              </h2>
              <p className="text-slate-400 text-xs font-medium">Efficiency tracking and daily workforce execution logistics.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-slate-50/50">
          {isEditing ? (
            <div className="p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-300">
              {/* Back Link */}
              <button 
                onClick={() => {setIsEditing(false); setCurrentPlan(null);}}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-xs font-bold uppercase tracking-widest"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to all plans
              </button>
              {/* Form Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-slate-900">
                {/* Left Column: Basic Info */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3">
                      <Settings className="w-3 h-3 text-red-600" />
                      Plan Core Identity
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Project Source</label>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setCurrentPlan({...currentPlan!, projectType: 'internal', projectId: '', projectName: ''})}
                            className={cn(
                              "flex-1 px-3 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all",
                              currentPlan?.projectType === 'internal' || !currentPlan?.projectType
                              ? "bg-slate-900 border-slate-900 text-white shadow-sm" 
                              : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                            )}
                          >
                            Internal System
                          </button>
                          <button 
                            onClick={() => setCurrentPlan({...currentPlan!, projectType: 'external', projectId: 'external', projectName: '', externalLocation: ''})}
                            className={cn(
                              "flex-1 px-3 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all",
                              currentPlan?.projectType === 'external' 
                              ? "bg-slate-900 border-slate-900 text-white shadow-sm" 
                              : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                            )}
                          >
                            External Project
                          </button>
                        </div>
                      </div>

                      {currentPlan?.projectType === 'internal' ? (
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Select Internal Project</label>
                          <select 
                            value={currentPlan?.projectId || ''}
                            onChange={e => {
                              const proj = projects.find(p => p.id === e.target.value);
                              setCurrentPlan({...currentPlan!, projectId: e.target.value, projectName: proj?.name || ''});
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                          >
                            <option value="">Select Project...</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                      ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">External Project Name</label>
                            <input 
                              type="text" 
                              value={currentPlan?.projectName || ''}
                              onChange={e => setCurrentPlan({...currentPlan!, projectName: e.target.value})}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500"
                              placeholder="Enter project name..."
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">External Location</label>
                            <input 
                              type="text" 
                              value={currentPlan?.externalLocation || ''}
                              onChange={e => setCurrentPlan({...currentPlan!, externalLocation: e.target.value})}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500"
                              placeholder="Enter site location..."
                            />
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Plan Date</label>
                          <input 
                            type="date" 
                            value={currentPlan?.planDate || ''}
                            onChange={e => setCurrentPlan({...currentPlan!, planDate: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Shift Slot</label>
                          <select 
                            value={currentPlan?.shift || 'Morning'}
                            onChange={e => setCurrentPlan({...currentPlan!, shift: e.target.value as 'Morning' | 'Evening'})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                          >
                            <option value="Morning">Morning Shift</option>
                            <option value="Evening">Evening Shift</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-slate-50">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Plan Number</label>
                          <input 
                            type="text" 
                            value={currentPlan?.planNumber || ''}
                            onChange={e => setCurrentPlan({...currentPlan!, planNumber: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                            placeholder="DWP-001"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Total Workforce (Auto)</label>
                          <div className="w-full bg-slate-100 border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold text-slate-700 flex items-center justify-between">
                             <span>Calculated Team Size:</span>
                             <span className="text-red-600 bg-white px-3 py-1 rounded-md shadow-sm border border-slate-200">
                                {currentPlan?.tasks?.reduce((acc, t) => acc + (t.workerSelectionType === 'Selective' ? (t.workerList?.length || 0) : (t.workerCount || 0)), 0)} Members
                             </span>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Plan Supervisor</label>
                          <input 
                            type="text" 
                            value={currentPlan?.planSupervisor || ''}
                            onChange={e => setCurrentPlan({...currentPlan!, planSupervisor: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500/20"
                            placeholder="Enter Name"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Project Manager</label>
                          <input 
                            type="text" 
                            value={currentPlan?.projectManager || ''}
                            onChange={e => setCurrentPlan({...currentPlan!, projectManager: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500/20"
                            placeholder="Enter Name"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Operations Manager</label>
                          <input 
                            type="text" 
                            value={currentPlan?.operationsManagerName || ''}
                            onChange={e => setCurrentPlan({...currentPlan!, operationsManagerName: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500/20"
                            placeholder="Approval Name"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Dynamic Tasks */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex justify-between items-center bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <LayoutGrid className="w-4 h-4 text-red-600" />
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Tasks & Execution details</h3>
                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[10px] font-black">{currentPlan?.tasks?.length || 0} ITEMS</span>
                    </div>
                    <button 
                      onClick={addTask}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all active:scale-95"
                    >
                      <Plus className="w-3 h-3" />
                      New Task Section
                    </button>
                  </div>

                  <div className="space-y-4">
                    {currentPlan?.tasks?.map((task, idx) => (
                      <div key={task.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ring-1 ring-slate-100">
                        <div 
                          className={cn(
                            "px-6 py-3 flex items-center justify-between cursor-pointer transition-colors",
                            task.isExpanded ? "bg-slate-50 border-b border-slate-100" : "hover:bg-slate-50/50"
                          )}
                          onClick={() => updateTask(task.id, { isExpanded: !task.isExpanded })}
                        >
                          <div className="flex items-center gap-4">
                            <span className="w-6 h-6 rounded bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">{idx + 1}</span>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900">{task.itemType || 'Untitled Task'}</span>
                              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">{task.itemLocation || 'Location Pending'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                             <button 
                                onClick={(e) => {e.stopPropagation(); removeTask(task.id);}}
                                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              {task.isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </div>
                        </div>

                        <AnimatePresence>
                          {task.isExpanded && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                               <div className="p-6 space-y-6">
                                 <div className="grid grid-cols-1 gap-4">
                                   <div>
                                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Item Type</label>
                                     <input 
                                       type="text" 
                                       value={task.itemType}
                                       onChange={e => updateTask(task.id, { itemType: e.target.value })}
                                       className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500"
                                       placeholder="e.g. Block Work, Painting"
                                     />
                                   </div>
                                 </div>

                                 <div className="grid grid-cols-2 gap-4">
                                   <div>
                                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Workforce Selection</label>
                                      <div className="flex gap-2">
                                        <button 
                                          onClick={() => updateTask(task.id, { workerSelectionType: 'Random' })}
                                          className={cn(
                                            "flex-1 px-3 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all",
                                            task.workerSelectionType === 'Random' || !task.workerSelectionType
                                            ? "bg-slate-900 border-slate-900 text-white shadow-sm" 
                                            : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                                          )}
                                        >
                                          Random Allocation
                                        </button>
                                        <button 
                                          onClick={() => updateTask(task.id, { workerSelectionType: 'Selective' })}
                                          className={cn(
                                            "flex-1 px-3 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all",
                                            task.workerSelectionType === 'Selective' 
                                            ? "bg-slate-900 border-slate-900 text-white shadow-sm" 
                                            : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                                          )}
                                        >
                                          Selective Assignment
                                        </button>
                                      </div>
                                   </div>
                                   <div>
                                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Worker Job Category</label>
                                     <input 
                                       type="text" 
                                       value={task.workerJobType}
                                       onChange={e => updateTask(task.id, { workerJobType: e.target.value })}
                                       className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500"
                                       placeholder="e.g. Mason, Helper"
                                     />
                                   </div>
                                 </div>

                                 {task.workerSelectionType === 'Selective' ? (
                                   <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                                      <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Unlimited Worker List</label>
                                        <button 
                                          onClick={() => addWorkerToTask(task.id)}
                                          className="flex items-center gap-1.5 px-3 py-1 bg-red-600 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-red-700 transition-colors"
                                        >
                                          <Plus className="w-3 h-3" />
                                          Add Worker
                                        </button>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {task.workerList?.map((worker, wIdx) => (
                                          <div key={worker.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex gap-3 group/worker">
                                            <div className="flex-1 space-y-2">
                                              <input 
                                                type="text"
                                                value={worker.name}
                                                onChange={e => updateWorkerInTask(task.id, worker.id, { name: e.target.value })}
                                                placeholder="Name"
                                                className="w-full bg-transparent border-b border-slate-200 text-xs font-bold focus:border-red-500 outline-none"
                                              />
                                              <div className="flex gap-2">
                                                <input 
                                                  type="text"
                                                  value={worker.badgeNumber}
                                                  onChange={e => updateWorkerInTask(task.id, worker.id, { badgeNumber: e.target.value })}
                                                  placeholder="Badge #"
                                                  className="w-full bg-transparent border-b border-slate-200 text-[10px] focus:border-red-500 outline-none"
                                                />
                                                <input 
                                                  type="text"
                                                  value={worker.occupation}
                                                  onChange={e => updateWorkerInTask(task.id, worker.id, { occupation: e.target.value })}
                                                  placeholder="Occupation"
                                                  className="w-full bg-transparent border-b border-slate-200 text-[10px] focus:border-red-500 outline-none"
                                                />
                                              </div>
                                            </div>
                                            <button 
                                              onClick={() => removeWorkerFromTask(task.id, worker.id)}
                                              className="p-1 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover/worker:opacity-100"
                                            >
                                              <X className="w-4 h-4" />
                                            </button>
                                          </div>
                                        ))}
                                        {(!task.workerList || task.workerList.length === 0) && (
                                          <div className="md:col-span-2 text-center py-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                            <p className="text-[10px] text-slate-400 italic">No specific workers assigned. Click "Add Worker" to begin.</p>
                                          </div>
                                        )}
                                      </div>
                                   </div>
                                 ) : (
                                   <div className="grid grid-cols-3 gap-4">
                                     <div>
                                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Required Workers #</label>
                                       <input 
                                         type="number" 
                                         value={task.workerCount}
                                         onChange={e => updateTask(task.id, { workerCount: parseInt(e.target.value) || 0 })}
                                         className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500"
                                       />
                                     </div>
                                     <div>
                                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Area Total Meters</label>
                                       <input 
                                         type="number" 
                                         value={task.totalMeters}
                                         onChange={e => updateTask(task.id, { totalMeters: parseInt(e.target.value) || 0 })}
                                         className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none"
                                       />
                                     </div>
                                     <div>
                                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Plan Target Meters</label>
                                       <input 
                                         type="number" 
                                         value={task.requiredMeters}
                                         onChange={e => updateTask(task.id, { requiredMeters: parseInt(e.target.value) || 0 })}
                                         className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none border-red-100 bg-red-50/20"
                                       />
                                     </div>
                                   </div>
                                 )}

                                 <div className="grid grid-cols-2 gap-4">
                                   <div>
                                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Item Location</label>
                                     <input 
                                       type="text" 
                                       value={task.itemLocation}
                                       onChange={e => updateTask(task.id, { itemLocation: e.target.value })}
                                       className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none"
                                       placeholder="e.g. Ground Floor, Sector B"
                                     />
                                   </div>
                                   <div>
                                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Detail Location</label>
                                     <input 
                                       type="text" 
                                       value={task.detailedLocation}
                                       onChange={e => updateTask(task.id, { detailedLocation: e.target.value })}
                                       className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none"
                                       placeholder="e.g. Room 102, West Wall"
                                     />
                                   </div>
                                 </div>

                                 {/* Execution Method Selection */}
                                 <div className="space-y-4 pt-4 border-t border-slate-100">
                                   <div>
                                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Execution method</label>
                                      <div className="flex gap-4">
                                        <button 
                                          onClick={() => updateTask(task.id, { executionMethod: 'Individual execution' })}
                                          className={cn(
                                            "flex-1 px-4 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all",
                                            task.executionMethod === 'Individual execution' 
                                            ? "bg-red-50 border-red-200 text-red-700 shadow-sm" 
                                            : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                                          )}
                                        >
                                          Individual execution
                                        </button>
                                        <button 
                                          onClick={() => updateTask(task.id, { executionMethod: 'Combined execution' })}
                                          className={cn(
                                            "flex-1 px-4 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all",
                                            task.executionMethod === 'Combined execution' 
                                            ? "bg-red-50 border-red-200 text-red-700 shadow-sm" 
                                            : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                                          )}
                                        >
                                          Combined execution
                                        </button>
                                      </div>
                                   </div>

                                   {task.executionMethod === 'Individual execution' ? (
                                      <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Execution Method Description (Optional)</label>
                                        <textarea 
                                          value={task.individualDescription || ''}
                                          onChange={e => updateTask(task.id, { individualDescription: e.target.value })}
                                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-red-500 outline-none resize-none"
                                          rows={3}
                                          placeholder="Describe how this task will be executed individually..."
                                        />
                                      </div>
                                   ) : (
                                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="flex justify-between items-center mb-2">
                                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Combined Execution Steps</label>
                                          <button 
                                            onClick={() => addExecutionStep(task.id)}
                                            className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-colors"
                                          >
                                            Add Step
                                          </button>
                                        </div>
                                        <div className="space-y-3">
                                          {task.executionSteps?.map((step, sIdx) => (
                                            <div key={step.id} className="flex gap-3 items-center group/step">
                                              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[9px] font-black">{sIdx + 1}</span>
                                              <input 
                                                type="text" 
                                                value={step.step}
                                                onChange={e => updateExecutionStep(task.id, step.id, e.target.value)}
                                                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs outline-none focus:border-red-500"
                                                placeholder={`Step ${sIdx + 1} description...`}
                                              />
                                              <button 
                                                onClick={() => removeExecutionStep(task.id, step.id)}
                                                className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover/step:opacity-100"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          ))}
                                          {(!task.executionSteps || task.executionSteps.length === 0) && (
                                            <p className="text-[10px] text-slate-400 italic text-center py-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                              No execution steps defined yet.
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                   )}
                                 </div>
                               </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}

                    {(!currentPlan?.tasks || currentPlan.tasks.length === 0) && (
                       <div className="py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200 shadow-sm">
                          <LayoutGrid className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                          <p className="text-sm font-medium text-slate-400 italic">No tasks added to this execution plan yet.</p>
                          <button 
                            onClick={addTask}
                            className="mt-4 px-6 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all"
                          >
                            Add Your First Task
                          </button>
                       </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Save Bar */}
              <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-lg">
                <button 
                  onClick={() => {setIsEditing(false); setCurrentPlan(null);}}
                  className="px-6 py-2 border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-50"
                >
                  Discard changes
                </button>
                <div className="flex gap-4">
                   {currentPlan?.id && (
                      <button 
                        onClick={() => handleExportPDF(currentPlan as DailyWorkPlan)}
                        className="flex items-center gap-2 px-6 py-2 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                      >
                        <Printer className="w-4 h-4" />
                        Preview Document
                      </button>
                   )}
                   <button 
                    onClick={handleSave}
                    className="flex items-center gap-2 px-10 py-2 bg-red-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all active:scale-95"
                  >
                    <Save className="w-4 h-4" />
                    Finalize execution plan
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 space-y-6 flex flex-col h-full">
               {/* Search & Tool Bar */}
               <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                  <div className="flex flex-1 items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search plan, project or supervisor..."
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-slate-900"
                      />
                    </div>
                    {selectedPlanIds.length > 0 && (
                       <button 
                        onClick={() => {
                          const toPrint = plans.filter(p => selectedPlanIds.includes(p.id));
                          handleExportPDF(toPrint);
                        }}
                        className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg animate-in fade-in zoom-in"
                      >
                        <Printer className="w-4 h-4" />
                        Print Selected ({selectedPlanIds.length})
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        if (selectedPlanIds.length === filteredPlans.length) {
                          setSelectedPlanIds([]);
                        } else {
                          setSelectedPlanIds(filteredPlans.map(p => p.id));
                        }
                      }}
                      className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all"
                    >
                      {selectedPlanIds.length === filteredPlans.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <button 
                      onClick={handleAddNew}
                      className="flex items-center gap-2 px-8 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-lg"
                    >
                      <Plus className="w-4 h-4" />
                      New execution Plan
                    </button>
                  </div>
               </div>

               {/* Plans List Component logic */}
               <div className="flex-1 overflow-auto min-h-0">
                  {loading ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="w-10 h-10 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin"></div>
                    </div>
                  ) : filteredPlans.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                      <LayoutGrid className="w-16 h-16 opacity-10" />
                      <p className="text-sm font-medium italic">No execution plans records found.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-8">
                       {filteredPlans.map(plan => (
                         <motion.div 
                           key={plan.id}
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           className={cn(
                             "bg-white rounded-2xl border transition-all group/card flex flex-col overflow-hidden relative",
                             selectedPlanIds.includes(plan.id) ? "border-red-500 ring-1 ring-red-500" : "border-slate-200 shadow-sm hover:shadow-md"
                           )}
                         >
                            <div 
                              className="absolute top-4 right-4 z-10"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input 
                                type="checkbox"
                                checked={selectedPlanIds.includes(plan.id)}
                                onChange={() => {
                                  setSelectedPlanIds(prev => 
                                    prev.includes(plan.id) 
                                    ? prev.filter(id => id !== plan.id)
                                    : [...prev, plan.id]
                                  );
                                }}
                                className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500 cursor-pointer"
                              />
                            </div>

                            <div className="px-5 py-6 bg-slate-50 border-b border-slate-100 relative text-slate-900">
                               <div className="flex justify-between items-start mb-3">
                                 <div className="flex gap-2 items-center">
                                   <span className="px-2 py-0.5 bg-red-600 text-white text-[9px] font-black rounded uppercase tracking-tighter shadow-sm">{plan.planNumber}</span>
                                   <span className={cn(
                                     "px-2 py-0.5 text-[9px] font-black rounded uppercase tracking-tighter shadow-sm border",
                                     plan.shift === 'Morning' ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-indigo-100 text-indigo-700 border-indigo-200"
                                   )}>
                                     {plan.shift}
                                   </span>
                                 </div>
                                  <div className="flex gap-2 opacity-0 group-hover/card:opacity-100 transition-opacity mr-6">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleEdit(plan); }} 
                                      className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-900 shadow-sm transition-all"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleExportPDF(plan); }} 
                                      className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-900 shadow-sm transition-all"
                                    >
                                      <Printer className="w-3 h-3" />
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleDelete(plan.id); }} 
                                      className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-600 shadow-sm transition-all"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                               </div>
                               <h4 className="text-sm font-bold text-slate-900 uppercase tracking-tight truncate pr-4">{plan.projectName}</h4>
                               <p className="text-[10px] text-slate-400 font-mono tracking-widest mt-1 uppercase font-bold">{plan.planSupervisor}</p>
                               
                               <div className="mt-4 flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                  <div className="flex items-center gap-1.5">
                                    <Users className="w-3 h-3 text-red-500" />
                                    <span>{plan.tasks.reduce((acc, t) => acc + (t.workerSelectionType === 'Selective' ? (t.workerList?.length || 0) : (t.workerCount || 0)), 0)} Workers</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="w-3 h-3 text-red-500" />
                                    <span>{plan.planDate}</span>
                                  </div>
                               </div>
                            </div>

                            <div className="p-5 space-y-4 flex-1">
                               <div className="flex items-center gap-4">
                                  <div className="flex-1 space-y-1">
                                     <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Plan Date</p>
                                     <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                       <Calendar className="w-3.5 h-3.5 text-red-600" />
                                       {plan.planDate}
                                     </div>
                                  </div>
                                  <div className="flex-1 space-y-1">
                                     <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Workforce</p>
                                     <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                       <Users className="w-3.5 h-3.5 text-red-600" />
                                       {plan.tasks.reduce((sum, t) => sum + (t.workerCount || 0), 0)} Men
                                     </div>
                                  </div>
                               </div>

                               <div className="space-y-2">
                                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Execution Target Items</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {plan.tasks.slice(0, 3).map(task => (
                                      <span key={task.id} className="text-[9px] font-medium bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-slate-600">{task.itemType}</span>
                                    ))}
                                    {plan.tasks.length > 3 && (
                                       <span className="text-[9px] font-black text-slate-400">+{plan.tasks.length - 3} MORE</span>
                                    )}
                                  </div>
                               </div>
                            </div>

                            <div className="px-5 py-4 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
                               <div className="flex items-center gap-2">
                                 <div className="w-6 h-6 rounded bg-slate-200 border border-slate-300 flex items-center justify-center">
                                   <User className="w-3 h-3 text-slate-500" />
                                 </div>
                                 <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">{plan.projectManager}</span>
                               </div>
                               <button 
                                onClick={(e) => { e.stopPropagation(); handleEdit(plan); }}
                                className="text-[10px] font-bold text-slate-900 border-b border-slate-900 hover:text-red-600 hover:border-red-600 transition-all uppercase tracking-widest"
                               >
                                 Manage Plan
                               </button>
                            </div>
                         </motion.div>
                       ))}
                    </div>
                  )}
               </div>
            </div>
          )}
        </div>

        {/* Messaging Feedback */}
        <AnimatePresence>
          {message && (
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200]"
            >
               <div className={cn(
                 "px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 border backdrop-blur-md",
                 message.type === 'success' ? "bg-emerald-500/90 text-white border-emerald-400" : "bg-red-600/90 text-white border-red-500"
               )}>
                 {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                 <p className="text-sm font-bold uppercase tracking-tight">{message.text}</p>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
