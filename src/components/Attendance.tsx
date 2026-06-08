import React from 'react';
import { 
  Calendar, 
  Search, 
  Plus, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  User, 
  X,
  ChevronRight,
  Filter,
  FileSpreadsheet,
  AlertCircle,
  Trash2,
  Settings,
  ClipboardList,
  Users,
  ChevronDown
} from 'lucide-react';
import { cn, formatCurrency, formatDate, getCleanLogoBase64 } from '../lib/utils';
import { Project, Worker, AttendanceSheet, AttendanceRecord, AttendanceStatus, CompanyData } from '../types';
import { useTranslation, Language } from '../lib/translations';
import { Printer, Copy } from 'lucide-react';
import { ComprehensiveAttendanceReport } from './ComprehensiveAttendanceReport';
import { WorkAreaGroupManager } from './WorkAreaGroupManager';
import { DailyAttendanceScheduleManager } from './DailyAttendanceSchedule';
import { useAuth } from '../contexts/AuthContext';

import { notificationService } from '../lib/notificationService';

import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firebase';

interface AttendanceProps {
  projects: Project[];
  workers: Worker[];
  attendanceSheets: AttendanceSheet[];
  setAttendanceSheets: React.Dispatch<React.SetStateAction<AttendanceSheet[]>>;
  onDeleteSheet?: (id: string) => void;
  language: Language;
  company?: Partial<CompanyData>;
}

const APPROVAL_WORKFLOW = [
  { role: 'Pending Project Manager', label: 'Project Manager' },
  { role: 'Pending HR Manager', label: 'HR Manager' },
  { role: 'Pending Accounting', label: 'Accounting Manager' },
  { role: 'Pending Operations', label: 'Operations Manager' },
  { role: 'Pending Executive', label: 'Executive Manager' },
] as const;

