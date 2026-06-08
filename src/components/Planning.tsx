import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Search, 
  Filter, 
  Printer, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  User, 
  Users as UsersIcon, 
  Building2,
  ChevronDown,
  ChevronRight,
  Download,
  LayoutGrid,
  TrendingUp,
  Briefcase,
  AlertTriangle,
  Undo2,
  Settings as SettingsIcon,
  RotateCcw,
  FileSpreadsheet,
  Check,
  ShieldAlert,
  Moon,
  Sun,
  Hammer,
  FileText,
  Workflow
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import * as XLSX from 'xlsx';
import { useAuth } from '../contexts/AuthContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { cn, createAuditLog, triggerSystemNotification } from '../lib/utils';
import { Project } from '../types';
import { 
  WbsNode, 
  Activity, 
  PlanningResource, 
  PrimaveraAuditLog, 
  UserRoleProfile, 
  INITIAL_USER_PROFILES, 
  INITIAL_WBS_NODES, 
  INITIAL_RESOURCES, 
  INITIAL_ACTIVITIES, 
  INITIAL_CONSTRUCTION_PROGRESS, 
  recalculateScheduleCPM, 
  ConstructionProgress,
  dateToOffsetDays,
  offsetDaysToDate
} from '../lib/planningHelpers';
import { DailyWorkPlanManager } from './DailyWorkPlanManager';

interface PlanningProps {
  projects: Project[];
  workers: any[];
  language: 'en' | 'ar';
  company: any;
}

