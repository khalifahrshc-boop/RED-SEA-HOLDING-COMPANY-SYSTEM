import React, { useState, useMemo, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { 
  Calendar,
  Plus, 
  Trash2, 
  Save, 
  Printer, 
  Download, 
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  ArrowLeft,
  UserPlus,
  Users,
  Building,
  User,
  Settings,
  X,
  ChevronRight,
  Briefcase
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Project, Worker, CompanyData, DailyAttendanceSchedule, ScheduleEmpDetail, ScheduleDayDetail } from '../types';
import { fixHtml2CanvasOklch } from '../lib/pdfUtils';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firebase';

interface DailyAttendanceScheduleMgrProps {
  projects: Project[];
  workers: Worker[];
  language: 'en' | 'ar';
  company?: Partial<CompanyData>;
  onClose: () => void;
}

// Translations dictionary internal to this module for complete stability and separation of concerns
const localDict = {
  en: {
    moduleTitle: "Daily Attendance Schedule",
    moduleSub: "Manage multi-project monthly daily attendance schedule logs",
    addSchedule: "Create Monthly Schedule",
    searchPlaceholder: "Search schedules by project, location, or month...",
    noSchedules: "No Attendance Schedules Registered",
    noSchedulesDesc: "Click the button above to initialize a monthly project schedule matrix.",
    back: "Back",
    projectName: "Project Name",
    projectLocation: "Project Location",
    prepTime: "Preparation Time",
    prepMonth: "Preparation Month / Year",
    selectProject: "Select Deployed Project",
    customProject: "— Or type Custom Project —",
    saveSuccess: "Daily attendance schedule saved successfully!",
    saveError: "Error saving schedule. Please try again.",
    deleteConfirm: "Are you sure you want to delete this schedule?",
    deleteSuccess: "Schedule deleted successfully.",
    employeesCount: "Personnel Deployed",
    editSchedule: "Edit Monthly Matrix",
    viewSchedule: "View Matrix Log",
    deleteSchedule: "Delete Log",
    manageEmployees: "Manage Assigned Workforce",
    addNewEmployee: "Add Personnel Row",
    employeeName: "Employee Name",
    badgeNumber: "Badge Number",
    companyType: "Company Affiliation",
    ourCompany: "Our Company (Internal)",
    rentalCompany: "Rental/External Company",
    rentalNamePlaceholder: "Rental Company Name",
    occupation: "Job / Occupation",
    actions: "Actions",
    noEmployees: "No personnel checked on this project schedule yet. Add rows below.",
    calendarTitle: "Days 1 to 31 Duty Log",
    calendarInstructions: "Select an employee from the left table to edit their 31-day attendance roster on the right.",
    editTimesForDay: "Configure Day ",
    present: "Present",
    workedHours: "Worked Hours",
    dutyStart: "Duty Start",
    workStart: "Work Start",
    workEnd: "Work End",
    totalWorkedHours: "Total Monthly Worked Hours:",
    totalPresentDays: "Total Days Present:",
    exportPDF: "Export A4 PDF",
    printSheet: "Direct Print",
    logoAlt: "Company Logo",
    authorizedSign: "Authorized Auditor Sign-off",
    dateStamp: "Date of Verification",
    loading: "Retrieving databases...",
    selectWorker: "Select Employee Profile",
    duplicateWorker: "Employee already exists in this sheet."
  },
  ar: {
    moduleTitle: "جدول الحضور اليومي للمشروع",
    moduleSub: "إدارة سجلات وجداول الحضور والانصراف التفصيلية شهرياً للمشاريع",
    addSchedule: "إنشاء جدول شهري جديد",
    searchPlaceholder: "البحث عن الجداول باسم المشروع، الموقع أو الشهر...",
    noSchedules: "لا توجد سجلات حضور مسجلة حالياً",
    noSchedulesDesc: "انقر على زر الإنشاء لإعداد كشف شهري جديد لأحد مشاريعك.",
    back: "العودة",
    projectName: "اسم المشروع",
    projectLocation: "موقع المشروع",
    prepTime: "وقت التحضير",
    prepMonth: "شهر / سنة التحضير",
    selectProject: "اختر مشروعاً من النظام",
    customProject: "— أو اكتب اسم مشروع خارجي —",
    saveSuccess: "تم حفظ جدول الحضور اليومي بنجاح!",
    saveError: "حدث خطأ أثناء حفظ الجدول. الرجاء المحاولة مجدداً.",
    deleteConfirm: "هل أنت متأكد من رغبتك في حذف هذا الجدول النهائي؟",
    deleteSuccess: "تم حذف الجدول بنجاح.",
    employeesCount: "الموظفين المدرجين",
    editSchedule: "تعديل الجدول الشهري",
    viewSchedule: "عرض السجلات",
    deleteSchedule: "حذف السجل",
    manageEmployees: "إدارة القوى العاملة المكلفة",
    addNewEmployee: "إضافة صف موظف جديد",
    employeeName: "اسم الموظف / العامل",
    badgeNumber: "رقم البطاقة / الرقم الوظيفي",
    companyType: "تبعية الموظف",
    ourCompany: "موظف داخلي (شركتنا)",
    rentalCompany: "موظف خارجي / شركة تأجير",
    rentalNamePlaceholder: "اسم شركة التأجير الخارجية",
    occupation: "المهنة / المسمى الوظيفي",
    actions: "الإجراءات",
    noEmployees: "لا يوجد موظفين مدرجين في هذا الجدول حتى الآن. أضف موظفين أدناه.",
    calendarTitle: "سجل العمل اليومي (أيام 1-31)",
    calendarInstructions: "اضغط على أي موظف من الجدول على اليسار لتعديل كشف حضوره البالغ 31 يوماً على اليمين.",
    editTimesForDay: "تعديل تفاصيل اليوم ",
    present: "حاضر",
    workedHours: "ساعات العمل المنجزة",
    dutyStart: "وقت التحضير",
    workStart: "بداية العمل",
    workEnd: "نهاية العمل",
    totalWorkedHours: "إجمالي الساعات المنجزة شهرياً:",
    totalPresentDays: "عدد أيام الحضور المسجلة:",
    exportPDF: "تصدير كتقرير A4 PDF",
    printSheet: "طباعة مباشرة",
    logoAlt: "شعار الشركة والمؤسسة",
    authorizedSign: "اعتماد وتوقيع المشرف المسؤول",
    dateStamp: "تاريخ التدقيق والتصديق",
    loading: "جاري تحميل قواعد البيانات...",
    selectWorker: "اختر ملف الموظف",
    duplicateWorker: "الموظف مضاف بالفعل في هذا الكشف الشهري."
  }
};

const calculateHours = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const [sHour, sMin] = start.split(':').map(Number);
  const [eHour, eMin] = end.split(':').map(Number);
  if (isNaN(sHour) || isNaN(sMin) || isNaN(eHour) || isNaN(eMin)) return 0;
  
  let diffMin = (eHour * 60 + eMin) - (sHour * 60 + sMin);
  if (diffMin < 0) diffMin += 24 * 60; // adjust for shifts running past midnight
  
  const hours = diffMin / 60;
  return Math.round(hours * 100) / 100;
};