export function Attendance({ projects, workers, attendanceSheets, setAttendanceSheets, onDeleteSheet, language, company }: AttendanceProps) {
  const { t, d } = useTranslation(language);
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isComprehensiveReportOpen, setIsComprehensiveReportOpen] = React.useState(false);
  const [isWorkAreaManagerOpen, setIsWorkAreaManagerOpen] = React.useState(false);
  const [isDailyScheduleMgrOpen, setIsDailyScheduleMgrOpen] = React.useState(false);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>(projects[0]?.id || '');
  const [currentDate, setCurrentDate] = React.useState<string>(new Date().toISOString().split('T')[0]);
  const [expandedRecords, setExpandedRecords] = React.useState<Record<string, boolean>>({});
  const [selectedSheetIds, setSelectedSheetIds] = React.useState<string[]>([]);

  // Project Selection Enhancements states
  const [projectInputMode, setProjectInputMode] = React.useState<'linked' | 'custom'>('linked');
  const [projectSearchTerm, setProjectSearchTerm] = React.useState('');
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = React.useState(false);
  const [manualProjectName, setManualProjectName] = React.useState('');
  const [manualPrepTime, setManualPrepTime] = React.useState('07:00');
  const [manualCloseTime, setManualCloseTime] = React.useState('08:30');
  const [manualSupervisorName, setManualSupervisorName] = React.useState('');
  const [manualSupervisorId, setManualSupervisorId] = React.useState('');
  const [selectedWorkerIds, setSelectedWorkerIds] = React.useState<string[]>([]);
  const [workerSearchQuery, setWorkerSearchQuery] = React.useState('');

  // PDF Export and print states
  const [printSheets, setPrintSheets] = React.useState<AttendanceSheet[]>([]);
  const [isGeneratingDailyPDF, setIsGeneratingDailyPDF] = React.useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  const [isCopying, setIsCopying] = React.useState(false);

  // Get all workers who might be supervisors
  const availableSupervisors = workers.filter(w => (w.role || '').toLowerCase().includes('supervisor') || (w.role || '').toLowerCase().includes('manager'));
  const [selectedSupervisorId, setSelectedSupervisorId] = React.useState<string>(availableSupervisors[0]?.id || '');

  // Auto-populate related project information when an existing project is selected
  const selectedProjectObj = React.useMemo(() => {
    return projects.find(p => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  React.useEffect(() => {
    if (selectedProjectObj) {
      setProjectSearchTerm(selectedProjectObj.name);
      
      if (selectedProjectObj.managerId) {
        const matchingSup = workers.find(w => w.id === selectedProjectObj.managerId || (w.id || '').toLowerCase() === (selectedProjectObj.managerId || '').toLowerCase());
        if (matchingSup) {
          setSelectedSupervisorId(matchingSup.id);
        } else {
          const fallbackSup = availableSupervisors.find(s => s.id === selectedProjectObj.managerId);
          if (fallbackSup) {
            setSelectedSupervisorId(fallbackSup.id);
          }
        }
      }
    }
  }, [selectedProjectId, selectedProjectObj, workers]);

  // Filter project dropdown options based on search query
  const filteredProjectsDropdown = React.useMemo(() => {
    if (!projectSearchTerm) return projects;
    return projects.filter(p => 
      (p.name || '').toLowerCase().includes((projectSearchTerm || '').toLowerCase()) || 
      (p.id || '').toLowerCase().includes((projectSearchTerm || '').toLowerCase())
    );
  }, [projects, projectSearchTerm]);

  // Filter workers inside custom creator list
  const filteredWorkersForSelection = React.useMemo(() => {
    if (!workerSearchQuery) return workers;
    return workers.filter(w => 
      (w.name || '').toLowerCase().includes((workerSearchQuery || '').toLowerCase()) || 
      (w.id || '').toLowerCase().includes((workerSearchQuery || '').toLowerCase()) || 
      (w.role || '').toLowerCase().includes((workerSearchQuery || '').toLowerCase())
    );
  }, [workers, workerSearchQuery]);

  const handleCreateSheet = async () => {
    let sheetProjectId = '';
    let sheetProjectName = '';
    let sheetSupervisorName = '';
    let sheetSupervisorId = '';
    let sheetRecords: AttendanceRecord[] = [];

    if (projectInputMode === 'linked') {
      const project = projects.find(p => p.id === selectedProjectId);
      if (!project) return;
      sheetProjectId = selectedProjectId;
      sheetProjectName = project.name;

      const supervisor = workers.find(w => w.id === selectedSupervisorId) || { name: 'Unknown', id: 'N/A' };
      sheetSupervisorName = supervisor.name;
      sheetSupervisorId = supervisor.id;

      const projectWorkers = workers.filter(w => w.projectId === selectedProjectId);
      sheetRecords = projectWorkers.map(w => ({
        workerId: w.id,
        workerName: w.name,
        status: 'Present',
      }));
    } else {
      if (!manualProjectName.trim()) {
        alert('Please specify a project name');
        return;
      }
      sheetProjectId = `P-CUST-${Date.now().toString().slice(-4)}`;
      sheetProjectName = manualProjectName.trim();
      sheetSupervisorName = manualSupervisorName.trim() || 'Custom Supervisor';
      sheetSupervisorId = manualSupervisorId.trim() || `SUP-CUST-${Date.now().toString().slice(-4)}`;

      const chosenWorkers = workers.filter(w => selectedWorkerIds.includes(w.id));
      sheetRecords = chosenWorkers.map(w => ({
        workerId: w.id,
        workerName: w.name,
        status: 'Present',
      }));
    }

    const newSheet: any = {
      projectId: sheetProjectId,
      projectName: sheetProjectName,
      date: currentDate,
      supervisorName: sheetSupervisorName,
      supervisorId: sheetSupervisorId,
      records: sheetRecords,
      status: 'Draft',
      createdAt: new Date().toISOString()
    };

    try {
      const id = `ATT-${Date.now().toString().slice(-6)}`;
      await setDoc(doc(db, 'attendanceSheets', id), newSheet);
      setIsModalOpen(false);
      // Reset custom inputs
      setManualProjectName('');
      setManualSupervisorName('');
      setManualSupervisorId('');
      setSelectedWorkerIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'attendanceSheets');
    }
  };

  const handleUpdateRecordStatus = async (sheetId: string, workerId: string, status: AttendanceStatus) => {
    const sheet = attendanceSheets.find(s => s.id === sheetId);
    if (!sheet) return;

    try {
      const newRecords = sheet.records.map(rec => 
        rec.workerId === workerId ? { ...rec, status } : rec
      );
      await setDoc(doc(db, 'attendanceSheets', sheetId), { 
        records: newRecords,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `attendanceSheets/${sheetId}`);
    }
  };

  const handleUpdateRecordField = async (sheetId: string, workerId: string, field: keyof AttendanceRecord, value: any) => {
    const sheet = attendanceSheets.find(s => s.id === sheetId);
    if (!sheet) return;

    try {
      const newRecords = sheet.records.map(rec => 
        rec.workerId === workerId ? { ...rec, [field]: value } : rec
      );
      await setDoc(doc(db, 'attendanceSheets', sheetId), { 
        records: newRecords,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `attendanceSheets/${sheetId}`);
    }
  };

  const handleDeleteRecord = async (sheetId: string, workerId: string) => {
    const sheet = attendanceSheets.find(s => s.id === sheetId);
    if (!sheet) return;

    try {
      const updatedRecords = sheet.records.filter(rec => rec.workerId !== workerId);
      await setDoc(doc(db, 'attendanceSheets', sheetId), { 
        records: updatedRecords,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `attendanceSheets/${sheetId}`);
    }
  };

  const handleSubmitSheet = async (sheetId: string) => {
    const sheet = attendanceSheets.find(s => s.id === sheetId);
    if (!sheet) return;

    try {
      await setDoc(doc(db, 'attendanceSheets', sheetId), { 
        status: 'Pending Project Manager',
        updatedAt: new Date().toISOString()
      }, { merge: true });

      notificationService.send({
        type: 'Request',
        title: `Attendance ${sheetId}: Pending PM`,
        message: `Attendance sheet for project ${projects.find(p => p.id === sheet.projectId)?.name} is awaiting Project Manager approval.`,
        department: 'Administrator', 
        relatedId: sheetId,
        relatedType: 'attendance'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `attendanceSheets/${sheetId}`);
    }
  };

  const handleCopySheet = async (sheet: AttendanceSheet) => {
    setIsCopying(true);
    try {
      const id = `ATT-${Date.now().toString().slice(-6)}`;
      const copiedSheet: any = {
        projectId: sheet.projectId,
        projectName: sheet.projectName || '',
        date: new Date().toISOString().split('T')[0], // Set default copied date to today
        supervisorName: sheet.supervisorName,
        supervisorId: sheet.supervisorId,
        records: sheet.records.map(rec => ({
          workerId: rec.workerId,
          workerName: rec.workerName,
          status: rec.status, 
          checkInTime: rec.checkInTime || '',
          notes: rec.notes || '',
          hasPPE: rec.hasPPE !== undefined ? rec.hasPPE : true,
          isHealthy: rec.isHealthy !== undefined ? rec.isHealthy : true,
          requiredHours: rec.requiredHours !== undefined ? rec.requiredHours : 8,
          completedHours: rec.completedHours !== undefined ? rec.completedHours : 8,
          breaksCount: rec.breaksCount !== undefined ? rec.breaksCount : 0,
          breakDuration: rec.breakDuration !== undefined ? rec.breakDuration : 0,
          endTime: rec.endTime || ''
        })),
        status: 'Draft',
        createdAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'attendanceSheets', id), copiedSheet);
    } catch (error) {
      console.error("Failed to copy attendance sheet:", error);
      handleFirestoreError(error, OperationType.CREATE, 'attendanceSheets');
    } finally {
      setIsCopying(false);
    }
  };

  const handleApprove = async (sheetId: string) => {
    const sheet = attendanceSheets.find(s => s.id === sheetId);
    if (!sheet) return;

    try {
      const currentIndex = APPROVAL_WORKFLOW.findIndex(w => w.role === sheet.status);
      let nextStatus: any;
      if (currentIndex === APPROVAL_WORKFLOW.length - 1) {
        nextStatus = 'Approved';
      } else {
        nextStatus = APPROVAL_WORKFLOW[currentIndex + 1].role;
      }

      await setDoc(doc(db, 'attendanceSheets', sheetId), { 
        status: nextStatus,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      notificationService.send({
        type: nextStatus === 'Approved' ? 'Success' : 'Request',
        title: `Attendance ${sheetId}: ${nextStatus}`,
        message: `Attendance sheet for project ${projects.find(p => p.id === sheet.projectId)?.name} is now ${nextStatus}.`,
        department: nextStatus === 'Pending HR Manager' ? 'HR' : 
                   nextStatus === 'Pending Accounting' ? 'Finance' : 
                   nextStatus === 'Approved' ? 'All' : 'Administrator',
        relatedId: sheetId,
        relatedType: 'attendance'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `attendanceSheets/${sheetId}`);
    }
  };

  const getStatusColor = (status: AttendanceSheet['status']) => {
    switch (status) {
      case 'Draft': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'Approved': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      default: return 'bg-red-50 text-red-700 border-red-100';
    }
  };

  const handlePrintSheets = (specificSheetId?: string) => {
    import('../lib/pdfUtils').then(({ generateStandardPDF, applyAutoTable }) => {
        const sheetsToPrint = specificSheetId 
          ? attendanceSheets.filter(s => s.id === specificSheetId)
          : selectedSheetIds.length > 0 
            ? attendanceSheets.filter(s => selectedSheetIds.includes(s.id))
            : attendanceSheets;

        if (sheetsToPrint.length === 0) return;

        const { doc, startY } = generateStandardPDF(
            sheetsToPrint.length === 1 ? `ATTENDANCE SHEET: ${projects.find(p => p.id === sheetsToPrint[0].projectId)?.name || sheetsToPrint[0].projectName || ''}` : 'ATTENDANCE SHEETS REPORT', 
            company || {}
        );
        let y = startY;

        sheetsToPrint.forEach((sheet, idx) => {
            const project = projects.find(p => p.id === sheet.projectId);
            
            if (idx > 0) {
              doc.addPage();
              y = 20; // reset y for new page
              doc.setFontSize(14);
              doc.text(`ATTENDANCE SHEET: ${project?.name || sheet.projectName || ''}`, 14, y); y += 8;
            }
            
            doc.setFontSize(10);
            doc.text(`Project Node: ${sheet.projectId} - ${project?.name || sheet.projectName || ''}`, 14, y); y += 8;
            doc.text(`Date: ${sheet.date}`, 14, y); y += 8;
            doc.text(`Status: ${sheet.status}`, 14, y); y += 8;
            doc.text(`Supervisor: ${sheet.supervisorName} (ID: ${sheet.supervisorId})`, 14, y); y += 8;
            doc.text(`Cut-off Time: ${project?.attendanceCloseTime || '08:30'}`, 14, y); y += 12;

            const tableData = sheet.records.map(rec => [
                `${rec.workerName}\n(${rec.workerId})`,
                rec.status,
                `PPE: ${rec.hasPPE ? 'Yes' : 'No'}\nHealth: ${rec.isHealthy ? 'Good' : 'Check'}`,
                `${rec.completedHours || 0} / ${rec.requiredHours || 0}`,
                `${rec.breaksCount || 0} breaks (${rec.breakDuration || 0}m)\nEnd: ${rec.endTime || '--:--'}`
            ]);

            applyAutoTable(doc, {
                startY: y,
                head: [['Personnel', 'Status', 'Health & PPE', 'Hours (Comp/Req)', 'Breaks & Departure']],
                body: tableData,
                styles: { fontSize: 8 },
            });

            y = (doc as any).lastAutoTable.finalY + 15;
            doc.text('Supervisor Authorization: _________________________', 14, y);
        });

        doc.save(sheetsToPrint.length === 1 ? `AttendanceSheet_${sheetsToPrint[0].id}.pdf` : 'Attendance_Report.pdf');
    });
  };

  const handleDirectPrintDailyAttendance = async (specificSheetId?: string) => {
    const sheetsToPrint = specificSheetId 
      ? attendanceSheets.filter(s => s.id === specificSheetId)
      : selectedSheetIds.length > 0 
        ? attendanceSheets.filter(s => selectedSheetIds.includes(s.id))
        : attendanceSheets;

    if (sheetsToPrint.length === 0) {
      alert('Please select at least one attendance sheet to print.');
      return;
    }

    setPrintSheets(sheetsToPrint);
    
    setTimeout(() => {
      const afterPrint = () => {
        setPrintSheets([]);
        window.removeEventListener('afterprint', afterPrint);
      };
      window.addEventListener('afterprint', afterPrint);
      
      // Fallback if event is not supported / reliable
      setTimeout(() => {
        setPrintSheets([]);
        window.removeEventListener('afterprint', afterPrint);
      }, 10000);
      
      try {
        window.print();
      } catch (e) {
        console.error("Print blocked by browser", e);
      }
    }, 500);
  };

  const handleExportDailyAttendancePDF = async (specificSheetId?: string) => {
    setIsGeneratingDailyPDF(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF } = await import('jspdf');
      const { fixHtml2CanvasOklch } = await import('../lib/pdfUtils');

      const sheetsToExport = specificSheetId 
        ? attendanceSheets.filter(s => s.id === specificSheetId)
        : selectedSheetIds.length > 0 
          ? attendanceSheets.filter(s => selectedSheetIds.includes(s.id))
          : attendanceSheets;

      if (sheetsToExport.length === 0) {
        alert('Please select at least one attendance sheet to export.');
        setIsGeneratingDailyPDF(false);
        return;
      }

      setPrintSheets(sheetsToExport);
      
      // Wait a frame for React to render the printable nodes
      await new Promise(resolve => setTimeout(resolve, 350));
      
      const printContainer = document.getElementById('attendance-report-printable');
      if (printContainer) {
        printContainer.classList.remove('hidden');
        printContainer.classList.remove('print:block');
        printContainer.style.position = 'absolute';
        printContainer.style.left = '-9999px';
        printContainer.style.top = '-9999px';
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      
      for (let i = 0; i < sheetsToExport.length; i++) {
        const sheet = sheetsToExport[i];
        const element = document.getElementById(`daily-print-node-${sheet.id}`);
        if (!element) {
          console.error(`Render element not found: daily-print-node-${sheet.id}`);
          continue;
        }

        if (i > 0) pdf.addPage();

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          onclone: (clonedDoc) => {
            const printable = clonedDoc.getElementById(`daily-print-node-${sheet.id}`);
            if (printable) {
              const style = clonedDoc.createElement('style');
              style.innerHTML = `
                * { 
                  font-feature-settings: "kern" 1, "liga" 1, "calt" 1 !important;
                  text-rendering: optimizeLegibility !important;
                  letter-spacing: normal !important;
                }
                .font-arabic, [dir="rtl"] {
                  font-family: sans-serif !important;
                  direction: rtl !important;
                  unicode-bidi: isolate !important;
                }
              `;
              clonedDoc.head.appendChild(style);

              fixHtml2CanvasOklch(clonedDoc);
              
              const tables = printable.getElementsByTagName('table');
              for (let t = 0; t < tables.length; t++) {
                tables[t].style.backgroundColor = '#ffffff';
              }
            }
          }
        });

        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, Math.min(pdfHeight, pdf.internal.pageSize.getHeight()));
      }

      pdf.save(sheetsToExport.length === 1 
        ? `DailyAttendanceSheet_${sheetsToExport[0].id}.pdf` 
        : `Ares_DailyAttendance_Batch.pdf`
      );

    } catch (error) {
      console.error('Error generating Daily Attendance PDF:', error);
      alert('High quality capture engine failed, downloading standard PDF report as fallback...');
      handlePrintSheets(specificSheetId);
    } finally {
      setIsGeneratingDailyPDF(false);

      const printContainer = document.getElementById('attendance-report-printable');
      if (printContainer) {
        printContainer.classList.add('hidden');
        printContainer.classList.add('print:block');
        printContainer.style.position = '';
        printContainer.style.left = '';
        printContainer.style.top = '';
      }
      
      // Clear print state to prevent overlap with other prints
      setTimeout(() => setPrintSheets([]), 500);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Project Attendance sheets</h2>
          <p className="text-slate-500 text-sm italic font-medium">Monitoring personnel deployment and verification thresholds.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsWorkAreaManagerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 bg-white rounded-md text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all active:scale-95"
          >
            <Users className="w-3 h-3 text-red-600" />
            Work Area Group Management
          </button>
          <button 
            onClick={() => setIsDailyScheduleMgrOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 bg-white rounded-md text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all active:scale-95"
          >
            <Calendar className="w-3 h-3 text-red-600" />
            {language === 'ar' ? 'جدول الحضور اليومي للمشروع' : 'Daily Attendance Schedule'}
          </button>
          <button 
            onClick={() => setIsComprehensiveReportOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 bg-white rounded-md text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all active:scale-95"
          >
            <ClipboardList className="w-3 h-3 text-red-600" />
            Comprehensive Attendance Report
          </button>
          <button 
            onClick={() => handleDirectPrintDailyAttendance()}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 bg-white rounded-md text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all active:scale-95"
            title={selectedSheetIds.length > 0 ? `Print ${selectedSheetIds.length} Selected Sheets` : "Print All Sheets"}
          >
            <Printer className="w-3 h-3" />
            {selectedSheetIds.length > 0 ? `Print Selected (${selectedSheetIds.length})` : "Print All"}
          </button>
          
          <button 
            disabled={isGeneratingDailyPDF}
            onClick={() => handleExportDailyAttendancePDF()}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 bg-white rounded-md text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
            title={selectedSheetIds.length > 0 ? `Export ${selectedSheetIds.length} Selected PDF` : "Export All PDF"}
          >
            <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
            {isGeneratingDailyPDF ? 'Exporting...' : (selectedSheetIds.length > 0 ? `Export PDF (${selectedSheetIds.length})` : "A4 PDF Export")}
          </button>
          <button 
            disabled={!hasPermission('hr', 'attendance', 'approve')}
            onClick={() => {
              setAttendanceSheets(prev => prev.map(sheet => {
                if (sheet.status !== 'Approved' && sheet.status !== 'Draft') {
                  const currentIndex = APPROVAL_WORKFLOW.findIndex(step => step.role === sheet.status);
                  return currentIndex === APPROVAL_WORKFLOW.length - 1 
                    ? { ...sheet, status: 'Approved' } 
                    : { ...sheet, status: APPROVAL_WORKFLOW[currentIndex + 1].role as any };
                }
                return sheet;
              }));
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-3 h-3" />
            Bulk Approve Pending
          </button>
          <button 
            disabled={!hasPermission('hr', 'attendance', 'create')}
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-black transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-3 h-3" />
            Generate New Sheet
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-12 space-y-4">
           {attendanceSheets.length === 0 ? (
             <div className="glass-panel p-20 text-center bg-white border border-slate-200">
                <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Attendance Sheets Logged</h3>
                <p className="text-xs text-slate-400 mt-2">Initialize a daily ledger for your project nodes.</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 gap-6">
                {attendanceSheets.map((sheet) => {
                  const project = projects.find(p => p.id === sheet.projectId);
                   return (
                     <div key={sheet.id} className="glass-panel bg-white border border-slate-200 overflow-auto resize-y group">
                      <div className="flex flex-col md:flex-row items-stretch border-b border-slate-100">
                        <div className="p-6 md:border-r border-slate-100 flex-1">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <input 
                                type="checkbox"
                                checked={selectedSheetIds.includes(sheet.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedSheetIds(prev => [...prev, sheet.id]);
                                  else setSelectedSheetIds(prev => prev.filter(id => id !== sheet.id));
                                }}
                                className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                              />
                              <div className="p-2 bg-slate-100 text-slate-600 rounded">
                                <FileSpreadsheet className="w-4 h-4" />
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-slate-900">{project?.name || sheet.projectName || 'External / Custom Project'}</h3>
                                <p className="text-[10px] font-mono text-slate-400">{sheet.id} • {formatDate(sheet.date)}</p>
                              </div>
                            </div>

                            <div className="flex gap-2 items-center">
                              <span className={cn("px-2 py-0.5 rounded text-[8px] font-bold uppercase border", getStatusColor(sheet.status))}>
                                {(sheet.status || '').replace('Pending ', '')}
                              </span>

                              {deleteConfirmId === sheet.id ? (
                                <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-md p-1">
                                  <span className="text-[9px] font-bold text-red-600 px-1 font-sans">
                                    {language === 'ar' ? 'تأكيد الحذف؟' : 'Confirm Delete?'}
                                  </span>
                                  <button 
                                      type="button"
                                      onClick={() => {
                                        if (onDeleteSheet) {
                                          onDeleteSheet(sheet.id);
                                        }
                                        setDeleteConfirmId(null);
                                      }}
                                      className="bg-red-600 hover:bg-red-700 text-white text-[8px] font-bold uppercase px-2 py-0.5 rounded transition-colors cursor-pointer font-sans"
                                  >
                                    {language === 'ar' ? 'نعم' : 'Yes'}
                                  </button>
                                  <button 
                                      type="button"
                                      onClick={() => setDeleteConfirmId(null)}
                                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[8px] font-bold uppercase px-2 py-0.5 rounded transition-colors cursor-pointer font-sans"
                                  >
                                    {language === 'ar' ? 'إلغاء' : 'No'}
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button 
                                      type="button"
                                      onClick={() => handleDirectPrintDailyAttendance(sheet.id)}
                                      className="text-slate-400 hover:text-red-650 transition-colors p-1 border border-slate-200 rounded block cursor-pointer"
                                      title="Direct Browser Print / طباعة مباشرة"
                                  >
                                      <Printer className="w-3 h-3" />
                                  </button>
                                  <button 
                                      type="button"
                                      disabled={isGeneratingDailyPDF}
                                      onClick={() => handleExportDailyAttendancePDF(sheet.id)}
                                      className="text-slate-400 hover:text-emerald-650 transition-colors p-1 border border-slate-200 rounded block disabled:opacity-50 cursor-pointer"
                                      title="Export Professional A4 PDF / تصدير مستند"
                                  >
                                      <FileSpreadsheet className="w-3 h-3 text-emerald-500" />
                                  </button>
                                  <button 
                                      type="button"
                                      disabled={isCopying}
                                      onClick={() => handleCopySheet(sheet)}
                                      className="text-slate-400 hover:text-blue-600 transition-colors p-1 border border-slate-200 rounded block disabled:opacity-50 cursor-pointer"
                                      title={language === 'ar' ? 'نسخ / تكرار السجل' : 'Copy / Duplicate Sheet'}
                                  >
                                      <Copy className="w-3 h-3 text-blue-500" />
                                  </button>
                                  {onDeleteSheet && (
                                    <button 
                                        type="button"
                                        onClick={() => setDeleteConfirmId(sheet.id)}
                                        className="text-slate-400 hover:text-red-600 transition-colors p-1 border border-slate-200 rounded block cursor-pointer"
                                        title="Delete Sheet"
                                    >
                                        <Trash2 className="w-3 h-3 text-rose-500" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="p-3 bg-slate-50 border border-slate-100 rounded">
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Supervisor</p>
                              <div className="flex items-center gap-2">
                                <User className="w-3 h-3 text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-700">{sheet.supervisorName}</span>
                              </div>
                              <p className="text-[8px] text-slate-400 font-mono mt-0.5">ID: {sheet.supervisorId}</p>
                            </div>
                            <div className="p-3 bg-slate-50 border border-slate-100 rounded">
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Personnel</p>
                              <span className="text-[10px] font-bold text-slate-700">{sheet.records.length} Headcount</span>
                            </div>
                            <div className="p-3 bg-slate-50 border border-slate-100 rounded">
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Prep Window</p>
                              <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-700">{project?.attendancePrepTime}</span>
                              </div>
                            </div>
                            <div className="p-3 bg-slate-50 border border-slate-100 rounded">
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cut-off Time</p>
                              <div className="flex items-center gap-2 text-rose-600">
                                <AlertCircle className="w-3 h-3" />
                                <span className="text-[10px] font-bold">{project?.attendanceCloseTime}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-slate-50/50 p-6 flex flex-col justify-center gap-3 md:w-64 border-l border-slate-100">
                          {sheet.status === 'Draft' ? (
                            <button 
                              onClick={() => handleSubmitSheet(sheet.id)}
                              className="w-full py-2 bg-red-600 text-white rounded text-[10px] font-bold uppercase tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Submit for Approval
                            </button>
                          ) : sheet.status === 'Approved' ? (
                            <div className="flex flex-col items-center gap-2 py-2">
                              <ShieldCheck className="w-6 h-6 text-emerald-500" />
                              <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Finalized & Locked</span>
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleApprove(sheet.id)}
                              className="w-full py-2 bg-slate-900 text-white rounded text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              Approve Next Tier
                            </button>
                          )}
                          <div className="flex items-center justify-center gap-1.5 opacity-50">
                             <div className="h-0.5 flex-1 bg-slate-200" />
                             <span className="text-[7px] font-bold text-slate-400 uppercase">Audit Trail</span>
                             <div className="h-0.5 flex-1 bg-slate-200" />
                          </div>
                          <div className="flex justify-between items-center px-1">
                             {APPROVAL_WORKFLOW.map((tier, idx) => {
                               const tierStatus = sheet.status === 'Approved' ? 'approved' : 
                                                 APPROVAL_WORKFLOW.findIndex(t => t.role === sheet.status) > idx ? 'approved' :
                                                 sheet.status === tier.role ? 'current' : 'pending';
                               return (
                                 <div 
                                   key={tier.role} 
                                   className={cn(
                                     "w-2 h-2 rounded-full",
                                     tierStatus === 'approved' ? "bg-emerald-500" :
                                     tierStatus === 'current' ? "bg-red-500 animate-pulse" : "bg-slate-200"
                                   )}
                                   title={tier.label}
                                 />
                               );
                             })}
                          </div>
                        </div>
                      </div>

                      {/* Records Table Overlay or Expandable */}
                      <div className="px-6 py-4 bg-white">
                        <div className="overflow-x-auto w-full min-w-full"><div className="min-w-max">
          <table className="w-full">
                          <thead>
                            <tr className="border-b border-slate-100">
                              <th className="text-left py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Personnel</th>
                              <th className="text-center py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                              <th className="text-right py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Logged At</th>
                              <th className="text-right py-2 px-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sheet.records.map((rec) => (
                              <React.Fragment key={rec.workerId}>
                                <tr className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                  <td className="py-2">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-500">
                                        {rec.workerName.split(' ').map(n => n[0]).join('')}
                                      </div>
                                      <span className="text-[10px] font-medium text-slate-700">{rec.workerName}</span>
                                    </div>
                                  </td>
                                  <td className="py-2 text-center">
                                    {sheet.status === 'Draft' ? (
                                      <select 
                                        disabled={!hasPermission('hr', 'attendance', 'record')}
                                        value={rec.status}
                                        onChange={(e) => handleUpdateRecordStatus(sheet.id, rec.workerId, e.target.value as any)}
                                        className="text-[9px] bg-white border border-slate-200 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50"
                                      >
                                        <option>Present</option>
                                        <option>Absent</option>
                                        <option>Late</option>
                                        <option>On Leave</option>
                                      </select>
                                    ) : (
                                      <span className={cn(
                                        "text-[9px] font-bold px-1.5 py-0.5 rounded",
                                        rec.status === 'Present' ? "text-emerald-600" :
                                        rec.status === 'Absent' ? "text-rose-600" : "text-amber-600"
                                      )}>
                                        {rec.status}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 text-right text-[9px] font-mono text-slate-400">
                                    {rec.status === 'Present' ? '07:12:44' : '--:--:--'}
                                  </td>
                                  <td className="py-2 px-2 text-right">
                                    {sheet.status === 'Draft' && (
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          onClick={() => setExpandedRecords(prev => ({ ...prev, [`${sheet.id}-${rec.workerId}`]: !prev[`${sheet.id}-${rec.workerId}`] }))}
                                          className={cn("text-slate-400 transition-colors", expandedRecords[`${sheet.id}-${rec.workerId}`] ? "text-red-600" : "hover:text-red-600")}
                                          title="Edit details"
                                        >
                                          <Settings className="w-3 h-3 inline" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteRecord(sheet.id, rec.workerId)}
                                          className="text-slate-400 hover:text-red-600 transition-colors"
                                          title="Remove from sheet"
                                        >
                                          <Trash2 className="w-3 h-3 inline" />
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                                {sheet.status === 'Draft' && expandedRecords[`${sheet.id}-${rec.workerId}`] && (
                                  <tr className="bg-slate-50/50">
                                    <td colSpan={4} className="p-3 border-b border-slate-100">
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-3 rounded border border-slate-100 shadow-sm">
                                        <div>
                                          <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Health & PPE</label>
                                          <div className="flex flex-col gap-2">
                                            <label className="flex items-center gap-2 text-[10px] text-slate-600 cursor-pointer">
                                              <input type="checkbox" checked={rec.hasPPE || false} onChange={e => handleUpdateRecordField(sheet.id, rec.workerId, 'hasPPE', e.target.checked)} className="rounded border-slate-300 text-red-600 focus:ring-red-500" />
                                              Fully equipped with PPE
                                            </label>
                                            <label className="flex items-center gap-2 text-[10px] text-slate-600 cursor-pointer">
                                              <input type="checkbox" checked={rec.isHealthy || false} onChange={e => handleUpdateRecordField(sheet.id, rec.workerId, 'isHealthy', e.target.checked)} className="rounded border-slate-300 text-red-600 focus:ring-red-500" />
                                              In good health
                                            </label>
                                          </div>
                                        </div>
                                        <div>
                                          <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Working Hours</label>
                                          <div className="grid grid-cols-2 gap-2">
                                            <div>
                                              <span className="text-[8px] text-slate-400 block">Required</span>
                                              <input type="number" value={rec.requiredHours || ''} onChange={e => handleUpdateRecordField(sheet.id, rec.workerId, 'requiredHours', Number(e.target.value))} className="w-full text-[10px] border border-slate-200 rounded px-2 py-1 outline-none focus:border-red-500" placeholder="0" />
                                            </div>
                                            <div>
                                              <span className="text-[8px] text-slate-400 block">Completed</span>
                                              <input type="number" value={rec.completedHours || ''} onChange={e => handleUpdateRecordField(sheet.id, rec.workerId, 'completedHours', Number(e.target.value))} className="w-full text-[10px] border border-slate-200 rounded px-2 py-1 outline-none focus:border-red-500" placeholder="0" />
                                            </div>
                                          </div>
                                        </div>
                                        <div>
                                          <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Breaks</label>
                                          <div className="grid grid-cols-2 gap-2">
                                            <div>
                                              <span className="text-[8px] text-slate-400 block">Count</span>
                                              <input type="number" value={rec.breaksCount || ''} onChange={e => handleUpdateRecordField(sheet.id, rec.workerId, 'breaksCount', Number(e.target.value))} className="w-full text-[10px] border border-slate-200 rounded px-2 py-1 outline-none focus:border-red-500" placeholder="0" />
                                            </div>
                                            <div>
                                              <span className="text-[8px] text-slate-400 block">Duration (min)</span>
                                              <input type="number" value={rec.breakDuration || ''} onChange={e => handleUpdateRecordField(sheet.id, rec.workerId, 'breakDuration', Number(e.target.value))} className="w-full text-[10px] border border-slate-200 rounded px-2 py-1 outline-none focus:border-red-500" placeholder="0" />
                                            </div>
                                          </div>
                                        </div>
                                        <div>
                                          <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-1">End Time</label>
                                          <input type="time" value={rec.endTime || ''} onChange={e => handleUpdateRecordField(sheet.id, rec.workerId, 'endTime', e.target.value)} className="w-full text-[10px] border border-slate-200 rounded px-2 py-1 outline-none focus:border-red-500" />
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
        </div></div>
                      </div>
                    </div>
                  );
                })}
             </div>
           )}
        </div>
      </div>

      {/* Generation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 text-slate-900">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">Initialize Attendance Node</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-405 hover:text-slate-900">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Toggle Modes Control */}
            <div className="px-6 pt-4 shrink-0">
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setProjectInputMode('linked')}
                  className={cn(
                    "flex-1 text-center py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                    projectInputMode === 'linked' ? "bg-white text-slate-905 shadow-sm" : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  System DB Project
                </button>
                <button
                  type="button"
                  onClick={() => setProjectInputMode('custom')}
                  className={cn(
                    "flex-1 text-center py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                    projectInputMode === 'custom' ? "bg-white text-slate-905 shadow-sm" : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  Type Custom Project
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {projectInputMode === 'linked' ? (
                /* Searchable System DB Project Mode */
                <div className="space-y-4 animate-in fade-in duration-250">
                  <div className="relative">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Search & Select Project Node</label>
                    <div className="relative">
                      <input 
                        type="text"
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none pr-8 font-medium"
                        placeholder="Type to search projects..."
                        value={projectSearchTerm}
                        onChange={(e) => {
                          setProjectSearchTerm(e.target.value);
                          setIsProjectDropdownOpen(true);
                        }}
                        onFocus={() => setIsProjectDropdownOpen(true)}
                      />
                      <button 
                        type="button"
                        onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                        className="absolute right-2.5 top-2.5 text-slate-450 hover:text-slate-600"
                      >
                        <ChevronDown className="w-4 h-4 cursor-pointer" />
                      </button>
                    </div>

                    {isProjectDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50 p-1 space-y-0.5">
                        {filteredProjectsDropdown.length === 0 ? (
                          <div className="p-3 text-xs text-slate-400 text-center italic">No matching projects found</div>
                        ) : (
                          filteredProjectsDropdown.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSelectedProjectId(p.id);
                                setProjectSearchTerm(p.name);
                                setIsProjectDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full text-left px-3 py-2 rounded text-xs transition-colors hover:bg-slate-100 flex flex-col",
                                selectedProjectId === p.id && "bg-amber-50 text-amber-800 font-semibold border-l-2 border-amber-600"
                              )}
                            >
                              <span>{p.name}</span>
                              <span className="text-[9px] text-slate-400 font-mono">ID: {p.id} • {p.location || 'No Location'}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Auto-populated System Information Box */}
                  {selectedProjectObj && (
                    <div className="p-4 bg-slate-50 border border-slate-150 rounded-lg text-[10px] space-y-2 animate-in slide-in-from-top-1 duration-200">
                      <p className="text-[9px] font-black uppercase text-red-600 tracking-wider">✓ Auto-Populated Project Specification</p>
                      <div className="grid grid-cols-2 gap-y-2 gap-x-3 font-medium text-slate-700">
                        <div><span className="text-slate-400 block text-[8px] uppercase">Project ID</span> <span className="font-mono text-slate-900 font-bold">{selectedProjectObj.id}</span></div>
                        <div><span className="text-slate-400 block text-[8px] uppercase">Location Zone</span> <span className="text-slate-900 font-bold">{selectedProjectObj.location || 'N/A'}</span></div>
                        <div><span className="text-slate-400 block text-[8px] uppercase">Active Personnel</span> <span className="text-rose-600 font-black">{workers.filter(w => w.projectId === selectedProjectId).length} deployed</span></div>
                        <div><span className="text-slate-400 block text-[8px] uppercase">Prep Window Open</span> <span className="font-mono text-slate-900 font-bold">{selectedProjectObj.attendancePrepTime || '07:00'} hrs</span></div>
                        <div><span className="text-slate-400 block text-[8px] uppercase">Shift Close Cut-off</span> <span className="font-mono text-rose-600 font-black">{selectedProjectObj.attendanceCloseTime || '08:30'} hrs</span></div>
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-red-50 border border-red-100 rounded-lg space-y-2">
                    <p className="text-[10px] font-bold text-red-700 uppercase tracking-widest">Supervisor Authorization</p>
                    <select 
                      value={selectedSupervisorId}
                      onChange={(e) => setSelectedSupervisorId(e.target.value)}
                      className="w-full bg-white border border-red-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                    >
                      {availableSupervisors.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                      ))}
                      {availableSupervisors.length === 0 && (
                        <option disabled value="">No supervisors available</option>
                      )}
                    </select>
                  </div>
                </div>
              ) : (
                /* Manual Custom Project Typing Mode */
                <div className="space-y-4 animate-in fade-in duration-250">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Custom Project Name</label>
                    <input 
                      type="text" 
                      placeholder="Type custom project name..."
                      value={manualProjectName}
                      onChange={(e) => setManualProjectName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Prep Window</label>
                      <input 
                        type="time" 
                        value={manualPrepTime}
                        onChange={(e) => setManualPrepTime(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Cut-off Time</label>
                      <input 
                        type="time" 
                        value={manualCloseTime}
                        onChange={(e) => setManualCloseTime(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Supervisor Details</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[9px] text-slate-450 block font-mono">Supervisor Name</span>
                        <input 
                          type="text" 
                          placeholder="e.g. Ali Ahmed"
                          value={manualSupervisorName}
                          onChange={(e) => setManualSupervisorName(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-450 block font-mono">Supervisor ID</span>
                        <input 
                          type="text" 
                          placeholder="e.g. EMP-9392"
                          value={manualSupervisorId}
                          onChange={(e) => setManualSupervisorId(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Multi-Worker selector for deploy list */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Deploy Personnel to Custom Sheet</label>
                    <input 
                      type="text" 
                      value={workerSearchQuery}
                      onChange={e => setWorkerSearchQuery(e.target.value)}
                      placeholder="Filter available system personnel..."
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-red-500"
                    />
                    <div className="border border-slate-150 rounded-lg max-h-32 overflow-y-auto p-1.5 space-y-1 bg-slate-50">
                      {filteredWorkersForSelection.map(w => {
                        const isChecked = selectedWorkerIds.includes(w.id);
                        return (
                          <label key={w.id} className="flex items-center gap-2 text-xs text-slate-700 hover:bg-slate-200/50 p-1 rounded cursor-pointer transition-all">
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={e => {
                                if (e.target.checked) setSelectedWorkerIds(prev => [...prev, w.id]);
                                else setSelectedWorkerIds(prev => prev.filter(id => id !== w.id));
                              }}
                              className="rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer" 
                            />
                            <div>
                              <span className="font-bold text-slate-800">{w.name}</span>
                              <span className="text-[8px] text-slate-400 block font-mono uppercase leading-none mt-0.5">{w.role} • ID: {w.id}</span>
                            </div>
                          </label>
                        );
                      })}
                      {filteredWorkersForSelection.length === 0 && (
                        <div className="p-3 text-[10px] text-slate-400 text-center italic">No matching personnel found</div>
                      )}
                    </div>
                    <p className="text-[8px] text-slate-450 mt-1 font-mono">{selectedWorkerIds.length} personnel checked for deployment</p>
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Record Date</label>
                <input 
                  type="date" 
                  value={currentDate}
                  onChange={(e) => setCurrentDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" 
                />
              </div>

              <div className="flex gap-3 pt-4 shrink-0">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border border-slate-200 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all">Abort</button>
                <button onClick={handleCreateSheet} className="flex-1 py-2 bg-slate-900 text-white rounded text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all">Instantiate Sheet</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isComprehensiveReportOpen && (
        <ComprehensiveAttendanceReport 
          language={language}
          company={company}
          onClose={() => setIsComprehensiveReportOpen(false)}
        />
      )}

      {isWorkAreaManagerOpen && (
        <WorkAreaGroupManager 
          company={company}
          onClose={() => setIsWorkAreaManagerOpen(false)}
        />
      )}

      {isDailyScheduleMgrOpen && (
        <DailyAttendanceScheduleManager 
          projects={projects}
          workers={workers}
          language={language}
          company={company}
          onClose={() => setIsDailyScheduleMgrOpen(false)}
        />
      )}

      {/* Daily Attendance A4 PRINTABLE Container */}
      {printSheets.length > 0 && (
        <div id="attendance-report-printable" className="hidden print:block bg-white text-slate-900 font-sans p-6 text-xs leading-normal">
          {printSheets.map((sheet, idx) => {
            const project = projects.find(p => p.id === sheet.projectId);
            
            return (
              <div 
                key={sheet.id}
                id={`daily-print-node-${sheet.id}`}
                className={cn(
                  "bg-white text-slate-900 w-[210mm] min-h-[295mm] p-8 relative flex flex-col justify-between mx-auto",
                  idx > 0 && "break-before-page border-t border-slate-150"
                )}
                style={{ boxSizing: 'border-box' }}
              >
                <div>
                  {/* Header Section */}
                  <div className="flex justify-between items-start border-b border-slate-200 pb-5 mb-5">
                    <div className="flex items-center gap-4">
                      {getCleanLogoBase64(company?.logo) ? (
                        <img 
                          src={getCleanLogoBase64(company?.logo)} 
                          className="w-16 h-16 object-contain" 
                          alt="Logo" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-red-650 text-white font-black flex items-center justify-center rounded-xl text-xl tracking-wider">
                          RSHG
                        </div>
                      )}
                      <div>
                        <h1 className="text-sm font-black text-slate-900 tracking-tight leading-none">
                          {company?.name || 'RED SEA HOLDING SYSTEM ERP'}
                        </h1>
                        <p className="text-[9px] text-slate-505 font-bold mt-1 uppercase tracking-widest">
                          {language === 'ar' ? 'البوابة التنفيذية لإدارة العمل المشترك' : 'ERP Project Asset Administration'}
                        </p>
                        <div className="text-[8px] text-slate-400 mt-1 space-y-0.5 font-mono leading-tight">
                          <p>CR Number / السجل التجاري: {company?.crNumber || '1010620353'}</p>
                          <p>VAT Number / الرقم الضريبي: {company?.vatNumber || '310349823500003'}</p>
                          <p>Headquarters / المقر الرئيسي: {company?.headquarters || 'Riyadh, Saudi Arabia'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-[8px] bg-red-50 text-red-600 px-2 py-0.5 font-bold rounded-full uppercase tracking-wider border border-red-100 font-mono">
                        {sheet.status}
                      </span>
                      <h2 className="text-md font-black text-rose-600 tracking-wider uppercase mt-1.5 mb-1 leading-none">
                        DAILY ATTENDANCE LOG
                      </h2>
                      <h3 className="text-xs font-bold text-slate-700 tracking-wider leading-none">
                        بيان الحضور اليومي للمشروع
                      </h3>
                      <p className="text-[8px] font-mono text-slate-400 mt-2">
                        Sheet ID / كود المستند: {sheet.id}
                      </p>
                    </div>
                  </div>

                  {/* Project Metadata Block */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
                    <h4 className="text-[10px] font-black uppercase text-red-600 tracking-wider mb-2">
                      {language === 'ar' ? 'تفاصيل المشروع وتكليف العمل' : 'Project Assignment Context'}
                    </h4>
                    <div className="grid grid-cols-3 gap-y-3 gap-x-4 text-[10px] text-slate-700">
                      <div>
                        <span className="text-slate-400 uppercase block text-[8px] font-bold">Project Name / اسم المشروع</span>
                        <span className="font-bold text-slate-900">{project?.name || sheet.projectName || 'Custom Project Node'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 uppercase block text-[8px] font-bold">Project Node ID / رمز المشروع</span>
                        <span className="font-mono font-bold text-slate-900">{sheet.projectId}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 uppercase block text-[8px] font-bold">Operational Date / تاريخ اليوم</span>
                        <span className="font-mono font-bold text-slate-900">{formatDate(sheet.date)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 uppercase block text-[8px] font-bold">Field Supervisor / المشرف المستلم</span>
                        <span className="font-bold text-slate-900">{sheet.supervisorName} <span className="text-[8px] font-mono text-slate-400">({sheet.supervisorId})</span></span>
                      </div>
                      <div>
                        <span className="text-slate-400 uppercase block text-[8px] font-bold">Prep Arrival Window / فترة التحضير</span>
                        <span className="font-mono font-bold text-slate-900">{project?.attendancePrepTime || '07:00'} hrs</span>
                      </div>
                      <div>
                        <span className="text-slate-400 uppercase block text-[8px] font-bold">Audit Shift Cut-off / وقت الإغلاق</span>
                        <span className="font-mono font-bold text-[10px] text-rose-600 font-black">{project?.attendanceCloseTime || '08:30'} hrs</span>
                      </div>
                    </div>
                  </div>

                  {/* Personnel Table */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white mb-6">
                    <table className="w-full text-left border-collapse bg-white">
                      <thead>
                        <tr className="bg-slate-900 text-white text-[8px] font-black uppercase tracking-wider border-b border-slate-200">
                          <th className="py-2.5 px-3 text-center w-8">#</th>
                          <th className="py-2.5 px-3">Deployed Worker / اسم الموظف</th>
                          <th className="py-2.5 px-3 text-center">Status / الحالة</th>
                          <th className="py-2.5 px-3">PPE Compliance / وقاية</th>
                          <th className="py-2.5 px-3 text-center">Shift Hours / الساعات</th>
                          <th className="py-2.5 px-3">Break Log / تفاصيل الراحة</th>
                          <th className="py-2.5 px-3 text-right">Departure / الانصراف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[10px] text-slate-700">
                        {sheet.records.map((rec, rIdx) => {
                          const workerObj = workers.find(w => w.id === rec.workerId);
                          return (
                            <tr key={rec.workerId} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 text-center font-mono text-slate-400">{rIdx + 1}</td>
                              <td className="py-2 px-3">
                                <span className="font-bold text-slate-900 block">{rec.workerName}</span>
                                <span className="text-[8px] text-slate-400 font-mono tracking-widest block uppercase">
                                  ID: {rec.workerId} • {workerObj?.role || 'Laborer'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest leading-none block mx-auto w-16 text-center",
                                  rec.status === 'Present' ? "bg-emerald-50 text-emerald-850 border border-emerald-100" :
                                  rec.status === 'Absent' ? "bg-red-50 text-red-850 border border-red-100" :
                                  "bg-amber-50 text-amber-850 border border-amber-100"
                                )}>
                                  {rec.status === 'Present' ? (language === 'ar' ? 'حاضر' : 'Present') :
                                   rec.status === 'Absent' ? (language === 'ar' ? 'غائب' : 'Absent') :
                                   rec.status === 'Late' ? (language === 'ar' ? 'متأخر' : 'Late') : (language === 'ar' ? 'إجازة' : 'Leave')}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <div className="space-y-0.5">
                                  <span className={cn(
                                    "inline-flex items-center gap-1 text-[8px] font-bold leading-none px-1 rounded-sm",
                                    rec.hasPPE ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
                                  )}>
                                    {rec.hasPPE ? '✓ PPE OK' : '✗ NO PPE'}
                                  </span>
                                  <span className={cn(
                                    "inline-flex items-center gap-1 text-[8px] font-bold leading-none px-1 rounded-sm block",
                                    rec.isHealthy ? "text-slate-600 bg-slate-50" : "text-amber-600 bg-amber-50"
                                  )}>
                                    {rec.isHealthy ? '✓ HEALTH CLEAN' : '✗ MEDICAL FLG'}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2 px-3 text-center font-mono font-bold text-slate-800">
                                {rec.completedHours !== undefined ? `${rec.completedHours}/${rec.requiredHours || 8}` : '8/8'} hrs
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                <div className="font-mono text-[8px]">
                                  <span className="text-slate-400 block">Count: {rec.breaksCount || 0} breaks</span>
                                  <span className="text-slate-500 font-bold">Duration: {rec.breakDuration || 0} min</span>
                                </div>
                              </td>
                              <td className="py-2 px-3 text-right">
                                <div className="font-mono">
                                  <span className="font-bold text-slate-800">{rec.endTime || '17:00'}</span>
                                  <span className="text-[7px] text-slate-400 block">Logged Time / البصمة</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {sheet.records.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-6 text-center text-xs text-slate-400 italic">No workers deployed on today's shift yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* PDF Bottom Auths */}
                <div>
                  <div className="grid grid-cols-2 gap-12 border-t border-slate-200 pt-5 mt-6">
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-10">
                        Field Supervisor Authorization / توقيع مشرف الموقع
                      </span>
                      <div className="border-b border-dashed border-slate-300 w-44 mb-1"></div>
                      <span className="text-[10px] font-bold text-slate-700 block">{sheet.supervisorName}</span>
                      <span className="text-[7px] text-slate-402 block font-mono">Supervisor Authorization Code / معتمد رقميًا بنجاح</span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-10">
                        Project HR Auditor Verdict / المصادقة الإدارية
                      </span>
                      <div className="border-b border-dashed border-slate-300 w-44 mb-1"></div>
                      <span className="text-[10px] font-bold text-slate-700 block">Project Auditor Approval Desk</span>
                      <span className="text-[7px] text-slate-402 block font-mono">Date Verified / تاريخ التدقيق: Awaiting Audit Lock</span>
                    </div>
                  </div>
                  
                  <div className="text-center text-[7px] text-slate-400 font-mono mt-8 border-t border-slate-100 pt-4 flex justify-between">
                    <span>SYSTEM ERP SYSTEM RUNNING IN SECURE MODE IP: 3000 • SECURITY AUDITING ON</span>
                    <span>ARES DAILY LABOR REPORT • PAGE {idx + 1} OF {printSheets.length}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
