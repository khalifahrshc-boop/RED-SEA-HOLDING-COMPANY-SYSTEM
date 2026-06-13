import React, { useState, useMemo, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { 
  Users, 
  Plus, 
  Trash2, 
  Save, 
  Printer, 
  Download, 
  UserPlus, 
  Building2, 
  BadgeCheck, 
  Briefcase,
  Calendar,
  Clock,
  ArrowLeft,
  Search,
  CheckCircle2,
  XCircle,
  Clock3,
  CalendarDays,
  FileText,
  ChevronLeft,
  ChevronRight,
  User,
  ShieldCheck,
  Building
} from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import { EmployeeAttendanceRec, MonthlyAttendanceDay } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { fixHtml2CanvasOklch } from '../lib/pdfUtils';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert } from 'lucide-react';

interface ComprehensiveAttendanceReportProps {
  language: 'en' | 'ar';
  company: any;
  onClose: () => void;
}

export function ComprehensiveAttendanceReport({ language, company, onClose }: ComprehensiveAttendanceReportProps) {
  const isRtl = language === 'ar';
  const { hasPermission } = useAuth();
  const [employees, setEmployees] = useState<EmployeeAttendanceRec[]>([]);

  if (!hasPermission('hr', 'attendance', 'view')) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl p-12 max-w-md shadow-2xl">
          <ShieldAlert className="w-20 h-20 text-slate-200 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-slate-900 mb-4 uppercase tracking-tight">Access Restricted</h2>
          <p className="text-slate-500 italic mb-8">You do not have the required permissions to access the Comprehensive Attendance Matrix.</p>
          <button onClick={onClose} className="px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-all shadow-xl">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const [loading, setLoading] = useState(true);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [reportDayLimit, setReportDayLimit] = useState(31);
  const [signatories, setSignatories] = useLocalStorage('ares_report_signatories', {
    personnel: { name: '', title: 'Personnel Signature' },
    supervisor: { name: '', title: 'Site Operation Lead' },
    management: { name: '', title: 'Matrix Core Admin' }
  });
  const [isEditingEmployee, setIsEditingEmployee] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'comprehensiveAttendance'), where('month', '==', selectedMonth));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as EmployeeAttendanceRec));
      setEmployees(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'comprehensiveAttendance');
    });
    return () => unsubscribe();
  }, [selectedMonth]);

  // Default record generator
  const generateEmptyMonth = (monthStr: string): MonthlyAttendanceDay[] => {
    const [year, month] = monthStr.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: 31 }, (_, i) => ({
      day: i + 1,
      status: i + 1 <= daysInMonth ? 'Present' : 'Absent',
      workingHours: i + 1 <= daysInMonth ? 8 : 0,
      startTime: '08:00',
      endTime: '17:00'
    }));
  };

  const activeEmployee = useMemo(() => 
    employees.find(e => e.id === selectedEmployeeId) || null
  , [employees, selectedEmployeeId]);

  // Calculations
  const stats = useMemo(() => {
    if (!activeEmployee) return { totalHours: 0, presentDays: 0, absentDays: 0 };
    
    // Filter records by day limit for mid-month reporting
    const records = activeEmployee.dailyRecords.filter(r => r.day <= reportDayLimit);
    return {
      totalHours: Math.round(records.reduce((sum, r) => sum + (r.status === 'Present' ? r.workingHours : 0), 0) * 100) / 100,
      presentDays: records.filter(r => r.status === 'Present').length,
      absentDays: records.filter(r => r.status === 'Absent').length
    };
  }, [activeEmployee, reportDayLimit]);

  // Handlers
  const handleAddEmployee = async () => {
    const newId = `EMP-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const newEmployee: any = {
      name: 'New Employee',
      idNumber: '',
      badgeNumber: '',
      jobTitle: 'Construction Worker',
      employeeType: 'Company',
      month: selectedMonth,
      dailyRecords: generateEmptyMonth(selectedMonth),
      createdAt: new Date().toISOString()
    };
    try {
      const docRef = await addDoc(collection(db, 'comprehensiveAttendance'), newEmployee);
      setSelectedEmployeeId(docRef.id);
      setIsEditingEmployee(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'comprehensiveAttendance');
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (confirm('Are you sure you want to delete this employee?')) {
      try {
        await deleteDoc(doc(db, 'comprehensiveAttendance', id));
        if (selectedEmployeeId === id) {
          setSelectedEmployeeId(null);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `comprehensiveAttendance/${id}`);
      }
    }
  };

  const handleUpdateEmployeeField = async (field: keyof EmployeeAttendanceRec, value: any) => {
    if (!selectedEmployeeId || !activeEmployee) return;
    try {
      await setDoc(doc(db, 'comprehensiveAttendance', selectedEmployeeId), {
        ...activeEmployee,
        [field]: value,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `comprehensiveAttendance/${selectedEmployeeId}`);
    }
  };

  const calculateHours = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const startDate = new Date(0, 0, 0, startH, startM);
    const endDate = new Date(0, 0, 0, endH, endM);
    let diff = (endDate.getTime() - startDate.getTime()) / 1000 / 60 / 60;
    if (diff < 0) diff += 24; // Handle overnight shifts if needed
    return Math.round(diff * 100) / 100;
  };

  const handleUpdateDailyRecord = async (dayIndex: number, field: keyof MonthlyAttendanceDay, value: any) => {
    if (!selectedEmployeeId || !activeEmployee) return;
    
    const newRecords = [...activeEmployee.dailyRecords];
    const updatedRecord = { ...newRecords[dayIndex], [field]: value };
    
    // Auto-calculate hours if start/end time changes
    if (field === 'startTime' || field === 'endTime') {
      updatedRecord.workingHours = calculateHours(updatedRecord.startTime, updatedRecord.endTime);
    }
    
    newRecords[dayIndex] = updatedRecord;
    
    try {
      await setDoc(doc(db, 'comprehensiveAttendance', selectedEmployeeId), {
        dailyRecords: newRecords,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `comprehensiveAttendance/${selectedEmployeeId}`);
    }
  };

  const [selectedForExport, setSelectedForExport] = useState<string[]>([]);

  // Toggle selection for export
  const toggleSelection = (id: string) => {
    setSelectedForExport(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handlePrint = () => {
    window.focus();
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleDownloadPDF = async (all = false) => {
    setIsGeneratingPDF(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const employeesToExport = all 
        ? employees.filter(e => selectedForExport.includes(e.id)) 
        : [employees.find(e => e.id === selectedEmployeeId)].filter(Boolean) as EmployeeAttendanceRec[];

      if (employeesToExport.length === 0) {
        alert('Please select at least one employee for export.');
        setIsGeneratingPDF(false);
        return;
      }

      const printContainer = document.getElementById('attendance-comprehensive-printable');
      if (!printContainer) {
        console.error('Print container element not found in DOM');
        throw new Error('Print container not found');
      }

      // Safe export procedure:
      // 1. Prepare container for high-quality capture
      const originalDisplay = printContainer.style.display;
      const originalPosition = printContainer.style.position;
      const originalLeft = printContainer.style.left;
      
      printContainer.style.display = 'block';
      printContainer.style.position = 'absolute';
      printContainer.style.left = '-5000px'; 
      printContainer.style.width = '210mm'; // Fixed A4 width for consistent rendering

      for (let i = 0; i < employeesToExport.length; i++) {
        const emp = employeesToExport[i];
        const empElement = document.getElementById(`print-node-${emp.id}`);
        
        if (!empElement) {
          console.warn(`Node print-node-${emp.id} not found`);
          continue;
        }

        if (i > 0) pdf.addPage();

        const canvas = await html2canvas(empElement, {
          scale: 2, // High resolution
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          onclone: (clonedDoc) => {
             // Deep dive to remove oklch which breaks html2canvas
             const printable = clonedDoc.getElementById(`print-node-${emp.id}`);
             if (printable) {
               // Add Arabic fix CSS
               const style = clonedDoc.createElement('style');
               style.innerHTML = `
                 * { 
                   font-feature-settings: "kern" 1, "liga" 1, "calt" 1 !important;
                   text-rendering: optimizeLegibility !important;
                   letter-spacing: normal !important;
                 }
                 .font-arabic, [dir="rtl"] {
                   font-family: "IBM Plex Sans Arabic", sans-serif !important;
                   direction: rtl !important;
                   unicode-bidi: isolate !important;
                 }
               `;
               clonedDoc.head.appendChild(style);

               // Add fallback CSS variables for the clone to ensure tailwind vars don't resolve to oklch
               const styleVars = clonedDoc.createElement('style');
                styleVars.innerHTML = `
                  :root, * {
                    --color-slate-50: #f4f6f9 !important;
                    --color-slate-100: #e9ecef !important;
                    --color-slate-200: #dee2e6 !important;
                    --color-slate-300: #ced4da !important;
                    --color-slate-400: #adb5bd !important;
                    --color-slate-500: #6c757d !important;
                    --color-slate-600: #495057 !important;
                    --color-slate-700: #343a40 !important;
                    --color-slate-800: #212529 !important;
                    --color-slate-900: #121416 !important;
                    --color-red-50: #fff5f5 !important;
                    --color-red-600: #e03131 !important;
                    --color-emerald-50: #ebfbee !important;
                    --color-emerald-100: #d3f9d8 !important;
                    --color-emerald-500: #37b24d !important;
                    --color-emerald-600: #2b8a3e !important;
                  }
                `;
                clonedDoc.head.appendChild(styleVars);

                // Scrub ALL modern color functions (oklch, oklab, lab, lch, hwb, color-mix)
                fixHtml2CanvasOklch(clonedDoc);

                // Manual overrides for core tailwind classes to ensure hex output
                const allElements = printable.getElementsByTagName('*');
                for (let j = 0; j < allElements.length; j++) {
                  const el = allElements[j] as HTMLElement;
                  if (el.classList.contains('bg-red-600')) el.style.backgroundColor = '#e03131';
                  if (el.classList.contains('text-red-600')) el.style.color = '#e03131';
                  if (el.classList.contains('bg-slate-900')) el.style.backgroundColor = '#121416';
                  if (el.classList.contains('bg-slate-50')) el.style.backgroundColor = '#f4f6f9';
                  if (el.classList.contains('border-slate-100')) el.style.borderColor = '#e9ecef';
                  if (el.classList.contains('border-slate-200')) el.style.borderColor = '#dee2e6';
                  if (el.classList.contains('text-slate-500')) el.style.color = '#6c757d';
                  if (el.classList.contains('text-slate-400')) el.style.color = '#adb5bd';
                  if (el.classList.contains('text-slate-900')) el.style.color = '#121416';
                  if (el.classList.contains('text-emerald-700')) el.style.color = '#2b8a3e';
                  if (el.classList.contains('bg-emerald-100')) el.style.backgroundColor = '#d3f9d8';
                  if (el.classList.contains('bg-emerald-500')) el.style.backgroundColor = '#37b24d';
                  if (el.classList.contains('text-red-700')) el.style.color = '#c92a2a';
                  if (el.classList.contains('bg-red-100')) el.style.backgroundColor = '#ffe3e3';
                  if (el.classList.contains('bg-red-500')) el.style.backgroundColor = '#fa5252';
                  if (el.classList.contains('bg-white')) el.style.backgroundColor = '#ffffff';
                }
             }
          }
        });

        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        // Add image with margins if height allows, otherwise fit to page
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, Math.min(pdfHeight, pdf.internal.pageSize.getHeight()));
      }
      
      // Cleanup
      printContainer.style.display = originalDisplay;
      printContainer.style.position = originalPosition;
      printContainer.style.left = originalLeft;
      
      pdf.save(`Ares_Attendance_${selectedMonth.replace('-', '_')}_${all ? 'Batch' : activeEmployee?.name.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('PDF Generation failed:', error);
      alert('Internal Capture Engine Error. Please ensure all employees are fully loaded in the sidebar before exporting.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => 
      (e.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
      e.idNumber.includes(searchTerm) ||
      e.badgeNumber?.includes(searchTerm)
    );
  }, [employees, searchTerm]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col animate-in fade-in duration-300">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-4 min-w-max">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Comprehensive Attendance Matrix</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Monthly Employee Compliance Repository</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select 
              value={selectedEmployeeId || ''}
              onChange={(e) => { setSelectedEmployeeId(e.target.value); setIsEditingEmployee(false); }}
              className="pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-red-600/20 appearance-none cursor-pointer min-w-[200px]"
            >
              <option value="" disabled>Select Staff Member</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                // Reset limit if month changes
                const [y, m] = e.target.value.split('-').map(Number);
                setReportDayLimit(new Date(y, m, 0).getDate());
              }}
              className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-red-600/20"
            />
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Limit:</span>
            <input 
              type="number" 
              min="1" 
              max="31"
              value={reportDayLimit}
              onChange={(e) => setReportDayLimit(Number(e.target.value))}
              className="w-10 bg-transparent border-none p-0 text-sm font-bold text-slate-700 focus:ring-0 text-center"
            />
          </div>
          {/* Status Indicator */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[9px] font-bold uppercase tracking-widest border border-emerald-100 ml-auto">
            <ShieldCheck className="w-3 h-3" />
            Cloud Database Synchronized
          </div>

          <button 
            onClick={() => handleDownloadPDF(true)}
            disabled={isGeneratingPDF || selectedForExport.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 bg-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition ml-4"
          >
            <Download className="w-4 h-4 text-red-600" /> Export Selected ({selectedForExport.length})
          </button>
          {hasPermission('hr', 'attendance', 'create') && (
            <button 
              onClick={handleAddEmployee}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition shadow-lg shadow-red-200 ml-2"
            >
              <UserPlus className="w-4 h-4" /> Add Employee
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Employee List */}
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search staff members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-red-600/10"
              />
            </div>
          </div>
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex flex-col">
              <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Personnel Pool</h5>
              <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{employees.length} Members Listed</span>
            </div>
            <Users className="w-4 h-4 text-slate-300" />
          </div>
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select for Export</h5>
            <div className="flex gap-2">
              <button 
                onClick={() => setSelectedForExport(employees.map(e => e.id))}
                className="text-[9px] font-bold text-red-600 hover:underline uppercase"
              >
                All
              </button>
              <span className="text-slate-200">|</span>
              <button 
                onClick={() => setSelectedForExport([])}
                className="text-[9px] font-bold text-slate-400 hover:underline uppercase"
              >
                None
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredEmployees.map(emp => (
              <div
                key={emp.id}
                className={cn(
                  "w-full flex items-center gap-2 p-1 rounded-xl transition-all",
                  selectedEmployeeId === emp.id ? "bg-red-50 ring-1 ring-red-200" : "hover:bg-slate-50"
                )}
              >
                <div className="pl-2">
                  <input 
                    type="checkbox"
                    checked={selectedForExport.includes(emp.id)}
                    onChange={() => toggleSelection(emp.id)}
                    className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-600"
                  />
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => { setSelectedEmployeeId(emp.id); setIsEditingEmployee(false); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedEmployeeId(emp.id);
                      setIsEditingEmployee(false);
                    }
                  }}
                  className="flex-1 flex items-center justify-between p-2 rounded-lg transition-all group overflow-hidden cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      selectedEmployeeId === emp.id ? "bg-red-600 text-white" : "bg-slate-100 text-slate-400"
                    )}>
                      {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="text-left min-w-0">
                      <p className={cn("text-xs font-bold truncate", selectedEmployeeId === emp.id ? "text-red-700" : "text-slate-700")}>{emp.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase truncate">{emp.badgeNumber || 'No Badge'}</p>
                    </div>
                  </div>
                  {hasPermission('hr', 'attendance', 'delete') && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteEmployee(emp.id); }}
                      className="p-1.5 text-slate-300 hover:text-red-500 transition-all focus:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {employees.length === 0 && (
              <div className="text-center py-12 px-4">
                <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">No Employees Added</p>
              </div>
            )}
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-8">
          {activeEmployee ? (
            <div className="max-w-6xl mx-auto space-y-8 pb-12">
              {/* Profile Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-xl shadow-slate-200">
                      <User className="w-10 h-10 opacity-30 absolute" />
                      <span className="relative z-10">{activeEmployee.name.charAt(0)}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <input 
                          type="text" 
                          value={activeEmployee.name}
                          onChange={(e) => handleUpdateEmployeeField('name', e.target.value)}
                          className="text-2xl font-black text-slate-900 bg-transparent border-none p-0 focus:ring-0 w-full max-w-md"
                        />
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border",
                          activeEmployee.employeeType === 'Company' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                        )}>
                          {activeEmployee.employeeType}
                        </span>
                      </div>
                      {hasPermission('hr', 'attendance', 'edit') ? (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-2 mt-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">ID Number</label>
                            <input 
                              type="text" 
                              value={activeEmployee.idNumber}
                              onChange={(e) => handleUpdateEmployeeField('idNumber', e.target.value)}
                              placeholder="National ID"
                              className="bg-transparent border-none p-0 text-sm font-bold text-slate-700 focus:ring-0"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Badge #</label>
                            <input 
                              type="text" 
                              value={activeEmployee.badgeNumber}
                              onChange={(e) => handleUpdateEmployeeField('badgeNumber', e.target.value)}
                              placeholder="0000"
                              className="bg-transparent border-none p-0 text-sm font-bold font-mono text-red-600 focus:ring-0"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Job Title</label>
                            <input 
                              type="text" 
                              value={activeEmployee.jobTitle}
                              onChange={(e) => handleUpdateEmployeeField('jobTitle', e.target.value)}
                              className="bg-transparent border-none p-0 text-sm font-bold text-slate-700 focus:ring-0"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Category</label>
                            <select 
                              value={activeEmployee.employeeType}
                              onChange={(e) => handleUpdateEmployeeField('employeeType', e.target.value)}
                              className="bg-transparent border-none p-0 text-sm font-bold text-slate-700 focus:ring-0 appearance-none cursor-pointer"
                            >
                              <option value="Company">Company Staff</option>
                              <option value="Rental">Rental Provider</option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-2 mt-4 text-sm font-bold text-slate-700">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">ID Number</span>
                            {activeEmployee.idNumber || 'N/A'}
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Badge #</span>
                            {activeEmployee.badgeNumber || 'N/A'}
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Job Title</span>
                            {activeEmployee.jobTitle || 'N/A'}
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Category</span>
                            {activeEmployee.employeeType}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {hasPermission('hr', 'attendance', 'export') && (
                      <button 
                        onClick={() => handleDownloadPDF(false)}
                        disabled={isGeneratingPDF}
                        className="p-3 text-slate-400 hover:text-red-600 transition-colors"
                        title="Export single PDF"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    )}
                    {hasPermission('hr', 'attendance', 'print') && (
                      <button 
                        onClick={handlePrint}
                        className="p-3 text-slate-400 hover:text-slate-600 transition-colors"
                        title="Print document"
                      >
                        <Printer className="w-5 h-5" />
                      </button>
                    )}
                    {hasPermission('hr', 'attendance', 'delete') && (
                      <button 
                        onClick={() => handleDeleteEmployee(activeEmployee.id)}
                        className="p-3 text-slate-300 hover:text-red-600 transition-colors"
                        title="Delete this record"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                {activeEmployee.employeeType === 'Rental' && (
                  <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                    <Building className="w-5 h-5 text-amber-500" />
                    <div className="flex-1 flex items-center gap-4">
                      <label className="text-[10px] font-bold text-amber-600 uppercase tracking-widest whitespace-nowrap">Vendor Name:</label>
                      <input 
                        type="text" 
                        value={activeEmployee.rentalCompanyName || ''}
                        onChange={(e) => handleUpdateEmployeeField('rentalCompanyName', e.target.value)}
                        placeholder="Enter rental provider name..."
                        className="bg-white border border-amber-200 rounded-lg px-3 py-1 text-sm font-bold text-amber-900 outline-none w-full max-w-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attendance Days</p>
                      <h3 className="text-2xl font-black text-slate-900">{stats.presentDays} <small className="text-xs font-normal text-slate-400 uppercase">Days</small></h3>
                   </div>
                   <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                      <CheckCircle2 className="w-6 h-6" />
                   </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Absence</p>
                      <h3 className="text-2xl font-black text-slate-900">{stats.absentDays} <small className="text-xs font-normal text-slate-400 uppercase">Days</small></h3>
                   </div>
                   <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
                      <XCircle className="w-6 h-6" />
                   </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monthly Yield</p>
                      <h3 className="text-2xl font-black text-slate-900 font-mono tracking-tighter">{stats.totalHours} <small className="text-xs font-normal text-slate-400 uppercase">Hrs</small></h3>
                   </div>
                   <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                      <Clock3 className="w-6 h-6" />
                   </div>
                </div>
              </div>

              {/* Signature Management Panel */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Report Validation Protocol (Signatories)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {['personnel', 'supervisor', 'management'].map((key) => {
                    const signatoryKey = key as keyof typeof signatories;
                    return (
                      <div key={key} className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{signatories[signatoryKey].title}</label>
                        <input 
                          type="text" 
                          placeholder="Full Name"
                          value={signatories[signatoryKey].name}
                          onChange={(e) => setSignatories({
                            ...signatories,
                            [signatoryKey]: { ...signatories[signatoryKey], name: e.target.value }
                          })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-600/20"
                        />
                        <input 
                          type="text" 
                          placeholder="Position Title"
                          value={signatories[signatoryKey].title}
                          onChange={(e) => setSignatories({
                            ...signatories,
                            [signatoryKey]: { ...signatories[signatoryKey], title: e.target.value }
                          })}
                          className="w-full bg-transparent border-none p-0 text-[10px] font-bold text-slate-400 uppercase tracking-tight focus:ring-0"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Attendance Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white">
                   <div className="flex items-center gap-3">
                      <CalendarDays className="w-5 h-5 text-red-500" />
                      <h4 className="text-xs font-bold uppercase tracking-widest">Duty Cycle Matrix: {selectedMonth}</h4>
                   </div>
                   <div className="text-[10px] font-mono text-slate-400 flex gap-4">
                      <span>PRESENT: <b className="text-emerald-500">{stats.presentDays}</b></span>
                      <span>ABSENT: <b className="text-red-500">{stats.absentDays}</b></span>
                   </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                        <th className="px-6 py-4 w-16 text-center">Day</th>
                        <th className="px-6 py-4">Attendance Status</th>
                        <th className="px-6 py-4">Check-In Time</th>
                        <th className="px-6 py-4">Check-Out Time</th>
                        <th className="px-6 py-4 text-right">Daily Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeEmployee.dailyRecords.map((record, idx) => {
                        return (
                          <tr 
                            key={idx} 
                            className="group hover:bg-slate-50 transition-colors"
                          >
                            <td className="px-6 py-3 text-sm font-bold font-mono text-slate-400 text-center">{record.day.toString().padStart(2, '0')}</td>
                            <td className="px-6 py-3">
                              <select 
                                value={record.status}
                                onChange={(e) => handleUpdateDailyRecord(idx, 'status', e.target.value)}
                                className={cn(
                                  "bg-transparent border-none p-0 text-xs font-bold uppercase tracking-widest focus:ring-0 appearance-none cursor-pointer",
                                  record.status === 'Present' ? "text-emerald-600" : "text-red-600"
                                )}
                              >
                                <option value="Present">Present</option>
                                <option value="Absent">Absent</option>
                              </select>
                            </td>
                            <td className="px-6 py-3">
                              <input 
                                disabled={record.status === 'Absent'}
                                type="time" 
                                value={record.startTime}
                                onChange={(e) => handleUpdateDailyRecord(idx, 'startTime', e.target.value)}
                                className="bg-transparent border-none p-0 text-xs font-bold text-slate-700 focus:ring-0"
                              />
                            </td>
                            <td className="px-6 py-3">
                              <input 
                                disabled={record.status === 'Absent'}
                                type="time" 
                                value={record.endTime}
                                onChange={(e) => handleUpdateDailyRecord(idx, 'endTime', e.target.value)}
                                className="bg-transparent border-none p-0 text-xs font-bold text-slate-700 focus:ring-0"
                              />
                            </td>
                            <td className="px-6 py-3 text-right">
                              <input 
                                type="number" 
                                readOnly
                                disabled={record.status === 'Absent'}
                                value={record.status === 'Absent' ? 0 : record.workingHours}
                                className="bg-transparent border-none p-0 text-sm font-bold font-mono text-slate-900 focus:ring-0 text-right w-16 cursor-default"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                        <td colSpan={2} className="px-6 py-6 text-sm text-slate-900 uppercase tracking-widest">Consolidated Performance Analytics</td>
                        <td colSpan={2} className="px-6 py-6 text-right text-xs text-slate-400 uppercase">Monthly Yield Total</td>
                        <td className="px-6 py-6 text-right text-xl font-black text-red-600 font-mono tracking-tighter">{stats.totalHours} Hrs</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6">
              <div className="w-24 h-24 bg-white rounded-3xl shadow-xl shadow-slate-200 flex items-center justify-center text-slate-300">
                <Users className="w-12 h-12" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Employee Select Required</h3>
                <p className="text-sm text-slate-500 mt-2">Please select an employee from the sidebar to view or edit their comprehensive monthly attendance data.</p>
              </div>
              <button 
                onClick={handleAddEmployee}
                className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black transition shadow-xl"
              >
                <Plus className="w-4 h-4" /> Initialize New Record
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Export Preview (Hidden from screen, used for PDF) */}
      <div id="attendance-comprehensive-printable" className="hidden print:block bg-white font-sans text-slate-900">
        {employees.map((emp, empIdx) => (
          <div 
            key={emp.id} 
            id={`print-node-${emp.id}`} 
            className={cn(
              "p-8 min-h-[297mm] w-[210mm] bg-white relative flex flex-col",
              empIdx > 0 ? "break-before-page" : ""
            )}
          >
            {/* Elegant Corporate Header */}
            <div className="flex justify-between items-center border-b-4 border-red-600 pb-6 mb-6">
               <div className="flex items-center gap-6">
                  {company?.logo ? (
                    <div className="w-20 h-20 flex items-center justify-center shrink-0 bg-white p-1">
                      <img src={company.logo} className="w-full h-full object-contain" alt="Logo" referrerPolicy="no-referrer" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-slate-900 flex items-center justify-center text-white shrink-0 rounded-lg">
                       <Building2 className="w-10 h-10" />
                    </div>
                  )}
                  <div>
                     <h1 className="text-2xl font-black text-slate-900 leading-tight uppercase">{company?.name || 'ARES MATRIX CORE'}</h1>
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">{company?.headquarters || 'Industrial Infrastructure & Compliance'}</p>
                     <div className="flex items-center gap-3 mt-2 text-[8px] font-bold text-slate-400">
                        <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> SECURITY VERIFIED</span>
                        {company?.email && <span>&bull; {company.email.toUpperCase()}</span>}
                        {company?.phone && <span>&bull; {company.phone}</span>}
                     </div>
                  </div>
               </div>
               <div className="text-right">
                  <div className="bg-red-600 text-white px-4 py-1.5 text-[11px] font-black uppercase tracking-widest rounded-sm mb-3">
                    Monthly Personnel Ledger
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Document Index Reference</p>
                  <p className="text-sm font-mono font-bold text-slate-900 tracking-tighter">AMC/ATT/{selectedMonth.replace('-', '/')}/{emp.id.split('-').pop()}</p>
               </div>
            </div>

            {/* Selection Metadata */}
            <div className="grid grid-cols-4 gap-px bg-slate-200 border border-slate-200 mb-6 rounded-md overflow-hidden shadow-sm">
               <div className="bg-slate-50 p-3">
                  <p className="text-[7px] font-bold text-slate-400 uppercase mb-1">Audit Period</p>
                  <p className="text-[10px] font-black text-slate-900">{new Date(selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase()}</p>
               </div>
               <div className="bg-white p-3">
                  <p className="text-[7px] font-bold text-slate-400 uppercase mb-1">Total Duty Days</p>
                  <p className="text-[10px] font-black text-slate-900">{emp.dailyRecords.filter(r => r.day <= reportDayLimit && r.status === 'Present').length} Out of {reportDayLimit}</p>
               </div>
               <div className="bg-slate-50 p-3">
                  <p className="text-[7px] font-bold text-slate-400 uppercase mb-1">Accumulated Hours</p>
                  <p className="text-[10px] font-black text-red-600">{emp.dailyRecords.filter(r => r.day <= reportDayLimit).reduce((s, r) => s + (r.status === 'Present' ? r.workingHours : 0), 0).toFixed(2)} Hrs</p>
               </div>
               <div className="bg-white p-3">
                  <p className="text-[7px] font-bold text-slate-400 uppercase mb-1">Status Code</p>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <p className="text-[10px] font-black text-emerald-600 uppercase">Compliant</p>
                  </div>
               </div>
            </div>

            {/* Personal Identification File */}
            <div className="mb-6 relative">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Users className="w-16 h-16 text-slate-900" />
               </div>
               <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 mb-3 border-l-4 border-red-600 pl-3">
                 Personnel Information Record
               </h3>
               <div className="grid grid-cols-2 md:grid-cols-3 gap-6 bg-white p-5 border border-slate-100 rounded-xl shadow-sm">
                  <div className="space-y-1">
                     <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Full Name</p>
                     <p className="text-xs font-black text-slate-900 uppercase">{emp.name}</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Job Classification</p>
                     <p className="text-xs font-bold text-slate-700">{emp.jobTitle}</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Personnel Badge ID</p>
                     <p className="text-xs font-mono font-black text-red-600 tracking-widest">{emp.badgeNumber || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">National ID / Passport</p>
                     <p className="text-xs font-mono font-bold text-slate-900">{emp.idNumber || 'PENDING'}</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Employment category</p>
                     <p className="text-xs font-bold text-slate-900 uppercase tracking-tight">{emp.employeeType === 'Company' ? 'Permanent Internal' : 'Contracted Rental'}</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Responsible Vendor</p>
                     <p className="text-xs font-bold text-slate-700 uppercase">{emp.employeeType === 'Rental' ? (emp.rentalCompanyName || 'UNVERIFIED VENDOR') : (company?.name || 'INTERNAL HOLDING')}</p>
                  </div>
               </div>
            </div>

            {/* Comprehensive Matrix Table */}
            <div className="flex-1">
               <div className="bg-slate-900 rounded-t-lg p-2.5 flex justify-between items-center px-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Operational Duty Cycle Calendar</span>
                  </div>
                  <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest">Period Scope: 01 - {reportDayLimit.toString().padStart(2, '0')}</span>
               </div>
               <div className="border-x border-b border-slate-200">
                 <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                       <tr className="bg-slate-50 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">
                          <th className="p-2.5 text-center w-12 border-r border-slate-200">Day</th>
                          <th className="p-2.5 pl-6 border-r border-slate-200">Attendance Status</th>
                          <th className="p-2.5 pl-6 border-r border-slate-200">Shift Window (Clock-In/Out)</th>
                          <th className="p-2.5 text-right pr-6">Yield (Hrs)</th>
                       </tr>
                    </thead>
                    <tbody className="text-[10px]">
                       {emp.dailyRecords.map((r, i) => {
                          if (r.day > reportDayLimit) return null;
                          return (
                            <tr key={i} className={cn(
                               "border-b border-slate-100 last:border-0 h-[8mm]",
                               r.status === 'Absent' ? "bg-red-50/40" : "bg-white"
                            )}>
                              <td className="p-1 px-2 text-center font-black border-r border-slate-200 text-slate-400 font-mono text-[10px]">{r.day.toString().padStart(2, '0')}</td>
                               <td className="p-1 px-4 border-r border-slate-200">
                                  <div className="flex items-center gap-2">
                                    <div className={cn("w-2 h-2 rounded-full", r.status === 'Present' ? "bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]" : "bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]")}></div>
                                    <span className={cn(
                                       "font-bold uppercase tracking-tight text-[10px]",
                                       r.status === 'Present' ? "text-slate-900" : "text-red-700"
                                    )}>
                                       {r.status}
                                    </span>
                                  </div>
                               </td>
                               <td className="p-1 px-4 border-r border-slate-200 text-slate-600 font-bold text-[10px]">
                                  {r.status === 'Present' ? (
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-3 h-3 text-slate-300" />
                                      {r.startTime} <ChevronRight className="w-3 h-3 text-slate-200" /> {r.endTime}
                                    </div>
                                  ) : (
                                    <span className="text-slate-300 italic">No activity logged</span>
                                  )}
                               </td>
                               <td className="p-1 px-6 text-right font-black font-mono text-slate-900 text-[11px]">
                                  {r.status === 'Present' ? r.workingHours.toFixed(2) : '0.00'}
                               </td>
                            </tr>
                          );
                       })}
                    </tbody>
                    <tfoot>
                       <tr className="bg-slate-100 text-slate-900 border-t-2 border-slate-900">
                          <td colSpan={3} className="p-3.5 px-6 font-black uppercase tracking-[0.2em] text-[11px]">Total Monthly Billable Yield</td>
                          <td className="p-3.5 px-6 text-right font-black font-mono text-base text-red-600">
                            {emp.dailyRecords.filter(r => r.day <= reportDayLimit).reduce((s, r) => s + (r.status === 'Present' ? r.workingHours : 0), 0).toFixed(2)} HRS
                          </td>
                       </tr>
                    </tfoot>
                 </table>
               </div>

               <div className="mt-4 flex gap-8 px-2">
                  <div className="flex items-center gap-2">
                     <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                     <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Present Status</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                     <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Absent / Leave</span>
                  </div>
                  <div className="flex items-center gap-2 ml-auto text-[8px] text-slate-400 font-bold uppercase italic">
                     * All measurements calibrated to +/- 0.01 hour precision nodes.
                  </div>
               </div>
            </div>

            {/* Professional Approval Block */}
            <div className="mt-10">
               <div className="grid grid-cols-3 gap-10">
                  <div className="space-y-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b-2 border-slate-100 pb-1">Employee Acknowledgement</p>
                    <div className="pt-10 border-b border-slate-900">
                       <p className="text-xs font-black text-slate-900 leading-none pb-1">{signatories.personnel.name || emp.name}</p>
                    </div>
                    <p className="text-[7px] font-bold text-slate-400 uppercase">{signatories.personnel.title}</p>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b-2 border-slate-100 pb-1">Operational Verification</p>
                    <div className="pt-10 border-b border-slate-900">
                       <p className="text-xs font-black text-slate-900 leading-none pb-1 text-center">{signatories.supervisor.name || '___________________________'}</p>
                    </div>
                    <p className="text-[7px] font-bold text-slate-400 uppercase text-center">{signatories.supervisor.title}</p>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b-2 border-slate-100 pb-1">Executive Certification</p>
                    <div className="pt-10 border-b border-slate-900">
                       <p className="text-xs font-black text-slate-900 leading-none pb-1 text-center">{signatories.management.name || (company?.operationsManager?.name ? company.operationsManager.name : '___________________________')}</p>
                    </div>
                    <p className="text-[7px] font-bold text-slate-400 uppercase text-center">{signatories.management.title}</p>
                  </div>
               </div>

               <div className="mt-8 flex justify-between items-center bg-slate-50 p-5 rounded-xl border border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-900 uppercase tracking-widest">Compliance Protocol Certification</span>
                    <p className="text-[9px] text-slate-500 font-medium italic mt-1.5 leading-relaxed max-w-xl">
                      I hereby certify that the attendance record provided above is an accurate representation of services rendered. 
                      Any discrepancies must be reported to the personnel department within 24 hours of issuance. 
                      Digitally signed and archived via ARES MASTER LEDGER.
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-4">
                     <div className="text-right">
                        <p className="text-[7px] font-bold text-slate-400 uppercase">Authentication Timestamp</p>
                        <p className="text-[10px] font-mono font-black text-red-600 uppercase tracking-tighter">{new Date().toLocaleString('en-US', { hour12: false }).toUpperCase()}</p>
                     </div>
                     <div className="w-12 h-12 border-2 border-red-100 bg-red-50/30 rounded-xl flex items-center justify-center">
                        <BadgeCheck className="w-8 h-8 text-red-600 opacity-60" />
                     </div>
                  </div>
               </div>
            </div>

            {/* System Footer Info */}
            <div className="mt-auto pt-8 flex justify-between items-end border-t border-slate-100 opacity-50">
               <div>
                  <p className="text-[8px] font-black text-slate-900 uppercase tracking-[0.2em] font-mono">
                    GENERATED BY ARES MATRIX CORE ERP SYSTEM &bull; {new Date().getFullYear()}
                  </p>
                  <p className="text-[7px] text-slate-400 font-mono mt-1 uppercase tracking-tight">
                    TRANSACTION HASH: {emp.id.split('-').pop()}_{Date.now().toString(36).toUpperCase()}_ARCHIVE_NODE_0
                  </p>
               </div>
               <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-red-600/40" />
                  <span className="text-[8px] font-black text-slate-900 uppercase tracking-[0.2em]">Personnel Compliance Standard v9.2.4</span>
               </div>
            </div>
          </div>
        ))}
      </div>


      {/* Saving Indicator */}
      <div className="fixed bottom-6 right-6">
         <div className="bg-white px-4 py-2 rounded-full shadow-lg border border-slate-200 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Auto-Save Matrix Active</span>
         </div>
      </div>
    </div>
  );
}