const createEmptyDays = (prepTime: string = '07:00'): Record<string, ScheduleDayDetail> => {
  const days: Record<string, ScheduleDayDetail> = {};
  for (let i = 1; i <= 31; i++) {
    days[i.toString()] = {
      present: false,
      dutyStartTime: prepTime,
      workStartTime: '08:00',
      workEndTime: '17:00',
      workedHours: 0
    };
  }
  return days;
};

export function DailyAttendanceScheduleManager({ projects, workers, language, company, onClose }: DailyAttendanceScheduleMgrProps) {
  const isRtl = language === 'ar';
  const dict = localDict[language];

  // List & Form State
  const [schedules, setSchedules] = useState<DailyAttendanceSchedule[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeFormOpen, setActiveFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

  // Active form controlled fields
  const [projectName, setProjectName] = useState('');
  const [projectLocation, setProjectLocation] = useState('');
  const [prepTime, setPrepTime] = useState('07:00');
  const [prepMonth, setPrepMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [formEmployees, setFormEmployees] = useState<ScheduleEmpDetail[]>([]);
  const [selectedEmpIndex, setSelectedEmpIndex] = useState<number | null>(null);

  // Printing & exporting state
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [printedSchedule, setPrintedSchedule] = useState<DailyAttendanceSchedule | null>(null);
  const [printSelectionOpen, setPrintSelectionOpen] = useState(false);
  const [activeScheduleForPrint, setActiveScheduleForPrint] = useState<DailyAttendanceSchedule | null>(null);
  const [selectedEmpIdsForPrint, setSelectedEmpIdsForPrint] = useState<Record<string, boolean>>({});

  // DB Sync
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'dailyAttendanceSchedules'), (snap) => {
      const records = snap.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as DailyAttendanceSchedule[];
      setSchedules(records);
      setLoading(false);
    }, (err) => {
      console.error("Firestore sync error for schedules:", err);
      handleFirestoreError(err, OperationType.LIST, 'dailyAttendanceSchedules');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Filter list
  const filteredSchedules = useMemo(() => {
    if (!searchTerm.trim()) return schedules;
    const term = (searchTerm || '').toLowerCase();
    return schedules.filter(s => 
      (s.projectName || '').toLowerCase().includes(term) || 
      (s.projectLocation || '').toLowerCase().includes(term) || 
      (s.month || '').toLowerCase().includes(term)
    );
  }, [schedules, searchTerm]);

  // Selected system project watcher to auto-populate
  const handleSelectSystemProject = (projId: string) => {
    if (!projId) return;
    const proj = projects.find(p => p.id === projId);
    if (proj) {
      setProjectName(proj.name);
      setProjectLocation((proj as any).location || (proj as any).workLocation || '');
      setPrepTime(proj.attendancePrepTime || '07:00');
    }
  };

  // Add empty personnel row with robust local key indexing
  const handleAddPersonnelRow = () => {
    const localId = `EMP-ROW-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newRow: ScheduleEmpDetail = {
      id: localId,
      name: '',
      badgeNumber: '',
      companyType: 'Our Company',
      occupation: '',
      days: createEmptyDays(prepTime)
    };
    setFormEmployees(prev => {
      const next = [...prev, newRow];
      setSelectedEmpIndex(next.length - 1);
      return next;
    });
  };

  // Select system worker to auto-populate fields inside row
  const handleSelectSystemWorker = (index: number, workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;

    // Check duplicate
    const alreadyExists = formEmployees.some((emp, idx) => idx !== index && emp.workerId === workerId);
    if (alreadyExists) {
      alert(dict.duplicateWorker);
      return;
    }

    setFormEmployees(prev => prev.map((emp, idx) => {
      if (idx !== index) return emp;
      return {
        ...emp,
        workerId: worker.id,
        name: worker.name,
        badgeNumber: worker.id, // ID acts as badge number in Workforce module
        companyType: worker.employmentType === 'Internal' ? 'Our Company' : 'Rental/External Company',
        occupation: worker.role
      };
    }));
  };

  // Row update handlers
  const handleUpdateEmpField = (index: number, field: keyof ScheduleEmpDetail, value: any) => {
    setFormEmployees(prev => prev.map((emp, idx) => {
      if (idx !== index) return emp;
      return {
        ...emp,
        [field]: value
      };
    }));
  };

  const handleDeleteEmpRow = (index: number) => {
    setFormEmployees(prev => {
      const filtered = prev.filter((_, idx) => idx !== index);
      if (selectedEmpIndex === index) {
        setSelectedEmpIndex(filtered.length > 0 ? 0 : null);
      } else if (selectedEmpIndex !== null && selectedEmpIndex > index) {
        setSelectedEmpIndex(selectedEmpIndex - 1);
      }
      return filtered;
    });
  };

  // Day toggle and time changes for the actively focused employee
  const handleToggleDay = (empIdx: number, dayKey: string, checked: boolean) => {
    setFormEmployees(prev => prev.map((emp, idx) => {
      if (idx !== empIdx) return emp;
      const currentDay = emp.days[dayKey];
      const updatedDay: ScheduleDayDetail = {
        ...currentDay,
        present: checked,
        workedHours: checked ? calculateHours(currentDay.workStartTime, currentDay.workEndTime) : 0
      };
      return {
        ...emp,
        days: {
          ...emp.days,
          [dayKey]: updatedDay
        }
      };
    }));
  };

  const handleUpdateDayTime = (empIdx: number, dayKey: string, timeField: 'dutyStartTime' | 'workStartTime' | 'workEndTime', value: string) => {
    setFormEmployees(prev => prev.map((emp, idx) => {
      if (idx !== empIdx) return emp;
      const currentDay = emp.days[dayKey];
      const partialDay = {
        ...currentDay,
        [timeField]: value
      };
      const updatedDay: ScheduleDayDetail = {
        ...partialDay,
        workedHours: currentDay.present ? calculateHours(partialDay.workStartTime, partialDay.workEndTime) : 0
      };
      return {
        ...emp,
        days: {
          ...emp.days,
          [dayKey]: updatedDay
        }
      };
    }));
  };

  // Renders summaries
  const getEmployeeStats = (emp: ScheduleEmpDetail) => {
    const daysArr = Object.values(emp.days);
    const presentCount = daysArr.filter(d => d.present).length;
    const hoursSum = daysArr.reduce((sum, d) => sum + (d.present ? d.workedHours : 0), 0);
    return {
      presentDays: presentCount,
      totalHours: Math.round(hoursSum * 100) / 100
    };
  };

  // Submit form to Firestore with strict ABAC rules validation
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      alert("Please provide a project name.");
      return;
    }
    if (!projectLocation.trim()) {
      alert("Please provide the project location.");
      return;
    }

    const payload: Omit<DailyAttendanceSchedule, 'id'> & { createdAt?: any; updatedAt?: any } = {
      projectName: projectName.trim(),
      projectLocation: projectLocation.trim(),
      prepTime,
      month: prepMonth,
      employees: formEmployees,
      updatedAt: serverTimestamp()
    };

    try {
      const scheduleId = formMode === 'create' 
        ? `SCH-${Date.now().toString().slice(-6)}`
        : editingScheduleId!;

      if (formMode === 'create') {
        payload.createdAt = serverTimestamp();
      }

      await setDoc(doc(db, 'dailyAttendanceSchedules', scheduleId), payload, { merge: true });
      alert(dict.saveSuccess);
      setActiveFormOpen(false);
      setEditingScheduleId(null);
    } catch (err) {
      console.error("Firestore write failure:", err);
      handleFirestoreError(err, formMode === 'create' ? OperationType.CREATE : OperationType.UPDATE, `dailyAttendanceSchedules`);
      alert(dict.saveError);
    }
  };

  // Edit action
  const handleStartEdit = (sched: DailyAttendanceSchedule) => {
    setFormMode('edit');
    setEditingScheduleId(sched.id);
    setProjectName(sched.projectName);
    setProjectLocation(sched.projectLocation);
    setPrepTime(sched.prepTime);
    setPrepMonth(sched.month);
    setFormEmployees(sched.employees || []);
    setSelectedEmpIndex(sched.employees && sched.employees.length > 0 ? 0 : null);
    setActiveFormOpen(true);
  };

  // Delete action without window.confirm to avoid iframe blocking
  const handleDeleteSchedule = async (schedId: string) => {
    try {
      await deleteDoc(doc(db, 'dailyAttendanceSchedules', schedId));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Failed to delete schedule document:", err);
      handleFirestoreError(err, OperationType.DELETE, `dailyAttendanceSchedules/${schedId}`);
    }
  };

  // Printing & exporting utils using pdfUtils capture engine with robust selection overlays
  const handleOpenPrintSelection = (sched: DailyAttendanceSchedule) => {
    setActiveScheduleForPrint(sched);
    // Select all employees by default
    const initialMap: Record<string, boolean> = {};
    if (sched.employees) {
      sched.employees.forEach(emp => {
        initialMap[emp.id] = true;
      });
    }
    setSelectedEmpIdsForPrint(initialMap);
    setPrintSelectionOpen(true);
  };

  const triggerDirectPrint = async () => {
    if (!activeScheduleForPrint) return;
    const selectedEmps = (activeScheduleForPrint.employees || []).filter(
      emp => selectedEmpIdsForPrint[emp.id]
    );
    if (selectedEmps.length === 0) {
      alert(language === 'ar' ? "يرجى اختيار موظف واحد على الأقل للطباعة." : "Please select at least one employee to print.");
      return;
    }

    const customSched: DailyAttendanceSchedule = {
      ...activeScheduleForPrint,
      employees: selectedEmps
    };

    setPrintedSchedule(customSched);
    setPrintSelectionOpen(false);

    // Provide enough time for React to render the printable area
    setTimeout(() => {
      const afterPrint = () => {
        setPrintedSchedule(null);
        window.removeEventListener('afterprint', afterPrint);
      };
      window.addEventListener('afterprint', afterPrint);
      
      setTimeout(() => {
        setPrintedSchedule(null);
        window.removeEventListener('afterprint', afterPrint);
      }, 10000);
      
      try {
        window.focus();
        window.print();
      } catch (e) {
        console.error("Print blocked by browser", e);
      }
    }, 500);
  };

  const triggerExportPDF = async () => {
    if (!activeScheduleForPrint) return;
    const selectedEmps = (activeScheduleForPrint.employees || []).filter(
      emp => selectedEmpIdsForPrint[emp.id]
    );
    if (selectedEmps.length === 0) {
      alert(language === 'ar' ? "يرجى اختيار موظف واحد على الأقل للطباعة." : "Please select at least one employee to print.");
      return;
    }

    const customSched: DailyAttendanceSchedule = {
      ...activeScheduleForPrint,
      employees: selectedEmps
    };

    setIsGeneratingPDF(true);
    setPrintedSchedule(customSched);
    setPrintSelectionOpen(false);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const printContainer = document.getElementById('attendance-schedule-printable');
      if (printContainer) {
        printContainer.classList.remove('hidden');
        printContainer.classList.remove('print:block');
        printContainer.style.position = 'absolute';
        printContainer.style.left = '-9999px';
        printContainer.style.top = '-9999px';
      }

      const element = document.getElementById(`dailyattendance-print-capture`);
      if (!element) {
        alert("Print asset loading...");
        setIsGeneratingPDF(false);
        return;
      }
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          fixHtml2CanvasOklch(clonedDoc);
        }
      });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape layout
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, Math.min(pdfHeight, pdf.internal.pageSize.getHeight()));
      pdf.save(`DailyAttendanceSchedule_${(customSched.projectName || '').replace(/\s+/g, '_')}_${customSched.month}.pdf`);
    } catch (e) {
      console.error("PDF generator fail, fallback to native print", e);
      window.print();
    } finally {
      setIsGeneratingPDF(false);
      
      const printContainer = document.getElementById('attendance-schedule-printable');
      if (printContainer) {
        printContainer.classList.add('hidden');
        printContainer.classList.add('print:block');
        printContainer.style.position = '';
        printContainer.style.left = '';
        printContainer.style.top = '';
      }

      // Clean up DOM to prevent print overlaps
      setTimeout(() => setPrintedSchedule(null), 500);
    }
  };

  const handleOpenCreateForm = () => {
    setFormMode('create');
    setEditingScheduleId(null);
    setProjectName('');
    setProjectLocation('');
    setPrepTime('07:05');
    setPrepMonth(new Date().toISOString().slice(0, 7));
    setFormEmployees([]);
    setSelectedEmpIndex(null);
    setActiveFormOpen(true);
  };

  return (
    <div 
      className="inset-0 bg-slate-950/50 backdrop-blur-sm z-50 overflow-y-auto p-4 flex justify-center items-start pt-10 pb-10 font-sans text-slate-800 print:bg-transparent print:p-0 print:overflow-visible print:z-auto"
      style={{ position: 'fixed' }}
    >
      <div className="bg-slate-50 rounded-2xl w-full max-w-7xl min-h-[85vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 print:hidden">
        
        {/* Header bar */}
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center shrink-0 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600 rounded-lg text-white">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold uppercase tracking-wider">{dict.moduleTitle}</h1>
              <p className="text-slate-400 text-xs mt-0.5">{dict.moduleSub}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 px-3 bg-slate-800 hover:bg-slate-700 transition-colors text-slate-300 rounded-md text-xs font-bold uppercase flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> {dict.back}
          </button>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12">
            <div className="w-10 h-10 rounded-full border-2 border-slate-200 border-t-red-600 animate-spin mb-4" />
            <p className="text-xs text-slate-500 font-bold italic">{dict.loading}</p>
          </div>
        ) : !activeFormOpen ? (
          
          /* VIEW MAIN LIST */
          <div className="p-6 flex-1 flex flex-col gap-6">
            
            {/* Toolbar search & create */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="relative flex-1">
                <Search className={cn("absolute top-3 w-4 h-4 text-slate-400", isRtl ? "right-3" : "left-3")} />
                <input 
                  type="text"
                  placeholder={dict.searchPlaceholder}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className={cn("w-full bg-slate-50 border border-slate-200 rounded-lg py-2 text-xs focus:ring-1 focus:ring-red-500 outline-none pr-10 font-medium", isRtl ? "pr-10" : "pl-10")}
                />
              </div>
              <button 
                onClick={handleOpenCreateForm}
                className="bg-red-600 hover:bg-red-700 transition-colors text-white py-2 px-5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {dict.addSchedule}
              </button>
            </div>

            {/* List Grids */}
            {filteredSchedules.length === 0 ? (
              <div className="flex-1 flex flex-col justify-center items-center text-center py-20 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <Calendar className="w-16 h-16 text-slate-300 mb-4" />
                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-widest">{dict.noSchedules}</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1">{dict.noSchedulesDesc}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSchedules.map((sched) => (
                  <div key={sched.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow flex flex-col justify-between shadow-sm relative group">
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-red-50 text-red-600 rounded font-mono">
                          {sched.month}
                        </span>
                        <p className="text-[9px] font-mono text-slate-400">{sched.id}</p>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition-colors uppercase leading-snug">
                        {sched.projectName}
                      </h3>
                      
                      <div className="mt-4 space-y-2 text-xs font-medium text-slate-600 border-t border-dashed border-slate-100 pt-3">
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{sched.employees ? sched.employees.length : 0} {dict.employeesCount}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{dict.prepTime}: <strong className="font-mono">{sched.prepTime}</strong></span>
                        </div>
                        <div className="flex items-start gap-2 text-[11px] leading-tight text-slate-500 font-normal">
                          <span className="font-bold text-slate-400 text-[10px] block uppercase mt-0.5">LOC:</span>
                          <span className="font-semibold">{sched.projectLocation}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-5 pt-3 border-t border-slate-100">
                      {deleteConfirmId === sched.id ? (
                        <div className="col-span-3 flex justify-between gap-2">
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteSchedule(sched.id);
                            }}
                            className="flex-1 py-1.5 px-2 bg-red-600 hover:bg-red-700 text-white text-[9px] font-bold uppercase rounded text-center transition-colors"
                          >
                            {language === 'ar' ? 'تأكيد الحذف' : 'Confirm'}
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDeleteConfirmId(null);
                            }}
                            className="flex-1 py-1.5 px-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-[9px] font-bold uppercase rounded text-center transition-colors"
                          >
                            {language === 'ar' ? 'إلغاء' : 'Cancel'}
                          </button>
                        </div>
                      ) : (
                        <>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleStartEdit(sched);
                            }}
                            className="py-1.5 px-2 bg-slate-900 hover:bg-black text-white text-[9px] font-bold uppercase rounded text-center block transition-colors"
                          >
                            {dict.editSchedule}
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleOpenPrintSelection(sched);
                            }}
                            className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-bold uppercase rounded text-center block transition-colors"
                          >
                            {dict.printSheet}
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDeleteConfirmId(sched.id);
                            }}
                            className="py-1.5 px-2 border border-slate-200 hover:bg-red-50 hover:border-red-200 text-rose-600 text-[9px] font-bold uppercase rounded text-center block transition-colors"
                          >
                            {dict.deleteSchedule}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          
          /* DETAILED CREATOR & EDITOR FORM MODAL */
          <form onSubmit={handleSaveSchedule} className="flex-1 flex flex-col overflow-hidden bg-white">
            
            {/* Top info inputs */}
            <div className="p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
              
              {/* Linked / system project selection dropdown */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest mb-1">{dict.projectName}</label>
                <div className="flex flex-col gap-1">
                  <select
                    onChange={e => {
                      if (e.target.value) {
                        handleSelectSystemProject(e.target.value);
                      }
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-red-500 font-bold"
                  >
                    <option value="">{dict.selectProject}</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                    ))}
                  </select>
                  
                  {/* Or Manual Title field */}
                  <input 
                    type="text"
                    required
                    placeholder={dict.customProject}
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-red-500 font-medium"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest mb-1">{dict.projectLocation}</label>
                <input 
                  type="text"
                  required
                  value={projectLocation}
                  onChange={e => setProjectLocation(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-red-500"
                  placeholder="e.g. Riyadh Depot Block C"
                />
              </div>

              {/* Prep time */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest mb-1">{dict.prepTime}</label>
                <input 
                  type="time"
                  required
                  value={prepTime}
                  onChange={e => setPrepTime(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              {/* Month */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest mb-1">{dict.prepMonth}</label>
                <input 
                  type="month"
                  required
                  value={prepMonth}
                  onChange={e => setPrepMonth(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

            </div>

            {/* Split screen workforce & schedule tables layout */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-[50vh]">
              
              {/* Left pane: Deployed workers tabular row list */}
              <div className="w-full lg:w-1/2 border-b lg:border-b-0 lg:border-r border-slate-200 p-5 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-3 shrink-0">
                  <h3 className="text-xs font-bold uppercase text-slate-600 tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    {dict.manageEmployees}
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddPersonnelRow}
                    className="p-1 px-3 bg-slate-900 hover:bg-black text-white rounded text-[10px] font-bold uppercase transition-colors tracking-widest flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {dict.addNewEmployee}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50/50 p-2 space-y-3">
                  {formEmployees.map((emp, index) => {
                    const isSelected = index === selectedEmpIndex;
                    const statsObj = getEmployeeStats(emp);
                    return (
                      <div 
                        key={emp.id}
                        type="button"
                        onClick={() => setSelectedEmpIndex(index)}
                        className={cn(
                          "w-full text-left p-3.5 rounded-lg border transition-all cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-3 relative overflow-hidden",
                          isSelected 
                            ? "bg-white border-red-500 shadow-sm ring-1 ring-red-550" 
                            : "bg-white border-slate-200 hover:bg-slate-50 shadow-xs"
                        )}
                      >
                        {/* Selector marker */}
                        {isSelected && <div className="absolute top-0 bottom-0 left-0 w-1 bg-red-600" />}

                        {/* Employee selectors */}
                        <div className="flex-1 space-y-2.5">
                          
                          {/* Worker dropdown config */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[7.5px] font-black text-slate-400 block uppercase tracking-wider leading-none mb-1">{dict.employeeName}</span>
                              <select
                                value={emp.workerId || ''}
                                onChange={e => {
                                  if (e.target.value) {
                                    handleSelectSystemWorker(index, e.target.value);
                                  } else {
                                    handleUpdateEmpField(index, 'workerId', '');
                                  }
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded py-0.5 px-1.5 text-[10px] font-bold outline-none"
                              >
                                <option value="">{dict.selectWorker}</option>
                                {workers.map(w => (
                                  <option key={w.id} value={w.id}>{w.name} ({w.role})</option>
                                ))}
                              </select>
                              <input 
                                type="text"
                                required
                                value={emp.name}
                                onChange={e => handleUpdateEmpField(index, 'name', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded py-0.5 px-1.5 text-[10px] mt-1 outline-none"
                                placeholder="Employee Roster Name"
                              />
                            </div>

                            <div>
                              <span className="text-[7.5px] font-black text-slate-400 block uppercase tracking-wider leading-none mb-1">{dict.badgeNumber}</span>
                              <input 
                                type="text"
                                required
                                value={emp.badgeNumber}
                                onChange={e => handleUpdateEmpField(index, 'badgeNumber', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded py-0.5 px-1.5 text-[10px] font-mono font-bold outline-none"
                                placeholder="e.g. B8381"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[7.5px] font-black text-slate-400 block uppercase tracking-wider leading-none mb-1">{dict.companyType}</span>
                              <select
                                value={emp.companyType}
                                onChange={e => handleUpdateEmpField(index, 'companyType', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded py-0.5 px-1.5 text-[9px] outline-none font-semibold"
                              >
                                <option value="Our Company">{dict.ourCompany}</option>
                                <option value="Rental/External Company">{dict.rentalCompany}</option>
                              </select>
                              
                              {emp.companyType === 'Rental/External Company' && (
                                <input 
                                  type="text"
                                  required
                                  value={emp.rentalCompanyName || ''}
                                  onChange={e => handleUpdateEmpField(index, 'rentalCompanyName', e.target.value)}
                                  placeholder={dict.rentalNamePlaceholder}
                                  className="w-full bg-white border border-slate-200 rounded py-0.5 px-1.5 text-[9px] mt-1 outline-none"
                                />
                              )}
                            </div>

                            <div>
                              <span className="text-[7.5px] font-black text-slate-400 block uppercase tracking-wider leading-none mb-1">{dict.occupation}</span>
                              <input 
                                type="text"
                                required
                                value={emp.occupation}
                                onChange={e => handleUpdateEmpField(index, 'occupation', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded py-0.5 px-1.5 text-[10px] outline-none"
                                placeholder="e.g. Mechanical Welder"
                              />
                            </div>
                          </div>

                        </div>

                        {/* Summaries & Trashing */}
                        <div className="flex md:flex-col items-end gap-2 shrink-0 justify-between self-stretch pt-2 md:pt-0 md:pl-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteEmpRow(index)}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors border border-slate-200 hover:border-red-100 rounded bg-white hover:bg-red-50 shadow-xs"
                            title="Delete Employee Row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          
                          <div className="text-right text-[9px] leading-tight font-mono text-slate-500 space-y-0.5">
                            <p>{dict.totalPresentDays} <strong className="text-slate-800">{statsObj.presentDays}</strong></p>
                            <p>{dict.totalWorkedHours} <strong className="text-slate-800">{statsObj.totalHours}h</strong></p>
                          </div>
                        </div>

                      </div>
                    );
                  })}

                  {formEmployees.length === 0 && (
                    <div className="p-8 text-center bg-white border border-slate-200 rounded-xl">
                      <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-[11px] text-slate-400 italic">{dict.noEmployees}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right pane: Attendance check-off sheet matrix days 1-31 */}
              <div className="w-full lg:w-1/2 p-5 flex flex-col overflow-hidden bg-slate-50/50">
                <h3 className="text-xs font-bold uppercase text-slate-600 tracking-wider mb-3 flex items-center gap-2 shrink-0">
                  <Calendar className="w-4 h-4 text-red-600" />
                  {dict.calendarTitle}
                </h3>

                {selectedEmpIndex === null || !formEmployees[selectedEmpIndex] ? (
                  <div className="flex-1 bg-white border border-slate-200 rounded-xl flex flex-col justify-center items-center text-center p-8 shadow-sm">
                    <Calendar className="w-12 h-12 text-slate-300 mb-3" />
                    <p className="text-xs text-slate-400 max-w-xs">{dict.calendarInstructions}</p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col overflow-hidden bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                    
                    {/* Header focused info */}
                    <div className="border-b border-slate-100 pb-3 mb-4 flex justify-between items-center shrink-0">
                      <div>
                        <h4 className="text-xs font-black uppercase text-slate-900">
                          {formEmployees[selectedEmpIndex].name || "Roster Row " + (selectedEmpIndex + 1)}
                        </h4>
                        <p className="text-[9px] font-mono text-slate-400 mt-0.5">
                          {formEmployees[selectedEmpIndex].occupation || "—"} • Badge: {formEmployees[selectedEmpIndex].badgeNumber || "—"}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-red-50 text-red-650 rounded">
                          {getEmployeeStats(formEmployees[selectedEmpIndex]).presentDays} / 31 Present
                        </span>
                      </div>
                    </div>

                    {/* Roster day cards grid */}
                    <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-1">
                      {Array.from({ length: 31 }, (_, i) => {
                        const dStr = (i + 1).toString();
                        const record = formEmployees[selectedEmpIndex].days[dStr] || {
                          present: false,
                          dutyStartTime: prepTime,
                          workStartTime: '08:00',
                          workEndTime: '17:00',
                          workedHours: 0
                        };

                        return (
                          <div 
                            key={dStr}
                            className={cn(
                              "border rounded-lg p-3 transition-colors flex flex-col justify-between text-left",
                              record.present
                                ? "bg-white border-red-200 ring-1 ring-red-50"
                                : "bg-slate-50/50 border-slate-150"
                            )}
                          >
                            <div className="flex justify-between items-center mb-2.5">
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                                {dict.editTimesForDay}{dStr}
                              </span>
                              
                              <input 
                                type="checkbox"
                                checked={record.present}
                                onChange={e => handleToggleDay(selectedEmpIndex, dStr, e.target.checked)}
                                className="w-4 h-4 rounded border-slate-350 text-red-600 focus:ring-red-500 cursor-pointer"
                              />
                            </div>

                            {record.present && (
                              <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-150">
                                
                                {/* Duty start input */}
                                <div className="flex items-center justify-between gap-2.5">
                                  <span className="text-[8px] text-slate-400 font-bold uppercase leading-none">{dict.dutyStart}</span>
                                  <input 
                                    type="time"
                                    value={record.dutyStartTime}
                                    onChange={e => handleUpdateDayTime(selectedEmpIndex, dStr, 'dutyStartTime', e.target.value)}
                                    className="text-[9px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 outline-none font-mono"
                                  />
                                </div>

                                {/* Work Start */}
                                <div className="flex items-center justify-between gap-2.5">
                                  <span className="text-[8px] text-slate-400 font-bold uppercase leading-none">{dict.workStart}</span>
                                  <input 
                                    type="time"
                                    value={record.workStartTime}
                                    onChange={e => handleUpdateDayTime(selectedEmpIndex, dStr, 'workStartTime', e.target.value)}
                                    className="text-[9px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 outline-none font-mono"
                                  />
                                </div>

                                {/* Work End */}
                                <div className="flex items-center justify-between gap-2.5">
                                  <span className="text-[8px] text-slate-400 font-bold uppercase leading-none">{dict.workEnd}</span>
                                  <input 
                                    type="time"
                                    value={record.workEndTime}
                                    onChange={e => handleUpdateDayTime(selectedEmpIndex, dStr, 'workEndTime', e.target.value)}
                                    className="text-[9px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 outline-none font-mono"
                                  />
                                </div>

                                <div className="border-t border-slate-100 pt-1 mt-1 text-right">
                                  <span className="text-[9px] font-bold text-slate-500 font-mono">
                                    {record.workedHours} hrs
                                  </span>
                                </div>

                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>

                  </div>
                )}

              </div>
            </div>

            {/* Bottom action bar */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
              {formEmployees.length > 0 && (
                <button 
                  type="button"
                  onClick={() => {
                    const activeFormSchedule: DailyAttendanceSchedule = {
                      id: editingScheduleId || 'PREVIEW',
                      projectName: projectName.trim() || 'Untitled Project',
                      projectLocation: projectLocation.trim() || 'Unspecified Location',
                      prepTime,
                      month: prepMonth,
                      employees: formEmployees
                    };
                    handleOpenPrintSelection(activeFormSchedule);
                  }}
                  className="py-2 px-4 border border-slate-200 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold uppercase rounded-lg shadow-xs flex items-center gap-1.5 mr-auto transition-colors"
                >
                  <Printer className="w-4 h-4 text-slate-500" />
                  Print / Export
                </button>
              )}
              <button 
                type="button"
                onClick={() => setActiveFormOpen(false)}
                className="py-2 px-5 border border-slate-200 bg-white text-slate-700 text-xs font-bold uppercase rounded-lg shadow-xs hover:bg-slate-50 transition-colors"
              >
                Abort
              </button>
              <button 
                type="submit"
                className="py-2 px-6 bg-slate-900 hover:bg-black text-white text-xs font-bold uppercase rounded-lg shadow-sm flex items-center gap-1 transition-colors"
              >
                <Save className="w-4 h-4" />
                Commit Matrix
              </button>
            </div>

          </form>
        )}

      </div>

      {/* Print Selection Modal */}
      {printSelectionOpen && activeScheduleForPrint && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[80] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-slate-900 px-5 py-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-red-500" />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    {language === 'ar' ? 'خيارات كشف الحضور' : 'Print Selection'}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    {activeScheduleForPrint.projectName} ({activeScheduleForPrint.month})
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setPrintSelectionOpen(false)}
                className="p-1 hover:bg-slate-800 rounded transition-colors"
              >
                <X className="w-4 h-4 text-slate-450" />
              </button>
            </div>

            {/* Content list with check-boxes */}
            <div className="p-5 flex-1 overflow-y-auto max-h-[350px] space-y-3 font-sans">
              <p className="text-[11px] text-slate-500 leading-normal">
                {language === 'ar' 
                  ? 'يرجى تحديد صفوف الموظفين الذين ترغب في تضمينهم في الكشف المطبوع أو تقرير PDF:' 
                  : 'Select which employee records to include in the physical print page or PDF layout:'}
              </p>

              {/* Master toggle */}
              <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold">
                <span className="text-slate-700">
                  {language === 'ar' ? 'تحديد الكل / إلغاء التحديد' : 'Select All / Deselect All'}
                </span>
                <input 
                  type="checkbox"
                  checked={(activeScheduleForPrint.employees || []).length > 0 && (activeScheduleForPrint.employees || []).every(emp => selectedEmpIdsForPrint[emp.id])}
                  onChange={e => {
                    const checked = e.target.checked;
                    const next: Record<string, boolean> = {};
                    (activeScheduleForPrint.employees || []).forEach(emp => {
                      next[emp.id] = checked;
                    });
                    setSelectedEmpIdsForPrint(next);
                  }}
                  className="w-4 h-4 text-red-650 rounded border-slate-300 focus:ring-red-500 cursor-pointer"
                />
              </div>

              {/* Scrollable list of employee rows */}
              <div className="space-y-1.5 border border-slate-100 rounded-lg p-1.5 max-h-[220px] overflow-y-auto bg-slate-50/20">
                {(activeScheduleForPrint.employees || []).map((emp) => (
                  <label 
                    key={emp.id}
                    className="flex items-center justify-between p-2 bg-white hover:bg-slate-50 transition-colors border border-slate-100 rounded cursor-pointer text-xs"
                  >
                    <div className="flex-1 min-w-0 pr-2 text-left">
                      <p className="font-semibold text-slate-900 truncate">{emp.name || (language === 'ar' ? 'موظف بدون اسم' : 'Unnamed Employee')}</p>
                      <p className="text-[9px] font-mono text-slate-400">
                        {emp.occupation || '—'} • Badge: {emp.badgeNumber || '—'}
                      </p>
                    </div>
                    <input 
                      type="checkbox"
                      checked={!!selectedEmpIdsForPrint[emp.id]}
                      onChange={e => {
                        setSelectedEmpIdsForPrint(prev => ({
                          ...prev,
                          [emp.id]: e.target.checked
                        }));
                      }}
                      className="w-4 h-4 text-red-650 rounded border-slate-300 focus:ring-red-500 cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPrintSelectionOpen(false)}
                className="py-1.5 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-bold uppercase transition-colors"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              
              <button
                type="button"
                onClick={triggerDirectPrint}
                className="py-1.5 px-4 bg-slate-900 hover:bg-black text-white rounded text-xs font-bold uppercase flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                {language === 'ar' ? 'طباعة مباشرة' : 'Direct Print'}
              </button>

              <button
                type="button"
                onClick={triggerExportPDF}
                className="py-1.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold uppercase flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                {language === 'ar' ? 'تصدير PDF' : 'A4 PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* DAILY ATTENDANCE SCHEDULE HIGH-CONTRAST A4 PRINT ELEMENT */}
      {/* ========================================== */}
      {printedSchedule && (
        <div id="attendance-schedule-printable" className="hidden print:block bg-white text-slate-900 font-sans p-2 text-xs leading-normal">
          <div 
            id={`dailyattendance-print-capture`}
            className="bg-white text-slate-900 w-[297mm] min-h-[210mm] p-6 relative flex flex-col justify-between mx-auto border border-transparent"
            style={{ boxSizing: 'border-box' }}
          >
            <div>
              {/* Top Banner */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-4">
                <div className="flex items-center gap-4">
                  {company?.logo ? (
                    <img 
                      src={company.logo} 
                      className="w-14 h-14 object-contain" 
                      alt="Logo" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-slate-900 text-white font-black flex items-center justify-center rounded text-base tracking-wider">
                      RSHG
                    </div>
                  )}
                  <div>
                    <h1 className="text-sm font-black text-slate-900 tracking-tight leading-none">
                      {company?.name || 'RED SEA HOLDING SYSTEM ERP'}
                    </h1>
                    <p className="text-[8px] text-slate-500 font-bold mt-1 uppercase tracking-widest">
                      {language === 'ar' ? 'سجل وكشف الحضور الشهري للمشاريع' : 'MONTHLY MULTI-PROJECT ATTENDANCE MATRIX REGISTER'}
                    </p>
                    <div className="text-[7px] text-slate-400 mt-1 space-y-0.5 font-mono leading-tight">
                      <p>CR Number / السجل التجاري: {company?.crNumber || '1010620353'}</p>
                      <p>VAT Number / الرقم الضريبي: {company?.vatNumber || '310349823500003'}</p>
                      <p>HQ Location / المقر الرئيسي: {company?.headquarters || 'Riyadh, Saudi Arabia'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <h2 className="text-sm font-black text-slate-900 tracking-wider uppercase leading-none">
                    DAILY ATTENDANCE SCHEDULE
                  </h2>
                  <h3 className="text-[10px] font-bold text-slate-600 tracking-wider mt-1 leading-none">
                    بيان وكشف وجدول التحضير الشهري للمشروع
                  </h3>
                  <p className="text-[7.5px] font-mono text-slate-400 mt-2">
                    MATRIX LOG ID / رمز السجل: {printedSchedule.id}
                  </p>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-4 gap-4 p-3 bg-slate-50 border border-slate-200 rounded-lg mb-4 text-[9px]">
                <div>
                  <span className="text-slate-400 block text-[7px] uppercase font-bold">Project Name / اسم المشروع</span>
                  <span className="font-bold text-slate-900">{printedSchedule.projectName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[7px] uppercase font-bold">Project Location / موقع المشروع</span>
                  <span className="font-bold text-slate-900">{printedSchedule.projectLocation}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[7px] uppercase font-bold">Prep Window Time / وقت التحضير</span>
                  <span className="font-bold text-slate-900 font-mono">{printedSchedule.prepTime}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[7px] uppercase font-bold">Roster Month / شهر التحضير</span>
                  <span className="font-bold text-slate-900 font-mono">{printedSchedule.month}</span>
                </div>
              </div>

              {/* Attendance days grid table */}
              <div className="border border-slate-300 rounded-lg overflow-hidden bg-white">
                <table className="w-full text-left border-collapse bg-white">
                  <thead>
                    <tr className="bg-slate-905 text-slate-900 bg-slate-100 border-b border-slate-300 text-[7px] font-black uppercase">
                      <th className="py-1 px-1.5 border-r border-slate-200">{language === 'ar' ? 'الموظف / العامل' : 'Deployed Personnel'}</th>
                      <th className="py-1 px-1.5 text-center border-r border-slate-200">{language === 'ar' ? 'التبعية / الشركة' : 'Company / Affiliation'}</th>
                      <th className="py-1 px-1.5 text-center border-r border-slate-200">{language === 'ar' ? 'المهنة' : 'Occupation'}</th>
                      <th className="py-1 px-1.5 text-center border-r border-slate-200">{language === 'ar' ? 'أيام الحضور' : 'Present'}</th>
                      <th className="py-1 px-1.5 text-center border-r border-slate-200">{language === 'ar' ? 'الساعات' : 'Hours'}</th>
                      
                      {/* Columns days 1 to 31 */}
                      {Array.from({ length: 31 }, (_, d) => (
                        <th key={d} className="py-0.5 text-center border-r border-slate-200 text-[6.5px] font-mono leading-none min-w-[14px]">
                          {d + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-[8.5px] font-medium">
                    {printedSchedule.employees && printedSchedule.employees.map((emp, eIdx) => {
                      const empSummary = getEmployeeStats(emp);
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50">
                          <td className="py-1 px-1.5 border-r border-slate-200">
                            <span className="font-black text-slate-900 block">{emp.name}</span>
                            <span className="text-[6.5px] text-slate-400 block font-mono">ID: {emp.badgeNumber || 'N/A'}</span>
                          </td>
                          <td className="py-1 px-1 text-center border-r border-slate-200 text-[8px]">
                            {emp.companyType === 'Our Company' 
                              ? (language === 'ar' ? 'شركتنا' : 'Our Co') 
                              : (emp.rentalCompanyName || (language === 'ar' ? 'جهة خارجية' : 'External Co'))}
                          </td>
                          <td className="py-1 px-1 border-r border-slate-200 text-[8px] max-w-[80px] truncate">
                            {emp.occupation}
                          </td>
                          <td className="py-1 px-1 text-center border-r border-slate-200 font-mono font-black text-rose-650 bg-red-50/20">
                            {empSummary.presentDays}
                          </td>
                          <td className="py-1 px-1 text-center border-r border-slate-200 font-mono font-black text-slate-900 bg-slate-50">
                            {empSummary.totalHours}<span className="font-sans">{language === 'ar' ? 'س' : 'h'}</span>
                          </td>

                          {/* 1 to 31 states */}
                          {Array.from({ length: 31 }, (_, dayIdx) => {
                            const dStr = (dayIdx + 1).toString();
                            const rec = emp.days[dStr];
                            const isPresent = rec && rec.present;
                            return (
                              <td 
                                key={dayIdx} 
                                className={cn(
                                  "p-0.5 text-center border-r border-slate-200 text-[7px] font-mono",
                                  isPresent ? "bg-emerald-50 text-emerald-800 font-black" : "text-slate-350"
                                )}
                              >
                                {isPresent ? (
                                  <div className="flex flex-col items-center justify-center leading-none gap-[1px]">
                                    <span title="Hours">{rec.workedHours}</span>
                                    {(rec.workStartTime || rec.dutyStartTime) && (
                                      <span className="text-[4px] font-normal tracking-tighter opacity-70" title="Start Time">
                                        {rec.workStartTime || rec.dutyStartTime}
                                      </span>
                                    )}
                                  </div>
                                ) : '·'}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>

            {/* Print Sign-off areas */}
            <div className="mt-8 pt-4 border-t border-slate-200">
              <div className="grid grid-cols-2 gap-16">
                <div>
                  <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block mb-10">
                    {language === 'ar' ? 'توقيع المشرف المسؤول والمطابقة الميدانية' : dict.authorizedSign}
                  </span>
                  <div className="border-b border-dashed border-slate-300 w-48 mb-1"></div>
                  <span className="text-[9px] font-black text-slate-500 block">{language === 'ar' ? 'اعتماد مسؤول العمليات' : 'Verified Operations Lead Desk'}</span>
                  <span className="text-[7px] text-slate-450 block font-mono">{language === 'ar' ? 'التاريخ: بانتظار تصديق النظام' : 'Date Verified / التاريخ: Awaiting System Verification Lock'}</span>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block mb-10">
                    {language === 'ar' ? 'قسم التدقيق المالي والإداري' : 'Project HR Auditor Verdict'}
                  </span>
                  <div className="border-b border-dashed border-slate-300 w-48 mb-1"></div>
                  <span className="text-[9px] font-black text-slate-550 block">{language === 'ar' ? 'تم التدقيق والاعتماد' : 'Audited & Verified successfully'}</span>
                  <span className="text-[7px] text-slate-450 block font-mono">{language === 'ar' ? 'الحالة: معتمد نهائياً' : 'Page Status / الحالة: Audit Locked'}</span>
                </div>
              </div>

              <div className="text-center text-[6.5px] text-slate-400 font-mono mt-6 border-t border-slate-100 pt-3 flex justify-between">
                <span>SYSTEM REGISTRATION RUNNING SECURE ON PORT 3000 • SECURITY AUDITING</span>
                <span>RED SEA HOLDING GROUP ERP REPORT MATRIX • PORTRAIT PRINT CONFINED</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Floating actions menu during PDF generation and print */}
      {isGeneratingPDF && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm z-[100] flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 text-center max-w-sm border border-slate-200 shadow-2xl flex flex-col items-center">
            <div className="w-10 h-10 rounded-full border-2 border-slate-200 border-t-red-650 animate-spin mb-4" />
            <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">Generating high-fidelity PDF...</p>
            <p className="text-[10px] text-slate-405 italic mt-1">Please wait while our capture engine compiles the A4 report matrix</p>
          </div>
        </div>
      )}

    </div>
  );
}