export function Planning({ projects, workers, language, company }: PlanningProps) {
  const { userData } = useAuth();
  const isRtl = language === 'ar';

  // Safe helper wrappers to prevent iframe sandbox crash on alert/confirm
  const safeConfirm = (msg: string) => {
    try {
      return confirm(msg);
    } catch (e) {
      console.warn("Blocked by sandbox iframe, automatically confirming", e);
      return true;
    }
  };

  const safeAlert = (msg: string) => {
    try {
      alert(msg);
    } catch (e) {
      console.warn("Blocked by sandbox iframe, alert ignored", e);
    }
  };

  // --- LOCAL PERSISTED STATES ---
  const [wbsNodes, setWbsNodes] = useLocalStorage<WbsNode[]>('ares_p6_wbs', INITIAL_WBS_NODES);
  const [activities, setActivities] = useLocalStorage<Activity[]>('ares_p6_activities', INITIAL_ACTIVITIES);
  const [resources, setResources] = useLocalStorage<PlanningResource[]>('ares_p6_resources', INITIAL_RESOURCES);
  const [constructionProgress, setConstructionProgress] = useLocalStorage<ConstructionProgress[]>('ares_p6_progress', INITIAL_CONSTRUCTION_PROGRESS);
  const [auditLogs, setAuditLogs] = useLocalStorage<PrimaveraAuditLog[]>('ares_p6_audit_logs', [
    { id: '1', timestamp: '2026-05-20T10:00:00Z', user: 'Eng. Khalid Al-Otaibi', role: 'Project Manager', action: 'Initial Schedule Baseline', details: 'WBS structure mapped and verified against master contract.' }
  ]);
  
  // Undo/History states for changes
  const [historyStack, setHistoryStack] = useState<Activity[][]>([]);
  
  // Versions state
  const [baselines, setBaselines] = useLocalStorage<Array<{id: string, name: string, date: string, activityCount: number}>>('ares_p6_baselines', [
    { id: 'BASE-1', name: 'Original Contract Baseline v1.0', date: '2024-01-10', activityCount: 9 }
  ]);

  // UI Active Sub-view/Tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'wbs' | 'resources' | 'workflows' | 'permissions'>('dashboard');

  // Multi-theme local setup
  const [isDarkMode, setIsDarkMode] = useLocalStorage<boolean>('ares_p6_theme_dark', false);

  // Filter/Search variables
  const [selectedProjectId, setSelectedProjectId] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');

  // Gantt Chart variables
  const [zoomLevel, setZoomLevel] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  // Daily Work Plan Trigger
  const [isDailyPlanOpen, setIsDailyPlanOpen] = useState(false);

  // User Roles Configuration
  const [selectedUserRole, setSelectedUserRole] = useState<'Admin' | 'Project Manager' | 'Planner' | 'Engineer' | 'Supervisor' | 'Viewer'>('Admin');
  const [customProfiles, setCustomProfiles] = useLocalStorage<UserRoleProfile[]>('ares_p6_user_profiles', INITIAL_USER_PROFILES);

  // MODAL FOR CRUD CONTROL - Activity & WBS
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  
  const [isWbsModalOpen, setIsWbsModalOpen] = useState(false);
  const [editingWbs, setEditingWbs] = useState<WbsNode | null>(null);

  // Bulk operation checklists
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([]);

  // Workflow Form state
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<ConstructionProgress | null>(null);
  const [modalProjectId, setModalProjectId] = useState<string>('P1');

  // --- CORE TRANSLATIONS FOR PRIMAVERA ---
  const t = useMemo(() => {
    return {
      en: {
        title: "Professional Project Planning & Control System",
        subtitle: "Primavera-grade scheduling, critical path calculations, resource loads, and contract workflows",
        dashboard: "Executive P6 Dashboard",
        wbs: "WBS & Activity Scheduler",
        resourcesTab: "Resource Capacity & Loads",
        workflowsTab: "Contractor Workflows",
        permissionsTab: "Roles & Security",
        totalProjects: "Planning Portfolios",
        activeProjects: "Active Control Projects",
        delayedProjects: "Schedule Variance Delays",
        totalActivities: "Scheduled Activities",
        budgetOverruns: "Budget Forecast Warnings",
        criticalCount: "On Critical Path",
        kpiMetrics: "Operational Control Statistics",
        cashflowForecast: "Project Cash Flow & Cost Forecasts",
        plannedVsActual: "Planned Value (PV) vs Actual Cost (AC) vs Estimate at Completion (EAC)",
        resourceLoad: "Resource Allocation Levels & Overload Detection",
        recentAudits: "Primavera Planning Audit Stream",
        addActivity: "New Activity",
        addWbs: "New WBS Node",
        recalculateCPM: "Recalculate CPM Network",
        undoAction: "Undo Last Edit",
        searchPlaceholder: "Search activities, codes, milestones or assignees...",
        allProjects: "All Portfolios",
        allStatuses: "All Statuses",
        allPriorities: "All Priorities",
        cpmDetails: "CPM Parameters",
        earlyStart: "Early Start",
        earlyFinish: "Early Finish",
        lateStart: "Late Start",
        lateFinish: "Late Finish",
        totalFloat: "Total Float",
        isCritical: "Critical Path Activity",
        duration: "Duration",
        days: "Days",
        progress: "Progress",
        dependencies: "Predecessor Logic (FS/SS/FF/SF)",
        addDependency: "Add Dependency",
        assignedResources: "Assigned Asset Load",
        bulkCompleted: "Bulk Complete Selected",
        bulkDelete: "Bulk Delete Selected",
        cpmSuccess: "CPM Network calculation executed successfully! Schedule rescheduled and critical tasks marked in red.",
        roleRestricted: "Access Denied: Your current P6 Role Profile is restricted from performing this database modification.",
        noCritical: "No activities on critical path.",
        backToDashboard: "Return to Main Screen",
        activeActivities: "Active Schedules",
        excelExport: "Export Excel Worksheet",
        pdfExport: "High-Fidelity PDF Document",
        milestone: "Key Milestone",
        baselineList: "Baseline Version Registry",
        createBaseline: "Freeze Current Schedule Baseline",
        wbsTitle: "Work Breakdown Tree Visualizer",
        dragHint: "Create nested phases and drag tasks to logically align schedules",
        contractorWorkflowTitle: "Contractor Site Operations Tracker",
        newWorkEntry: "Record Daily Finished Compaction",
        finishedArea: "Finished Coating Square Meters",
        workProductivity: "Coating Group Performance Ratio (M2/Worker)"
      },
      ar: {
        title: "النظام الاحترافي لتخطيط ومراقبة المشاريع (Primavera)",
        subtitle: "إدارة الجدولة الزمنية، وحسابات المسار الحرج (CPM)، وتحميل الموارد، وسير عمل المقاولين",
        dashboard: "لوحة تحكم بريمافيرا التنفيذية",
        wbs: "جدولة المهام وهيكل (WBS)",
        resourcesTab: "طاقة وحمل الموارد",
        workflowsTab: "مسارات عمل الموقع للكود",
        permissionsTab: "الأدوار والصلاحيات الأمانية",
        totalProjects: "محافظ تخطيط المشاريع",
        activeProjects: "المشاريع الخاضعة للرقابة",
        delayedProjects: "المشاريع المتأخرة بالجدول",
        totalActivities: "الأنشطة المجدولة حالياً",
        budgetOverruns: "تحذيرات تجاوز ميزانية التكلفة",
        criticalCount: "على المسار الحرج (CPM)",
        kpiMetrics: "إحصائيات الرقابة التشغيلية",
        cashflowForecast: "التدفق النقدي وتوقعات التكلفة",
        plannedVsActual: "القيمة المخططة (PV) مقابل التكلفة الفعلية (AC) والتقدير عند الاكتمال (EAC)",
        resourceLoad: "مستويات توزيع الموارد وكشف التحميل الزائد",
        recentAudits: "سجل التدقيق والتغييرات في التخطيط",
        addActivity: "نشاط جديد",
        addWbs: "إضافة عقدة WBS جديدة",
        recalculateCPM: "إعادة حساب شبكة CPM",
        undoAction: "تراجع عن الإجراء الأخير",
        searchPlaceholder: "البحث في الأنشطة، الرموز، المعالم أو الموظفين المعينين...",
        allProjects: "جميع المحافظ الاستثمارية",
        allStatuses: "جميع الحالات",
        allPriorities: "جميع الأولويات",
        cpmDetails: "معاملات المسار الحرج (CPM)",
        earlyStart: "البدء المبكر",
        earlyFinish: "الانتهاء المبكر",
        lateStart: "البدء المتأخر",
        lateFinish: "الانتهاء المتأخر",
        totalFloat: "الفائض الإجمالي (Float)",
        isCritical: "نشاط ذو ممر حرج",
        duration: "المدة الزمنية",
        days: "أيام",
        progress: "نسبة الإنجاز",
        dependencies: "الاعتمادية المسبقة (FS/SS/FF/SF)",
        addDependency: "إضافة اعتماد مسبق",
        assignedResources: "الأصول والموارد المحملة",
        bulkCompleted: "إكمال الأنشطة المحددة bulk",
        bulkDelete: "حذف الأنشطة المحددة bulk",
        cpmSuccess: "تم تنفيذ حساب شبكة CPM بنجاح! تم تحديث التواريخ وتمييز المسار الحرج بالأحمر.",
        roleRestricted: "تم رفض الوصول: ملف الصلاحيات الحالي يمنع إجراء هذا التعديل على قاعدة البيانات الخاصة بالنظام.",
        noCritical: "لا توجد أنشطة على المسار الحرج الرئيسي.",
        backToDashboard: "العودة إلى الشاشة الرئيسية",
        activeActivities: "الأنشطة النشطة مجدولة",
        excelExport: "تصدير جدول بيانات Excel",
        pdfExport: "تنزيل مستند PDF عالي الجودة",
        milestone: "معلم رئيسي للمشروع",
        baselineList: "سجل إصدارات خطوط الأساس (Baselines)",
        createBaseline: "حفظ خط أساس للجدول الحالي",
        wbsTitle: "هيكل تجزئة العمل (WBS Tree)",
        dragHint: "إنشاء مراحل فرعية متداخلة وسحب المهام لترتيب الجدول منطقياً",
        contractorWorkflowTitle: "متتبع عمليات مقاول طبقات الإيبوكسي بالموقع",
        newWorkEntry: "تسجيل الإنتاجية اليومية للمسطحات",
        finishedArea: "المساحة المنجزة بالمتر المربع",
        workProductivity: "معدل أداء فريق الطلاء (م٢ / للعامل)"
      }
    }[language];
  }, [language]);

  // --- CURRENT ACTIVE ROLE PERMISSION HELPER ---
  const activeProfile = useMemo(() => {
    return customProfiles.find(p => p.role === selectedUserRole) || customProfiles[0];
  }, [customProfiles, selectedUserRole]);

  // Push activity state to history for undo function before modifying
  const saveStateForUndo = (currentActs: Activity[]) => {
    setHistoryStack(prev => [...prev.slice(-9), currentActs]); // keep up to 10 states
  };

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const previous = historyStack[historyStack.length - 1];
    setHistoryStack(prev => prev.slice(0, -1));
    setActivities(previous);
    addPrimaveraLog('Undo Modification', 'Restored previous planning activities state from backup history.');
  };

  const addPrimaveraLog = (action: string, details: string) => {
    const newLog: PrimaveraAuditLog = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: userData?.name || 'Authorized Planner',
      role: selectedUserRole,
      action,
      details
    };
    setAuditLogs(prev => [newLog, ...prev.slice(0, 49)]); // keep 50 logs
  };

  // --- SCHEDULING COMPUTER: TRIGGER CPM ---
  const triggerCpmSchedule = () => {
    if (!activeProfile.permissions.update) {
      safeAlert(t.roleRestricted);
      return;
    }
    const currentProj = selectedProjectId === 'All' ? 'P1' : selectedProjectId;
    const targetProjectObj = projects.find(p => p.id === currentProj) || projects[0];
    const projectStart = targetProjectObj ? targetProjectObj.startDate : '2024-01-15';

    saveStateForUndo(activities);
    
    // Filter activities belonging to current project
    const projActivities = activities.filter(a => a.projectId === currentProj);
    const otherActivities = activities.filter(a => a.projectId !== currentProj);

    // Calculate CPM for specified project activities
    const calculated = recalculateScheduleCPM(projActivities, projectStart);
    
    // Recombine and set
    const merged = [...calculated, ...otherActivities];
    setActivities(merged);

    addPrimaveraLog('CPM Scheduling Run', `Executed topological forward/backward pass calculations relative to start date ${projectStart}.`);
    
    triggerSystemNotification({
      id: `NOT-CPM-${Date.now()}`,
      type: 'Task',
      title: 'P6 CPM Calculations Succeeded',
      message: t.cpmSuccess,
      department: 'Engineering',
      read: false,
      createdAt: new Date().toISOString()
    });
  };

  // --- AUTOMATIC RECALCULATION TRIGGERS ---
  // If activities count changes or selected projectId changes, run CPM calculation to keep indices fresh
  useEffect(() => {
    if (activities.length > 0) {
      const currentProj = selectedProjectId === 'All' ? 'P1' : selectedProjectId;
      const targetProj = projects.find(p => p.id === currentProj) || projects[0];
      const start = targetProj ? targetProj.startDate : '2024-01-15';
      const projActivities = activities.filter(a => a.projectId === currentProj);
      if (projActivities.length > 0 && projActivities.some(a => a.earlyStart === 0 && a.earlyFinish === 0)) {
        const calculated = recalculateScheduleCPM(projActivities, start);
        const otherActivities = activities.filter(a => a.projectId !== currentProj);
        setActivities([...calculated, ...otherActivities]);
      }
    }
  }, [selectedProjectId, activities.length, projects]);

  // --- STATISTICS COMPUTATION ---
  const stats = useMemo(() => {
    const targetProjId = selectedProjectId === 'All' ? 'P1' : selectedProjectId;
    const projectActs = activities.filter(a => a.projectId === targetProjId);
    
    const completed = projectActs.filter(a => a.status === 'Completed').length;
    const progressAvg = projectActs.length ? Math.round(projectActs.reduce((sum, a) => sum + (a.progress || 0), 0) / projectActs.length) : 0;
    
    const critical = projectActs.filter(a => a.isCritical).length;
    const upcomingDeadlines = projectActs.filter(a => a.status !== 'Completed' && a.priority === 'High').length;
    
    // Calculate total planned cost vs actual cost
    const resMap = new Map(resources.map(r => [r.id, r]));
    let plannedValue = 0;
    let actualCost = 0;
    
    projectActs.forEach(a => {
      a.assignedResources.forEach(resId => {
        const res = resMap.get(resId);
        if (res) {
          const allocCost = (res.costRate || 0) * (a.duration || 1);
          plannedValue += allocCost;
          actualCost += allocCost * (a.progress / 100);
        }
      });
    });

    // Check budget limit from project
    const activeProjectObj = projects.find(p => p.id === targetProjId);
    const budgetLimit = activeProjectObj ? activeProjectObj.budget : 12000000;
    const warningTrigger = actualCost > budgetLimit;

    return {
      totalActs: projectActs.length,
      completed,
      progressAvg,
      critical,
      upcomingDeadlines,
      plannedValue,
      actualCost,
      warningTrigger,
      budgetLimit
    };
  }, [selectedProjectId, activities, resources, projects]);

  // --- SUBSTRUCTURE & PARENT SEARCH ENGINE ---
  const filteredActivities = useMemo(() => {
    return activities.filter(a => {
      const matchesProject = selectedProjectId === 'All' || a.projectId === selectedProjectId;
      const matchesSearch = (a.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
                          (a.code || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
                          (a.description || '').toLowerCase().includes((searchTerm || '').toLowerCase());
      const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
      const matchesPriority = priorityFilter === 'All' || a.priority === priorityFilter;
      
      return matchesProject && matchesSearch && matchesStatus && matchesPriority;
    });
  }, [activities, selectedProjectId, searchTerm, statusFilter, priorityFilter]);

  // List of unique phases associated with current project
  const currentProjectWbs = useMemo(() => {
    return wbsNodes.filter(n => selectedProjectId === 'All' || n.projectId === selectedProjectId);
  }, [wbsNodes, selectedProjectId]);

  // --- BULK OPERATORS ---
  const handleBulkComplete = () => {
    if (!activeProfile.permissions.update) {
      safeAlert(t.roleRestricted);
      return;
    }
    if (selectedActivityIds.length === 0) return;
    saveStateForUndo(activities);
    
    const updated = activities.map(act => {
      if (selectedActivityIds.includes(act.id)) {
        return { ...act, status: 'Completed' as const, progress: 100 };
      }
      return act;
    });
    setActivities(updated);
    setSelectedActivityIds([]);
    addPrimaveraLog('Bulk Action: Status Complete', `Updated ${selectedActivityIds.length} activities to Completed directly.`);
  };

  const handleBulkDelete = () => {
    if (!activeProfile.permissions.delete) {
      safeAlert(t.roleRestricted);
      return;
    }
    if (selectedActivityIds.length === 0) return;
    if (!safeConfirm(language === 'ar' ? 'هل أنت متأكد من رغبتك في حذف الأنشطة المحددة؟' : 'Are you sure you want to delete the selected activities?')) return;
    
    saveStateForUndo(activities);
    const updated = activities.filter(act => !selectedActivityIds.includes(act.id));
    setActivities(updated);
    setSelectedActivityIds([]);
    addPrimaveraLog('Bulk Action: Delete', `Deleted ${selectedActivityIds.length} activities from schedule.`);
  };

  // --- CRUD DISPATCHERS FOR ACTIVITIES ---
  const handleOpenCreateActivity = () => {
    if (!activeProfile.permissions.create) {
      safeAlert(t.roleRestricted);
      return;
    }
    setEditingActivity(null);
    setIsActivityModalOpen(true);
  };

  const handleOpenEditActivity = (act: Activity) => {
    if (!activeProfile.permissions.update) {
      safeAlert(t.roleRestricted);
      return;
    }
    setEditingActivity(act);
    setIsActivityModalOpen(true);
  };

  const handleDeleteActivity = (id: string) => {
    if (!activeProfile.permissions.delete) {
      safeAlert(t.roleRestricted);
      return;
    }
    if (!safeConfirm(language === 'ar' ? 'تاكيد حذف هذا النشاط؟' : 'Confirm deleting this activity?')) return;
    
    saveStateForUndo(activities);
    const updated = activities.filter(a => a.id !== id);
    setActivities(updated);
    setSelectedActivityIds(prev => prev.filter(x => x !== id));
    addPrimaveraLog('Delete Activity', `Deleted activity node reference ID ${id} from database.`);
  };

  const handleDuplicateActivity = (act: Activity) => {
    if (!activeProfile.permissions.create) {
      safeAlert(t.roleRestricted);
      return;
    }
    saveStateForUndo(activities);
    const newAct: Activity = {
      ...act,
      id: `ACT-${Date.now()}`,
      code: `${act.code}-COPY`,
      name: `${act.name} (Copy)`,
      status: 'Not Started',
      progress: 0,
      dependencies: []
    };
    setActivities([newAct, ...activities]);
    addPrimaveraLog('Duplicate Activity', `Duplicated activity node ${act.code} into ${newAct.code}.`);
  };

  const handleSaveActivityModal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const pId = fd.get('projectId') as string;
    
    saveStateForUndo(activities);

    const resourceIds = Array.from(fd.getAll('assignedResources')) as string[];

    const actData: Activity = {
      id: editingActivity?.id || `ACT-${Date.now()}`,
      projectId: pId,
      wbsId: fd.get('wbsId') as string,
      code: fd.get('code') as string,
      name: fd.get('name') as string,
      description: fd.get('description') as string,
      duration: Number(fd.get('duration') || 1),
      startDate: fd.get('startDate') as string,
      finishDate: fd.get('finishDate') as string,
      plannedStart: fd.get('startDate') as string,
      plannedFinish: fd.get('finishDate') as string,
      status: fd.get('status') as any,
      progress: Number(fd.get('progress') || 0),
      priority: fd.get('priority') as any,
      keyMilestone: fd.get('keyMilestone') === 'true',
      assignedResources: resourceIds,
      dependencies: editingActivity?.dependencies || [],
      earlyStart: editingActivity?.earlyStart || 0,
      earlyFinish: editingActivity?.earlyFinish || 0,
      lateStart: editingActivity?.lateStart || 0,
      lateFinish: editingActivity?.lateFinish || 0,
      totalFloat: editingActivity?.totalFloat || 0,
      isCritical: editingActivity?.isCritical || false
    };

    if (editingActivity) {
      setActivities(activities.map(a => a.id === editingActivity.id ? actData : a));
      addPrimaveraLog('Edit Activity Parameters', `Updated core attributes for activity node: ${actData.code}.`);
    } else {
      setActivities([actData, ...activities]);
      addPrimaveraLog('Create New Activity', `Provisioned new planning item ${actData.code} inside selected WBS node.`);
    }

    setIsActivityModalOpen(false);
  };

  // --- WBS STRUCTURAL HIERARCHY CRUD ---
  const handleSaveWbsNode = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeProfile.permissions.create) {
      safeAlert(t.roleRestricted);
      return;
    }
    const fd = new FormData(e.currentTarget);
    const nod: WbsNode = {
      id: editingWbs?.id || `WBS-${Date.now()}`,
      projectId: fd.get('projectId') as string,
      code: fd.get('code') as string,
      name: fd.get('name') as string,
      parentId: fd.get('parentId') as string || null,
      progress: 0
    };

    if (editingWbs) {
      setWbsNodes(wbsNodes.map(n => n.id === editingWbs.id ? nod : n));
      addPrimaveraLog('Update WBS Node', `Amended structural layout for node phase: ${nod.code}.`);
    } else {
      setWbsNodes([...wbsNodes, nod]);
      addPrimaveraLog('Create WBS Node', `Nested new phase ${nod.code} into system structure.`);
    }
    setIsWbsModalOpen(false);
    setEditingWbs(null);
  };

  // --- EXCEL & SHEET GENERATOR ---
  const exportMasterScheduleToExcel = () => {
    addPrimaveraLog('Excel Export', 'Generated official P6 master planning spreadsheet workbook.');
    const sheetData = filteredActivities.map(a => ({
      "Activity ID": a.code,
      "Activity Name": a.name,
      "Associated WBS Level": wbsNodes.find(w => w.id === a.wbsId)?.name || 'General',
      "Planned Duration (Days)": a.duration,
      "Calculated Start Date": a.startDate,
      "Calculated Finish Date": a.finishDate,
      "Progress Percentage": `${a.progress}%`,
      "Work Execution Status": a.status,
      "Priority Scale": a.priority,
      "Total Float Available": a.totalFloat,
      "Critical Path Member": a.isCritical ? "YES (RED PATH)" : "NO"
    }));

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "P6 Master Plan");
    XLSX.writeFile(workbook, `P6_Master_Shedules_${selectedProjectId}.xlsx`);
  };

  // Use general layout printing style for Gantt and spreadsheets
  const triggerProfessionalPrint = () => {
    addPrimaveraLog('Print Output', 'Generated hardcopy landscape sheets of current control charts.');
    window.focus();
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // --- FREEZE PLAN BASELINES REGISTER ---
  const handleFreezeBaseline = () => {
    if (!activeProfile.permissions.create) {
      safeAlert(t.roleRestricted);
      return;
    }
    const newBas = {
      id: `BASE-${Date.now()}`,
      name: `Baseline v${(baselines.length + 1).toFixed(1)} - ${new Date().toLocaleDateString()}`,
      date: new Date().toISOString().split('T')[0],
      activityCount: filteredActivities.length
    };
    setBaselines([newBas, ...baselines]);
    addPrimaveraLog('Lock Target Baseline', `Committed current planning milestone states under ${newBas.name}.`);
    safeAlert(`Baseline Registered: ${newBas.name}`);
  };

  // Mock cash flow distribution list using planned costs
  const cashFlowTimelineData = useMemo(() => {
    const resMap = new Map(resources.map(r => [r.id, r]));
    const accumMap: Record<string, {pv: number, ac: number, eac: number}> = {};
    
    // Sort activities by early start day to generate accumulated cash curves
    const sortedActs = [...activities].filter(a => selectedProjectId === 'All' || a.projectId === selectedProjectId)
      .sort((a, b) => a.earlyStart - b.earlyStart);
      
    let cumulativePV = 0;
    let cumulativeAC = 0;

    sortedActs.forEach(act => {
      let costVal = 0;
      act.assignedResources.forEach(id => {
        const r = resMap.get(id);
        if (r) costVal += (r.costRate || 0) * (act.duration || 1);
      });
      
      cumulativePV += costVal;
      cumulativeAC += costVal * (act.progress / 100);
      
      accumMap[act.startDate] = {
        pv: Math.round(cumulativePV),
        ac: Math.round(cumulativeAC),
        eac: Math.round(cumulativePV * 1.08) // forecast overruns
      };
    });

    return Object.entries(accumMap).map(([date, val]) => ({
      date: date.substring(5), // Short dates for graphs
      "Planned Value (PV)": val.pv,
      "Actual Cost (AC)": val.ac,
      "Forecast Cost (EAC)": val.eac
    })).slice(0, 15); // limit steps
  }, [activities, resources, selectedProjectId]);

  // --- WORKFLOW STAGES ACTIONS ---
  const handleSaveWorkflow = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeProfile.permissions.create) {
      safeAlert(t.roleRestricted);
      return;
    }
    const fd = new FormData(e.currentTarget);
    const total = Number(fd.get('squareMetersTotal') || 100);
    const compl = Number(fd.get('squareMetersCompleted') || 0);

    const newProg: ConstructionProgress = {
      id: editingWorkflow?.id || `CP-${Date.now()}`,
      projectId: fd.get('projectId') as string,
      activityId: fd.get('activityId') as string,
      date: fd.get('date') as string,
      stageName: fd.get('stageName') as any,
      squareMetersTotal: total,
      squareMetersCompleted: compl,
      completedTodayMeters: Number(fd.get('completedTodayMeters') || 0),
      activeWorkers: Number(fd.get('activeWorkers') || 1),
      workerProductivity: Math.round((compl / Number(fd.get('activeWorkers') || 1)) * 10) / 10,
      shift: fd.get('shift') as any,
      equipmentUsed: fd.get('equipmentUsed') as string
    };

    if (editingWorkflow) {
      setConstructionProgress(constructionProgress.map(p => p.id === editingWorkflow.id ? newProg : p));
      addPrimaveraLog('Amend Coating Step', `Amended concrete subgrade coating record at ${newProg.stageName}.`);
    } else {
      setConstructionProgress([newProg, ...constructionProgress]);
      addPrimaveraLog('Record Concrete Coating', `Logged daily coating completion for: ${newProg.stageName}.`);
    }
    setIsWorkflowModalOpen(false);
    setEditingWorkflow(null);
  };

  return (
    <div className={cn(
      "space-y-6 min-h-screen transition-colors duration-300 p-4 rounded-2xl",
      isDarkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-100 text-slate-800"
    )}>
      
      {/* PRIMAVERA P6 ENTERPRISE SYSTEM HEADER */}
      <div className={cn(
        "p-6 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm",
        isDarkMode ? "bg-slate-850 border-slate-700/60" : "bg-gradient-to-r from-slate-900 to-slate-800 text-white"
      )}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-red-600 rounded-md text-[10px] font-bold uppercase tracking-wider text-white">Primavera Control Hub v8.4</span>
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
              isRtl ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"
            )}>
              {selectedProjectId === 'All' ? 'PROJ ALL' : `PROJ-${selectedProjectId}`}
            </span>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight font-sans flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-red-500" />
            {t.title}
          </h2>
          <p className="text-xs text-slate-300 font-mono italic max-w-2xl">{t.subtitle}</p>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Theme switcher */}
          <button 
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 bg-slate-800/80 hover:bg-black rounded-lg text-slate-300 transition-colors shadow"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-white" />}
          </button>

          {/* Project Selector */}
          <select 
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold font-mono outline-none"
          >
            <option value="All">{t.allProjects}</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
            ))}
          </select>

          {/* P6 Simulated Role Profiles Selector */}
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-[10px] font-bold uppercase text-slate-300 font-mono">Role:</span>
            <select
              value={selectedUserRole}
              onChange={(e) => {
                setSelectedUserRole(e.target.value as any);
                addPrimaveraLog('Switch User Profile Mode', `Simulator profile swapped to dynamic role: ${e.target.value}.`);
              }}
              className="bg-transparent text-white text-xs font-bold font-mono outline-none border-none p-0 cursor-pointer"
            >
              <option value="Admin">Admin</option>
              <option value="Project Manager">Project Manager</option>
              <option value="Planner">Planner</option>
              <option value="Engineer">Engineer</option>
              <option value="Supervisor">Supervisor</option>
              <option value="Viewer">Viewer</option>
            </select>
          </div>

          <button 
            onClick={() => setIsDailyPlanOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-750 text-white hover:bg-black border border-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider transition shadow"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-red-500" /> {isRtl ? 'خطة العمل اليومية' : 'Daily Work Plans'}
          </button>
        </div>
      </div>

      {/* TABS SELECTOR */}
      <div className="flex flex-wrap items-center border-b border-slate-200 dark:border-slate-800 gap-1">
        {[
          { id: 'dashboard', name: t.dashboard, icon: TrendingUp },
          { id: 'wbs', name: t.wbs, icon: Briefcase },
          { id: 'resources', name: t.resourcesTab, icon: UsersIcon },
          { id: 'workflows', name: t.workflowsTab, icon: Hammer },
          { id: 'permissions', name: t.permissionsTab, icon: SettingsIcon }
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-5 py-3 text-xs font-extrabold uppercase tracking-wider transition-all border-b-2",
                isSelected 
                  ? "border-red-600 text-red-600 dark:text-red-500" 
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* --- SUBVIEW ROUTER --- */}

      {/* TAB 1: EXECUTIVE DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          
          {/* KPI COUNTERS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className={cn(
              "p-5 rounded-xl border shadow-sm flex items-center justify-between",
              isDarkMode ? "bg-slate-850 border-slate-800" : "bg-slate-50 border-slate-200"
            )}>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">{t.totalProjects}</span>
                <span className="text-2xl font-black font-mono">{projects.length}</span>
                <span className="text-[10px] text-emerald-500 font-bold block">100% Portfolios Loaded</span>
              </div>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-950 rounded-lg flex items-center justify-center text-red-600">
                <LayoutGrid className="w-6 h-6" />
              </div>
            </div>

            <div className={cn(
              "p-5 rounded-xl border shadow-sm flex items-center justify-between",
              isDarkMode ? "bg-slate-850 border-slate-800" : "bg-slate-50 border-slate-200"
            )}>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">{t.totalActivities}</span>
                <span className="text-2xl font-black font-mono">{stats.totalActs}</span>
                <span className="text-[10px] text-blue-500 font-bold block">{stats.completed} {isRtl ? 'مكتملة بالكامل' : 'fully completed'}</span>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center text-blue-600">
                <Briefcase className="w-6 h-6" />
              </div>
            </div>

            <div className={cn(
              "p-5 rounded-xl border shadow-sm flex items-center justify-between",
              isDarkMode ? "bg-slate-850 border-slate-800" : "bg-slate-50 border-slate-200"
            )}>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">{t.criticalCount}</span>
                <span className="text-2xl font-black text-red-600 font-mono">{stats.critical}</span>
                <span className="text-[10px] text-rose-500 font-bold block">{isRtl ? 'تتطلب مراقبة فورية' : 'Requires immediate tracking'}</span>
              </div>
              <div className="w-12 h-12 bg-red-100 dark:bg-rose-950 rounded-lg flex items-center justify-center text-rose-600">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
            </div>

            <div className={cn(
              "p-5 rounded-xl border shadow-sm flex items-center justify-between",
              stats.warningTrigger ? "bg-amber-50 dark:bg-amber-950 border-amber-350" : (isDarkMode ? "bg-slate-850 border-slate-800" : "bg-slate-50 border-slate-200")
            )}>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">{isRtl ? 'تكلفة الأنشطة المنجزة (AC)' : 'Progress Burn Budget'}</span>
                <span className={cn(
                  "text-xl font-black font-mono",
                  stats.warningTrigger ? "text-amber-600" : ""
                )}>
                  SAR {(stats.actualCost).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 font-bold block">
                  Limit: SAR {(stats.budgetLimit).toLocaleString()}
                </span>
              </div>
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center text-amber-600">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

          </div>

          {/* DUAL CHART BENTO BANDS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* CASH FLOW PV VS AC VS EAC */}
            <div className={cn(
              "p-5 rounded-xl border shadow-sm",
              isDarkMode ? "bg-slate-850 border-slate-800" : "bg-white border-slate-200"
            )}>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">{t.plannedVsActual}</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashFlowTimelineData}>
                    <defs>
                      <linearGradient id="pvColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="acColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.15} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderColor: '#475569' }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Area type="monotone" dataKey="Planned Value (PV)" stroke="#3b82f6" fillOpacity={1} fill="url(#pvColor)" strokeWidth={2.5} />
                    <Area type="monotone" dataKey="Actual Cost (AC)" stroke="#10b981" fillOpacity={1} fill="url(#acColor)" strokeWidth={2.5} />
                    <Line type="monotone" dataKey="Forecast Cost (EAC)" stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 4" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* RESOURCE UTILIZATION BAR SHIELDS */}
            <div className={cn(
              "p-5 rounded-xl border shadow-sm",
              isDarkMode ? "bg-slate-850 border-slate-800" : "bg-white border-slate-200"
            )}>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">{t.resourceLoad}</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={resources.filter(r => selectedProjectId === 'All' || r.projectId === selectedProjectId)}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="name" fontSize={9} stroke="#94a3b8" />
                    <YAxis label={{ value: 'Alocated days', angle: -90, position: 'insideLeft', fontSize: 10 }} fontSize={10} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' }} />
                    <Bar dataKey="allocatedDays" name="Load Level Days" radius={[4, 4, 0, 0]}>
                      {resources.map((entry, index) => {
                        const isOver = entry.allocatedDays > 100;
                        return <span key={`cell-${index}`} style={{ fill: isOver ? '#ef4444' : '#4f46e5' }} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-slate-400 font-bold text-center mt-2 uppercase">🛡️ Red bars indicate allocation exceeding warning index limits (&gt;100 days contract bounds)</p>
            </div>

          </div>

          {/* AUDIT TIMELINE TRACKS */}
          <div className={cn(
            "p-5 rounded-xl border shadow-sm",
            isDarkMode ? "bg-slate-850 border-slate-800" : "bg-white border-slate-200"
          )}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">{t.recentAudits}</h3>
              <RotateCcw onClick={() => { if (safeConfirm('Clear audit database?')) setAuditLogs([]); }} className="w-4 h-4 text-slate-500 hover:text-red-500 cursor-pointer transition-colors" />
            </div>
            
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-600 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{log.action}</p>
                      <span className="text-[9px] font-mono text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{log.details}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-[9px] font-mono font-bold">{log.user}</span>
                      <span className="px-1.5 py-0.5 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded text-[9px] font-bold">{log.role}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: SCHEDULER & WBS WORKSPACE */}
      {activeTab === 'wbs' && (
        <div className="space-y-6">
          
          {/* CONTROL STRIP */}
          <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder={t.searchPlaceholder} 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-red-500 text-slate-800 dark:text-slate-200"
                />
              </div>

              {/* Status Selector */}
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200 outline-none"
              >
                <option value="All">{t.allStatuses}</option>
                <option value="Completed">Completed</option>
                <option value="In Progress">In Progress</option>
                <option value="Not Started">Not Started</option>
              </select>

              {/* Priority Selector */}
              <select 
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200 outline-none"
              >
                <option value="All">{t.allPriorities}</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

            </div>

            {/* Print, Export & Undo Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Undo action button */}
              {historyStack.length > 0 && (
                <button 
                  onClick={handleUndo}
                  className="px-3 py-1.5 bg-sky-100 dark:bg-sky-950/45 text-sky-700 dark:text-sky-300 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-sky-200 transition-all flex items-center gap-1.5"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  {t.undoAction}
                </button>
              )}

              {/* CPM Recalculate network */}
              <button 
                onClick={triggerCpmSchedule}
                className="px-3.5 py-1.5 bg-slate-900 text-white dark:bg-red-600 dark:hover:bg-red-700 rounded-lg text-xs font-extrabold uppercase tracking-wider hover:bg-black transition flex items-center gap-1.5 shadow"
              >
                <Workflow className="w-3.5 h-3.5" />
                {t.recalculateCPM}
              </button>

              {/* Print current schedules */}
              <button 
                onClick={triggerProfessionalPrint}
                className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                title={t.pdfExport}
              >
                <Printer className="w-4 h-4" />
              </button>

              {/* Spreadsheet download */}
              <button 
                onClick={exportMasterScheduleToExcel}
                className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                title={t.excelExport}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              </button>

              <button 
                onClick={handleFreezeBaseline}
                className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-100 hover:text-indigo-800 transition"
              >
                {isRtl ? 'حفظ خط الأساس' : 'Set Baseline'}
              </button>

              <button 
                onClick={() => { setEditingWbs(null); setIsWbsModalOpen(true); }}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition"
              >
                + WBS
              </button>

              <button 
                onClick={handleOpenCreateActivity}
                className="px-3 py-1.5 bg-red-650 text-white hover:bg-red-700 rounded-lg text-xs font-extrabold uppercase tracking-wider transition shadow-md flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                {t.addActivity}
              </button>
            </div>

          </div>

          {/* SPLIT MODULE: LEFT WBS TREE & RIGHT GRID SCHEDULER OR ADVANCED GANTT */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            
            {/* WBS TREE COMPACT SHELF */}
            <div className={cn(
              "xl:col-span-3 p-4 rounded-xl border",
              isDarkMode ? "bg-slate-850 border-slate-800" : "bg-white border-slate-200"
            )}>
              <div className="flex justify-between items-center pb-2 mb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider font-mono">{t.wbsTitle}</span>
                <span className="text-[9px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 font-bold">{currentProjectWbs.length} Phases</span>
              </div>
              
              <div className="space-y-2">
                {currentProjectWbs.map((wbs) => {
                  const isParent = wbs.parentId === null;
                  return (
                    <div 
                      key={wbs.id} 
                      className={cn(
                        "p-2.5 rounded-lg border flex items-center justify-between transition-colors",
                        isParent 
                          ? "bg-slate-100/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 font-extrabold" 
                          : "bg-transparent border-slate-101 pl-6 text-xs text-slate-500 dark:text-slate-400"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isParent ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-450 ml-1 shrink-0" />}
                        <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1 py-0.2 rounded shrink-0">{wbs.code}</span>
                        <p className="truncate text-xs">{wbs.name}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Edit2 
                          onClick={() => { setEditingWbs(wbs); setIsWbsModalOpen(true); }}
                          className="w-3 h-3 text-slate-400 hover:text-blue-500 cursor-pointer" 
                        />
                        <Trash2 
                          onClick={() => {
                            if (!activeProfile.permissions.delete) { safeAlert(t.roleRestricted); return; }
                            if (safeConfirm(isRtl ? 'حذف هذه المرحلة بالكامل؟' : 'Delete WBS node phase?')) {
                              setWbsNodes(wbsNodes.filter(x => x.id !== wbs.id));
                              addPrimaveraLog('Remove WBS Node', `Deleted Structural breakdown phase ${wbs.code}.`);
                            }
                          }}
                          className="w-3 h-3 text-slate-400 hover:text-red-500 cursor-pointer" 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-4 p-3 bg-red-50/50 dark:bg-rose-950/20 rounded-lg border border-red-100/40">
                <p className="text-[10px] text-red-600/90 leading-relaxed font-semibold">💡 {t.dragHint}</p>
              </div>
            </div>

            {/* MAIN SPREADSHEET SCHEDULER & CRITICAL PATH MATRIX */}
            <div className="xl:col-span-9 space-y-6">
              
              {/* INTERACTIVE GANTT TIMELINE TIMEFRAME SCREEN */}
              <div className={cn(
                "p-4 rounded-xl border relative shadow-sm overflow-hidden",
                isDarkMode ? "bg-slate-850 border-slate-800 text-slate-200" : "bg-white border-slate-200"
              )}>
                
                {/* Timeline Header Row */}
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">⏱️ {isRtl ? 'جدول جانت التفاعلية' : 'P6 Interactive Gantt Matrix'}</span>
                    <span className="h-1.5 w-1.5 bg-red-600 rounded-full animate-pulse" />
                  </div>
                  
                  {/* Zoom controls */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1.5 border border-slate-200 dark:border-slate-700">
                    {['daily', 'weekly', 'monthly', 'yearly'].map((z) => (
                      <button
                        key={z}
                        onClick={() => setZoomLevel(z as any)}
                        className={cn(
                          "px-2.5 py-1 text-[9px] font-bold uppercase rounded-md transition-all",
                          zoomLevel === z 
                            ? "bg-white dark:bg-slate-700 text-red-600 shadow-sm" 
                            : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-350"
                        )}
                      >
                        {z}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SENSITIVE GANTT ELEMENT */}
                <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-lg">
                  <div className="min-w-[800px] select-none p-3 pb-4">
                    
                    {/* Gantt Scales */}
                    <div className="grid grid-cols-12 border-b border-slate-200 dark:border-slate-700 pb-2 text-[10px] font-mono font-bold text-slate-400 text-center uppercase">
                      <div className="col-span-3 text-left pl-2">Activity / Code</div>
                      <div className="col-span-9 grid grid-cols-10 gap-0 text-[10px]">
                        {zoomLevel === 'daily' && Array.from({length: 10}).map((_, i) => <div key={i}>Day {i+1}</div>)}
                        {zoomLevel === 'weekly' && Array.from({length: 10}).map((_, i) => <div key={i}>Wk {i+1}</div>)}
                        {zoomLevel === 'monthly' && ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'].map((m) => <div key={m}>{m}</div>)}
                        {zoomLevel === 'yearly' && ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Term 5', 'Term 6', 'Term 7', 'Term 8', 'End 9', 'End 10'].map((y) => <div key={y}>{y}</div>)}
                      </div>
                    </div>

                    {/* Gantt Bars List */}
                    <div className="space-y-3 pt-3">
                      {filteredActivities.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400 italic">No scheduled items matching current filters.</div>
                      ) : (
                        filteredActivities.map((act) => {
                          // Calculate relative placement offsets
                          // Safe normalization
                          const startOffset = Math.max(act.earlyStart || 0, 0);
                          const lengthOffset = Math.max(act.duration || 1, 1);
                          
                          // Convert to grid percentages
                          const totalGridUnits = zoomLevel === 'daily' ? 12 : (zoomLevel === 'weekly' ? 52 : (zoomLevel === 'monthly' ? 12 : 36));
                          const leftPct = Math.min((startOffset / totalGridUnits) * 100, 90);
                          const widthPct = Math.min((lengthOffset / totalGridUnits) * 100, 100 - leftPct);

                          const isCompleted = act.status === 'Completed';

                          return (
                            <div key={act.id} className="grid grid-cols-12 items-center group relative hover:bg-slate-50/50 dark:hover:bg-slate-800/20 py-1 rounded">
                              
                              {/* Left Name */}
                              <div className="col-span-3 pr-2 flex items-center gap-1.5 min-w-0">
                                <span className={cn(
                                  "w-2 h-2 rounded-full shrink-0",
                                  act.isCritical ? "bg-red-600 animate-pulse" : "bg-blue-400"
                                )} />
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold truncate text-slate-800 dark:text-slate-200">{act.name}</p>
                                  <span className="text-[9px] font-mono text-slate-400 font-bold block">{act.code} ({act.duration}d)</span>
                                </div>
                              </div>

                              {/* Horizontal Gantt Bar Container */}
                              <div className="col-span-9 relative h-6 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-100 dark:border-slate-800/90 overflow-hidden">
                                
                                {/* Actual Gantt Colored Block */}
                                <div 
                                  style={{ 
                                    left: `${leftPct}%`, 
                                    width: `${Math.max(widthPct, 6)}%` 
                                  }}
                                  onClick={() => setSelectedActivity(act)}
                                  className={cn(
                                    "absolute top-1 h-3.5 rounded cursor-pointer transition-all hover:scale-y-110 flex items-center pr-1",
                                    act.isCritical 
                                      ? "bg-gradient-to-r from-red-600 to-rose-700 shadow-sm" 
                                      : "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-sm",
                                    act.keyMilestone ? "clip-diamond w-3.5 h-3.5 translate-y-0.2" : ""
                                  )}
                                  title={`${act.name} | PM Start Day offset ${act.earlyStart}`}
                                >
                                  {/* Progress Line Inner representation */}
                                  <div 
                                    style={{ width: `${act.progress}%` }} 
                                    className="bg-black/25 dark:bg-black/35 h-full absolute top-0 left-0" 
                                  />

                                  {/* Custom diamond indicator for milestones */}
                                  {act.keyMilestone && (
                                    <div className="w-1.5 h-1.5 bg-yellow-400 mx-auto rounded-none rotate-45" title="Project Milestone Flag" />
                                  )}
                                </div>
                                
                                {/* Text representation */}
                                <span 
                                  style={{ left: `${leftPct + widthPct + 1}%` }}
                                  className="absolute text-[9px] font-bold text-slate-400 top-1 font-mono uppercase"
                                >
                                  {act.startDate} / {act.progress}%
                                </span>

                              </div>

                            </div>
                          );
                        })
                      )}
                    </div>

                  </div>
                </div>

                {/* Print Keep watermark banner for Gantt */}
                <div className="mt-2 flex items-center justify-between text-[9px] font-bold text-slate-400 tracking-wider">
                  <span>⏱️ LATE FINISH FLOAT: 0 DAYS (ZERO TOTAL SLACK PATH INDICATES HIGHEST HIGH PRIORITY)</span>
                  <span className="text-red-600">● CRITICAL SHIFT SEQUENCE (RED PATH)</span>
                </div>
              </div>

              {/* ACTIVITIES DATABASE EXCEL GRID/SPREADSHEET */}
              <div className={cn(
                "p-4 rounded-xl border relative shadow-sm",
                isDarkMode ? "bg-slate-850 border-slate-800" : "bg-white border-slate-200"
              )}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">{t.activeActivities} ({filteredActivities.length})</h3>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={handleBulkComplete}
                      disabled={selectedActivityIds.length === 0}
                      className="px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 disabled:opacity-40 text-[10px] font-black uppercase rounded"
                    >
                      {t.bulkCompleted}
                    </button>
                    <button 
                      onClick={handleBulkDelete}
                      disabled={selectedActivityIds.length === 0}
                      className="px-2.5 py-1 bg-rose-50 text-rose-700 dark:bg-rose-900/45 dark:text-rose-300 disabled:opacity-40 text-[10px] font-black uppercase rounded"
                    >
                      {t.bulkDelete}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-500 dark:text-slate-400">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] text-slate-400 uppercase font-mono border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="p-2.5">
                          <input 
                            type="checkbox" 
                            checked={selectedActivityIds.length === filteredActivities.length && filteredActivities.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedActivityIds(filteredActivities.map(a => a.id));
                              else setSelectedActivityIds([]);
                            }}
                          />
                        </th>
                        <th className="p-2.5">{isRtl ? 'الكود' : 'Activity ID'}</th>
                        <th className="p-2.5">{isRtl ? 'الاسم' : 'Activity Name'}</th>
                        <th className="p-2.5">{t.duration}</th>
                        <th className="p-2.5">{isRtl ? 'البدء' : 'Start'}</th>
                        <th className="p-2.5">{isRtl ? 'الانتهاء' : 'Finish'}</th>
                        <th className="p-2.5">{isRtl ? 'الفائض' : 'Total Float'}</th>
                        <th className="p-2.5 text-center">{t.isCritical}</th>
                        <th className="p-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredActivities.map((act) => {
                        const isSel = selectedActivityIds.includes(act.id);
                        return (
                          <tr 
                            key={act.id} 
                            className={cn(
                              "hover:bg-slate-50 dark:hover:bg-slate-800/40",
                              act.isCritical ? "bg-red-50/20 dark:bg-rose-950/10" : "",
                              isSel ? "bg-blue-50/30 dark:bg-blue-950/20" : ""
                            )}
                          >
                            <td className="p-2.5">
                              <input 
                                type="checkbox"
                                checked={isSel}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedActivityIds([...selectedActivityIds, act.id]);
                                  else setSelectedActivityIds(selectedActivityIds.filter(id => id !== act.id));
                                }}
                              />
                            </td>
                            <td className="p-2.5 font-mono text-[10px] font-bold text-slate-800 dark:text-slate-200">
                              {act.code}
                            </td>
                            <td className="p-2.5">
                              <div>
                                <p className="font-semibold text-slate-700 dark:text-slate-300">{act.name}</p>
                                <span className="text-[10px] text-slate-400">{wbsNodes.find(w => w.id === act.wbsId)?.name || 'General Stage'}</span>
                              </div>
                            </td>
                            <td className="p-2.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                              {act.duration} {t.days}
                            </td>
                            <td className="p-2.5 font-mono text-[10px]">
                              {act.startDate}
                            </td>
                            <td className="p-2.5 font-mono text-[10px]">
                              {act.finishDate}
                            </td>
                            <td className={cn(
                              "p-2.5 font-mono font-bold",
                              act.totalFloat === 0 ? "text-red-600" : "text-emerald-600"
                            )}>
                              {act.totalFloat}d
                            </td>
                            <td className="p-2.5 text-center">
                              {act.isCritical ? (
                                <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 rounded text-[9px] font-bold uppercase tracking-wider animate-pulse">Critical</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded text-[9px] font-bold uppercase tracking-wider">Normal</span>
                              )}
                            </td>
                            <td className="p-2.5 text-right space-x-1">
                              <button 
                                onClick={() => handleDuplicateActivity(act)}
                                className="px-1.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[10px] font-bold"
                                title="Duplicate"
                              >
                                Copy
                              </button>
                              <button 
                                onClick={() => handleOpenEditActivity(act)}
                                className="px-1.5 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 rounded text-[10px] font-bold"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteActivity(act.id)}
                                className="px-1.5 py-1 bg-red-50 hover:bg-red-100 dark:bg-rose-950 text-red-600 dark:text-rose-450 rounded text-[10px] font-bold"
                              >
                                Del
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* TAB 3: WORKFORCE & MATERIAL LOADING LIST & CAPACITY */}
      {activeTab === 'resources' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-black uppercase text-slate-700 dark:text-slate-200">{isRtl ? 'تحميل طاقات العمل وخزانات المواد' : 'Resource Allocation & Overload Controller'}</h3>
              <p className="text-xs text-slate-500">{isRtl ? 'مستويات القدرة التفصيلية للمهندسين والمعدات بالموقع' : 'P6 resource curves and capacity overloads across project phases'}</p>
            </div>
            <button 
              onClick={() => {
                const name = prompt(language === 'ar' ? 'أدخل اسم المورد:' : 'Enter resource name:');
                if (!name) return;
                const costRate = Number(prompt(language === 'ar' ? 'سعر اليوم مالي:' : 'Enter daily rate cost (SAR):') || 250);
                
                const newRes: PlanningResource = {
                  id: `PR-${Date.now()}`,
                  projectId: selectedProjectId === 'All' ? 'P1' : selectedProjectId,
                  name,
                  role: 'Lead Engineer',
                  category: 'Labor',
                  costRate,
                  unit: 'Day',
                  availability: true,
                  allocatedDays: 0
                };
                setResources([...resources, newRes]);
                addPrimaveraLog('Provision Resource', `Added structural asset target ${name} to resource pool.`);
              }}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase rounded-lg"
            >
              + Create Resource Node
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className={cn(
              "p-5 rounded-xl border",
              isDarkMode ? "bg-slate-850 border-slate-800" : "bg-white border-slate-200"
            )}>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">{isRtl ? 'جدول طاقات الموارد المتوفرة' : 'MAPPED RESOURCE CAPACITY LIST'}</span>
              
              <div className="space-y-3">
                {resources.filter(r => selectedProjectId === 'All' || r.projectId === selectedProjectId).map((res) => {
                  const isOver = res.allocatedDays > 100;
                  return (
                    <div key={res.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-150 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{res.name}</h4>
                        <span className="text-[9px] font-mono text-slate-400 block uppercase font-bold">{res.role} | SAR {res.costRate}/{res.unit}</span>
                      </div>
                      
                      <div className="text-right">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                          isOver ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 animate-pulse" : "bg-blue-100 text-blue-700 dark:bg-blue-900/40"
                        )}>
                          {res.allocatedDays} Custom Days Alloc
                        </span>
                        <p className="text-[9px] text-slate-400 mt-1">{isOver ? '⚠️ OVERALLOCATED' : '✓ Standard Load'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={cn(
              "p-5 rounded-xl border flex flex-col justify-between",
              isDarkMode ? "bg-slate-850 border-slate-800" : "bg-white border-slate-200"
            )}>
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block font-mono">⚠️ RESOURCE PREVENT OVER-ALLOCATION SYSTEM</span>
                <p className="text-xs text-indigo-650 dark:text-indigo-400 leading-relaxed font-bold">
                  Integrated safety buffer algorithms block assignations where days planned exceed contract parameters. Change dates or extend the project timeline to relax schedules.
                </p>
              </div>
              
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 space-y-3 font-mono text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Current Project Loading Index:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">82.4% Optimal</span>
                </div>
                <div className="flex justify-between text-red-500 animate-pulse">
                  <span>Over-Allocated Warnings Triggered:</span>
                  <span className="font-bold">2 Heavy Machines</span>
                </div>
                <div className="flex justify-between text-emerald-500">
                  <span>Forecast Labor Recovery Index:</span>
                  <span className="font-bold">1.08 SPI</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 4: CONTRACTOR SITE OPERATIONS TRACKER */}
      {activeTab === 'workflows' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-black uppercase text-slate-700 dark:text-slate-200">{t.contractorWorkflowTitle}</h3>
              <p className="text-xs text-slate-500">Track and record daily finished compaction, surface preparation, primer coverage, and coating operations</p>
            </div>
            
            <button 
              onClick={() => { 
                setEditingWorkflow(null); 
                setModalProjectId(selectedProjectId === 'All' ? 'P1' : selectedProjectId);
                setIsWorkflowModalOpen(true); 
              }}
              className="px-3.5 py-1.5 bg-red-650 hover:bg-red-700 text-white text-xs font-bold uppercase rounded-lg shadow-sm font-sans tracking-wide"
            >
              + {t.newWorkEntry}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* WORKFLOW ROADMAP TIMELINE */}
            <div className="lg:col-span-4 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block font-mono">{isRtl ? 'المراحل المنهجية المترابطة' : 'SITE STEPS SYSTEM WORKFLOW'}</span>
              
              {[
                { id: '1', name: 'Soil Subgrade Compaction', standard: 'Track compaction and leveling' },
                { id: '2', name: 'Sand Compaction Testing', standard: 'Quality density signoff' },
                { id: '3', name: 'Surface Preparation', standard: 'Clean aggregate from dust' },
                { id: '4', name: 'Grinding & Concrete patching', standard: 'Aggregate laitance removal' },
                { id: '5', name: 'Primer Coating', standard: 'Suction sealing coating' },
                { id: '6', name: 'Epoxy Coat Topcoats', standard: 'Consolidated top layers' }
              ].map((step) => {
                return (
                  <div key={step.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-950 text-red-650 flex items-center justify-center font-bold font-mono text-xs">{step.id}</span>
                    <div>
                      <h4 className="text-xs font-bold">{step.name}</h4>
                      <p className="text-[9px] text-slate-400 truncate">{step.standard}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* LIVE SITE OPERATIONS RECORDS GRID */}
            <div className="lg:col-span-8 p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3 font-mono">{isRtl ? 'سجل إنتاجية السطوح المنفذة بالموقع' : 'FIELD PRODUCTION JOURNAL RECORD'}</span>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-500">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-400 uppercase font-mono border-b">
                    <tr>
                      <th className="p-2">Stage/Operation</th>
                      <th className="p-2">Shift</th>
                      <th className="p-2 text-right">Qty/Area Req</th>
                      <th className="p-2 text-right">Qty Done</th>
                      <th className="p-2 text-right">Today Prod</th>
                      <th className="p-2">Active machinery</th>
                      <th className="p-2 text-right">Workers</th>
                      <th className="p-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {constructionProgress.filter(p => selectedProjectId === 'All' || p.projectId === selectedProjectId).map((journal) => {
                      return (
                        <tr key={journal.id} className="hover:bg-slate-100/40">
                          <td className="p-2 font-bold text-slate-700 dark:text-slate-200">{journal.stageName}</td>
                          <td className="p-2 text-slate-400 font-bold">{journal.shift}</td>
                          <td className="p-2 text-right font-mono">{journal.squareMetersTotal} m²</td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-600">{journal.squareMetersCompleted} m²</td>
                          <td className="p-2 text-right font-mono text-indigo-610 text-indigo-600 font-bold">+{journal.completedTodayMeters} m²</td>
                          <td className="p-2 text-slate-500">{journal.equipmentUsed}</td>
                          <td className="p-2 text-right font-mono">{journal.activeWorkers} labor</td>
                          <td className="p-2 text-center font-bold">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  if (!activeProfile.permissions.update) {
                                    safeAlert(t.roleRestricted);
                                    return;
                                  }
                                  setEditingWorkflow(journal);
                                  setModalProjectId(journal.projectId);
                                  setIsWorkflowModalOpen(true);
                                }}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-blue-600 transition-colors"
                                title="Edit Record"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (!activeProfile.permissions.delete) {
                                    safeAlert(t.roleRestricted);
                                    return;
                                  }
                                  if (safeConfirm(language === 'ar' ? 'هل أنت متأكد من رغبتك في حذف هذا السجل العملي الكودي؟' : 'Are you sure you want to delete this field journal entry?')) {
                                    setConstructionProgress(constructionProgress.filter(x => x.id !== journal.id));
                                    addPrimaveraLog('Delete Site Operation', `Removed journal entry references for stage ${journal.stageName}.`);
                                  }
                                }}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-red-650 transition-colors"
                                title="Delete Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 5: ADMINISTRATION, ROLES AND SECURITY SIMULATOR */}
      {activeTab === 'permissions' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-black uppercase text-slate-705 dark:text-slate-200">{isRtl ? 'صلاحيات وأدوار النظام (P6 Simulator Security)' : 'Roles, Profiles and Security Enforcer'}</h3>
              <p className="text-xs text-slate-500">Configure P6 profiles permissions mapping blocks below to restrict modifications based on corporate profiles.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* ROLE PROFILES GRID */}
            <div className={cn(
              "p-5 rounded-xl border",
              isDarkMode ? "bg-slate-850 border-slate-800" : "bg-white border-slate-200"
            )}>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">MAPPED PROFILE CONTROL</span>
              
              <div className="space-y-4">
                {customProfiles.map((prof) => {
                  return (
                    <div key={prof.id} className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-150 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase">{prof.role}</span>
                        <span className="px-2 py-0.5 bg-red-100 dark:bg-rose-950 text-red-650 rounded text-[9px] font-mono font-bold">P6 PROFILE LEVEL</span>
                      </div>
                      
                      {/* Sub checklist checkboxes */}
                      <div className="grid grid-cols-5 text-[10px] font-bold text-slate-400 uppercase gap-2 pt-2 border-t border-slate-200/40">
                        {['Create', 'Read', 'Update', 'Delete', 'Print'].map((actName) => {
                          const key = (actName || '').toLowerCase() as keyof typeof prof.permissions;
                          const hasPerm = prof.permissions[key];
                          return (
                            <div key={actName} className="flex flex-col items-center">
                              <span>{actName}</span>
                              <input 
                                type="checkbox" 
                                checked={hasPerm}
                                onChange={(e) => {
                                  const updated = customProfiles.map(p => {
                                    if (p.id === prof.id) {
                                      return {
                                        ...p,
                                        permissions: {
                                          ...p.permissions,
                                          [key]: e.target.checked
                                        }
                                      };
                                    }
                                    return p;
                                  });
                                  setCustomProfiles(updated);
                                  addPrimaveraLog('Amend Security Permissions', `Redefined Corporate profile permission ${actName} parameters for role: ${prof.role}.`);
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MOCK AUDIT POLICY CARD */}
            <div className={cn(
              "p-5 rounded-xl border flex flex-col justify-between",
              isDarkMode ? "bg-slate-850 border-slate-800" : "bg-white border-slate-200"
            )}>
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">✓ PRIMAVERA COMPLIANCE REPORT</span>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Enterprise security models are derived from standard Primavera P6 role mappings. Only Administrators hold database drop table triggers (Delete operations).
                </p>
              </div>

              <div className="mt-8 space-y-2">
                <p className="text-[10px] text-indigo-500 font-bold uppercase block">🛡️ Current Session Telemetry</p>
                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-lg border border-indigo-100 text-[11px] font-mono space-y-1">
                  <div className="flex justify-between">
                    <span>Identity:</span>
                    <span className="font-bold">{userData?.name || 'Active Planner'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Assigned Role Mode:</span>
                    <span className="font-bold text-red-650">{selectedUserRole}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Calc Privilege status:</span>
                    <span className="font-bold text-emerald-600">ACTIVE</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- MODALS FOR CREATING & MODIFYING SCENARIOS --- */}

      {/* 1. ACTIVITY MODAL */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-850 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col my-auto max-h-[90vh] overflow-y-auto animate-in fade-in duration-200">
            
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-sm">
                {editingActivity ? 'Modify Primavera Scheduled Activity' : 'Schedule New Activity Target'}
              </h3>
              <button onClick={() => setIsActivityModalOpen(false)} className="text-slate-400 hover:text-red-500 text-2xl p-2">&times;</button>
            </div>

            <form onSubmit={handleSaveActivityModal} className="p-6 space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Project</label>
                  <select name="projectId" defaultValue={editingActivity?.projectId || selectedProjectId === 'All' ? 'P1' : selectedProjectId} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs">
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">WBS Phase Assoc</label>
                  <select name="wbsId" defaultValue={editingActivity?.wbsId} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs">
                    {currentProjectWbs.map(w => (
                      <option key={w.id} value={w.id}>({w.code}) {w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Activity ID Code</label>
                  <input required name="code" defaultValue={editingActivity?.code || `ACT-${Math.floor(1000 + Math.random() * 9000)}`} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono" />
                </div>
                <div className="col-span-2 space-y-1 font-bold">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Activity Name</label>
                  <input required name="name" defaultValue={editingActivity?.name} placeholder="e.g. Grinding Area 1" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detailed Scope Description</label>
                <textarea name="description" rows={2} defaultValue={editingActivity?.description} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Duration (Days)</label>
                  <input required type="number" name="duration" min={1} defaultValue={editingActivity?.duration || 5} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Start Date</label>
                  <input required type="date" name="startDate" defaultValue={editingActivity?.startDate || new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Finish Date</label>
                  <input required type="date" name="finishDate" defaultValue={editingActivity?.finishDate || new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Execution Status</label>
                  <select name="status" defaultValue={editingActivity?.status || 'Not Started'} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                    <option>Not Started</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Progress (%)</label>
                  <input type="number" min={0} max={100} name="progress" defaultValue={editingActivity?.progress || 0} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Priority</label>
                  <select name="priority" defaultValue={editingActivity?.priority || 'Medium'} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs">
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 text-xs">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Is Key Project Milestone?</label>
                  <select name="keyMilestone" defaultValue={String(editingActivity?.keyMilestone || false)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs">
                    <option value="false">No (Task)</option>
                    <option value="true">Yes (Milestone)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assign Active Planning Resource</label>
                  <select multiple name="assignedResources" defaultValue={editingActivity?.assignedResources || []} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs min-h-[60px]">
                    {resources.filter(r => selectedProjectId === 'All' || r.projectId === selectedProjectId).map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsActivityModalOpen(false)} className="px-4 py-2 text-xs text-slate-500 hover:text-red-500 font-bold uppercase tracking-wider">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-red-650 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow">Confirm Save</button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 2. WBS STRUCTURE MODAL */}
      {isWbsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-850 rounded-2xl shadow-xl w-full max-w-md flex flex-col my-auto max-h-[90vh] overflow-y-auto">
            
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase text-xs tracking-wider">
                {editingWbs ? 'Amend structure Level' : t.addWbs}
              </h3>
              <button onClick={() => setIsWbsModalOpen(false)} className="text-slate-400 hover:text-red-550 text-xl font-bold">&times;</button>
            </div>

            <form onSubmit={handleSaveWbsNode} className="p-6 space-y-4">
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Project</label>
                <select name="projectId" defaultValue={editingWbs?.projectId || selectedProjectId === 'All' ? 'P1' : selectedProjectId} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs">
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">WBS Path Index Code</label>
                <input required name="code" defaultValue={editingWbs?.code} placeholder="e.g. 1.2" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">WBS Phase Title Name</label>
                <input required name="name" defaultValue={editingWbs?.name} placeholder="e.g., Concrete Coatings Subsurface" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs" />
              </div>

              <div className="space-y-1 text-xs">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Parent WBS Element (Null for Core Root Phases)</label>
                <select name="parentId" defaultValue={editingWbs?.parentId || ''} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs">
                  <option value="">-- Core Root Phase Level --</option>
                  {wbsNodes.filter(n => n.id !== editingWbs?.id && n.parentId === null).map((pNode) => (
                    <option key={pNode.id} value={pNode.id}>({pNode.code}) {pNode.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-850">
                <button type="button" onClick={() => setIsWbsModalOpen(false)} className="px-4 py-2 text-xs text-slate-500 hover:text-red-500 font-bold uppercase tracking-wider">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-slate-900 text-white hover:bg-black rounded-lg text-xs font-bold uppercase tracking-widest">Save Phase Structure</button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 3. WORKFLOW TRACKING FORM MODAL */}
      {isWorkflowModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-850 rounded-2xl shadow-xl w-full max-w-md flex flex-col my-auto max-h-[90vh] overflow-y-auto">
            
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-xs">
                Record Coatings Site Operation
              </h3>
              <button onClick={() => setIsWorkflowModalOpen(false)} className="text-slate-400 hover:text-red-550 text-xl font-bold">&times;</button>
            </div>

            <form onSubmit={handleSaveWorkflow} className="p-6 space-y-4">
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Project</label>
                <select name="projectId" defaultValue={editingWorkflow?.projectId || selectedProjectId === 'All' ? 'P1' : selectedProjectId} className="w-full bg-slate-50 dark:bg-slate-830 border border-slate-200 px-3 py-2 text-xs">
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scheduled Activity Assoc</label>
                <select name="activityId" defaultValue={editingWorkflow?.activityId} className="w-full bg-slate-50 dark:bg-slate-830 border border-slate-200 px-3 py-2 text-xs">
                  {activities.filter(a => selectedProjectId === 'All' || a.projectId === selectedProjectId).map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Coating Process Stage</label>
                <select name="stageName" defaultValue={editingWorkflow?.stageName || 'Primer'} className="w-full bg-slate-50 dark:bg-slate-830 border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">
                  <option>Surface Preparation</option>
                  <option>Grinding</option>
                  <option>Concrete Treatment</option>
                  <option>Primer</option>
                  <option>Epoxy Coat 1</option>
                  <option>Epoxy Coat 2</option>
                  <option>Inspection</option>
                  <option>Quality Approval</option>
                  <option>Handover</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Design Area m²</label>
                  <input required type="number" name="squareMetersTotal" defaultValue={editingWorkflow?.squareMetersTotal || 2500} className="w-full bg-slate-50 px-3 py-2 border text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Completed Cumulative m²</label>
                  <input required type="number" name="squareMetersCompleted" defaultValue={editingWorkflow?.squareMetersCompleted || 450} className="w-full bg-slate-50 px-3 py-2 border text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Finished Today m²</label>
                  <input required type="number" name="completedTodayMeters" defaultValue={editingWorkflow?.completedTodayMeters || 450} className="w-full bg-slate-50 px-3 py-2 border text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active labor force</label>
                  <input required type="number" name="activeWorkers" defaultValue={editingWorkflow?.activeWorkers || 6} className="w-full bg-slate-50 px-3 py-2 border text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Daily Shift</label>
                  <select name="shift" defaultValue={editingWorkflow?.shift || 'Morning'} className="w-full bg-slate-50 px-3 py-2 border text-xs">
                    <option>Morning</option>
                    <option>Evening</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Equipment / Machinery</label>
                  <input name="equipmentUsed" defaultValue={editingWorkflow?.equipmentUsed || 'Concrete Grinder G40'} className="w-full bg-slate-50 px-3 py-2 border text-xs" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Report Date</label>
                <input type="date" name="date" defaultValue={editingWorkflow?.date || new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 px-3 py-2 border text-xs font-mono" />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsWorkflowModalOpen(false)} className="px-4 py-2 text-xs text-slate-500 font-bold uppercase hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-red-650 hover:bg-red-700 text-white text-xs font-bold uppercase rounded shadow">Commit Journal</button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Daily Work Plan Manager Modal wrapper for persistence */}
      {isDailyPlanOpen && (
        <DailyWorkPlanManager 
          onClose={() => setIsDailyPlanOpen(false)}
          company={company}
          projects={projects}
        />
      )}

    </div>
  );
}
