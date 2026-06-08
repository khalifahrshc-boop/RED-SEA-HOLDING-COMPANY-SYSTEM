import React from 'react';
import { 
  Briefcase, 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  Calendar, 
  DollarSign, 
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Activity,
  BarChart3,
  Users,
  Receipt,
  Trash2,
  Edit3,
  Printer,
  Download,
  FileDown,
  ClipboardList,
  CalendarCheck,
  X,
  Target,
  Zap,
  ShieldCheck,
  UserPlus,
  FileSpreadsheet,
  ChevronDown,
  LayoutDashboard,
  ArrowLeft,
  Coffee,
  Clock
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/src/lib/utils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ComprehensiveProjectReport } from './ComprehensiveProjectReport';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import { Project, Worker, ProjectResource, ProjectTask, Asset } from '@/src/types';
import { useTranslation, Language } from '../lib/translations';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { notificationService } from '../lib/notificationService';

const dummyInvoices = [
  { id: 'INV-2024-001', projectId: 'P1', date: '2024-04-10', total: 51750, status: 'Paid' },
  { id: 'INV-2024-002', projectId: 'P2', date: '2024-04-20', total: 13800, status: 'Approved' },
  { id: 'INV-2024-003', projectId: 'P3', date: '2024-04-25', total: 102350, status: 'Draft' },
];

const dummyQuotes = [
  { id: 'QT-8821', projectId: 'P1', vendorName: 'Global Concrete Ltd', date: '2024-04-10', totalAmount: 45000, status: 'Approved' },
  { id: 'QT-8822', projectId: 'P1', vendorName: 'Atlas Steel', date: '2024-04-12', totalAmount: 125000, status: 'Sent' },
  { id: 'QT-8901', projectId: 'P2', vendorName: 'Horizon Logistics', date: '2024-04-15', totalAmount: 8400, status: 'Approved' },
];

const dummyPOs = [
  { id: 'PO-2024-001', projectId: 'P1', vendorName: 'Global Concrete Ltd', date: '2024-04-12', totalAmount: 45000, status: 'Issued' },
  { id: 'PO-2024-002', projectId: 'P2', vendorName: 'Horizon Logistics', date: '2024-04-18', totalAmount: 8400, status: 'Received' },
];

const projectMilestones = {
  'P1': [
    { name: 'Initial Survey', date: '2024-02-15', status: 'Completed' },
    { name: 'Bedrock Excavation', date: '2024-05-10', status: 'In Progress' },
    { name: 'Utility Grid Set', date: '2024-09-20', status: 'Pending' },
  ],
  'P2': [
    { name: 'Coastal Impact Study', date: '2023-12-01', status: 'Completed' },
    { name: 'Main Frame Erection', date: '2024-06-15', status: 'Pending' },
  ],
  'P3': [
    { name: 'Soil Analysis', date: '2024-03-25', status: 'Failed Verification' },
  ],
};

const dummyTasks = {
  'P1': [
    { id: 'T1', name: 'Site Clearing', start: '2024-01-15', end: '2024-02-15', status: 'Completed' },
    { id: 'T2', name: 'Soil Stabilization', start: '2024-02-10', end: '2024-03-30', status: 'Completed' },
    { id: 'T3', name: 'Foundation Pouring', start: '2024-04-01', end: '2024-05-30', status: 'In Progress' },
    { id: 'T4', name: 'Structural Framing', start: '2024-06-01', end: '2024-09-15', status: 'Pending' },
  ],
  'P2': [
    { id: 'T1', name: 'Architectural Approval', start: '2023-11-01', end: '2023-12-15', status: 'Completed' },
    { id: 'T2', name: 'Groundworks', start: '2023-12-10', end: '2024-04-30', status: 'In Progress' },
  ],
  'P3': [
    { id: 'T1', name: 'Initial Analysis', start: '2024-03-10', end: '2024-03-25', status: 'Failed Verification' },
  ]
};

const BASELINE_CATALOG: Asset[] = [
  // Equipment
  { id: 'cat-eq-1', referenceNumber: 'EQ-CR-010', name: 'Tower Crane TC-70', model: 'Liebherr 280 EC-H', category: 'Heavy Equipment', ownershipType: 'Owned', serialNumber: 'SN-CR9302', acquisitionDate: '2024-01-10', condition: 'Good', status: 'Active', location: 'Central Yard', value: 850000, quantity: 1, unit: 'Unit', accountingApproved: true },
  { id: 'cat-eq-2', referenceNumber: 'EQ-EX-012', name: 'Hydraulic Excavator EX-330', model: 'Komatsu PC330', category: 'Heavy Equipment', ownershipType: 'Owned', serialNumber: 'SN-EX1102', acquisitionDate: '2023-05-15', condition: 'Good', status: 'Active', location: 'Central Yard', value: 420000, quantity: 1, unit: 'Unit', accountingApproved: true },
  { id: 'cat-eq-3', referenceNumber: 'EQ-MX-005', name: 'Concrete Mixer Truck', model: 'Volvo FMX 8x4', category: 'Vehicles', ownershipType: 'Rented', serialNumber: 'SN-MX3381', acquisitionDate: '2024-03-01', condition: 'Mint', status: 'Active', location: 'hq', value: 310000, quantity: 1, unit: 'Unit', accountingApproved: true },
  { id: 'cat-eq-4', referenceNumber: 'EQ-GN-002', name: 'Diesel Generator 150kVA', model: 'Cummins C150D5', category: 'Tools', ownershipType: 'Owned', serialNumber: 'SN-GN0082', acquisitionDate: '2022-08-11', condition: 'Good', status: 'Active', location: 'Service Yard', value: 95000, quantity: 1, unit: 'Unit', accountingApproved: true },
  // Materials
  { id: 'cat-mat-1', referenceNumber: 'MAT-CM-001', name: 'Portland Cement Grade-A', model: '50kg Bag', category: 'Other', ownershipType: 'Owned', serialNumber: 'SN-CM-G1', acquisitionDate: '2025-01-01', condition: 'Good', status: 'Active', location: 'Warehouse', value: 24, quantity: 1000, unit: 'Bag', accountingApproved: true },
  { id: 'cat-mat-2', referenceNumber: 'MAT-ST-002', name: 'High-Tensile Deformed Steel Rebar 12mm', model: 'ASTM A615 Grade 60', category: 'Other', ownershipType: 'Owned', serialNumber: 'SN-ST-R12', acquisitionDate: '2025-01-01', condition: 'Good', status: 'Active', location: 'Warehouse', value: 2850, quantity: 150, unit: 'Ton', accountingApproved: true },
  { id: 'cat-mat-3', referenceNumber: 'MAT-CN-003', name: 'Ready-Mix Concrete C35/45', model: 'High Strength', category: 'Other', ownershipType: 'Owned', serialNumber: 'SN-CN-RM35', acquisitionDate: '2025-01-01', condition: 'Good', status: 'Active', location: 'Batching Plant', value: 380, quantity: 200, unit: 'm³', accountingApproved: true },
  { id: 'cat-mat-4', referenceNumber: 'MAT-BR-004', name: 'Red Clay Bricks (Standard)', model: '200x100x50mm', category: 'Other', ownershipType: 'Owned', serialNumber: 'SN-BR-RC', acquisitionDate: '2025-01-01', condition: 'Good', status: 'Active', location: 'Warehouse', value: 1.5, quantity: 15000, unit: 'Pcs', accountingApproved: true },
  { id: 'cat-mat-5', referenceNumber: 'MAT-WD-005', name: 'Structural Pine Timber', model: '2x4x10ft Board', category: 'Other', ownershipType: 'Owned', serialNumber: 'SN-WD-PT', acquisitionDate: '2025-01-01', condition: 'Good', status: 'Active', location: 'Warehouse', value: 35, quantity: 500, unit: 'Board', accountingApproved: true },
];

interface ProjectsProps {
  projects: Project[];
  onUpdateProject: (p: Project) => void;
  onCreateProject: (p: Project) => void;
  onDeleteProject: (id: string) => void;
  workers: Worker[];
  setWorkers: React.Dispatch<React.SetStateAction<Worker[]>>;
  resources: ProjectResource[];
  setResources: React.Dispatch<React.SetStateAction<ProjectResource[]>>;
  language: Language;
  company?: any;
  assets?: Asset[];
  setAssets?: React.Dispatch<React.SetStateAction<Asset[]>>;
  dailyOutputs?: any[];
  setDailyOutputs?: React.Dispatch<React.SetStateAction<any[]>>;
}

export function Projects({ 
  projects, 
  onUpdateProject, 
  onCreateProject, 
  onDeleteProject,
  workers,
  setWorkers,
  resources,
  setResources,
  language,
  company,
  assets,
  setAssets,
  dailyOutputs: propsDailyOutputs,
  setDailyOutputs: propsSetDailyOutputs
}: ProjectsProps) {
  const { t, d } = useTranslation(language);
  const [currentTime, setCurrentTime] = React.useState(() => new Date());
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Ticks every second for active real-time updates
    return () => clearInterval(timer);
  }, []);

  const getProjectTimelineData = React.useCallback((project: Project, now: Date) => {
    // Falls back to project's startDate if createdAt is not available
    const start = project.createdAt ? new Date(project.createdAt) : new Date(project.startDate);
    const end = new Date(project.endDate);

    const totalMs = end.getTime() - start.getTime();
    const elapsedMs = now.getTime() - start.getTime();
    const remainingMs = end.getTime() - now.getTime();

    let percentage = 0;
    if (totalMs > 0) {
      percentage = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
    }

    if (remainingMs <= 0) {
      return {
        months: 0,
        days: 0,
        hours: 0,
        minutes: 0,
        percentage: 100,
        isOver: true
      };
    }

    const totalSeconds = Math.floor(remainingMs / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);

    // Approximate average number of days in a month is 30.437
    const months = Math.floor(totalDays / 30.437);
    const days = Math.floor(totalDays % 30.437);
    const hours = totalHours % 24;
    const minutes = totalMinutes % 60;

    return {
      months,
      days,
      hours,
      minutes,
      percentage,
      isOver: false
    };
  }, []);

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingProject, setEditingProject] = React.useState<Project | null>(null);
  const [editingProductivityMetrics, setEditingProductivityMetrics] = React.useState<NonNullable<Project['productivityMetrics']>>([]);
  const [activeTab, setActiveTab] = React.useState<'Analytics' | 'Personnel' | 'Resources' | 'Financial' | 'Roadmap' | 'Productivity Metrics' | 'Daily Output'>('Analytics');

  // Daily Output production report state
  const [localDailyOutputs, setLocalDailyOutputs] = useLocalStorage<any[]>('ares_project_daily_outputs', [
    {
      id: 'DO-001',
      projectId: 'PRJ-24-001',
      date: '2026-05-28',
      timeframe: '07:00 - 16:00',
      workersCount: 12,
      workersType: 'Masonry Specialists, Helpers & Supervisors',
      expectedMeters: 100,
      actualMeters: 105,
      daysRequired: 15,
      status: 'Ahead of Schedule',
      notes: 'Excellent teamwork and optimal material feed. Work proceeded uninterrupted.'
    },
    {
      id: 'DO-002',
      projectId: 'PRJ-24-001',
      date: '2026-05-29',
      timeframe: '07:00 - 16:00',
      workersCount: 15,
      workersType: 'Concrete Crew, Carpentry Assistants',
      expectedMeters: 150,
      actualMeters: 120,
      daysRequired: 14,
      status: 'Behind Schedule',
      notes: 'Concrete mixer delivery delayed by two hours due to detour on Highway 10.'
    },
    {
      id: 'DO-003',
      projectId: 'PRJ-24-001',
      date: '2026-05-30',
      timeframe: '07:00 - 16:00',
      workersCount: 10,
      workersType: 'Steel Fixers & General Labor',
      expectedMeters: 80,
      actualMeters: 80,
      daysRequired: 12,
      status: 'On Track',
      notes: 'Welding machines serviced and prepped early. Goal reached per shift expectations.'
    }
  ]);
  const dailyOutputs = propsDailyOutputs !== undefined ? propsDailyOutputs : localDailyOutputs;
  const setDailyOutputs = propsSetDailyOutputs !== undefined ? propsSetDailyOutputs : setLocalDailyOutputs;

  const [isDailyOutputModalOpen, setIsDailyOutputModalOpen] = React.useState(false);
  const [editingDailyOutput, setEditingDailyOutput] = React.useState<any | null>(null);
  const [selectedDailyOutputIds, setSelectedDailyOutputIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    setSelectedDailyOutputIds([]);
  }, [selectedId, activeTab]);

  // Daily output form fields
  const [doDate, setDoDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [doTimeframe, setDoTimeframe] = React.useState('07:00 - 16:00');
  const [doWorkersCount, setDoWorkersCount] = React.useState(10);
  const [doWorkersType, setDoWorkersType] = React.useState('');
  const [doExpectedMeters, setDoExpectedMeters] = React.useState(100);
  const [doActualMeters, setDoActualMeters] = React.useState(100);
  const [doDaysRequired, setDoDaysRequired] = React.useState(10);
  const [doStatus, setDoStatus] = React.useState<'On Track' | 'Ahead of Schedule' | 'Behind Schedule'>('On Track');
  const [doNotes, setDoNotes] = React.useState('');
  const [doTaskId, setDoTaskId] = React.useState('');
  const [riskSortOrder, setRiskSortOrder] = React.useState<'none' | 'high-low' | 'low-high'>('none');
  const [isFullReportOpen, setIsFullReportOpen] = React.useState(false);

  const getCalculatedDate = (startDateStr: string, dayNum: number) => {
    const d = new Date(startDateStr);
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() + (dayNum - 1));
    return d.toISOString().split('T')[0];
  };

  // Day-by-day interactive timeline states
  const [focusedDay, setFocusedDay] = React.useState<number>(1);
  const [timelineViewMode, setTimelineViewMode] = React.useState<'day-matrix' | 'monthly-gantt'>('day-matrix');
  const [taskFormType, setTaskFormType] = React.useState<'Task' | 'Break'>('Task');
  const [taskTimingMode, setTaskTimingMode] = React.useState<'relative' | 'absolute'>('relative');
  const [formStartDay, setFormStartDay] = React.useState<number>(1);
  const [formEndDay, setFormEndDay] = React.useState<number>(5);
  const [deployingTaskId, setDeployingTaskId] = React.useState<string>('');

  // Controlled fields for the task definition form (allows programmatically pre-filling for copying, editing, etc.)
  const [taskFormName, setTaskFormName] = React.useState<string>('');
  const [taskFormLocation, setTaskFormLocation] = React.useState<string>('');
  const [taskFormExpectedMeters, setTaskFormExpectedMeters] = React.useState<number>(100);
  const [taskFormAllowedRole, setTaskFormAllowedRole] = React.useState<string>('');
  const [taskFormMaxWorkers, setTaskFormMaxWorkers] = React.useState<number>(10);
  const [taskFormDepartment, setTaskFormDepartment] = React.useState<string>('Operations');
  const [taskFormAssignedValue, setTaskFormAssignedValue] = React.useState<string>('Site Supervisor');
  const [taskFormGoal, setTaskFormGoal] = React.useState<string>('');
  const [taskFormStart, setTaskFormStart] = React.useState<string>('');
  const [taskFormEnd, setTaskFormEnd] = React.useState<string>('');
  const [editingTask, setEditingTask] = React.useState<ProjectTask | null>(null);
  const [selectedTimelineTaskId, setSelectedTimelineTaskId] = React.useState<string | null>(null);

  const openTaskModalForAdd = () => {
    setEditingTask(null);
    setTaskFormType('Task');
    setTaskTimingMode('relative');
    setFormStartDay(1);
    setFormEndDay(5);
    setTaskFormName('');
    setTaskFormLocation('');
    setTaskFormExpectedMeters(100);
    setTaskFormAllowedRole('');
    setTaskFormMaxWorkers(10);
    setTaskFormDepartment('Operations');
    setTaskFormAssignedValue('Site Supervisor');
    setTaskFormGoal('');
    setTaskFormStart(selectedProject?.startDate || '');
    setTaskFormEnd(selectedProject?.endDate || '');
    setIsTaskModalOpen(true);
  };

  const openTaskModalForEdit = (t: ProjectTask) => {
    setEditingTask(t);
    setTaskFormType(t.taskType);
    setTaskTimingMode(t.date && t.date.includes('-') && !t.hasOwnProperty('startDay') ? 'absolute' : 'relative');
    setFormStartDay((t as any).startDay || 1);
    setFormEndDay((t as any).endDay || 5);
    setTaskFormName(t.task);
    setTaskFormLocation(t.location || '');
    setTaskFormExpectedMeters(t.expectedMeters || 100);
    setTaskFormAllowedRole(t.allowedRole || '');
    setTaskFormMaxWorkers(t.maxWorkers || 10);
    setTaskFormDepartment(t.department || 'Operations');
    setTaskFormAssignedValue(typeof t.assignedTo === 'object' ? t.assignedTo.value : String(t.assignedTo || ''));
    setTaskFormGoal(t.goal || '');
    setTaskFormStart(t.date || '');
    setTaskFormEnd(t.endDate || '');
    setIsTaskModalOpen(true);
  };

  const openTaskModalForCopy = (t: ProjectTask) => {
    setEditingTask(null); // Save as new task
    setTaskFormType(t.taskType);
    setTaskTimingMode(t.date && t.date.includes('-') && !t.hasOwnProperty('startDay') ? 'absolute' : 'relative');
    setFormStartDay((t as any).startDay || 1);
    setFormEndDay((t as any).endDay || 5);
    setTaskFormName(`${t.task} (Copy)`);
    setTaskFormLocation(t.location || '');
    setTaskFormExpectedMeters(t.expectedMeters || 100);
    setTaskFormAllowedRole(t.allowedRole || '');
    setTaskFormMaxWorkers(t.maxWorkers || 10);
    setTaskFormDepartment(t.department || 'Operations');
    setTaskFormAssignedValue(typeof t.assignedTo === 'object' ? t.assignedTo.value : String(t.assignedTo || ''));
    setTaskFormGoal(t.goal || '');
    setTaskFormStart(t.date || '');
    setTaskFormEnd(t.endDate || '');
    setIsTaskModalOpen(true);
  };

  const riskValue = (level: Project['riskLevel']) => {
    switch (level) {
      case 'High': return 3;
      case 'Medium': return 2;
      case 'Low': return 1;
      default: return 0;
    }
  };

  const selectedProject = projects.find(p => p.id === selectedId);
  
  const filteredProjects = React.useMemo(() => {
    let result = projects.filter(p => 
      (p.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
      (p.id || '').toLowerCase().includes((searchTerm || '').toLowerCase())
    );

    if (riskSortOrder !== 'none') {
      result = [...result].sort((a, b) => {
        const valA = riskValue(a.riskLevel);
        const valB = riskValue(b.riskLevel);
        return riskSortOrder === 'high-low' ? valB - valA : valA - valB;
      });
    }
    
    return result;
  }, [projects, searchTerm, riskSortOrder]);

  // Daily Output save / edit / delete and print functions
  const handleSaveDailyOutput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;

    const projectTasks = tasks.filter(t => t.projectId === selectedId && t.taskType === 'Task');

    // 1. Ensure a valid timeline activity is chosen
    if (!doTaskId) {
      alert(language === 'ar'
        ? 'يرجى تحديد النشاط المقابل من الخط الزمني لمطابقة تتبع الإنتاجية!'
        : 'Please select the corresponding active Timeline Activity to match production tracking!'
      );
      return;
    }

    const selectedTask = projectTasks.find(t => t.id === doTaskId);
    if (!selectedTask) {
      alert(language === 'ar'
        ? 'النشاط المحدد غير صحيح أو لم يعد موجوداً في الجدول الزمني الكلي للمشروع!'
        : 'The selected activity is invalid or no longer exists in the project roadmap!'
      );
      return;
    }

    // 2. Work type verification (Soft Confirm)
    if (selectedTask.allowedRole && doWorkersType !== selectedTask.allowedRole) {
      const proceed = confirm(language === 'ar'
        ? `تحذير: نوع وتخصص العمالة المدخل (${doWorkersType || 'لاشيء'}) لا يتطابق مع النشاط المبرمج في الجدول الزمني (${selectedTask.allowedRole}). هل ترغب في المتابعة والحفظ على أي حال؟`
        : `Specialty Warning: The specified workforce trade (${doWorkersType || 'None'}) does not match the allowed role from the timeline (${selectedTask.allowedRole}). Save anyways?`
      );
      if (!proceed) return;
    }

    // 3. Meters verification (Soft Confirm)
    const priorMeters = dailyOutputs
      .filter(item => item.projectId === selectedId && item.taskId === doTaskId && item.id !== editingDailyOutput?.id)
      .reduce((sum, item) => sum + (Number(item.actualMeters) || 0), 0);

    const targetLimit = selectedTask.expectedMeters || 100;
    const remainingMetersAllowed = targetLimit - priorMeters;

    if (Number(doActualMeters) > remainingMetersAllowed) {
      const proceed = confirm(language === 'ar'
        ? `تجاوز الحد كمية: لا يمكنك تدوين مخرجات تتجاوز الكمية المتبقية المقررة في الخطة المعتمدة (${remainingMetersAllowed} متر متاح). هل تريد المتابعة لتخزين السجل وتجاوز الحد على أي حال؟`
        : `Target Warning: This entry pushes cumulative output past the timeline's limit of ${targetLimit}m (Max remaining allowed is ${remainingMetersAllowed}m). Save and record this additional output anyway?`
      );
      if (!proceed) return;
    }

    // 4. Workers and capacity validation (Soft Confirm)
    const assignedWorkforceCount = workers.filter(w => w.projectId === selectedId && w.assignedTaskId === doTaskId).length;
    if (Number(doWorkersCount) > assignedWorkforceCount) {
      const proceed = confirm(language === 'ar'
        ? `تجاوز العمالة المتوفرة: عدد الكادر المحدد (${doWorkersCount}) تجاوز عدد العمال المعينين في قاعدة البيانات للوردية (${assignedWorkforceCount} عمال معينين حالياً). هل ترغب في إتمام الحفظ والمتابعة؟`
        : `Workforce Warning: Recording ${doWorkersCount} workers exceeds the ${assignedWorkforceCount} personnel currently assigned to this task. Save and proceed?`
      );
      if (!proceed) return;
    }

    const newOutput = {
      id: editingDailyOutput?.id || `DO-${Date.now()}`,
      projectId: selectedId,
      taskId: doTaskId,
      date: doDate,
      timeframe: doTimeframe,
      workersCount: Number(doWorkersCount),
      workersType: doWorkersType,
      expectedMeters: Number(doExpectedMeters),
      actualMeters: Number(doActualMeters),
      daysRequired: Number(doDaysRequired),
      status: doStatus,
      notes: doNotes
    };

    if (editingDailyOutput) {
      setDailyOutputs(prev => prev.map(item => item.id === editingDailyOutput.id ? newOutput : item));
    } else {
      setDailyOutputs(prev => [newOutput, ...prev]);
    }

    setIsDailyOutputModalOpen(false);
    setEditingDailyOutput(null);
    setDoTaskId('');
  };

  const handleEditDailyOutput = (outputItem: any) => {
    setEditingDailyOutput(outputItem);
    setDoDate(outputItem.date || new Date().toISOString().split('T')[0]);
    setDoTimeframe(outputItem.timeframe || '07:00 - 16:00');
    setDoWorkersCount(outputItem.workersCount ?? 10);
    setDoWorkersType(outputItem.workersType || '');
    setDoExpectedMeters(outputItem.expectedMeters ?? 100);
    setDoActualMeters(outputItem.actualMeters ?? 0);
    setDoDaysRequired(outputItem.daysRequired ?? 10);
    setDoStatus(outputItem.status || 'On Track');
    setDoNotes(outputItem.notes || '');
    setDoTaskId(outputItem.taskId || '');
    setIsDailyOutputModalOpen(true);
  };

  const handleDeleteDailyOutput = (id: string) => {
    if (confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا السجل اليومي؟' : 'Are you sure you want to delete this daily output record?')) {
      setDailyOutputs(prev => prev.filter(item => item.id !== id));
    }
  };

  React.useEffect(() => {
    if (doActualMeters >= doExpectedMeters) {
      if (doActualMeters > doExpectedMeters * 1.1) {
        setDoStatus('Ahead of Schedule');
      } else {
        setDoStatus('On Track');
      }
    } else {
      setDoStatus('Behind Schedule');
    }
  }, [doActualMeters, doExpectedMeters]);

  const handlePrintDailyOutput = (item: any) => {
    import('../lib/pdfUtils').then(({ generateStandardPDF, applyAutoTable }) => {
      const { doc, startY } = generateStandardPDF(`DAILY PRODUCTION SUMMARY: ${item.date}`, company || {});
      let y = startY;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(language === 'ar' ? 'تقرير الإنتاج اليومي وتتبع المخرجات' : 'DAILY OUTPUT & PRODUCTION SHIFT REPORT', 14, y);
      y += 10;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`${language === 'ar' ? 'المشروع' : 'Project'}: ${selectedProject?.name} (ID: ${selectedProject?.id})`, 14, y);
      y += 6;
      doc.text(`${language === 'ar' ? 'التاريخ' : 'Date'}: ${item.date} (${item.timeframe})`, 14, y);
      y += 12;

      const tableData = [
        [language === 'ar' ? 'البيان' : 'Field KPI', language === 'ar' ? 'القيمة المسجلة' : 'Logged Value'],
        [language === 'ar' ? 'تاريخ الوردية' : 'Shift Date', item.date],
        [language === 'ar' ? 'الإطار الزمني' : 'Manning Timeframe', item.timeframe],
        [language === 'ar' ? 'عدد العمالة المشاركة' : 'Number of Workers Deployed', `${item.workersCount} ${language === 'ar' ? 'عامل' : 'Workers'}`],
        [language === 'ar' ? 'فئات العمالة المشاركة' : 'Workers Specialty Trades', item.workersType || '-'],
        [language === 'ar' ? 'الإنتاجية المستهدفة (بالمتر)' : 'Target Expected Progress (Meters)', `${item.expectedMeters} m`],
        [language === 'ar' ? 'الإنتاجية المصانعة / الفعلية (بالمتر)' : 'Actual Achieved Progress (Meters)', `${item.actualMeters} m`],
        [language === 'ar' ? 'نسبة الإنجاز اليومي' : 'Daily Completion Rate', `${Math.round((item.actualMeters / item.expectedMeters) * 100)}%`],
        [language === 'ar' ? 'كامل الأيام المطلوبة لإتمام العمل' : 'Estimated Plan Duration', `${item.daysRequired} ${language === 'ar' ? 'أيام' : 'Days'}`],
        [language === 'ar' ? 'حالة التقدم وجدول التنفيذ' : 'Schedule Efficiency State', item.status],
        [language === 'ar' ? 'ملاحظات وتوجيهات الشفت' : 'Field Shift Remarks', item.notes || '-']
      ];

      applyAutoTable(doc, {
        startY: y,
        head: [[language === 'ar' ? 'المدخل الإنتاجي' : 'Production Parameter', language === 'ar' ? 'تفاصيل السجل' : 'Report Log Statement']],
        body: tableData.slice(1),
        theme: 'striped',
        styles: { fontSize: 9, font: 'helvetica' },
        headStyles: { fillColor: [15, 23, 42] }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 15;
      
      // Signature lines
      doc.text(language === 'ar' ? 'توقيع مهندس الموقع: ________________________' : 'Site Engineer Signature: ________________________', 14, finalY);
      doc.text(language === 'ar' ? 'اعتماد مدير إدارة المشاريع: ________________________' : 'Project Manager Approval: ________________________', 14, finalY + 12);

      doc.save(`Shift-Production-Report-${item.date}-${selectedProject?.id}.pdf`);
    });
  };

  const handlePrintSelectedDailyOutputs = () => {
    if (selectedDailyOutputIds.length === 0) return;
    
    const selectedItems = dailyOutputs
      .filter(item => selectedDailyOutputIds.includes(item.id))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    import('../lib/pdfUtils').then(({ generateStandardPDF, applyAutoTable }) => {
      const firstItem = selectedItems[0];
      const { doc, startY } = generateStandardPDF(
        language === 'ar' ? 'تقرير التراكمي الشامل للإنتاجية' : `BATCH PRODUCTION SUMMARY (${selectedItems.length} REPORTS)`, 
        company || {}
      );
      
      const drawReportOnPage = (item: any, docInstance: any, sY: number, pageIndex: number) => {
        let y = sY;

        docInstance.setFont("helvetica", "bold");
        docInstance.setFontSize(14);
        docInstance.text(language === 'ar' ? 'تقرير إنتاجية الوردية اليومي (دفعة)' : 'DAILY SHIFT PRODUCTION REPORT (BATCH)', 14, y);
        y += 8;

        docInstance.setFont("helvetica", "normal");
        docInstance.setFontSize(10);
        docInstance.text(`${language === 'ar' ? 'المشروع' : 'Project'}: ${selectedProject?.name} (ID: ${selectedProject?.id})`, 14, y);
        y += 5;
        docInstance.text(
          language === 'ar' 
            ? `سجل رقم: ${pageIndex + 1} / ${selectedItems.length} | التاريخ: ${item.date} (${item.timeframe})` 
            : `Report No: ${pageIndex + 1} / ${selectedItems.length} | Date: ${item.date} (${item.timeframe})`, 
          14, y
        );
        y += 8;

        const tableData = [
          [language === 'ar' ? 'البيان' : 'Field KPI', language === 'ar' ? 'القيمة المسجلة' : 'Logged Value'],
          [language === 'ar' ? 'تاريخ الوردية' : 'Shift Date', item.date],
          [language === 'ar' ? 'الإطار الزمني' : 'Manning Timeframe', item.timeframe],
          [language === 'ar' ? 'عدد العمالة المشاركة' : 'Number of Workers Deployed', `${item.workersCount} ${language === 'ar' ? 'عامل' : 'Workers'}`],
          [language === 'ar' ? 'فئات العمالة المشاركة' : 'Workers Specialty Trades', item.workersType || '-'],
          [language === 'ar' ? 'الإنتاجية المستهدفة (بالمتر)' : 'Target Expected Progress (Meters)', `${item.expectedMeters} m`],
          [language === 'ar' ? 'الإنتاجية المصانعة / الفعلية (بالمتر)' : 'Actual Achieved Progress (Meters)', `${item.actualMeters} m`],
          [language === 'ar' ? 'نسبة الإنجاز اليومي' : 'Daily Completion Rate', `${Math.round((item.actualMeters / item.expectedMeters) * 100)}%`],
          [language === 'ar' ? 'كامل الأيام المطلوبة لإتمام العمل' : 'Estimated Plan Duration', `${item.daysRequired} ${language === 'ar' ? 'أيام' : 'Days'}`],
          [language === 'ar' ? 'حالة التقدم وجدول التنفيذ' : 'Schedule Efficiency State', item.status],
          [language === 'ar' ? 'ملاحظات وتوجيهات الشفت' : 'Field Shift Remarks', item.notes || '-']
        ];

        applyAutoTable(docInstance, {
          startY: y,
          head: [[language === 'ar' ? 'المدخل الإنتاجي' : 'Production Parameter', language === 'ar' ? 'البيان والتفاصيل' : 'Report Log Statement']],
          body: tableData.slice(1),
          theme: 'striped',
          styles: { fontSize: 8.5, font: 'helvetica' },
          headStyles: { fillColor: [15, 23, 42] }
        });

        const finalY = (docInstance as any).lastAutoTable.finalY + 12;
        
        docInstance.setFontSize(9);
        docInstance.text(language === 'ar' ? 'توقيع مهندس الموقع: ________________________' : 'Site Engineer Signature: ________________________', 14, finalY);
        docInstance.text(language === 'ar' ? 'اعتماد مدير إدارة المشاريع: ________________________' : 'Project Manager Approval: ________________________', 14, finalY + 10);
      };

      drawReportOnPage(firstItem, doc, startY, 0);

      for (let i = 1; i < selectedItems.length; i++) {
        doc.addPage();
        
        let pageY = 14;
        let startX = 14;
        const data = company || {};
        
        if (data.logo) {
          try {
            doc.addImage(data.logo, 'PNG', 14, 10, 24, 24);
            startX = 44;
            pageY = 18;
          } catch(e) {
            console.error(e);
          }
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        const companyName = data.name || 'RED SEA HOLDING SYSTEM ERP';
        doc.text(companyName, startX, pageY);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        pageY += 5;
        if (data.crNumber) {
          doc.text(`CR Number: ${data.crNumber}`, startX, pageY);
          pageY += 4;
        }
        if (data.vatNumber) {
          doc.text(`VAT Number: ${data.vatNumber}`, startX, pageY);
          pageY += 4;
        }

        pageY = Math.max(pageY + 6, data.logo ? 40 : 30);
        
        drawReportOnPage(selectedItems[i], doc, pageY, i);
      }

      doc.save(`Batch-Shift-Production-Reports-${selectedProject?.id}.pdf`);
    });
  };

  const handlePrintCumulativeProductionReport = () => {
    if (!selectedProject) return;
    const projectOutputs = dailyOutputs.filter(d => d.projectId === selectedProject.id);
    
    import('../lib/pdfUtils').then(({ generateStandardPDF, applyAutoTable }) => {
      const { doc, startY } = generateStandardPDF(`CUMULATIVE PERFORMANCE REPORT: ${selectedProject.name}`, company || {});
      let y = startY;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(language === 'ar' ? 'التقرير التراكمي الشامل لأداء الإنتاجية والتقدم' : 'COMPREHENSIVE CUMULATIVE PROJECT PRODUCTION REPORT', 14, y);
      y += 10;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`${language === 'ar' ? 'اسم المشروع' : 'Project Name'}: ${selectedProject.name} (${selectedProject.id})`, 14, y);
      y += 6;
      doc.text(`${language === 'ar' ? 'تاريخ طباعة التقرير' : 'Report Printed At'}: ${new Date().toISOString().split('T')[0]}`, 14, y);
      y += 12;

      // Summary metrics
      const totalExpected = projectOutputs.reduce((acc, curr) => acc + curr.expectedMeters, 0);
      const totalActual = projectOutputs.reduce((acc, curr) => acc + curr.actualMeters, 0);
      const overallRate = totalExpected > 0 ? Math.round((totalActual / totalExpected) * 100) : 0;
      const behindCount = projectOutputs.filter(curr => curr.status === 'Behind Schedule').length;

      doc.setFont("helvetica", "bold");
      doc.text(language === 'ar' ? 'ملخص الأداء الإنتاجي التراكمي:' : 'Performance Executive Highlights:', 14, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.text(`- ${language === 'ar' ? 'إجمالي الأمتار المستهدفة' : 'Cumulative Target Length'}: ${totalExpected} m`, 14, y); y += 5;
      doc.text(`- ${language === 'ar' ? 'إجمالي الأمتار المنجزة فعلياً' : 'Cumulative Achieved Length'}: ${totalActual} m`, 14, y); y += 5;
      doc.text(`- ${language === 'ar' ? 'نسبة الكفاءة العامة' : 'Aggregate Production Efficiency'}: ${overallRate}%`, 14, y); y += 5;
      doc.text(`- ${language === 'ar' ? 'عدد الورديات المتأخرة عن الجدول' : 'Shifts Logged Behind Schedule'}: ${behindCount} ${language === 'ar' ? 'ورديات' : 'Shifts'}`, 14, y); y += 10;

      // Detailed shifts table
      const tableHeaders = [
        language === 'ar' ? 'التاريخ' : 'Date',
        language === 'ar' ? 'الإطار الزمني' : 'Timeframe',
        language === 'ar' ? 'العمالة' : 'Workers',
        language === 'ar' ? 'المستهدف (م)' : 'Target (m)',
        language === 'ar' ? 'الفعلي (م)' : 'Actual (m)',
        language === 'ar' ? 'نسبة الإنجاز' : 'Completion %',
        language === 'ar' ? 'حالة التقدم' : 'Plan Status'
      ];

      const tableRows = projectOutputs.map(item => [
        item.date,
        item.timeframe,
        `${item.workersCount} (${item.workersType || 'Labor'})`,
        `${item.expectedMeters}m`,
        `${item.actualMeters}m`,
        `${Math.round((item.actualMeters / item.expectedMeters) * 100)}%`,
        item.status
      ]);

      applyAutoTable(doc, {
        startY: y,
        head: [tableHeaders],
        body: tableRows,
        theme: 'striped',
        styles: { fontSize: 8, font: 'helvetica' },
        headStyles: { fillColor: [15, 23, 42] }
      });

      doc.save(`Cumulative-Production-Report-${selectedProject.id}.pdf`);
    });
  };

  const handleSaveProject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const projectData: Project = {
      id: editingProject?.id || `PRJ-${Date.now().toString().slice(-4)}-${projects.length + 1}`,
      name: formData.get('name') as string,
      status: formData.get('status') as Project['status'],
      budget: Number(formData.get('budget')),
      expenditureBudget: Number(formData.get('expenditureBudget')),
      spent: Number(formData.get('spent')),
      contractValue: Number(formData.get('contractValue')),
      revenueGenerated: Number(formData.get('revenueGenerated')),
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      managerId: 'M-001',
      riskLevel: formData.get('riskLevel') as Project['riskLevel'],
      riskDetails: formData.get('riskDetails') as string,
      attendancePrepTime: formData.get('attendancePrepTime') as string,
      attendanceCloseTime: formData.get('attendanceCloseTime') as string,
      dailyBudget: Number(formData.get('dailyBudget')),
      productivityMetrics: editingProductivityMetrics,
      createdAt: editingProject?.createdAt || new Date().toISOString()
    };

    if (editingProject) {
      onUpdateProject(projectData);
      notificationService.send({
        type: 'Success',
        title: `Project Updated: ${projectData.name}`,
        message: `Strategic node ${projectData.id} has been reconfigured.`,
        department: 'Administrator',
        relatedId: projectData.id,
        relatedType: 'projects'
      });
    } else {
      onCreateProject(projectData);
      setSelectedId(projectData.id);
      notificationService.send({
        type: 'Success',
        title: `New Project: ${projectData.name}`,
        message: `New strategic node ${projectData.id} has been registered and initialized.`,
        department: 'All',
        relatedId: projectData.id,
        relatedType: 'projects'
      });
    }
    setIsModalOpen(false);
    setEditingProject(null);
  };

  const handleDeleteProjectLocal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to decommission this strategic asset?')) {
      const project = projects.find(p => p.id === id);
      onDeleteProject(id);
      notificationService.send({
        type: 'Alert',
        title: `Project Decommissioned: ${project?.name || id}`,
        message: `Strategic node ${id} has been removed from the operational matrix.`,
        department: 'Administrator',
        relatedId: id,
        relatedType: 'projects'
      });
      if (selectedId === id) {
        const remaining = projects.filter(p => p.id !== id);
        setSelectedId(remaining[0]?.id || null);
      }
    }
  };

  const handlePrint = () => {
    import('../lib/pdfUtils').then(({ generateStandardPDF, applyAutoTable }) => {
        const { doc, startY } = generateStandardPDF('PROJECTS LEDGER', company || {});
        let y = startY;
        
        const tableData = projects.map(p => [
          p.id,
          p.name,
          p.status,
          `SAR ${p.budget.toLocaleString()}`,
          `${Math.round((p.spent / p.budget) * 100)}%`
        ]);

        applyAutoTable(doc, {
          head: [['Project ID', 'Name', 'State', 'Budget', 'Burn Rate']],
          body: tableData,
          startY: y,
        });

        doc.save('Project_Operational_Matrix.pdf');
    });
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(projects);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Projects");
    XLSX.writeFile(wb, `Projects_Master_List_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadCSV = () => {
    if (!selectedProject) return;
    const headers = ['ID', 'Name', 'Status', 'Budget', 'Spent', 'Start Date', 'End Date', 'Risk Level'];
    const row = [
      selectedProject.id,
      selectedProject.name,
      selectedProject.status,
      selectedProject.budget,
      selectedProject.spent,
      selectedProject.startDate,
      selectedProject.endDate,
      selectedProject.riskLevel
    ];
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + row.join(",");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Project-${selectedProject.id}-Ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [isBulkMode, setIsBulkMode] = React.useState(true);
  const [bulkCheckedIds, setBulkCheckedIds] = React.useState<string[]>([]);
  const [bulkQtns, setBulkQtns] = React.useState<Record<string, number>>({});
  const [bulkCsts, setBulkCsts] = React.useState<Record<string, number>>({});
  const [bulkFilter, setBulkFilter] = React.useState<'All' | 'Material' | 'Equipment'>('All');
  const [bulkSearch, setBulkSearch] = React.useState('');

  const [tasks, setTasks] = useLocalStorage<ProjectTask[]>('ares_planning_tasks', []);

  // Safe reactive task populator to inject default timeline components (e.g. Oxygen paint, Painting, Concrete pouring) with breaks
  React.useEffect(() => {
    if (selectedId && selectedProject) {
      const hasSpecificTasks = tasks.some(t => t.projectId === selectedId);
      if (!hasSpecificTasks) {
        const defaultTasks: ProjectTask[] = [
          {
            id: `def-t1-${selectedId}`,
            projectId: selectedId,
            startDay: 1,
            endDay: 5,
            task: 'Oxygen paint coating',
            date: getCalculatedDate(selectedProject.startDate || '2026-06-01', 1),
            endDate: getCalculatedDate(selectedProject.startDate || '2026-06-01', 5),
            goal: 'Apply protective epoxy oxygen barrier coating on steel structures to prevent environmental oxidation.',
            taskType: 'Task',
            expectedMeters: 120,
            maxWorkers: 6,
            maxManagers: 1,
            allowedRole: 'Concrete Crew',
            location: 'Sector-7, Bridge North',
            department: 'Operations',
            assignedTo: { type: 'Person', value: 'Operations Lead' },
            status: 'In Progress',
            createdAt: new Date().toISOString()
          } as any,
          {
            id: `def-t2-${selectedId}`,
            projectId: selectedId,
            startDay: 2,
            endDay: 8,
            task: 'Epoxy painting surface prep',
            date: getCalculatedDate(selectedProject.startDate || '2026-06-01', 2),
            endDate: getCalculatedDate(selectedProject.startDate || '2026-06-01', 8),
            goal: 'Perform grinding, washing and priming of the intermediate tunnel surfaces.',
            taskType: 'Task',
            expectedMeters: 180,
            maxWorkers: 4,
            maxManagers: 1,
            allowedRole: 'Masonry Specialists',
            location: 'Tunnel C, Section-A',
            department: 'Quality Control',
            assignedTo: { type: 'Person', value: 'QC Inspector' },
            status: 'Pending',
            createdAt: new Date().toISOString()
          } as any,
          {
            id: `def-t3-${selectedId}`,
            projectId: selectedId,
            startDay: 1,
            endDay: 20,
            task: 'Concrete pouring and curing',
            date: getCalculatedDate(selectedProject.startDate || '2026-06-01', 1),
            endDate: getCalculatedDate(selectedProject.startDate || '2026-06-01', 20),
            goal: 'Reinforce retaining foundation structures in critical load-bearing segment.',
            taskType: 'Task',
            expectedMeters: 450,
            maxWorkers: 15,
            maxManagers: 3,
            allowedRole: 'Concrete Crew',
            location: 'Sector-7, Tunnel C',
            department: 'Operations',
            assignedTo: { type: 'Person', value: 'Project Engineer' },
            status: 'In Progress',
            createdAt: new Date().toISOString()
          } as any,
          {
            id: `def-t4-${selectedId}`,
            projectId: selectedId,
            startDay: 6,
            endDay: 7,
            task: 'Mid-stage QC stress review rest',
            date: getCalculatedDate(selectedProject.startDate || '2026-06-01', 6),
            endDate: getCalculatedDate(selectedProject.startDate || '2026-06-01', 7),
            goal: 'Allows poured concrete elements to dry and settle cleanly without operational vibrations.',
            taskType: 'Break',
            status: 'Pending',
            createdAt: new Date().toISOString(),
            assignedTo: { type: 'Person', value: 'Quality Control Manager' }
          } as any,
          {
            id: `def-t5-${selectedId}`,
            projectId: selectedId,
            startDay: 14,
            endDay: 15,
            task: 'Weekly Friday Operational Break',
            date: getCalculatedDate(selectedProject.startDate || '2026-06-01', 14),
            endDate: getCalculatedDate(selectedProject.startDate || '2026-06-01', 15),
            goal: 'Weekly scheduled repose days and general heavy mechanical equipment maintenance pause.',
            taskType: 'Break',
            status: 'Pending',
            createdAt: new Date().toISOString(),
            assignedTo: { type: 'Person', value: 'Site Supervisor' }
          } as any
        ];
        
        setTasks(prev => {
          if (prev.some(t => t.projectId === selectedId)) return prev;
          return [...prev, ...defaultTasks];
        });
      }
    }
  }, [selectedId, selectedProject]);

  const [isStaffModalOpen, setIsStaffModalOpen] = React.useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = React.useState(false);
  const [isResourceModalOpen, setIsResourceModalOpen] = React.useState(false);
  const [resourceType, setResourceType] = React.useState<'Material' | 'Equipment'>('Material');
  const [resName, setResName] = React.useState('');
  const [resType, setResType] = React.useState('');
  const [resUnit, setResUnit] = React.useState('');
  const [resQty, setResQty] = React.useState(1);
  const [resCost, setResCost] = React.useState(0);
  const [syncToEquipment, setSyncToEquipment] = React.useState(true);

  const selectableAssetsPool = React.useMemo(() => {
    const userAssets = assets || [];
    const pooled = [...userAssets];
    BASELINE_CATALOG.forEach(catalogItem => {
      if (!pooled.some(a => (a.name || '').toLowerCase() === (catalogItem.name || '').toLowerCase())) {
        pooled.push(catalogItem);
      }
    });
    return pooled;
  }, [assets]);

  const toggleBulkItem = (id: string, defaultQty: number, defaultValue: number) => {
    setBulkCheckedIds(prev => {
      const exists = prev.includes(id);
      if (exists) {
        return prev.filter(x => x !== id);
      } else {
        setBulkQtns(cur => ({ ...cur, [id]: cur[id] || defaultQty }));
        setBulkCsts(cur => ({ ...cur, [id]: cur[id] !== undefined ? cur[id] : defaultValue }));
        return [...prev, id];
      }
    });
  };

  const bulkFilteredAssets = React.useMemo(() => {
    let pool = selectableAssetsPool;
    if (bulkFilter === 'Material') {
      pool = pool.filter(a => !['Heavy Equipment', 'Vehicles', 'Tools'].includes(a.category) && !a.referenceNumber.startsWith('EQ-'));
    } else if (bulkFilter === 'Equipment') {
      pool = pool.filter(a => ['Heavy Equipment', 'Vehicles', 'Tools'].includes(a.category) || a.referenceNumber.startsWith('EQ-'));
    }
    
    if (bulkSearch.trim()) {
      const q = (bulkSearch || '').toLowerCase();
      pool = pool.filter(a => 
        (a.name || '').toLowerCase().includes(q) || 
        (a.referenceNumber || '').toLowerCase().includes(q) || 
        (a.model && (a.model || '').toLowerCase().includes(q))
      );
    }
    
    return pool;
  }, [selectableAssetsPool, bulkFilter, bulkSearch]);

  const openResourceModal = (type: 'Material' | 'Equipment') => {
    setResourceType(type);
    setResName('');
    setResType('');
    setResUnit('');
    setResQty(1);
    setResCost(0);
    setSyncToEquipment(true);
    setIsBulkMode(true);
    setBulkCheckedIds([]);
    setBulkQtns({});
    setBulkCsts({});
    setBulkFilter(type === 'Material' ? 'Material' : 'Equipment');
    setBulkSearch('');
    setIsResourceModalOpen(true);
  };

  const handleSelectAsset = (assetId: string) => {
    const selectedAsset = selectableAssetsPool.find(a => a.id === assetId);
    if (selectedAsset) {
      setResName(selectedAsset.name);
      setResType(selectedAsset.model || selectedAsset.category || '');
      setResUnit(selectedAsset.unit || 'Item');
      setResQty(selectedAsset.quantity || 1);
      setResCost(selectedAsset.value || 0);
    }
  };
  const [roleFilter, setRoleFilter] = React.useState<string>('All');
  const [deployingWorkerId, setDeployingWorkerId] = React.useState<string | null>(null);

  // Available workers are those either not assigned to any project node or assigned to a different one
  const availableWorkers = workers.filter(w => w.projectId !== selectedId);

  const handleAssignStaff = (workerId: string, location: string, area: string, assignedTaskId?: string) => {
    if (!selectedId) return;
    
    // Find project and worker to calculate cost
    const project = projects.find(p => p.id === selectedId);
    const worker = workers.find(w => w.id === workerId);
    
    if (project && worker) {
      // Find timeline task if assigned
      const projectTasks = tasks.filter(t => t.projectId === selectedId);
      const selectedTask = projectTasks.find(t => t.id === assignedTaskId);

      if (selectedTask) {
        // Validation: Job title / role check
        if (selectedTask.allowedRole && worker.role !== selectedTask.allowedRole) {
          alert(language === 'ar' 
            ? `فشل التنصيب: المسمى الوظيفي للموظف (${worker.role}) لا يطابق التخصص المطلوب لهذا النشاط وهو (${selectedTask.allowedRole})! لا يمكنك وضع عامل في وظيفة أو موقع غير مخصص له.` 
            : `Deployment Failed: The employee's job title (${worker.role}) does not match the allowed specialty for this activity (${selectedTask.allowedRole})! Workers cannot be assigned to mismatched tasks.`
          );
          return;
        }

        // Validation: Workers count limit check
        const currentTaskWorkers = workers.filter(w => w.projectId === selectedId && w.assignedTaskId === assignedTaskId).length;
        if (selectedTask.maxWorkers && currentTaskWorkers >= selectedTask.maxWorkers) {
          alert(language === 'ar'
            ? `فشل التنصيب: تم تجاوز الحد الأقصى المسموح به للعمالة في هذا النشاط! الحد الأقصى للعمال للنشاط المقابل في الجدول الزمني هو ${selectedTask.maxWorkers} عامل.`
            : `Deployment Failed: Exceeded the maximum allowed workers limit for this activity! The timeline limits this job to ${selectedTask.maxWorkers} workers concurrently.`
          );
          return;
        }
      }

      const resolvedLocation = selectedTask ? (selectedTask.location || location) : location;
      const resolvedArea = selectedTask ? (selectedTask.task || area) : area;

      const start = new Date(project.startDate);
      const end = new Date(project.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1; // Minimum 1 day if dates are same
      
      const operatingCost = worker.dailyRate * diffDays;
      const equipmentCost = (worker.equipmentDailyRate || 0) * diffDays;
      const combinedCost = operatingCost + equipmentCost;
      
      // Update project budget utilization
      onUpdateProject({
        ...project,
        spent: project.spent + combinedCost,
        expenditureBudget: project.expenditureBudget - combinedCost
      });
      
      console.log(`Automatically calculated cost for ${worker.name}: Operating($${operatingCost}) + Equipment($${equipmentCost}) = $${combinedCost} for ${diffDays} days.`);
      
      notificationService.send({
        type: 'Info',
        title: `Personnel Deployed: ${worker.name}`,
        message: `${worker.name} has been assigned to Project ${project.name} at ${resolvedLocation} (${resolvedArea}).`,
        department: 'Workforce',
        relatedId: worker.id,
        relatedType: 'hr'
      });

      setWorkers(prev => prev.map(w => 
        w.id === workerId ? { 
          ...w, 
          projectId: selectedId,
          assignedTaskId: assignedTaskId,
          assignmentLocation: resolvedLocation,
          assignmentArea: resolvedArea,
          status: 'Working'
        } : w
      ));

      setDeployingWorkerId(null);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleUpdateTaskStatus = (taskId: string, newStatus: ProjectTask['status']) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const handleAddTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedId || !selectedProject) return;
    const formData = new FormData(e.currentTarget);
    const taskType = (formData.get('taskType') || 'Task') as string;
    const timingMode = (formData.get('timingMode') || 'relative') as 'relative' | 'absolute';
    
    let resolvedStartDateStr = '';
    let resolvedEndDateStr = '';
    let startDayNum: number | undefined = undefined;
    let endDayNum: number | undefined = undefined;

    const projectStartStr = selectedProject.startDate || '2026-06-01';

    if (timingMode === 'relative') {
      const sDay = parseInt(formData.get('startDay') as string || '1', 10);
      const eDay = parseInt(formData.get('endDay') as string || '1', 10);
      
      startDayNum = sDay;
      endDayNum = eDay;

      // Calculate absolute dates from relative days
      const d1 = new Date(projectStartStr);
      d1.setHours(0,0,0,0);
      d1.setDate(d1.getDate() + (sDay - 1));
      resolvedStartDateStr = d1.toISOString().split('T')[0];

      const d2 = new Date(projectStartStr);
      d2.setHours(0,0,0,0);
      d2.setDate(d2.getDate() + (eDay - 1));
      resolvedEndDateStr = d2.toISOString().split('T')[0];
    } else {
      resolvedStartDateStr = formData.get('start') as string;
      resolvedEndDateStr = formData.get('end') as string || resolvedStartDateStr;

      // Calculate relative days from absolute dates
      const pStart = new Date(projectStartStr);
      const tStart = new Date(resolvedStartDateStr);
      const tEnd = new Date(resolvedEndDateStr);
      pStart.setHours(0,0,0,0);
      tStart.setHours(0,0,0,0);
      tEnd.setHours(0,0,0,0);

      startDayNum = Math.round((tStart.getTime() - pStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      endDayNum = Math.round((tEnd.getTime() - pStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    if (editingTask) {
      setTasks(prev => prev.map(t => {
        if (t.id === editingTask.id) {
          const updated: ProjectTask = {
            ...t,
            date: resolvedStartDateStr,
            endDate: resolvedEndDateStr,
            task: formData.get('name') as string,
            goal: (formData.get('goal') as string) || (taskType === 'Break' ? 'Scheduled site reprieve / rest day' : 'Operational task'),
            taskType: taskType,
            expectedMeters: taskType === 'Task' ? Number(formData.get('expectedMeters') || 100) : undefined,
            maxWorkers: taskType === 'Task' ? Number(formData.get('maxWorkers') || 10) : undefined,
            maxManagers: taskType === 'Task' ? Number(formData.get('maxManagers') || 2) : undefined,
            allowedRole: taskType === 'Task' ? String(formData.get('allowedRole') || '') : undefined,
            location: taskType === 'Task' ? String(formData.get('location') || '') : undefined,
            department: (formData.get('department') as string) || 'Operations',
            assignedTo: { 
              type: 'Person', 
              value: (formData.get('assignedValue') as string) || 'Site Supervisor' 
            },
          };
          (updated as any).startDay = startDayNum;
          (updated as any).endDay = endDayNum;
          return updated;
        }
        return t;
      }));
      setEditingTask(null);
    } else {
      const newTask: ProjectTask = {
        id: `T${Date.now()}`,
        projectId: selectedId,
        date: resolvedStartDateStr,
        endDate: resolvedEndDateStr,
        task: formData.get('name') as string,
        goal: (formData.get('goal') as string) || (taskType === 'Break' ? 'Scheduled site reprieve / rest day' : 'Operational task'),
        taskType: taskType,
        expectedMeters: taskType === 'Task' ? Number(formData.get('expectedMeters') || 100) : undefined,
        maxWorkers: taskType === 'Task' ? Number(formData.get('maxWorkers') || 10) : undefined,
        maxManagers: taskType === 'Task' ? Number(formData.get('maxManagers') || 2) : undefined,
        allowedRole: taskType === 'Task' ? String(formData.get('allowedRole') || '') : undefined,
        location: taskType === 'Task' ? String(formData.get('location') || '') : undefined,
        department: (formData.get('department') as string) || 'Operations',
        assignedTo: { 
          type: 'Person', 
          value: (formData.get('assignedValue') as string) || 'Site Supervisor' 
        },
        status: 'Pending',
        createdAt: new Date().toISOString()
      };

      // Store custom fields in the object as well
      (newTask as any).startDay = startDayNum;
      (newTask as any).endDay = endDayNum;

      setTasks(prev => [...prev, newTask]);
    }
    setIsTaskModalOpen(false);
  };

  const projectTasks = tasks.filter(t => t.projectId === selectedId);

  const teamMembers = workers.filter(w => w.projectId === selectedId);
  const projectInvoices = dummyInvoices.filter(i => i.projectId === selectedId);
  const projectQuotes = dummyQuotes.filter(q => q.projectId === selectedId);
  const projectPOs = dummyPOs.filter(p => p.projectId === selectedId);

  const budgetData = projects.map(p => ({
    name: p.id,
    budget: p.budget / 1000000, 
    spent: p.spent / 1000000,
    revenue: p.contractValue / 1000000,
    fullName: p.name
  }));

  const projectResources = resources.filter(r => r.projectId === selectedId);

  const filteredAssets = React.useMemo(() => {
    if (!assets) return [];
    const isEquip = resourceType === 'Equipment';
    return assets.filter(a => {
      const matchEquip = ['Heavy Equipment', 'Vehicles', 'Tools'].includes(a.category);
      return isEquip ? matchEquip : !matchEquip;
    });
  }, [assets, resourceType]);

  const handleAddResource = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedId) return;

    if (isBulkMode) {
      if (bulkCheckedIds.length === 0) {
        alert("Please select at least one machinery, equipment, or material to add.");
        return;
      }

      const newBatch: ProjectResource[] = [];
      bulkCheckedIds.forEach((id, idx) => {
        const asset = selectableAssetsPool.find(a => a.id === id);
        if (asset) {
          const qty = bulkQtns[id] !== undefined ? bulkQtns[id] : 1;
          const cost = bulkCsts[id] !== undefined ? bulkCsts[id] : (asset.value || 0);
          
          const isEquipment = ['Heavy Equipment', 'Vehicles', 'Tools'].includes(asset.category) || asset.referenceNumber.startsWith('EQ-');
          const category: 'Material' | 'Equipment' = isEquipment ? 'Equipment' : 'Material';

          newBatch.push({
            id: `R${Date.now()}-${idx}-${id}`,
            projectId: selectedId,
            name: asset.name,
            category: category,
            type: asset.model || asset.category || 'Standard',
            quantity: qty,
            unit: asset.unit || 'Item',
            unitCost: cost,
            totalCost: qty * cost,
            status: 'Ordered'
          });
        }
      });

      setResources(prev => [...prev, ...newBatch]);
      setIsResourceModalOpen(false);
      return;
    }

    const qty = Number(resQty);
    const cost = Number(resCost);

    const newResource: ProjectResource = {
      id: `R${Date.now()}`,
      projectId: selectedId,
      name: resName,
      category: resourceType,
      type: resType,
      quantity: qty,
      unit: resUnit,
      unitCost: cost,
      totalCost: qty * cost,
      status: 'Ordered'
    };

    setResources(prev => [...prev, newResource]);

    if (syncToEquipment && setAssets) {
      const isEquipment = resourceType === 'Equipment';
      const newAsset: Asset = {
        id: `A${Date.now()}`,
        referenceNumber: `${isEquipment ? 'EQ' : 'MAT'}-${String(Math.floor(1000 + Math.random() * 9000))}`,
        name: resName,
        model: resType || 'Standard',
        category: isEquipment ? 'Heavy Equipment' : 'Other',
        ownershipType: 'Owned',
        condition: 'Good',
        status: 'Active',
        location: selectedProject?.name || 'On Site',
        value: cost,
        quantity: qty,
        unit: resUnit || 'Item',
        serialNumber: `SN-${Date.now().toString().slice(-6)}`,
        acquisitionDate: new Date().toISOString().split('T')[0],
        projectId: selectedId,
        accountingApproved: true
      };

      setAssets(prev => {
        if (!prev.some(a => (a.name || '').toLowerCase() === (resName || '').toLowerCase())) {
          return [...prev, newAsset];
        }
        return prev;
      });
    }

    setIsResourceModalOpen(false);
  };

  const kpiData = [
    { subject: 'Efficiency', A: 85, fullMark: 100 },
    { subject: 'Velocity', A: 92, fullMark: 100 },
    { subject: 'Financial Health', A: Math.min(100, Math.round((selectedProject?.revenueGenerated || 1) / (selectedProject?.spent || 1) * 80)), fullMark: 100 },
    { subject: 'Resources', A: 88, fullMark: 100 },
    { subject: 'Compliance', A: 95, fullMark: 100 },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{payload[0].payload.fullName}</p>
          <div className="space-y-1">
            <p className="text-xs font-mono text-red-400">Budget: ${payload[0].value}M</p>
            <p className="text-xs font-mono text-emerald-400">Spent: ${payload[1].value}M</p>
            {payload[2] && <p className="text-xs font-mono text-amber-400">Revenue: ${payload[2].value}M</p>}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">{t.projects_view.title}</h2>
          <p className="text-slate-500 text-sm italic font-medium">Monitoring capital allocation across {projects.length} strategic nodes.</p>
        </div>
        <div className="flex gap-3 print:hidden">
          <div className="relative group">
            <button 
              onClick={() => { if (selectedProject) setIsFullReportOpen(true); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 border rounded-md text-xs font-bold uppercase tracking-widest shadow-sm transition-all active:scale-95",
                selectedProject 
                  ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50" 
                  : "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
              )}
            >
              <LayoutDashboard className={cn("w-3 h-3", selectedProject ? "text-red-600" : "text-slate-300")} />
              Report Matrix {selectedProject && <ChevronDown className="w-3 h-3 ml-1" />}
            </button>
            {selectedProject && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-1 group-hover:translate-y-0">
                <button 
                  onClick={() => setIsFullReportOpen(true)}
                  className="w-full text-left px-4 py-3 text-[10px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 uppercase tracking-widest"
                >
                  <LayoutDashboard className="w-4 h-4 text-red-600" />
                  Open Comprehensive Matrix
                </button>
                <div className="h-px bg-slate-100 my-1 mx-2"></div>
                <button 
                  onClick={handlePrint}
                  className="w-full text-left px-4 py-3 text-[10px] font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 uppercase tracking-widest"
                >
                  <Printer className="w-4 h-4" />
                  Global Ledger PDF
                </button>
                <button 
                  onClick={exportToExcel}
                  className="w-full text-left px-4 py-3 text-[10px] font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 uppercase tracking-widest"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Raw Data Export (Excel)
                </button>
              </div>
            )}
          </div>
          <button 
            onClick={() => { setEditingProject(null); setEditingProductivityMetrics([]); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-black transition-all active:scale-95"
          >
            <Plus className="w-3 h-3" />
            {t.projects_view.new_project}
          </button>
        </div>
      </div>

      {/* KPI Section */}
      {selectedId === null && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:hidden">
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel p-5 bg-white border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Velocity</p>
                <h3 className="text-xl font-bold font-mono text-slate-900">84.2%</h3>
              </div>
            </div>
            <div className="glass-panel p-5 bg-white border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Risk Encumbrance</p>
                <h3 className="text-xl font-bold font-mono text-slate-900">12.5%</h3>
              </div>
            </div>
            <div className="glass-panel p-5 bg-white border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Budget Efficiency</p>
                <h3 className="text-xl font-bold font-mono text-slate-900">92.1%</h3>
              </div>
            </div>
          </div>
          <div className="lg:col-span-4 glass-panel bg-white border border-slate-100 p-4 h-[220px] flex items-center justify-center">
              <div className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={kpiData}>
                    <PolarGrid stroke="#f1f5f9" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} />
                    <Radar name="Project KPIs" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Project Selection Directory (Full-screen grid when none selected, Hidden when showcase is active) */}
        <div className={cn(
          "print:hidden transition-all duration-300",
          selectedId === null ? "xl:col-span-12 space-y-6" : "hidden"
        )}>
          <div className="flex items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-250 border-slate-200">
            <div className="glass-panel px-4 py-2.5 rounded-lg flex items-center gap-3 bg-white border border-slate-200 flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={language === 'ar' ? 'البحث في المشاريع وسجل الأداء...' : 'Search assets and projects...'}
                className="bg-transparent border-none outline-none text-xs w-full placeholder:text-slate-400 text-slate-800 font-medium"
              />
            </div>
            
            <button 
              onClick={() => {
                setRiskSortOrder(prev => {
                  if (prev === 'none') return 'high-low';
                  if (prev === 'high-low') return 'low-high';
                  return 'none';
                });
              }}
              className={cn(
                "px-4 py-2.5 rounded-lg border transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest bg-white shadow-sm",
                riskSortOrder !== 'none' ? "bg-red-600 text-white border-red-700 hover:bg-red-700" : "text-slate-600 border-slate-200 hover:border-slate-400"
              )}
              title="Sort by Risk Level"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>
                {language === 'ar' ? 'فرز المخاطر' : 'Risk Rating'}: {riskSortOrder === 'none' ? (language === 'ar' ? 'افتراضي' : 'Default') : riskSortOrder === 'high-low' ? 'H → L' : 'L → H'}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <div 
                key={project.id}
                onClick={() => setSelectedId(project.id)}
                className="p-6 bg-white border border-slate-150 border-slate-200 rounded-xl cursor-pointer transition-all duration-300 shadow-sm hover:shadow-lg hover:-translate-y-1 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                      {project.id}
                    </span>
                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedId(project.id); setIsFullReportOpen(true); }}
                        className="p-1 px-1.5 border border-slate-200 rounded text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-slate-100 transition-all font-bold text-[9px] uppercase tracking-wider flex items-center gap-1"
                        title="Open Report Matrix"
                      >
                        <LayoutDashboard className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingProject(project); setEditingProductivityMetrics(project.productivityMetrics || []); setIsModalOpen(true); }}
                        className="p-1 px-1.5 border border-slate-200 rounded text-slate-500 hover:text-red-650 bg-slate-50 hover:bg-slate-100 transition-all font-bold text-[9px] uppercase tracking-wider flex items-center gap-1"
                        title="Edit Project"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteProjectLocal(project.id, e)}
                        className="p-1 px-1.5 border border-slate-200 rounded text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 transition-all font-bold text-[9px] uppercase tracking-wider flex items-center gap-1"
                        title="Delete Project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-red-700 transition-colors leading-snug font-sans truncate mb-4">
                    {d(project.name)}
                  </h4>

                  <div className="space-y-4">
                    {/* Budget progress bar */}
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-slate-500 font-bold uppercase tracking-wider">{t.projects_view.budget_utilization}</span>
                        <span className="font-mono font-bold text-slate-900">
                          {Math.round((project.spent / project.budget) * 100)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-slate-900 rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min(100, Math.round((project.spent / project.budget) * 100))}%` }}
                        />
                      </div>
                    </div>

                    {/* Real-time Countdown Timeline Progress */}
                    {(() => {
                      const timeline = getProjectTimelineData(project, currentTime);
                      return (
                        <div className="pt-3 border-t border-dashed border-slate-150 border-slate-200">
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="text-slate-500 font-bold uppercase tracking-wider">Time Duration progress</span>
                            <span className="font-mono font-bold text-red-650">
                              {Math.round(timeline.percentage)}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                            <div 
                              className="h-full bg-red-600 rounded-full transition-all duration-1000"
                              style={{ width: `${Math.min(100, Math.round(timeline.percentage))}%` }}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between text-[10px] bg-slate-50 p-2 rounded-lg border border-slate-150 border-slate-200 font-mono">
                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[8px]">Remaining Time</span>
                            {timeline.isOver ? (
                              <span className="font-bold text-emerald-600 uppercase text-[9px]">Completed</span>
                            ) : (
                              <span className="font-bold text-slate-800 text-[10px]">
                                {timeline.months}m {timeline.days}d {timeline.hours}h {timeline.minutes}m
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Explore click helper */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-red-600 group-hover:text-red-700 transition-colors uppercase tracking-widest">
                  <span>{language === 'ar' ? 'عرض لوحة التحكم الشاملة' : 'Explore Showcase Dashboard'}</span>
                  <span className="transition-transform group-hover:translate-x-1 duration-200 text-xs">→</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail Panel (Showcase) */}
        {selectedProject && (
          <div className="xl:col-span-12 flex flex-col gap-6 mb-8">
            {/* Back Button and Showcase Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <button
                onClick={() => setSelectedId(null)}
                className="flex items-center gap-2.5 px-4 py-2.5 border border-slate-200 hover:border-red-500 bg-white hover:bg-red-50 text-slate-700 hover:text-red-700 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-200 shadow-sm shrink-0"
              >
                <ArrowLeft className="w-4 h-4 text-red-650" />
                <span>
                  {language === 'ar' ? 'الرجوع إلى قائمة المشاريع' : 'Back to Projects List'}
                </span>
              </button>
              <div className="text-left sm:text-right">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  {language === 'ar' ? 'البوابة الذكية للمشروع (لوحة تحكم كاملة)' : 'PROJECT PROFILE INTELLIGENCE (SHOWCASE MODE)'}
                </span>
                <div className="text-sm font-extrabold text-slate-800 flex items-center justify-start sm:justify-end gap-2 mt-0.5 font-sans">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse shrink-0" />
                  <span>{selectedProject.name}</span>
                </div>
              </div>
            </div>
              {/* BRANDED TIME COUNTDOWN TIMELINE HEADER BANNER */}
              {(() => {
                const timeline = getProjectTimelineData(selectedProject, currentTime);
                return (
                  <div className="glass-panel p-6 bg-gradient-to-r from-slate-900 to-red-950 border border-slate-800 text-white rounded-xl shadow-xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-red-100">
                          Active Timeline Countdown
                        </span>
                        <h4 className="text-lg font-bold mt-1 text-slate-100">
                          Completion countdown tracker
                        </h4>
                      </div>
                      
                      {/* Counter numbers */}
                      {timeline.isOver ? (
                        <div className="bg-white/10 px-4 py-2 rounded-lg font-bold text-sm tracking-wider uppercase border border-white/20 backdrop-blur-sm self-start text-emerald-400">
                          Project Completed / Target Reached
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          {[
                            { value: timeline.months, label: 'Months' },
                            { value: timeline.days, label: 'Days' },
                            { value: timeline.hours, label: 'Hours' },
                            { value: timeline.minutes, label: 'Minutes' }
                          ].map((unit, i) => (
                            <div key={i} className="bg-slate-900/85 border border-slate-800 px-3 py-2 rounded-lg text-center backdrop-blur-sm min-w-[64px] shadow-md">
                              <p className="text-xl font-mono font-bold leading-none text-red-400">{String(unit.value).padStart(2, '0')}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">{unit.label}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Progress Slider */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold tracking-wider uppercase">
                        <div className="flex items-center gap-1">
                          <span>Started:</span>
                          <span className="font-mono text-slate-200">{formatDate(selectedProject.createdAt || selectedProject.startDate)}</span>
                        </div>
                        <span className="bg-red-950/40 text-red-400 border border-red-900/40 px-2 py-0.5 rounded font-mono text-[10px] font-bold">
                          {Math.round(timeline.percentage)}% Time Elapsed
                        </span>
                        <div className="flex items-center gap-1">
                          <span>Target End:</span>
                          <span className="font-mono text-slate-200">{formatDate(selectedProject.endDate)}</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5">
                        <div 
                          className="h-full bg-red-600 rounded-full transition-all duration-1000 shadow-sm"
                          style={{ width: `${timeline.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="glass-panel p-8 bg-white border border-slate-200">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{d(selectedProject.name)}</h3>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[9px] font-bold uppercase border",
                        selectedProject.status === 'Active' ? "bg-red-50 text-red-700 border-red-100" :
                        selectedProject.status === 'Completed' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                        "bg-slate-100 text-slate-600 border-slate-200"
                      )}>
                        {d(selectedProject.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-slate-500">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-300" />
                        <span className="text-xs font-medium">{formatDate(selectedProject.startDate)} &mdash; {formatDate(selectedProject.endDate)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-slate-300" />
                        <span className="text-xs font-medium uppercase tracking-widest">{selectedProject.id}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Allocated Budget</p>
                      <h2 className="text-2xl font-mono font-bold text-slate-900 leading-none">{formatCurrency(selectedProject.budget)}</h2>
                    </div>
                    <div className="relative group">
                      <button 
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-700 text-white rounded-md text-[10px] font-bold uppercase tracking-widest shadow-sm hover:bg-black transition-all"
                      >
                        <Printer className="w-3 h-3" /> Report Matrix <ChevronDown className="w-3 h-3" />
                      </button>
                      <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-1 group-hover:translate-y-0">
                        <button 
                          onClick={() => setIsFullReportOpen(true)}
                          className="w-full text-left px-4 py-3 text-[10px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 uppercase tracking-widest"
                        >
                          <LayoutDashboard className="w-4 h-4 text-red-600" />
                          Comprehensive Report
                        </button>
                        <div className="h-px bg-slate-100 my-1 mx-2"></div>
                        <button 
                          onClick={() => {
                              import('../lib/pdfUtils').then(({ generateStandardPDF }) => {
                                  const { doc, startY } = generateStandardPDF(`PROJECT DOSSIER: ${selectedProject.name}`, company || {});
                                  let y = startY;
                                  
                                  doc.text(`ID: ${selectedProject.id} | Status: ${selectedProject.status}`, 14, y); y += 8;
                                  doc.text(`Timeline: ${formatDate(selectedProject.startDate)} to ${formatDate(selectedProject.endDate)}`, 14, y); y += 8;
                                  doc.text(`Project Manager: ${selectedProject.managerId}`, 14, y); y += 8;
                                  doc.text(`Risk Level: ${selectedProject.riskLevel}`, 14, y); y += 12;

                                  doc.setFont("courier", "bold");
                                  doc.text(`FINANCIAL EXPOSURE`, 14, y); y += 8;
                                  doc.setFont("courier", "normal");
                                  doc.text(`Budget: ${formatCurrency(selectedProject.budget)}`, 14, y); y += 8;
                                  doc.text(`Spent: ${formatCurrency(selectedProject.spent)}`, 14, y); y += 8;
                                  doc.text(`Remaining Budget: ${formatCurrency(selectedProject.budget - selectedProject.spent)}`, 14, y); y += 8;
                                  doc.text(`Contract Value: ${formatCurrency(selectedProject.contractValue)}`, 14, y); y += 16;
                                  
                                  doc.setFont("courier", "bold");
                                  doc.text(`PERSONNEL OVERVIEW`, 14, y); y += 8;
                                  doc.setFont("courier", "normal");
                                  doc.text(`Total Assigned Workers: ${teamMembers.length}`, 14, y); y += 8;
                                  doc.text(`Daily Labor Burn Rate: ${formatCurrency(teamMembers.reduce((sum, w) => sum + w.dailyRate, 0))} / Day`, 14, y); y += 16;

                                  doc.setFont("courier", "bold");
                                  doc.text(`RESOURCES & ASSETS`, 14, y); y += 8;
                                  doc.setFont("courier", "normal");
                                  doc.text(`Materials (SKUs): ${projectResources.filter(r => r.category === 'Material').length}`, 14, y); y += 8;
                                  doc.text(`Equipment (Assets): ${projectResources.filter(r => r.category === 'Equipment').length}`, 14, y); y += 16;

                                  if (y > 250) { doc.addPage(); y = 20; }
                                  
                                  doc.setFont("courier", "bold");
                                  doc.text(`RISK MITIGATION DIRECTIVES`, 14, y); y += 8;
                                  doc.setFont("courier", "normal");
                                  const lines = doc.splitTextToSize(selectedProject.riskDetails || 'No explicit risk details noted.', 180);
                                  doc.text(lines, 14, y);
                                  
                                  doc.save(`Project_${selectedProject.id}_Summary.pdf`);
                              });
                          }}
                          className="w-full text-left px-4 py-3 text-[10px] font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 uppercase tracking-widest"
                        >
                          <Printer className="w-4 h-4" />
                          Short PDF Summary
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 border-b border-slate-100 mb-8 print:hidden overflow-x-auto">
                  {(['Analytics', 'Roadmap', 'Personnel', 'Resources', 'Financial', 'Productivity Metrics', 'Daily Output'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab as any)}
                      className={cn(
                        "px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all relative whitespace-nowrap",
                        activeTab === tab ? "text-red-600" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      {tab === 'Analytics' ? t.projects_view.analytics :
                       tab === 'Personnel' ? t.projects_view.personnel :
                       tab === 'Resources' ? t.projects_view.resources :
                       tab === 'Financial' ? t.projects_view.financial :
                       tab === 'Roadmap' ? t.projects_view.roadmap :
                       tab === 'Productivity Metrics' ? 'Productivity Metrics' :
                       (language === 'ar' ? 'الإنتاج اليومي والتقارير' : 'Daily Output & Reports')}
                      {activeTab === tab && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />
                      )}
                    </button>
                  ))}
                </div>

                {activeTab === 'Analytics' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div className="glass-panel p-4 bg-red-50/50 border border-red-100 rounded-lg">
                        <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest mb-1">Assigned Personnel</p>
                        <h4 className="text-xl font-mono font-bold text-slate-900">{teamMembers.length} <span className="text-[10px] text-slate-400">Headcount</span></h4>
                      </div>
                      <div className="glass-panel p-4 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                        <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Materials Indexed</p>
                        <h4 className="text-xl font-mono font-bold text-slate-900">{projectResources.filter(r => r.category === 'Material').length} <span className="text-[10px] text-slate-400">SKUs</span></h4>
                      </div>
                      <div className="glass-panel p-4 bg-amber-50/50 border border-amber-100 rounded-lg">
                        <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-1">Active Equipment</p>
                        <h4 className="text-xl font-mono font-bold text-slate-900">{projectResources.filter(r => r.category === 'Equipment').length} <span className="text-[10px] text-slate-400">Assets</span></h4>
                      </div>
                      <div className="glass-panel p-4 bg-rose-50/50 border border-rose-100 rounded-lg">
                        <p className="text-[9px] font-bold text-rose-600 uppercase tracking-widest mb-1">Daily Labor Burn</p>
                        <h4 className="text-xl font-mono font-bold text-slate-900">${teamMembers.reduce((acc, w) => acc + w.dailyRate, 0)} <span className="text-[10px] text-slate-400">/ Day</span></h4>
                      </div>
                    </div>

                    <div>
                      <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-3 h-3" />
                        Comparative Analytics
                      </h5>
                      <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={budgetData.filter(d => d.name === selectedProject.id)}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                            />
                            <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#94a3b8' }} 
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(248, 250, 252, 0.5)' }} />
                            <Bar dataKey="budget" fill="#f1f5f9" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="spent" fill="#0f172a" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div>
                      <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                        <Activity className="w-3 h-3" />
                        Critical Milestones
                      </h5>
                      <div className="space-y-4">
                        {projectTasks.map((ms, idx) => (
                          <div key={idx} className="flex gap-4 group">
                            <div className="flex flex-col items-center">
                              <div className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center font-bold",
                                ms.status === 'Completed' ? "bg-emerald-500 border-emerald-500 text-white" :
                                ms.status === 'In Progress' ? "border-red-500 text-red-500" :
                                "border-slate-200 text-slate-200"
                              )}>
                                {ms.status === 'Completed' ? <CheckCircle2 className="w-3 h-3" /> : <span className="text-[8px]">{idx + 1}</span>}
                              </div>
                              {idx < projectTasks.length - 1 && (
                                <div className="w-0.5 h-full bg-slate-100 my-1" />
                              )}
                            </div>
                            <div className="flex-1 pb-4">
                              <div className="flex justify-between items-start mb-1">
                                <p className="text-xs font-bold text-slate-800">{ms.task}</p>
                                <span className="text-[9px] font-mono font-medium text-slate-400">{formatDate(ms.date)}</span>
                              </div>
                              <p className={cn(
                                "text-[9px] font-bold uppercase tracking-wider",
                                ms.status === 'Completed' ? "text-emerald-500" :
                                ms.status === 'In Progress' ? "text-red-500" :
                                "text-slate-400"
                              )}>
                                {ms.status}
                              </p>
                            </div>
                          </div>
                        ))}
                        {projectTasks.length === 0 && (
                          <div className="py-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">No milestones defined in site planning</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'Productivity Metrics' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex justify-between items-center mb-6">
                      <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Target className="w-3 h-3" />
                        Defined Productivity Goals
                      </h5>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedProject.productivityMetrics?.map(metric => (
                        <div key={metric.id} className="glass-panel p-4 bg-white border border-slate-100 rounded-lg">
                          <h6 className="text-sm font-bold text-slate-900 mb-2">{metric.targetTask}</h6>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Unit</p>
                              <p className="font-mono text-xs">{metric.unitMeasurement}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Default Daily Quota</p>
                              <p className="font-mono text-xs">{metric.defaultDailyQuota} {metric.unitMeasurement}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Est. Unit Cost</p>
                              <p className="font-mono text-xs">${metric.defaultUnitCost.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {!selectedProject.productivityMetrics?.length && (
                        <p className="text-xs text-slate-500 italic">No metrics defined for this project.</p>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'Daily Output' && (() => {
                  const projectOutputs = dailyOutputs.filter(d => d.projectId === selectedProject.id);
                  const totalExpected = projectOutputs.reduce((sum, curr) => sum + curr.expectedMeters, 0);
                  const totalActual = projectOutputs.reduce((sum, curr) => sum + curr.actualMeters, 0);
                  const efficiencyPct = totalExpected > 0 ? Math.round((totalActual / totalExpected) * 100) : 0;
                  const latestOutput = projectOutputs[0]; // array sorted or latest first
                  const overallStatus = latestOutput ? latestOutput.status : 'On Track';
                  const totalDaysPlanned = latestOutput ? latestOutput.daysRequired : '-';

                  return (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8 text-slate-900">
                      {/* STATS HEADER CARDS */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="glass-panel p-4 bg-slate-50 border border-slate-200 rounded-lg">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                            {language === 'ar' ? 'الورديات المسجلة' : 'TOTAL SHIFTS LOGGED'}
                          </p>
                          <h4 className="text-2xl font-mono font-bold text-slate-900">{projectOutputs.length}</h4>
                        </div>
                        <div className="glass-panel p-4 bg-emerald-50/40 border border-emerald-100 rounded-lg">
                          <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1">
                            {language === 'ar' ? 'إجمالي الأمتار المنجزة' : 'CUMULATIVE METERS ACHIEVED'}
                          </p>
                          <h4 className="text-2xl font-mono font-bold text-emerald-700">{totalActual} <span className="text-xs text-slate-400">m</span></h4>
                        </div>
                        <div className={cn(
                          "glass-panel p-4 rounded-lg border",
                          efficiencyPct >= 100 ? "bg-green-50/30 border-green-100" : "bg-red-50/30 border-red-100"
                        )}>
                          <p className="text-[9px] font-bold uppercase tracking-widest mb-1">
                            {language === 'ar' ? 'مؤشر كفاءة الإنتاج' : 'PRODUCTION EFFICIENCY'}
                          </p>
                          <h4 className="text-2xl font-mono font-bold text-slate-900">{efficiencyPct}%</h4>
                        </div>
                        <div className={cn(
                          "glass-panel p-4 rounded-lg border",
                          overallStatus === 'Behind Schedule' ? "bg-amber-50/50 border-amber-100" : "bg-blue-50/30 border-blue-100"
                        )}>
                          <p className="text-[9px] font-bold uppercase tracking-widest mb-1">
                            {language === 'ar' ? 'حالة الجدول لتاريخه' : 'OVERALL SCHEDULE STATUS'}
                          </p>
                          <span className={cn(
                            "inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mt-1.5",
                            overallStatus === 'Ahead of Schedule' ? "bg-emerald-100 text-emerald-800" :
                            overallStatus === 'On Track' ? "bg-blue-100 text-blue-800" :
                            "bg-red-100 text-red-800"
                          )}>
                            {language === 'ar' ? 
                              (overallStatus === 'Ahead of Schedule' ? 'متقدم عن الجدول' :
                               overallStatus === 'On Track' ? 'حسب الخطة' : 'متأخر عن الجدول') :
                              overallStatus
                            }
                          </span>
                        </div>
                      </div>

                      {/* ACTIONS BAR */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          {projectOutputs.length > 0 && (
                            <input
                              type="checkbox"
                              checked={projectOutputs.length > 0 && selectedDailyOutputIds.length === projectOutputs.length}
                              onChange={e => {
                                const checked = e.target.checked;
                                setSelectedDailyOutputIds(checked ? projectOutputs.map(o => o.id) : []);
                              }}
                              className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300 cursor-pointer"
                              title={language === 'ar' ? 'تحديد الكل للطباعة الجماعية' : 'Select All for Batch Print'}
                            />
                          )}
                          <div>
                            <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              {language === 'ar' ? 'سجلات المخرجات اليومية للشفتات' : 'Daily Shift Output Logs'}
                            </h5>
                            <p className="text-xs text-slate-500 mt-1">
                              {language === 'ar' ? 'تتبع التقدم اليومي الفعلي للأمتار، القوى العاملة، وتوليد تقارير الإنتاج الرسمية.' : 'Track live day-by-day linear meters, manpower headcount, and compile official PDF reports.'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 print:hidden">
                          {selectedDailyOutputIds.length > 0 && (
                            <button
                              onClick={handlePrintSelectedDailyOutputs}
                              className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-md transition-all border border-slate-950"
                              title={language === 'ar' ? 'طباعة تقارير الورديات المحددة' : 'Print Selected Shift Reports'}
                            >
                              <Printer className="w-3.5 h-3.5 text-red-500" />
                              <span>
                                {language === 'ar' ? `طباعة المحدد (${selectedDailyOutputIds.length})` : `Print Selected (${selectedDailyOutputIds.length})`}
                              </span>
                            </button>
                          )}
                          {projectOutputs.length > 0 && (
                            <button
                              onClick={handlePrintCumulativeProductionReport}
                              className="px-4 py-2 border border-slate-200 text-slate-700 bg-white rounded text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-all"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                              {language === 'ar' ? 'تقرير الأداء التراكمي الشامل' : 'Project Performance Audit (PDF)'}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingDailyOutput(null);
                              setDoDate(new Date().toISOString().split('T')[0]);
                              setDoTimeframe('07:00 - 16:00');
                              setDoWorkersCount(10);
                              setDoWorkersType('');
                              setDoExpectedMeters(100);
                              setDoActualMeters(100);
                              setDoDaysRequired(10);
                              setDoStatus('On Track');
                              setDoNotes('');
                              setDoTaskId('');
                              setIsDailyOutputModalOpen(true);
                            }}
                            className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-md transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {language === 'ar' ? 'تسجيل مخرجات الوردية اليومية' : 'Log Day Shift Output'}
                          </button>
                         </div>
                      </div>

                      {/* OUTPUTS GRAPHICAL MATRIX / TIMELINE LOGS LIST */}
                      <div className="space-y-4">
                        {projectOutputs.length === 0 ? (
                          <div className="text-center py-12 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
                            <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                            <h6 className="text-sm font-bold text-slate-800">{language === 'ar' ? 'لا توجد سجلات إنتاجية حالياً' : 'No Shift Outputs Logged'}</h6>
                            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                              {language === 'ar' ? 'اضغط على زر التسجيل لإضافة تفاصيل أمتار اليوم، والورديات، للتأكد من المتابعة الدقيقة للجدول.' : 'Start adding daily output shift data to generate charts, calculate completion rates, and print formal audit logs.'}
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-4">
                            {projectOutputs.map(item => {
                              const completionRate = Math.round((item.actualMeters / item.expectedMeters) * 100);
                              return (
                                <div key={item.id} className="glass-panel p-6 bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-sm transition-all space-y-4 text-slate-900">
                                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1">
                                      <input
                                        type="checkbox"
                                        checked={selectedDailyOutputIds.includes(item.id)}
                                        onChange={e => {
                                          const checked = e.target.checked;
                                          setSelectedDailyOutputIds(prev => 
                                            checked ? [...prev, item.id] : prev.filter(id => id !== item.id)
                                          );
                                        }}
                                        className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300 mt-1 cursor-pointer shrink-0"
                                        title={language === 'ar' ? 'تحديد هذا السجل' : 'Select this log'}
                                      />
                                      <div className="space-y-1 flex-1">
                                        <div className="flex items-center gap-2.5">
                                          <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                            {item.date}
                                          </span>
                                          <span className={cn(
                                            "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
                                            item.status === 'Ahead of Schedule' ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                                            item.status === 'On Track' ? "bg-blue-100 text-blue-800 border border-blue-200" :
                                            "bg-rose-100 text-rose-800 border border-rose-200"
                                          )}>
                                            {language === 'ar' ? 
                                              (item.status === 'Ahead of Schedule' ? 'متقدم عن الجدول' :
                                               item.status === 'On Track' ? 'حسب الخطة' : 'متأخر عن الجدول') :
                                              item.status
                                            }
                                          </span>
                                        </div>
                                        <h6 className="text-sm font-bold text-slate-900 pt-1 flex items-center gap-1.5 font-sans">
                                          <CalendarCheck className="w-4 h-4 text-red-600" />
                                          {language === 'ar' ? `إنتاجية شفت: ${item.timeframe}` : `Shift: ${item.timeframe}`}
                                        </h6>
                                      </div>
                                    </div>

                                    {/* Action Buttons for log */}
                                    <div className="flex items-center gap-2 self-start print:hidden">
                                      <button
                                        onClick={() => handlePrintDailyOutput(item)}
                                        className="p-1.5 border border-slate-200 bg-white rounded hover:bg-slate-50 text-slate-500 hover:text-slate-850 transition-colors flex items-center gap-1"
                                        title={language === 'ar' ? 'توليد تقرير رسمي PDF' : 'Download PDF Production Report'}
                                      >
                                        <Printer className="w-3.5 h-3.5 text-slate-800" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-700 pr-1">{language === 'ar' ? 'تقرير' : 'Report'}</span>
                                      </button>
                                      <button
                                        onClick={() => handleEditDailyOutput(item)}
                                        className="p-1.5 border border-slate-200 bg-white rounded hover:bg-slate-50 text-slate-500 hover:text-red-600 transition-colors"
                                        title={language === 'ar' ? 'تعديل السجل' : 'Edit Daily Log'}
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteDailyOutput(item.id)}
                                        className="p-1.5 border border-slate-200 bg-white rounded hover:bg-slate-50 text-slate-500 hover:text-red-700 transition-colors"
                                        title={language === 'ar' ? 'حذف السجل' : 'Delete Daily Log'}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Grid Details */}
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
                                    <div className="bg-slate-50/50 p-2.5 rounded border border-slate-100 space-y-1">
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                        {language === 'ar' ? 'العمالة والمهام' : 'WORKFORCE'}
                                      </p>
                                      <p className="font-bold text-slate-800 flex items-center gap-1">
                                        <Users className="w-3.5 h-3.5 text-slate-500" />
                                        {item.workersCount} {language === 'ar' ? 'عامل' : 'Workers'}
                                      </p>
                                      <p className="text-[10px] text-slate-500 font-medium italic">{item.workersType || '-'}</p>
                                    </div>
                                    <div className="bg-slate-50/50 p-2.5 rounded border border-slate-100 space-y-1">
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                        {language === 'ar' ? 'مستوى المخرجات المخطط والفعلي' : 'OUTPUT (METERS)'}
                                      </p>
                                      <p className="font-medium text-slate-800">
                                        {language === 'ar' ? 'فعلي:' : 'Actual:'} <span className="font-mono font-bold text-red-600">{item.actualMeters}m</span> /
                                        {language === 'ar' ? 'مستهدف:' : 'Expected:'} <span className="font-mono font-bold text-slate-500">{item.expectedMeters}m</span>
                                      </p>
                                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
                                        <div 
                                          className={cn("h-full rounded-full transition-all", completionRate >= 100 ? "bg-emerald-500" : "bg-red-500")}
                                          style={{ width: `${Math.min(completionRate, 100)}%` }}
                                        />
                                      </div>
                                    </div>
                                    <div className="bg-slate-50/50 p-2.5 rounded border border-slate-100 space-y-1">
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                        {language === 'ar' ? 'مؤشر الكفاءة الإنتاجية الشفتية' : 'SHIFT EFFICIENCY'}
                                      </p>
                                      <p className={cn("text-base font-mono font-extrabold", completionRate >= 100 ? "text-emerald-600" : "text-red-500")}>
                                        {completionRate}%
                                      </p>
                                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                        {completionRate >= 100 ? 
                                          (language === 'ar' ? 'تم تحقيق المستهدف' : 'TARGET GAINED') : 
                                          (language === 'ar' ? `عجز المخرجات: ${100 - completionRate}%` : `DEFICIT: ${100 - completionRate}%`)}
                                      </p>
                                    </div>
                                    <div className="bg-slate-50/50 p-2.5 rounded border border-slate-100 space-y-1">
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                        {language === 'ar' ? 'توقع الأيام الكلية المطلوبة' : 'ESTIMATED DAYS REQUIRED'}
                                      </p>
                                      <p className="text-base font-mono font-extrabold text-slate-800">
                                        {item.daysRequired} <span className="text-xs font-semibold text-slate-400">{language === 'ar' ? 'أيام' : 'Days'}</span>
                                      </p>
                                      <p className="text-[9px] text-slate-400 leading-none">
                                        {language === 'ar' ? 'الجدول الكلي المحتسب بناء على الوردية' : 'Overall plan timeline required'}
                                      </p>
                                    </div>
                                  </div>

                                  {item.notes && (
                                    <div className="bg-amber-50/30 border border-amber-100/40 p-3 rounded-lg text-xs">
                                      <span className="font-bold text-amber-800 uppercase text-[9px] tracking-wider block mb-1">
                                        {language === 'ar' ? 'الملاحظات والتعليمات الميدانية (بعد إنتهاء الوردية):' : 'SHIFT WRAP-UP FIELD NOTES:'}
                                      </span>
                                      <p className="text-slate-650 text-slate-700 font-medium italic">"{item.notes}"</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {activeTab === 'Resources' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex justify-between items-center mb-6">
                      <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Zap className="w-3 h-3" />
                        Project Material & Equipment Matrix
                      </h5>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => openResourceModal('Material')}
                          className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded"
                        >
                          <Plus className="w-3 h-3" />
                          Add Material
                        </button>
                        <button 
                          onClick={() => openResourceModal('Equipment')}
                          className="text-[10px] font-bold uppercase tracking-widest text-amber-600 hover:text-amber-700 transition-colors flex items-center gap-1.5 px-3 py-1 bg-amber-50 rounded"
                        >
                          <Plus className="w-3 h-3" />
                          Add Equipment
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Materials List */}
                      <div className="space-y-4">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-tighter border-l-2 border-emerald-400 pl-2">Assigned Materials</p>
                        <div className="space-y-2">
                          {projectResources.filter(r => r.category === 'Material').map(res => (
                            <div key={res.id} className="glass-panel p-3 border border-slate-100 bg-white group hover:border-emerald-200 transition-all">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h6 className="text-xs font-bold text-slate-900">{res.name}</h6>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{res.type}</p>
                                </div>
                                <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase">
                                  {res.status}
                                </span>
                              </div>
                              <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">
                                <div className="text-[10px]">
                                  <span className="font-bold text-slate-900">{res.quantity}</span>
                                  <span className="text-slate-400 ml-1 uppercase font-bold">{res.unit}</span>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] font-mono font-bold text-slate-900">{formatCurrency(res.totalCost)}</p>
                                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Total Value</p>
                                </div>
                              </div>
                            </div>
                          ))}
                          {projectResources.filter(r => r.category === 'Material').length === 0 && (
                            <p className="text-[10px] text-slate-400 italic py-6 text-center border-2 border-dashed border-slate-50 rounded-lg">No materials assigned.</p>
                          )}
                        </div>
                      </div>

                      {/* Equipment List */}
                      <div className="space-y-4">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-tighter border-l-2 border-amber-400 pl-2">Operational Equipment</p>
                        <div className="space-y-2">
                          {projectResources.filter(r => r.category === 'Equipment').map(res => (
                            <div key={res.id} className="glass-panel p-3 border border-slate-100 bg-white group hover:border-amber-200 transition-all">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h6 className="text-xs font-bold text-slate-900">{res.name}</h6>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{res.type}</p>
                                </div>
                                <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100 uppercase">
                                  {res.status}
                                </span>
                              </div>
                              <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">
                                <div className="text-[10px]">
                                  <span className="font-bold text-slate-900">{res.quantity}</span>
                                  <span className="text-slate-400 ml-1 uppercase font-bold">{res.unit}</span>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] font-mono font-bold text-slate-900">{formatCurrency(res.totalCost)}</p>
                                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">OpEx Impact</p>
                                </div>
                              </div>
                            </div>
                          ))}
                          {projectResources.filter(r => r.category === 'Equipment').length === 0 && (
                            <p className="text-[10px] text-slate-400 italic py-6 text-center border-2 border-dashed border-slate-50 rounded-lg">No equipment deployed.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'Roadmap' && (() => {
                  const startCalendarStr = selectedProject?.startDate || '2026-06-01';
                  const endCalendarStr = selectedProject?.endDate || '2026-06-30';
                  
                  const startCal = new Date(startCalendarStr);
                  const endCal = new Date(endCalendarStr);
                  const calculatedTotalDays = Math.max(1, Math.round((endCal.getTime() - startCal.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                  const totalProjectDays = calculatedTotalDays < 5 ? 30 : calculatedTotalDays;

                  const dayCells = Array.from({ length: totalProjectDays }, (_, i) => i + 1);

                  // Filter tasks/breaks active on the focusedDay
                  const activeProductionTasks = projectTasks.filter(t => {
                    if (t.taskType !== 'Task') return false;
                    const sDay = t.startDay !== undefined ? t.startDay : 1;
                    const eDay = t.endDay !== undefined ? t.endDay : 1;
                    return focusedDay >= sDay && focusedDay <= eDay;
                  });

                  const activeBreaks = projectTasks.filter(t => {
                    if (t.taskType !== 'Break') return false;
                    const sDay = t.startDay !== undefined ? t.startDay : 1;
                    const eDay = t.endDay !== undefined ? t.endDay : 1;
                    return focusedDay >= sDay && focusedDay <= eDay;
                  });

                  return (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                      {/* Control Panel / Navigation Toolbar */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 border border-slate-150 rounded-xl">
                        <div className="space-y-1">
                          <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                            {language === 'ar' ? 'نظام تخطيط الجدول الزمني والورديات اليومية' : 'TIMELINE & SHIFT PLANNING BOARD'}
                          </h5>
                          <p className="text-xs text-slate-500 font-medium">
                            {language === 'ar' 
                              ? 'قم بجدولة المهام وتحديد أيام الراحة ومطابقة تدفقات الإنتاجية بدقة' 
                              : 'Schedule operations, orchestrate breaks, and align site production outputs.'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto shrink-0">
                          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                            <button
                              onClick={() => setTimelineViewMode('day-matrix')}
                              type="button"
                              className={cn(
                                "rounded px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all",
                                timelineViewMode === 'day-matrix'
                                  ? "bg-slate-900 text-white shadow-sm"
                                  : "text-slate-500 hover:text-slate-900 bg-transparent"
                              )}
                            >
                              🔢 {language === 'ar' ? 'الشبكة التفاعلية اليومية' : 'Day-by-Day Shift Matrix'}
                            </button>
                            <button
                              onClick={() => setTimelineViewMode('monthly-gantt')}
                              type="button"
                              className={cn(
                                "rounded px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all",
                                timelineViewMode === 'monthly-gantt'
                                  ? "bg-slate-900 text-white shadow-sm"
                                  : "text-slate-500 hover:text-slate-900 bg-transparent"
                              )}
                            >
                              📅 {language === 'ar' ? 'مخطط غانت العام' : 'Macro Gantt Chart'}
                            </button>
                          </div>
                          
                          <button 
                            onClick={openTaskModalForAdd}
                            type="button"
                            className="text-[10px] font-bold uppercase tracking-wider text-white hover:bg-red-700 bg-red-600 px-3 py-2 rounded-lg shadow transition-all flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {language === 'ar' ? 'تعريف نشاط / استراحة' : 'Define Activity / Break'}
                          </button>
                        </div>
                      </div>

                      {timelineViewMode === 'day-matrix' ? (
                        <div className="space-y-6">
                          {/* Day-by-Day Interactive Ribbon */}
                          <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {language === 'ar' ? 'تحديد وردية الورد اليومي (انقر للمعاينة):' : 'SHIFT TIMELINE RIBBON (CLICK TO SELECT DAY):'}
                              </span>
                              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                                <span className="inline-block w-2.5 h-2.5 bg-red-500 rounded-full"></span>
                                <span className={cn(language === 'ar' ? "ml-3 mr-0.5" : "mr-3 ml-0.5")}>{language === 'ar' ? 'طاقة تشغيلية' : 'Active Tasks'}</span>
                                <span className="inline-block w-2.5 h-2.5 bg-amber-500 rounded-full"></span>
                                <span className={cn(language === 'ar' ? "mr-0.5" : "ml-0.5")}>{language === 'ar' ? 'استراحة / توقف' : 'Periods of Break'}</span>
                              </div>
                            </div>
                            
                            {/* Horizontal scroll container */}
                            <div className="flex gap-2 overflow-x-auto pb-3 pt-1 custom-scrollbar scroll-smooth">
                              {dayCells.map(dayNum => {
                                const dayTasks = projectTasks.filter(t => {
                                  if (t.taskType !== 'Task') return false;
                                  const sDay = t.startDay !== undefined ? t.startDay : 1;
                                  const eDay = t.endDay !== undefined ? t.endDay : 1;
                                  return dayNum >= sDay && dayNum <= eDay;
                                });

                                const dayBreaks = projectTasks.filter(t => {
                                  if (t.taskType !== 'Break') return false;
                                  const sDay = t.startDay !== undefined ? t.startDay : 1;
                                  const eDay = t.endDay !== undefined ? t.endDay : 1;
                                  return dayNum >= sDay && dayNum <= eDay;
                                });

                                const isFocused = focusedDay === dayNum;
                                const mappedDate = getCalculatedDate(startCalendarStr, dayNum);
                                const dObj = new Date(mappedDate);
                                const dayShortName = dObj.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' });

                                return (
                                  <button
                                    key={dayNum}
                                    onClick={() => setFocusedDay(dayNum)}
                                    type="button"
                                    className={cn(
                                      "flex-shrink-0 w-16 p-2 rounded-xl border transition-all text-center flex flex-col items-center justify-between gap-1.5 focus:outline-none relative group",
                                      isFocused
                                        ? "bg-slate-900 text-white border-slate-900 shadow-md scale-[1.02] ring-2 ring-red-500 ring-offset-2"
                                        : "bg-slate-50 hover:bg-white text-slate-800 border-slate-200 hover:border-slate-300"
                                    )}
                                  >
                                    <span className={cn(
                                      "text-[10px] font-black uppercase tracking-tighter block",
                                      isFocused ? "text-red-400" : "text-slate-400"
                                    )}>
                                      Day {dayNum}
                                    </span>
                                    <span className="text-[10px] font-bold block truncate w-full leading-none">
                                      {dayShortName}
                                    </span>
                                    
                                    {/* Small indicator dots */}
                                    <div className="flex gap-1 items-center h-2 mt-1">
                                      {dayTasks.length > 0 && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse block" />
                                      )}
                                      {dayBreaks.length > 0 && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 block" />
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Timeline Quick Step Controls */}
                            <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                              <button
                                type="button"
                                disabled={focusedDay <= 1}
                                onClick={() => setFocusedDay(p => Math.max(1, p - 1))}
                                className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all disabled:opacity-45 disabled:cursor-not-allowed"
                              >
                                ◀ {language === 'ar' ? 'الوردية السابقة' : 'Previous Day Shift'}
                              </button>
                              
                              <div className="text-[10px] font-black text-slate-500 tracking-wider font-mono">
                                {focusedDay} / {totalProjectDays} {language === 'ar' ? 'إجمالي الأيام' : 'TOTAL SHIFT DAYS'}
                              </div>

                              <button
                                type="button"
                                disabled={focusedDay >= totalProjectDays}
                                onClick={() => setFocusedDay(p => Math.min(totalProjectDays, p + 1))}
                                className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all disabled:opacity-45 disabled:cursor-not-allowed"
                              >
                                {language === 'ar' ? 'الوردية التالية' : 'Next Day Shift'} ▶
                              </button>
                            </div>
                          </div>

                          {/* Focused Day Details Card */}
                          <div className="bg-slate-50 rounded-2xl border border-slate-150 p-6 space-y-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200 pb-4">
                              <div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                                  {language === 'ar' ? 'تاريخ المعاينة المحدد ومجموعة الأنشطة الميدانية' : 'OPERATIONAL MATRIX & STAFF DIAGNOSTIC FOR:'}
                                </span>
                                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 mt-0.5">
                                  <Clock className="w-4 h-4 text-slate-500" />
                                  {language === 'ar' ? `اليوم ${focusedDay} من المشروع` : `Day ${focusedDay} of Project Timeline`}
                                  <span className="text-slate-500 text-xs font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                                    {getCalculatedDate(startCalendarStr, focusedDay)}
                                  </span>
                                </h4>
                              </div>
                              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono bg-white px-3 py-1 border border-slate-200 rounded-lg">
                                {language === 'ar' ? 'الحالة الميدانية اليوم:' : 'Status Today:'} {' '}
                                {activeBreaks.length > 0 ? (
                                  <span className="text-amber-650 bg-amber-50 px-1.5 py-0.5 rounded text-amber-700 font-bold font-mono">☕ {language === 'ar' ? 'فترة توقف' : 'Break Active'}</span>
                                ) : activeProductionTasks.length > 0 ? (
                                  <span className="text-red-650 bg-red-50 px-1.5 py-0.5 rounded text-red-600 font-bold font-mono">🚧 {language === 'ar' ? 'إنتاجي نشط' : 'Production Active'}</span>
                                ) : (
                                  <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono">💤 {language === 'ar' ? 'في الاستعداد' : 'Standby'}</span>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              {/* Left & Center: Active Tasks */}
                              <div className="lg:col-span-2 space-y-4">
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                  <Activity className="w-3.5 h-3.5 text-slate-500" />
                                  {language === 'ar' ? 'النشاطات ومكونات العمل الإنتاجية النشطة' : 'Active Production Units & Tasks'} ({activeProductionTasks.length})
                                </h5>

                                <div className="space-y-4">
                                  {activeProductionTasks.map(t => {
                                    const isSelected = selectedTimelineTaskId === t.id;
                                    // Calculate metrics progress
                                    const loggedMeters = dailyOutputs
                                      .filter(item => item.projectId === selectedId && item.taskId === t.id)
                                      .reduce((sum, item) => sum + (Number(item.actualMeters) || 0), 0);
                                    const expectedLimit = t.expectedMeters || 100;
                                    const progressPct = Math.round((loggedMeters / expectedLimit) * 100);

                                    // Filter worker roster deployed to this task
                                    const dnsWorkers = workers.filter(w => w.projectId === selectedId && w.assignedTaskId === t.id);

                                    return (
                                      <div key={t.id} className={cn(
                                        "bg-white border rounded-xl p-5 shadow-sm space-y-4 hover:border-red-200 transition-all",
                                        isSelected ? "border-red-600 ring-2 ring-red-500/20" : "border-slate-200"
                                      )}>
                                        <div className="flex justify-between items-start gap-4">
                                          <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                              <span className="text-[10px] font-mono font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                                ID: {t.id}
                                              </span>
                                              <span className={cn(
                                                "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border",
                                                t.status === 'Completed' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                                t.status === 'In Progress' ? "bg-red-50 text-red-750 border-red-100 animate-pulse" :
                                                "bg-amber-50 text-amber-700 border-amber-100"
                                              )}>
                                                {t.status || 'Pending'}
                                              </span>
                                              {isSelected && (
                                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-red-600 text-white">
                                                  {language === 'ar' ? 'محدد حالياً' : 'SELECTED'}
                                                </span>
                                              )}
                                            </div>
                                            <h6 className="text-sm font-black text-slate-900 leading-tight mt-1">{t.task}</h6>
                                            <p className="text-[11px] text-slate-500 font-medium italic">"{t.goal || t.task}"</p>
                                          </div>
                                          
                                          <div className="flex gap-2 shrink-0">
                                            <select 
                                              value={t.status || 'Pending'} 
                                              onChange={e => handleUpdateTaskStatus(t.id, e.target.value as any)}
                                              className="text-[10px] bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer font-bold outline-none"
                                              title={language === 'ar' ? 'تعديل الحالة مجهرياً' : 'Update Task Status'}
                                            >
                                              <option value="Pending">Pending</option>
                                              <option value="In Progress">In Progress</option>
                                              <option value="Completed">Completed</option>
                                              <option value="Canceled">Canceled</option>
                                            </select>
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                                          {/* Diagnostics columns */}
                                          <div className="space-y-1 text-[11px] text-slate-600">
                                            <div className="flex justify-between">
                                              <span className="font-semibold text-slate-400">Location:</span>
                                              <span className="font-mono font-bold text-slate-900">{t.location || 'Site General'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="font-semibold text-slate-400">Requires Trade:</span>
                                              <span className="font-bold text-red-600">{t.allowedRole || 'Any Specialty'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="font-semibold text-slate-400">Total Bounds:</span>
                                              <span className="font-mono text-slate-500 font-bold">Day {t.startDay} to {t.endDay}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="font-semibold text-slate-400">Personnel Limits:</span>
                                              <span className="font-semibold text-slate-800">Max {t.maxWorkers || 10} crews ({t.maxManagers || 1} admin)</span>
                                            </div>
                                          </div>

                                          {/* Cumulative Meters meters target bar */}
                                          <div className="space-y-2 bg-slate-50/70 p-3 rounded-lg border border-slate-100 flex flex-col justify-center">
                                            <div className="flex justify-between items-center text-[10px] font-bold">
                                              <span className="text-slate-500 uppercase tracking-wide">CUMULATIVE OUTPUT</span>
                                              <span className={cn("font-mono font-black", progressPct >= 100 ? "text-emerald-600" : "text-red-500")}>
                                                {loggedMeters}m / {expectedLimit}m ({progressPct}%)
                                              </span>
                                            </div>
                                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                              <div 
                                                className={cn("h-full rounded-full transition-all", progressPct >= 100 ? "bg-emerald-550 bg-emerald-500" : "bg-red-500")}
                                                style={{ width: `${Math.min(progressPct, 100)}%` }}
                                              />
                                            </div>
                                            {progressPct >= 100 && (
                                              <p className="text-[9px] font-bold text-emerald-600 tracking-wide text-right leading-none m-0 animate-in fade-in">
                                                ✓ Target Output Reached
                                              </p>
                                            )}
                                          </div>
                                        </div>

                                        {/* Deployed workforce roster listing */}
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 space-y-2">
                                          <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                                              👥 Active Crew on Site ({dnsWorkers.length} / {t.maxWorkers || 10})
                                            </span>
                                            <span className="text-[9px] text-slate-450 text-slate-400 font-semibold italic">
                                              * Deployable from Workforce Panel
                                            </span>
                                          </div>
                                          
                                          {dnsWorkers.length > 0 ? (
                                            <div className="flex flex-wrap gap-1.5">
                                              {dnsWorkers.map(w => (
                                                <span 
                                                  key={w.id} 
                                                  className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-slate-700 bg-white border border-slate-200 rounded px-2 py-0.5 shadow-xs"
                                                >
                                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                  {w.name} <span className="text-[8.5px] text-slate-400 font-bold uppercase font-mono">({w.role})</span>
                                                </span>
                                              ))}
                                            </div>
                                          ) : (
                                            <p className="text-[10px] text-slate-400 italic font-medium m-0 flex items-center gap-1 pb-1">
                                              ⚠️ {language === 'ar' 
                                                ? 'لا يوجد عمالة منتدبة حالياً لهذا النشاط اليوم. الرجاء إسناد الكادر من قسم العمال لتمكين تسجيل التقدم.' 
                                                : 'No personnel deployed to this activity today. Deploy matching tradesmen from the Workforce panel.'}
                                            </p>
                                          )}
                                        </div>

                                        {/* Activity Action Toolbar (Select, Edit, Copy, Delete) */}
                                        <div className="flex items-center justify-between border-t border-slate-150 pt-3 bg-slate-50/50 -mx-5 -mb-5 px-5 py-2.5 rounded-b-xl border-t">
                                          <div className="flex gap-2 text-[10px] font-black uppercase tracking-wider">
                                            <button
                                              onClick={() => setSelectedTimelineTaskId(isSelected ? null : t.id)}
                                              type="button"
                                              className={cn(
                                                "px-2.5 py-1.5 rounded border transition-all flex items-center gap-1",
                                                isSelected 
                                                  ? "bg-red-650 bg-red-600 text-white border-red-700" 
                                                  : "bg-white border-slate-250 text-slate-700 hover:bg-slate-100"
                                              )}
                                            >
                                              🎯 {isSelected ? (language === 'ar' ? 'محدد حالياً' : 'Current Selection') : (language === 'ar' ? 'تحديد وتثبيت' : 'Select Activity')}
                                            </button>

                                            <button
                                              onClick={() => openTaskModalForEdit(t)}
                                              type="button"
                                              className="px-2.5 py-1.5 bg-white border border-slate-250 rounded text-slate-700 hover:bg-slate-100 transition-all flex items-center gap-1 font-bold"
                                            >
                                              ✏️ {language === 'ar' ? 'تعديل الخصائص' : 'Edit'}
                                            </button>

                                            <button
                                              onClick={() => openTaskModalForCopy(t)}
                                              type="button"
                                              className="px-2.5 py-1.5 bg-white border border-slate-250 rounded text-slate-700 hover:bg-slate-100 transition-all flex items-center gap-1 font-bold"
                                            >
                                              📋 {language === 'ar' ? 'تكرار / نسخ سريع' : 'Copy'}
                                            </button>
                                          </div>

                                          <button
                                            onClick={() => {
                                              if (confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا النشاط للوردية؟' : 'Are you sure you want to delete this activity?')) {
                                                handleDeleteTask(t.id);
                                                if (isSelected) setSelectedTimelineTaskId(null);
                                              }
                                            }}
                                            type="button"
                                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-250 rounded text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                                          >
                                            🗑️ {language === 'ar' ? 'حذف مبرم' : 'Delete'}
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {activeProductionTasks.length === 0 && (
                                    <div className="bg-white border border-slate-150 rounded-xl p-8 shadow-sm text-center space-y-2">
                                      <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto">
                                        <Clock className="w-5 h-5 text-slate-450 text-slate-400" />
                                      </div>
                                      <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 mb-1 text-slate-600">
                                        💤 {language === 'ar' ? 'لا توجد مهام إنشائية مبرمجة لليوم' : 'NO SITE PRODUCTION SCHEDULED TODAY'}
                                      </p>
                                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                        {language === 'ar'
                                          ? 'اليوم المحدد خالي من مكونات العمل النشطة في مسار المخطط الكلي للجدول الزمني.'
                                          : 'This specific calendar window lists no active pipeline tasks. The field crew remains in reserve mode.'}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Right: Breaks & Off Days */}
                              <div className="space-y-4">
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                  <Coffee className="w-3.5 h-3.5 text-slate-500" />
                                  {language === 'ar' ? 'فترات الراحة والتعطيل والعمليات الموقوفة' : 'Scheduled Breaks & Operational Rest'} ({activeBreaks.length})
                                </h5>

                                <div className="space-y-4">
                                  {activeBreaks.map(b => {
                                    const isSelected = selectedTimelineTaskId === b.id;
                                    return (
                                      <div key={b.id} className={cn(
                                        "bg-white border rounded-xl p-4 shadow-sm relative overflow-hidden group transition-all",
                                        isSelected ? "border-amber-500 ring-2 ring-amber-500/20" : "border-dashed border-amber-200 hover:border-amber-300"
                                      )}>
                                        {/* Diagonal striped element */}
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/[0.04] rotate-45 transform translate-x-12 -translate-y-12 pointer-events-none" />
                                        <div className="flex justify-between items-start gap-3">
                                          <div className="space-y-1 z-10">
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5 uppercase tracking-wide inline-block">
                                                ☕ Site Reprieve Active
                                              </span>
                                              {isSelected && (
                                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-amber-550 bg-amber-500 text-white">
                                                  {language === 'ar' ? 'محدد حالياً' : 'SELECTED'}
                                                </span>
                                              )}
                                            </div>
                                            <h6 className="text-xs font-black text-slate-900 mt-1">{b.task}</h6>
                                            <p className="text-[10.5px] text-slate-500 leading-normal">{b.goal}</p>
                                            
                                            <p className="text-[9.5px] font-mono text-slate-400 uppercase tracking-tighter mt-2">
                                              Day {b.startDay} to {b.endDay} ({getCalculatedDate(startCalendarStr, b.startDay || 1)} - {getCalculatedDate(startCalendarStr, b.endDay || 1)})
                                            </p>
                                          </div>
                                        </div>

                                        {/* Break Action Toolbar (Select, Edit, Copy, Delete) */}
                                        <div className="flex items-center justify-between border-t border-dashed border-amber-200 pt-3 bg-amber-50/50 -mx-4 -mb-4 px-4 py-2.5 rounded-b-xl border-t mt-3">
                                          <div className="flex gap-2 text-[10px] font-black uppercase tracking-wider">
                                            <button
                                              onClick={() => setSelectedTimelineTaskId(isSelected ? null : b.id)}
                                              type="button"
                                              className={cn(
                                                "px-2.5 py-1.5 rounded border transition-all flex items-center gap-1",
                                                isSelected 
                                                  ? "bg-amber-500 text-white border-amber-550" 
                                                  : "bg-white border-slate-205 text-slate-700 hover:bg-slate-100"
                                              )}
                                            >
                                              🎯 {isSelected ? (language === 'ar' ? 'محدد حالياً' : 'Current Selection') : (language === 'ar' ? 'تحديد وتثبيت' : 'Select Activity')}
                                            </button>

                                            <button
                                              onClick={() => openTaskModalForEdit(b)}
                                              type="button"
                                              className="px-2.5 py-1.5 bg-white border border-slate-205 rounded text-slate-700 hover:bg-slate-100 transition-all flex items-center gap-1 font-bold"
                                            >
                                              ✏️ {language === 'ar' ? 'تعديل الخصائص' : 'Edit'}
                                            </button>

                                            <button
                                              onClick={() => openTaskModalForCopy(b)}
                                              type="button"
                                              className="px-2.5 py-1.5 bg-white border border-slate-205 rounded text-slate-700 hover:bg-slate-100 transition-all flex items-center gap-1 font-bold"
                                            >
                                              📋 {language === 'ar' ? 'تكرار / نسخ سريع' : 'Copy'}
                                            </button>
                                          </div>

                                          <button
                                            onClick={() => {
                                              if (confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذه الاستراحة؟' : 'Are you sure you want to delete this scheduled break?')) {
                                                handleDeleteTask(b.id);
                                                if (isSelected) setSelectedTimelineTaskId(null);
                                              }
                                            }}
                                            type="button"
                                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-205 rounded text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                                          >
                                            🗑️ {language === 'ar' ? 'حذف مبرم' : 'Delete'}
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {activeBreaks.length === 0 && (
                                    <div className="bg-white border border-slate-150 border-dashed rounded-xl p-5 text-center text-slate-450 text-slate-400 text-[10.5px] italic">
                                      {language === 'ar' ? 'لا يوجد فترات راحة أو تجميد عمل لليوم' : 'No periodic breaks or rest days scheduled for this operational day.'}
                                    </div>
                                  )}
                                </div>

                                {/* Operational Safety / Logistics notice board */}
                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white shadow space-y-2 text-[11.5px]">
                                  <p className="text-[9px] font-black text-red-400 uppercase tracking-widest">
                                    ⚓ TIMELINE INTERLACING NOTICE
                                  </p>
                                  <p className="text-slate-300 leading-normal">
                                    {language === 'ar'
                                      ? 'يرجى العلم أن ربط التقارير يدوياً بمحطات الجدول الزمني يضمن عدم تسجيل كميات مخرجات مضاعفة تتجاوز السقف المعتمد، كما يعزل تداخل العمالة في المواقع غير المرطبة تخصصياً.'
                                      : 'Defining absolute bounds for tasks prevents field managers from logging extra volumetric output, and halts mismatched workers on mismated trades instantly.'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Classical Macro Monthly Gantt Chart */
                        <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm space-y-6">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              {language === 'ar' ? 'مخطط التوزيع الزمني الشهري الكلي:' : 'MACRO COMPONENT MONTHLY DISTRIBUTION:'}
                            </span>
                          </div>
                          
                          <div className="space-y-6 overflow-x-auto pb-4 custom-scrollbar">
                            <div className="min-w-[600px]">
                              <div className="flex border-b border-slate-100 pb-2 mb-4">
                                <div className="w-48 text-[8px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Operation Node</div>
                                <div className="flex-1 grid grid-cols-12 gap-0 text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center font-mono">
                                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => <div key={m}>{m}</div>)}
                                </div>
                              </div>
                              <div className="space-y-4">
                                {projectTasks.map((task) => {
                                  const startMonth = new Date(task.date).getMonth();
                                  const endMonth = task.endDate ? new Date(task.endDate).getMonth() : startMonth;
                                  const duration = Math.max(1, endMonth - startMonth + 1);
                                  
                                  return (
                                    <div key={task.id} className="flex items-center group">
                                      <div className="w-48 pr-4">
                                        <p className="text-[11px] font-bold text-slate-900 group-hover:text-red-650 group-hover:text-red-600 transition-colors line-clamp-1">{task.task}</p>
                                        <p className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-tighter flex items-center gap-1.5 mt-0.5">
                                          <span className={cn(
                                            "inline-block w-1.5 h-1.5 rounded-full",
                                            task.taskType === 'Break' ? "bg-amber-400" : "bg-red-500"
                                          )}></span>
                                          {task.taskType === 'Break' ? 'Break' : 'Active'} ({task.status}) - Day {task.startDay || 1}
                                        </p>
                                      </div>
                                      <div className="flex-1 grid grid-cols-12 h-7 relative bg-slate-50 rounded-lg overflow-hidden border border-slate-100">
                                        <div 
                                          className={cn(
                                            "absolute h-full rounded shadow-sm opacity-80 group-hover:opacity-100 transition-opacity flex items-center px-2 text-[9px] text-white font-bold",
                                            task.taskType === 'Break' ? "bg-amber-500" :
                                            task.status === 'Completed' ? "bg-emerald-500" :
                                            task.status === 'In Progress' ? "bg-red-500" :
                                            "bg-slate-400"
                                          )}
                                          style={{ 
                                            gridColumnStart: startMonth + 1, 
                                            gridColumnEnd: `span ${duration}` 
                                          }}
                                        >
                                          <span className="truncate">{task.task} ({task.startDay}-{task.endDay})</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                                {projectTasks.length === 0 && (
                                  <p className="text-[10px] text-slate-400 italic py-10 text-center">No roadmap modules detected for this initiative.</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {activeTab === 'Personnel' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex justify-between items-center mb-4">
                      <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Users className="w-3 h-3" />
                        Operational Personnel
                      </h5>
                      <button 
                        onClick={() => setIsStaffModalOpen(true)}
                        className="text-[10px] font-bold uppercase tracking-widest text-red-600 hover:text-red-700 transition-colors flex items-center gap-1.5 px-3 py-1 bg-red-50 rounded"
                      >
                        <UserPlus className="w-3 h-3" />
                        Deploy Personnel
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {teamMembers.map((worker) => (
                        <div key={worker.id} className="flex flex-col p-4 rounded-xl bg-white border border-slate-100 group hover:border-red-200 transition-all shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-[11px] font-black text-slate-400">
                                {worker.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <h6 className="text-xs font-black text-slate-900 leading-tight">{d(worker.name)}</h6>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{d(worker.role)}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => {
                                setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, projectId: undefined, assignmentLocation: undefined, assignmentArea: undefined, status: 'Off Duty' } as any : w));
                              }}
                              className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-all"
                              title="Withdraw from Project"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 mt-auto">
                            <div className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg">
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Location</p>
                              <p className="text-[10px] font-bold text-slate-700 truncate">{worker.assignmentLocation || 'Unspecified'}</p>
                            </div>
                            <div className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg">
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Work Zone</p>
                              <p className="text-[10px] font-bold text-slate-700 truncate">{worker.assignmentArea || 'General area'}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                            <span className={cn(
                              "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border",
                              worker.status === 'Working' ? "text-red-600 bg-red-50 border-red-100" :
                              worker.status === 'On Site' ? "text-emerald-600 bg-emerald-50 border-emerald-100" :
                              "text-slate-400 bg-slate-50 border-slate-100"
                            )}>
                              {d(worker.status)}
                            </span>
                            <span className="text-[10px] font-mono font-black text-slate-900">${worker.dailyRate}/{t.common.cost.split(' ')[0]}</span>
                          </div>
                        </div>
                      ))}
                      {teamMembers.length === 0 && <p className="text-[10px] text-slate-400 italic">No personnel currently assigned.</p>}
                    </div>
                  </div>
                )}

                {activeTab === 'Financial' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                      <div className="glass-panel p-4 bg-slate-900 border border-slate-800">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Revenue</p>
                        <h4 className="text-lg font-mono font-bold text-white">{formatCurrency(selectedProject.contractValue)}</h4>
                        <div className="mt-2 text-[8px] text-red-400 font-bold uppercase tracking-tight">
                          {Math.round((selectedProject.revenueGenerated / selectedProject.contractValue) * 100)}% Invoiced
                        </div>
                      </div>
                      <div className="glass-panel p-4 bg-white border border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Expenses</p>
                        <h4 className="text-lg font-mono font-bold text-slate-900">{formatCurrency(selectedProject.spent)}</h4>
                        <div className="mt-2 text-[8px] text-rose-500 font-bold uppercase tracking-tight">
                          {Math.round((selectedProject.spent / selectedProject.budget) * 100)}% Utilization
                        </div>
                      </div>
                      <div className="glass-panel p-4 bg-white border border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Open Quotes</p>
                        <h4 className="text-lg font-mono font-bold text-slate-900">
                          {formatCurrency(projectQuotes.reduce((acc, q) => acc + q.totalAmount, 0))}
                        </h4>
                        <div className="mt-2 text-[8px] text-slate-400 font-bold uppercase tracking-tight">
                          {projectQuotes.length} Units Detected
                        </div>
                      </div>
                      <div className="glass-panel p-4 bg-white border border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Open POs</p>
                        <h4 className="text-lg font-mono font-bold text-slate-900">
                          {formatCurrency(projectPOs.reduce((acc, p) => acc + p.totalAmount, 0))}
                        </h4>
                        <div className="mt-2 text-[8px] text-amber-600 font-bold uppercase tracking-tight">
                          Binding Commitment
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <div className="glass-panel p-6 bg-slate-900 border border-slate-800">
                        <div className="flex items-center gap-3 mb-4">
                           <div className="p-2 bg-red-500/20 text-red-400 rounded">
                             <TrendingUp className="w-5 h-5" />
                           </div>
                           <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Revenue Forecast</h6>
                        </div>
                        <div className="flex justify-between items-end">
                           <div>
                             <p className="text-2xl font-mono font-bold text-white leading-none">{formatCurrency(selectedProject.contractValue)}</p>
                             <p className="text-[10px] text-slate-500 mt-2">Total Contract Value</p>
                           </div>
                           <div className="text-right">
                             <p className="text-lg font-mono font-bold text-red-400 leading-none">{formatCurrency(selectedProject.revenueGenerated)}</p>
                             <p className="text-[10px] text-slate-500 mt-2">Invoiced to Date</p>
                           </div>
                        </div>
                        <div className="mt-4 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                           <div 
                             className="h-full bg-red-400 transition-all duration-1000"
                             style={{ width: `${(selectedProject.revenueGenerated / selectedProject.contractValue) * 100}%` }}
                           />
                        </div>
                      </div>

                      <div className="glass-panel p-6 bg-white border border-slate-100">
                        <div className="flex items-center gap-3 mb-4">
                           <div className="p-2 bg-rose-50 text-rose-600 rounded">
                             <AlertTriangle className="w-5 h-5" />
                           </div>
                           <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expense Overhead</h6>
                        </div>
                        <div className="flex justify-between items-end">
                           <div>
                             <p className="text-2xl font-mono font-bold text-slate-900 leading-none">{formatCurrency(selectedProject.budget)}</p>
                             <p className="text-[10px] text-slate-500 mt-2">Internal Budget Limit</p>
                           </div>
                           <div className="text-right">
                             <p className="text-lg font-mono font-bold text-rose-600 leading-none">{formatCurrency(selectedProject.spent)}</p>
                             <p className="text-[10px] text-slate-500 mt-2">Actual Utilization</p>
                           </div>
                        </div>
                        <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                           <div 
                             className="h-full bg-slate-900 transition-all duration-1000"
                             style={{ width: `${(selectedProject.spent / selectedProject.budget) * 100}%` }}
                           />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                      {/* Quotes Section */}
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Target className="w-3 h-3" />
                            Procurement Quotes
                          </h5>
                        </div>
                        <div className="space-y-2">
                          {projectQuotes.map((quote) => (
                            <div key={quote.id} className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-100 hover:border-slate-200 transition-all shadow-sm">
                              <div className="flex items-center gap-4">
                                <div className="p-2 bg-slate-50 text-slate-400 rounded">
                                  <Receipt className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="text-xs font-mono font-bold text-slate-900">{quote.id}</p>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{quote.vendorName}</p>
                                </div>
                              </div>
                              <div className="text-right flex items-center gap-6">
                                <div>
                                  <p className="text-xs font-bold text-slate-900">{formatCurrency(quote.totalAmount)}</p>
                                  <span className={cn(
                                    "text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter",
                                    quote.status === 'Approved' ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50"
                                  )}>
                                    {quote.status}
                                  </span>
                                </div>
                                <button className="p-1.5 text-slate-300 hover:text-slate-600">
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {projectQuotes.length === 0 && <p className="text-[10px] text-slate-400 italic py-4">No price quotes initialized.</p>}
                        </div>
                      </div>

                      {/* PO Section */}
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <ShieldCheck className="w-3 h-3" />
                            Executed Purchase Orders
                          </h5>
                        </div>
                        <div className="space-y-2">
                          {projectPOs.map((po) => (
                            <div key={po.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                               <div className="flex items-center gap-4">
                                <div className="p-2 bg-white border border-slate-200 text-slate-400 rounded">
                                  <Zap className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="text-xs font-mono font-bold text-slate-900">{po.id}</p>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{po.vendorName}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-bold text-slate-900">{formatCurrency(po.totalAmount)}</p>
                                <span className={cn(
                                  "text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter",
                                  po.status === 'Received' ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50"
                                )}>
                                  {po.status}
                                </span>
                              </div>
                            </div>
                          ))}
                          {projectPOs.length === 0 && <p className="text-[10px] text-slate-400 italic py-4">No active purchase orders detected.</p>}
                        </div>
                      </div>

                      {/* Invoices Section */}
                      <div>
                        <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                          <BarChart3 className="w-3 h-3" />
                          A/P Ledger Status
                        </h5>
                        <div className="space-y-2">
                          {projectInvoices.map((inv) => (
                            <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-100">
                              <div>
                                <p className="text-xs font-mono font-bold text-slate-900">{inv.id}</p>
                                <p className="text-[9px] text-slate-400 font-medium">{formatDate(inv.date)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-bold text-slate-900">{formatCurrency(inv.total)}</p>
                                <span className={cn(
                                  "text-[8px] font-bold px-1.5 py-0.5 rounded uppercase",
                                  inv.status === 'Paid' ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50"
                                )}>
                                  {inv.status}
                                </span>
                              </div>
                            </div>
                          ))}
                          {projectInvoices.length === 0 && <p className="text-[10px] text-slate-400 italic py-4">No historical financial records found.</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div>
                    <h6 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Spend Rate
                    </h6>
                    <p className="text-sm font-bold text-slate-900">12.4M / Month</p>
                  </div>
                  <div>
                    <h6 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Risk Assessment
                    </h6>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {selectedProject.riskDetails || 'No high-impact anomalies detected within current sensor range.'}
                    </p>
                  </div>
                  <div className="flex items-end justify-end gap-3 print:hidden">
                    <button 
                      onClick={handlePrint}
                      className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors border border-slate-200 p-2 rounded bg-slate-50"
                    >
                      <Printer className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={handleDownloadCSV}
                      className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-red-600 transition-colors border border-slate-200 px-4 py-2 rounded bg-slate-50 flex items-center gap-2"
                    >
                      <Download className="w-3 h-3" />
                      Export Ledger
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl border border-slate-200 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">
                {editingProject ? 'Modify Initiative Parameters' : 'Register Strategic Node'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveProject} className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0 text-slate-900">
              
              {/* SECTION 1: IDENTITY & SCHEDULE */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-2">
                  <div className="p-1 px-1.5 bg-slate-905 bg-slate-900 text-white rounded text-[10px] font-bold">01</div>
                  <h4 className="text-[10px] font-bold text-slate-705 text-slate-700 uppercase tracking-widest">
                    Identity & Timeline Parameters
                  </h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Project Identity Name</label>
                    <input name="name" required defaultValue={editingProject?.name} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Operational Status</label>
                    <select name="status" defaultValue={editingProject?.status} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none">
                      <option>Active</option>
                      <option>On Hold</option>
                      <option>Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Risk Classification</label>
                    <select name="riskLevel" defaultValue={editingProject?.riskLevel} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none">
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Incubation Date</label>
                    <input type="date" name="startDate" required defaultValue={editingProject?.startDate} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Projection Date</label>
                    <input type="date" name="endDate" required defaultValue={editingProject?.endDate} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Risk Assessment Details</label>
                    <textarea name="riskDetails" defaultValue={editingProject?.riskDetails} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm h-20 focus:ring-1 focus:ring-red-500 outline-none resize-none" />
                  </div>
                </div>
              </div>

              {/* SECTION 2: FINANCIAL CONTROL BASELINE */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-2">
                  <div className="p-1 px-1.5 bg-slate-900 text-white rounded text-[10px] font-bold">02</div>
                  <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                    Financial & Budget Framework (SAR)
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Total Project Budget</label>
                    <input type="number" name="budget" required defaultValue={editingProject?.budget} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-mono" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Contract Value</label>
                    <input type="number" name="contractValue" required defaultValue={editingProject?.contractValue} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-mono" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Revenue Generated to Date</label>
                    <input type="number" name="revenueGenerated" required defaultValue={editingProject?.revenueGenerated || 0} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-mono" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Expenditure Budget</label>
                    <input type="number" name="expenditureBudget" required defaultValue={editingProject?.expenditureBudget || 0} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-mono" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Initial Accrued Spend</label>
                    <input type="number" name="spent" required defaultValue={editingProject?.spent || 0} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-mono" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Daily Allocation Budget</label>
                    <input type="number" name="dailyBudget" required defaultValue={editingProject?.dailyBudget || 0} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-mono font-bold text-rose-700" />
                  </div>
                </div>
                <div className="text-[8px] text-slate-400 italic font-black uppercase mt-1 leading-normal">
                  Note: Personnel costs are calculated automatically based on deployment. Under-spending daily allocation budget limits requires executive justification.
                </div>
              </div>

              {/* SECTION 3: ATTENDANCE CONTROLS */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-2">
                  <div className="p-1 px-1.5 bg-slate-900 text-white rounded text-[10px] font-bold">03</div>
                  <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    Attendance Logistics
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Preparation Start Time</label>
                    <input type="time" name="attendancePrepTime" required defaultValue={editingProject?.attendancePrepTime || '07:00'} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" />
                    <p className="text-[8px] text-slate-400 mt-1 italic">Time window opens for supervisor entry.</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Shift Cut-off Time</label>
                    <input type="time" name="attendanceCloseTime" required defaultValue={editingProject?.attendanceCloseTime || '08:30'} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" />
                    <p className="text-[8px] text-slate-400 mt-1 italic">Time window closes for on-site logging.</p>
                  </div>
                </div>
                <p className="text-[9px] text-red-700 leading-relaxed bg-red-50 p-2.5 rounded border border-red-100">
                  <span className="font-bold uppercase tracking-tight mr-1">Compliance notice:</span>
                  Attendance sheets submitted outside this window require manual Project Manager override.
                </p>
              </div>

              {/* SECTION 4: PRODUCTIVITY TARGETS */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1 px-1.5 bg-slate-900 text-white rounded text-[10px] font-bold">04</div>
                    <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1">
                      <Target className="w-4 h-4 text-slate-500 font-bold" />
                      Measurable Productivity Targets
                    </h4>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingProductivityMetrics(prev => [
                        ...prev, 
                        { id: `M${Date.now()}`, targetTask: 'Concrete Pouring', unitMeasurement: 'm3', defaultUnitCost: 0, defaultDailyQuota: 0 }
                      ])
                    }}
                    className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-red-50 text-red-600 rounded hover:bg-red-100 transition"
                  >
                    + Add Metric
                  </button>
                </div>

                <div className="space-y-3">
                  {editingProductivityMetrics.map((metric, index) => (
                    <div key={metric.id} className="p-3 border border-slate-200 rounded-lg bg-white relative group">
                      <button 
                        type="button" 
                        onClick={() => setEditingProductivityMetrics(prev => prev.filter(m => m.id !== metric.id))}
                        className="absolute right-2 top-2 p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pr-8">
                        <div className="col-span-1 md:col-span-2">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Target Task Name</label>
                          <input 
                            required type="text"
                            value={metric.targetTask}
                            onChange={(e) => {
                              const newMetrics = [...editingProductivityMetrics];
                              newMetrics[index].targetTask = e.target.value;
                              setEditingProductivityMetrics(newMetrics);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs outline-none focus:border-red-400"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Unit</label>
                          <input 
                            required type="text"
                            value={metric.unitMeasurement}
                            onChange={(e) => {
                              const newMetrics = [...editingProductivityMetrics];
                              newMetrics[index].unitMeasurement = e.target.value;
                              setEditingProductivityMetrics(newMetrics);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs outline-none focus:border-red-400"
                            placeholder="m3, sqft..."
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Est Unit Cost</label>
                          <input 
                            required type="number" step="0.01"
                            value={metric.defaultUnitCost}
                            onChange={(e) => {
                              const newMetrics = [...editingProductivityMetrics];
                              newMetrics[index].defaultUnitCost = Number(e.target.value);
                              setEditingProductivityMetrics(newMetrics);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs outline-none focus:border-red-400 font-mono"
                          />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Daily Target Quota</label>
                          <input 
                            required type="number" step="0.01"
                            value={metric.defaultDailyQuota}
                            onChange={(e) => {
                              const newMetrics = [...editingProductivityMetrics];
                              newMetrics[index].defaultDailyQuota = Number(e.target.value);
                              setEditingProductivityMetrics(newMetrics);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs outline-none focus:border-red-400 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {editingProductivityMetrics.length === 0 && (
                    <div className="p-8 text-center text-[10px] uppercase font-bold text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                      No productivity metrics defined
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex gap-3 pb-2 sticky bottom-0 bg-white border-t border-slate-100 mt-4 shrink-0">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors text-slate-600">Abort</button>
                 <button type="submit" className="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors">Commit Parameters</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Assignment Modal */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 text-slate-900">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">HR Resource Pool Deployment</h3>
              <button onClick={() => { setIsStaffModalOpen(false); setDeployingWorkerId(null); }} className="text-slate-400 hover:text-slate-900">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              {!deployingWorkerId ? (
                <>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Select Specialization</p>
                      {roleFilter !== 'All' && (
                        <button onClick={() => setRoleFilter('All')} className="text-[10px] text-red-600 font-bold uppercase">Clear Filter</button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                       {['All', ...Array.from(new Set(availableWorkers.map(w => w.role)))].map(role => (
                         <button 
                           key={role}
                           onClick={() => setRoleFilter(role)}
                           className={cn(
                             "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight transition-all",
                             roleFilter === role ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                           )}
                         >
                           {role}
                         </button>
                       ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Available Operational Personnel</p>
                    <div className="grid gap-3">
                      {availableWorkers
                        .filter(w => roleFilter === 'All' || w.role === roleFilter)
                        .length > 0 ? (
                        availableWorkers
                          .filter(w => roleFilter === 'All' || w.role === roleFilter)
                          .map(worker => (
                          <div 
                            key={worker.id} 
                            className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-red-50 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-xs font-bold text-slate-400">
                                {worker.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900">{worker.name}</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-[8px] text-slate-400 uppercase font-bold tracking-tight border-r border-slate-200 pr-2">{worker.role}</span>
                                  <span className="text-[8px] text-emerald-600 font-mono font-bold">${worker.dailyRate}/day</span>
                                  {worker.projectId && (
                                    <span className="text-[7px] text-amber-600 bg-amber-50 px-1 rounded">Locked in {worker.projectId}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button 
                              onClick={() => setDeployingWorkerId(worker.id)}
                              className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded text-[9px] font-bold uppercase tracking-widest hover:bg-red-700 transition-all shadow-sm active:scale-95"
                            >
                              <UserPlus className="w-3 h-3" />
                              Select
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-xl">
                          <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                          <p className="text-xs text-slate-400 italic">No resources matched the selected criteria.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (() => {
                const currentWorker = workers.find(w => w.id === deployingWorkerId);
                const projectTasks = tasks.filter(t => t.projectId === selectedId && t.taskType === 'Task');
                const selectedTask = projectTasks.find(t => t.id === deployingTaskId);
                const currentTaskWorkers = workers.filter(w => w.projectId === selectedId && w.assignedTaskId === deployingTaskId).length;
                
                return (
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAssignStaff(
                        deployingWorkerId!,
                        selectedTask ? (selectedTask.location || '') : '',
                        selectedTask ? (selectedTask.task || '') : '',
                        deployingTaskId
                      );
                    }}
                    className="space-y-4 animate-in slide-in-from-right-4 duration-300"
                  >
                    <div className="flex items-center gap-4 p-4 bg-red-50/50 border border-red-100 rounded-xl">
                      <div className="w-12 h-12 bg-white border border-red-200 rounded-lg flex items-center justify-center text-sm font-bold text-red-600">
                        {currentWorker?.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">{currentWorker?.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{currentWorker?.role}</p>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
                        Link to Timeline Task / Activity
                      </label>
                      <select
                        value={deployingTaskId}
                        onChange={e => {
                          const val = e.target.value;
                          setDeployingTaskId(val);
                        }}
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none text-slate-900 font-medium"
                      >
                        <option value="">-- Choose Active Timeline Task --</option>
                        {projectTasks.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.task} ({t.location || 'No Loc'}) - Day {t.startDay || 1} to {t.endDay || 1}
                          </option>
                        ))}
                      </select>
                      <p className="text-[9px] text-slate-400 mt-1">
                        * Workers must be assigned directly to active tasks on the project timeline.
                      </p>
                    </div>

                    {selectedTask && (
                      <div className="p-3 bg-slate-50 rounded border border-slate-150 space-y-2 text-[11px] animate-in fade-in duration-200 text-slate-700">
                        <div className="flex justify-between">
                          <span className="font-semibold">Required Specialty:</span>
                          <span className={cn(
                            "font-bold font-mono px-1.5 py-0.5 rounded text-[10px]",
                            currentWorker?.role === selectedTask.allowedRole 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                              : "bg-rose-50 text-rose-700 border border-rose-100"
                          )}>
                            {selectedTask.allowedRole || 'Any Specialty'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold">Expected Location:</span>
                          <span className="font-bold text-slate-900 font-mono">{selectedTask.location || 'Not Specified'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold">Task Metrics:</span>
                          <span className="font-bold text-slate-900 font-mono">{selectedTask.expectedMeters || 100} Linear Meters</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold">Capacity Constraints:</span>
                          <span className={cn(
                            "font-bold font-mono",
                            selectedTask.maxWorkers && currentTaskWorkers >= selectedTask.maxWorkers ? "text-red-600" : "text-slate-900"
                          )}>
                            {currentTaskWorkers} / {selectedTask.maxWorkers || 10} Assigned
                          </span>
                        </div>

                        {currentWorker?.role !== selectedTask.allowedRole && selectedTask.allowedRole && (
                          <p className="text-[9px] text-rose-600 bg-rose-50 p-2 rounded border border-rose-150 font-medium">
                            ⚠️ This worker's job title ({currentWorker?.role}) does not match the activity's required designation ({selectedTask.allowedRole}). You cannot place a worker with a different job title.
                          </p>
                        )}
                        {selectedTask.maxWorkers && currentTaskWorkers >= selectedTask.maxWorkers && (
                          <p className="text-[9px] text-rose-600 bg-rose-50 p-2 rounded border border-rose-150 font-medium">
                            ⚠️ This activity has reached its maximum allocated capacity of {selectedTask.maxWorkers} workers.
                          </p>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Project Location Assignment</label>
                        <input 
                          name="location" 
                          required 
                          placeholder="e.g. Sector-7, Bridge North" 
                          value={selectedTask ? (selectedTask.location || '') : ''}
                          disabled
                          className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none text-slate-900 disabled:opacity-75 disabled:cursor-not-allowed font-mono" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Specific Work Area / Zone</label>
                        <input 
                          name="area" 
                          placeholder="e.g. Foundation G-4" 
                          value={selectedTask ? (selectedTask.task || '') : ''}
                          disabled
                          className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none text-slate-900 disabled:opacity-75 disabled:cursor-not-allowed font-mono" 
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button 
                        type="button"
                        onClick={() => {
                          setDeployingWorkerId(null);
                          setDeployingTaskId('');
                        }}
                        className="flex-1 py-2 border border-slate-200 bg-white rounded text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        Back to Pool
                      </button>
                      <button 
                        type="submit"
                        disabled={
                          (selectedTask && selectedTask.allowedRole ? currentWorker?.role !== selectedTask.allowedRole : false) ||
                          (selectedTask && selectedTask.maxWorkers ? currentTaskWorkers >= selectedTask.maxWorkers : false)
                        }
                        className="flex-1 py-2 bg-red-600 text-white rounded text-[10px] font-bold uppercase tracking-widest hover:bg-red-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Confirm Deployment
                      </button>
                    </div>
                  </form>
                );
              })()}
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100">
               <button 
                 onClick={() => { setIsStaffModalOpen(false); setDeployingWorkerId(null); }}
                 className="w-full py-2 bg-white border border-slate-200 rounded text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:text-slate-900 transition-colors"
               >
                 Close Deployment Control
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Definition Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">
                {editingTask 
                  ? (language === 'ar' ? `تعديل النشاط: ${editingTask.task}` : `Editing: ${editingTask.task}`)
                  : (language === 'ar' ? 'تعريف نشاط أو استراحة مشروع' : 'Define Site Activity or Break')
                }
              </h3>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 hover:text-slate-900">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="px-6 py-2 bg-slate-100 border-b border-slate-200 flex gap-4 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setTaskFormType('Task')}
                className={cn(
                  "pb-1.5 px-1 relative transition-all uppercase tracking-wider flex items-center gap-1.5",
                  taskFormType === 'Task' ? "text-red-600 border-b-2 border-red-600 font-bold" : "text-slate-500 hover:text-slate-700 font-medium"
                )}
              >
                🚧 {language === 'ar' ? 'نشاط إنتاجي' : 'Production Activity'}
              </button>
              <button
                type="button"
                onClick={() => setTaskFormType('Break')}
                className={cn(
                  "pb-1.5 px-1 relative transition-all uppercase tracking-wider flex items-center gap-1.5",
                  taskFormType === 'Break' ? "text-red-700 border-b-2 border-red-700 font-bold" : "text-slate-500 hover:text-slate-700 font-medium"
                )}
              >
                🛑 {language === 'ar' ? 'استراحة / وقف عمل' : 'Project Break / Off-day'}
              </button>
            </div>

            <form onSubmit={handleAddTask} className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0 text-slate-900">
              <input type="hidden" name="taskType" value={taskFormType} />
              <input type="hidden" name="timingMode" value={taskTimingMode} />

              {/* TEMPLATE & ACTIONS AREA (COPY, EDIT, DELETE, SELECT) */}
              {projectTasks.length > 0 && (
                <div className="bg-red-50/60 p-4 rounded-xl border border-red-100 space-y-3 mb-2">
                  <div>
                    <label className="text-[10px] font-black text-red-800 uppercase tracking-widest block mb-1.5">
                      ⚡ {language === 'ar' ? 'نسخ، تعديل، حذف وتحديد الأنشطة الحالية' : 'Copy, Edit, Delete, or Select Existing Activity'}
                    </label>
                    <select
                      value={selectedTimelineTaskId || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedTimelineTaskId(val || null);
                        if (val) {
                          const t = projectTasks.find(item => item.id === val);
                          if (t) {
                            // Autoload properties (Selecting)
                            setTaskFormType(t.taskType);
                            setTaskTimingMode(t.date && t.date.includes('-') && !t.hasOwnProperty('startDay') ? 'absolute' : 'relative');
                            setFormStartDay((t as any).startDay || 1);
                            setFormEndDay((t as any).endDay || 5);
                            setTaskFormName(t.task);
                            setTaskFormLocation(t.location || '');
                            setTaskFormExpectedMeters(t.expectedMeters || 100);
                            setTaskFormAllowedRole(t.allowedRole || '');
                            setTaskFormMaxWorkers(t.maxWorkers || 10);
                            setTaskFormDepartment(t.department || 'Operations');
                            setTaskFormAssignedValue(typeof t.assignedTo === 'object' ? t.assignedTo.value : String(t.assignedTo || ''));
                            setTaskFormGoal(t.goal || '');
                            setTaskFormStart(t.date || '');
                            setTaskFormEnd(t.endDate || '');
                          }
                        }
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-red-500 shadow-sm"
                    >
                      <option value="">{language === 'ar' ? '-- اختر نشاطاً للتعديل أو النسخ أو الحذف --' : '-- Quick Select Existing Activity --'}</option>
                      {projectTasks.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.taskType === 'Break' ? '☕' : '🚧'} [{item.id}] {item.task} (Day {item.startDay || 1}-{item.endDay || 1})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedTimelineTaskId && (
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-red-100/50">
                      <button
                        type="button"
                        onClick={() => {
                          const t = projectTasks.find(item => item.id === selectedTimelineTaskId);
                          if (t) {
                            setEditingTask(t);
                            alert(language === 'ar' ? `وضع التعديل نشط الآن للنشاط [${t.task}]` : `Edit mode activated for [${t.task}]. Submit to save modifications.`);
                          }
                        }}
                        className={cn(
                          "px-2.5 py-1.5 rounded text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1",
                          editingTask?.id === selectedTimelineTaskId 
                            ? "bg-red-600 text-white" 
                             : "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
                        )}
                      >
                        ✏️ {language === 'ar' ? 'تعديل النشاط' : 'Edit Mode'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const t = projectTasks.find(item => item.id === selectedTimelineTaskId);
                          if (t) {
                            setEditingTask(null); // Create as new task
                            setTaskFormName(`${t.task} (Copy)`);
                            alert(language === 'ar' ? 'تم النسخ كمسودة نشاط جديد!' : 'Copied! It will be saved as a new activity with "(Copy)" suffix.');
                          }
                        }}
                        className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                      >
                        📋 {language === 'ar' ? 'نسخ بيانات هذا النشاط' : 'Copy / Prefill'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا النشاط للوردية؟' : 'Are you sure you want to delete this activity?')) {
                            handleDeleteTask(selectedTimelineTaskId);
                            setSelectedTimelineTaskId(null);
                            setTaskFormName('');
                            setTaskFormLocation('');
                            setTaskFormGoal('');
                          }
                        }}
                        className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded text-[10px] font-black uppercase tracking-wider border border-red-200 transition-all flex items-center gap-1 ml-auto"
                      >
                        🗑️ {language === 'ar' ? 'حذف النشاط من المخطط' : 'Delete'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TIMING MODE SELECTOR */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  {language === 'ar' ? 'نظام تحديد التوقيت' : 'Time Determination Mode'}
                </label>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => setTaskTimingMode('relative')}
                    className={cn(
                      "py-1.5 px-3 rounded text-center border transition-all",
                      taskTimingMode === 'relative' 
                        ? "bg-slate-900 text-white border-slate-950" 
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    🔢 {language === 'ar' ? 'أيام نسبية (من اليوم 1)' : 'Relative Project Days'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskTimingMode('absolute')}
                    className={cn(
                      "py-1.5 px-3 rounded text-center border transition-all",
                      taskTimingMode === 'absolute' 
                        ? "bg-slate-900 text-white border-slate-950" 
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    📅 {language === 'ar' ? 'تواريخ تقويمية محددة' : 'Absolute Calendar Dates'}
                  </button>
                </div>
              </div>

              {/* DYNAMIC TIMING FIELDS */}
              {taskTimingMode === 'relative' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
                        {language === 'ar' ? 'من اليوم رقم' : 'Start Day (from Day 1)'}
                      </label>
                      <input 
                        type="number" 
                        name="startDay" 
                        min="1" 
                        required 
                        value={formStartDay}
                        onChange={e => setFormStartDay(Math.max(1, parseInt(e.target.value || '1', 10)))}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-mono" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
                        {language === 'ar' ? 'إلى اليوم رقم' : 'End Day (Inclusive)'}
                      </label>
                      <input 
                        type="number" 
                        name="endDay" 
                        min={formStartDay} 
                        required 
                        value={formEndDay}
                        onChange={e => setFormEndDay(Math.max(formStartDay, parseInt(e.target.value || '1', 10)))}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-mono" 
                      />
                    </div>
                  </div>
                  {selectedProject && (
                    <p className="text-[11px] text-emerald-600 font-medium px-2 py-1 bg-emerald-50 rounded border border-emerald-100 flex items-center gap-1.5">
                      📅 {language === 'ar' ? 'يقابل تقويمياً:' : 'Maps on Calendar to:'} 
                      <span className="font-bold">
                        {getCalculatedDate(selectedProject.startDate || '2026-06-01', formStartDay)}
                      </span>
                      <span> {language === 'ar' ? 'إلى' : 'to'} </span>
                      <span className="font-bold">
                        {getCalculatedDate(selectedProject.startDate || '2026-06-01', formEndDay)}
                      </span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
                      {language === 'ar' ? 'تاريخ البدء والنافذة' : 'Start Calendar Date'}
                    </label>
                    <input 
                      type="date" 
                      name="start" 
                      required 
                      value={taskFormStart} 
                      onChange={e => setTaskFormStart(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none text-slate-900" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
                      {language === 'ar' ? 'تاريخ الانتهاء المتوقع' : 'End Calendar Date'}
                    </label>
                    <input 
                      type="date" 
                      name="end" 
                      required 
                      value={taskFormEnd} 
                      onChange={e => setTaskFormEnd(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none text-slate-900" 
                    />
                  </div>
                </div>
              )}

              {/* MODULE IDENTITY */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
                  {taskFormType === 'Break' 
                    ? (language === 'ar' ? 'اسم فترة الراحة / مناسبة التوقف' : 'Break Title / Operational Reason') 
                    : (language === 'ar' ? 'اسم النشاط ومكون العمل الكلي' : 'Activity Name / Project Component')
                  }
                </label>
                <input 
                  name="name" 
                  required 
                  value={taskFormName}
                  onChange={e => setTaskFormName(e.target.value)}
                  placeholder={taskFormType === 'Break' ? (language === 'ar' ? 'مثال: عطلة نهاية الأسبوع، فحص الجودة الشامل، إجازة العيد' : 'e.g. Weekly Friday Rest, Concrete Curing Pause, Safety Stand-Down') : (language === 'ar' ? 'مثال: طلاء تكسية الأيبوكسي، صب الخرسانة المسلحة، عزل الأنابيب' : 'e.g. oxy-coating, painting, concrete pouring, welding')} 
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none text-slate-900" 
                />
              </div>

              {/* DYNAMIC METRIC DETAILS FOR TASKS ONLY */}
              {taskFormType === 'Task' ? (
                <div className="space-y-4 border-t border-slate-100 pt-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
                        {language === 'ar' ? 'الموقع المحدد للعمل' : 'Physical Site Location'}
                      </label>
                      <input 
                        name="location" 
                        required 
                        value={taskFormLocation}
                        onChange={e => setTaskFormLocation(e.target.value)}
                        placeholder="e.g. Sector-7, Tunnel C" 
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none text-slate-900" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
                        {language === 'ar' ? 'الكمية المستهدفة (بالمتر طولي)' : 'Expected Target (Linear Meters)'}
                      </label>
                      <input 
                        type="number" 
                        name="expectedMeters" 
                        min="1" 
                        required 
                        value={taskFormExpectedMeters}
                        onChange={e => setTaskFormExpectedMeters(Number(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-mono text-slate-900" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
                        {language === 'ar' ? 'المسمى الوظيفي المطلوب للنشاط' : 'Requires Specialty/Role'}
                      </label>
                      <select 
                        name="allowedRole" 
                        required
                        value={taskFormAllowedRole}
                        onChange={e => setTaskFormAllowedRole(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none text-slate-900"
                      >
                        <option value="">-- Select Worker Role --</option>
                        {Array.from(new Set(workers.map(w => w.role))).filter(Boolean).map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                        <option value="Masonry Specialists">Masonry Specialists</option>
                        <option value="Steel Fixers & General Labor">Steel Fixers & General Labor</option>
                        <option value="Concrete Crew">Concrete Crew</option>
                        <option value="Site Engineer">Site Engineer</option>
                        <option value="Project Manager">Project Manager</option>
                        <option value="Supervisors">Supervisors</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
                        {language === 'ar' ? 'الحد الأقصى للعمالة المسموحة' : 'Max Allowed Workers'}
                      </label>
                      <input 
                        type="number" 
                        name="maxWorkers" 
                        min="1" 
                        required 
                        value={taskFormMaxWorkers}
                        onChange={e => setTaskFormMaxWorkers(Number(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-mono text-slate-900" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
                        {language === 'ar' ? 'القسم المسؤول تكتيكياً' : 'Tactical Department'}
                      </label>
                      <select 
                        name="department" 
                        value={taskFormDepartment}
                        onChange={e => setTaskFormDepartment(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none text-slate-900"
                      >
                        <option value="Operations">Operations</option>
                        <option value="Quality Control">Quality Control</option>
                        <option value="Safety & HSE">Safety & HSE</option>
                        <option value="Logistics">Logistics</option>
                        <option value="Engineering Support">Engineering Support</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
                        {language === 'ar' ? 'رجل الجودة أو المشرف المعين' : 'Assigned Site Official'}
                      </label>
                      <input 
                        name="assignedValue" 
                        value={taskFormAssignedValue}
                        onChange={e => setTaskFormAssignedValue(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none text-slate-900" 
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              {/* DESCRIPTION/GOALS */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
                  {language === 'ar' ? 'تفاصيل الملاحظات الميدانية والهدف المعين' : 'Field Notes / Target Parameters'}
                </label>
                <textarea 
                  name="goal" 
                  value={taskFormGoal}
                  onChange={e => setTaskFormGoal(e.target.value)}
                  placeholder={taskFormType === 'Break' ? (language === 'ar' ? 'صف سبب هذا التوقف لضمان الشفافية...' : 'Describe the pause rationale to keep all site supervisors updated...') : (language === 'ar' ? 'مثال: صب 150 متر مكعب خرسانة مسلحة، طلاء 200 متر طولي، مع إشراك وحدة الأمان المالي.' : 'e.g. Target expected linear progress, special equipment requirement, safety checklists.')}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm h-16 focus:ring-1 focus:ring-red-500 outline-none resize-none"
                />
              </div>

              <div className="pt-4 flex gap-3 border-t border-slate-100 shrink-0">
                 <button type="button" onClick={() => setIsTaskModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors">
                   {language === 'ar' ? 'إلغاء' : 'Abort'}
                 </button>
                 <button type="submit" className="flex-1 px-4 py-2 bg-red-650 hover:bg-red-700 text-white rounded text-xs font-bold uppercase tracking-widest transition-colors shadow-md">
                   {editingTask 
                     ? (language === 'ar' ? 'حفظ التعديلات' : 'Save Task Changes')
                     : taskFormType === 'Break' 
                       ? (language === 'ar' ? 'تطبيق استراحة المشروع' : 'Deploy Operational Break') 
                       : (language === 'ar' ? 'تطبيق النشاط للوردية' : 'Deploy Action Module')
                   }
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resource Allocation Modal */}
      {isResourceModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={cn(
            "bg-white rounded-xl shadow-2xl w-full border border-slate-200 flex flex-col max-h-[90vh] transition-all duration-200",
            isBulkMode ? "max-w-2xl" : "max-w-md"
          )}>
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">
                {isBulkMode ? "Allocate Group of Resources" : `Add Project ${resourceType}`}
              </h3>
              <button onClick={() => setIsResourceModalOpen(false)} className="text-slate-400 hover:text-slate-900">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Selector */}
            <div className="px-6 py-2 bg-slate-50 border-b border-slate-100 flex gap-4 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setIsBulkMode(false)}
                className={cn(
                  "pb-1.5 px-1 relative transition-all uppercase tracking-wider",
                  !isBulkMode ? "text-red-600 border-b-2 border-red-600 font-bold" : "text-slate-400 hover:text-slate-600 font-medium"
                )}
              >
                Single Custom Item
              </button>
              <button
                type="button"
                onClick={() => setIsBulkMode(true)}
                className={cn(
                  "pb-1.5 px-1 relative transition-all uppercase tracking-wider flex items-center gap-1.5",
                  isBulkMode ? "text-red-600 border-b-2 border-red-600 font-bold" : "text-slate-400 hover:text-slate-600 font-medium"
                )}
              >
                Bulk Group Selection
                <span className="bg-red-100 text-red-700 text-[9px] px-1.5 py-0.5 rounded">Multi-add</span>
              </button>
            </div>

            <form onSubmit={handleAddResource} className="flex flex-col flex-1 min-h-0">
              {isBulkMode ? (
                /* Bulk Selection Mode Content */
                <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0 text-slate-900">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Select any group of machinery, vehicles, tools, or materials below. You can adjust the quantity and unit cost of selected items directly in their rows.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Search Field */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search standard catalog..."
                        value={bulkSearch}
                        onChange={e => setBulkSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:ring-1 focus:ring-red-500 outline-none"
                      />
                    </div>

                    {/* Filter Segmented Control */}
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setBulkFilter('All')}
                        className={cn(
                          "flex-1 py-1 text-[10px] uppercase font-bold rounded transition-all",
                          bulkFilter === 'All' ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkFilter('Material')}
                        className={cn(
                          "flex-1 py-1 text-[10px] uppercase font-bold rounded transition-all",
                          bulkFilter === 'Material' ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        Materials
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkFilter('Equipment')}
                        className={cn(
                          "flex-1 py-1 text-[10px] uppercase font-bold rounded transition-all",
                          bulkFilter === 'Equipment' ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        Equipment
                      </button>
                    </div>
                  </div>

                  {/* Toggle Selector Utilities */}
                  <div className="flex justify-between items-center text-[10px] text-slate-500 px-1 font-bold tracking-wider uppercase">
                    <span>Showing {bulkFilteredAssets.length} enterprise options</span>
                    <div className="flex gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          const allIds = bulkFilteredAssets.map(a => a.id);
                          setBulkCheckedIds(allIds);
                          allIds.forEach(id => {
                            const asset = selectableAssetsPool.find(x => x.id === id);
                            if (asset) {
                              setBulkQtns(cur => ({ ...cur, [id]: cur[id] || 1 }));
                              setBulkCsts(cur => ({ ...cur, [id]: cur[id] !== undefined ? cur[id] : (asset.value || 0) }));
                            }
                          });
                        }}
                        className="text-red-600 hover:underline"
                      >
                        Select All
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setBulkCheckedIds([])}
                        className="text-slate-600 hover:underline"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Checkbox List */}
                  <div className="border border-slate-200 rounded-lg overflow-y-auto max-h-[350px] divide-y divide-slate-100 bg-white shadow-inner">
                    {bulkFilteredAssets.map(a => {
                      const isChecked = bulkCheckedIds.includes(a.id);
                      return (
                        <div 
                          key={a.id} 
                          className={cn(
                            "p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors",
                            isChecked ? "bg-red-50/45 border-l-2 border-red-500" : "hover:bg-slate-50 border-l-2 border-transparent"
                          )}
                        >
                          {/* Row metadata header */}
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleBulkItem(a.id, 1, a.value || 0)}
                              className="mt-0.5 rounded border-slate-300 text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer accent-red-600 shrink-0"
                            />
                            <div className="min-w-0" onClick={() => toggleBulkItem(a.id, 1, a.value || 0)}>
                              <span className="font-bold text-xs text-slate-800 block truncate hover:text-red-700 cursor-pointer">
                                {a.name}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono tracking-wider block mt-0.5 uppercase">
                                {a.referenceNumber} • {a.category} • Default value: {a.value} SAR / {a.unit || 'Item'}
                              </span>
                            </div>
                          </div>

                          {/* Inline adjustments details if checked */}
                          {isChecked ? (
                            <div className="flex items-center gap-2 border border-red-100 bg-white p-2 rounded-lg shrink-0 shadow-sm animate-in zoom-in-95 duration-100">
                              <div className="w-16">
                                <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Qty</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={bulkQtns[a.id] !== undefined ? bulkQtns[a.id] : 1}
                                  onChange={e => setBulkQtns(cur => ({ ...cur, [a.id]: Math.max(1, Number(e.target.value)) }))}
                                  className="w-full bg-slate-50 px-1.5 py-0.5 text-xs text-center border border-slate-200 rounded font-mono font-medium text-slate-950 focus:ring-1 focus:ring-red-500 outline-none"
                                />
                              </div>
                              <div className="w-24">
                                <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Cost / {a.unit || 'Item'}</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={bulkCsts[a.id] !== undefined ? bulkCsts[a.id] : (a.value || 0)}
                                  onChange={e => setBulkCsts(cur => ({ ...cur, [a.id]: Math.max(0, Number(e.target.value)) }))}
                                  className="w-full bg-slate-50 px-1.5 py-0.5 text-xs text-right border border-slate-200 rounded font-mono font-medium text-slate-950 focus:ring-1 focus:ring-red-500 outline-none"
                                />
                              </div>
                              <div className="text-right min-w-[75px] pl-1 font-bold text-xs text-red-700 font-mono shrink-0">
                                {((bulkQtns[a.id] || 1) * (bulkCsts[a.id] !== undefined ? bulkCsts[a.id] : (a.value || 0))).toLocaleString()} SAR
                              </div>
                            </div>
                          ) : (
                            <div className="text-right text-[10px] text-slate-400 font-mono shrink-0 font-medium">
                              Select to assign
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {bulkFilteredAssets.length === 0 && (
                      <div className="p-12 text-center text-xs text-slate-400 italic">
                        No catalog items found matching "{bulkSearch}".
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Traditional Single Allocation Form Mode */
                <div className="p-6 space-y-4 text-slate-900 overflow-y-auto flex-1 min-h-0">
                  {assets && assets.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                        Choose from Equipment Section
                      </label>
                      <select
                        onChange={(e) => handleSelectAsset(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-red-500 outline-none font-medium text-slate-900"
                        defaultValue=""
                      >
                        <option value="" disabled>-- Select existing item --</option>
                        {filteredAssets.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.referenceNumber}) — {a.value} SAR ({a.category})
                          </option>
                        ))}
                        {assets.filter(a => !filteredAssets.includes(a)).length > 0 && (
                          <optgroup label="Other Categories">
                            {assets.filter(a => !filteredAssets.includes(a)).map(a => (
                              <option key={a.id} value={a.id}>
                                {a.name} ({a.referenceNumber}) — {a.value} SAR ({a.category})
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                      <p className="text-[9px] text-slate-400">
                        Auto-fills: name, model/type, unit, and value.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Resource Name</label>
                    <input 
                      name="name" 
                      required 
                      value={resName} 
                      onChange={e => setResName(e.target.value)}
                      placeholder={`e.g. ${resourceType === 'Material' ? 'Cement Grade-A' : 'Heavy Excavator'}`} 
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" 
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Classification/Model</label>
                      <input 
                        name="type" 
                        required 
                        value={resType}
                        onChange={e => setResType(e.target.value)}
                        placeholder="e.g. Consumable" 
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Unit Type</label>
                      <input 
                        name="unit" 
                        required 
                        value={resUnit}
                        onChange={e => setResUnit(e.target.value)}
                        placeholder="e.g. Ton, Units" 
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Quantity</label>
                      <input 
                        type="number" 
                        name="quantity" 
                        required 
                        value={resQty}
                        onChange={e => setResQty(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-mono" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Unit cost (SAR)</label>
                      <input 
                        type="number" 
                        name="unitCost" 
                        required 
                        value={resCost}
                        onChange={e => setResCost(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-mono" 
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 pb-1 border-t border-slate-100">
                    <input
                      type="checkbox"
                      id="syncToEquipment"
                      checked={syncToEquipment}
                      onChange={e => setSyncToEquipment(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500 w-3.5 h-3.5 cursor-pointer accent-red-600"
                    />
                    <label htmlFor="syncToEquipment" className="text-[10px] text-slate-600 uppercase tracking-wider font-bold cursor-pointer select-none">
                      Sync / Publish as new item in Equipment section
                    </label>
                  </div>
                </div>
              )}

              {/* Form Bottom Tally & Footer Actions */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                {isBulkMode ? (
                  <div className="text-left font-semibold text-xs text-slate-600">
                    Selected Items: <span className="text-slate-900 font-bold font-mono">{bulkCheckedIds.length}</span>
                  </div>
                ) : (
                  <div className="text-left font-semibold text-xs text-slate-600">
                    Total Allocation: <span className="text-slate-900 font-bold font-mono">{(resQty * resCost).toLocaleString()} SAR</span>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setIsResourceModalOpen(false)} 
                    className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-100 transition-colors text-slate-600 hover:text-slate-900 rounded text-xs font-bold uppercase tracking-widest"
                  >
                    Abort
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded text-xs font-bold uppercase tracking-widest transition-all shadow-md active:scale-95"
                  >
                    {isBulkMode ? `Allocate Selection (${bulkCheckedIds.length})` : "Allocate Resource"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {isFullReportOpen && selectedProject && (
        <ComprehensiveProjectReport 
          project={selectedProject}
          workers={workers}
          resources={resources}
          language={language as 'en' | 'ar'}
          company={company}
          onClose={() => setIsFullReportOpen(false)}
        />
      )}

      {isDailyOutputModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 text-slate-900">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">
                {editingDailyOutput ? 
                  (language === 'ar' ? 'تعديل تقرير الإنتاجية اليومية للوردية' : 'Edit Shift Production Record') : 
                  (language === 'ar' ? 'تسجيل مخرجات الوردية اليومية' : 'Create Shift Production Record')
                }
              </h3>
              <button type="button" onClick={() => { setIsDailyOutputModalOpen(false); setEditingDailyOutput(null); }} className="text-slate-400 hover:text-slate-900">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSaveDailyOutput} className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0 text-slate-900">
              {/* CORRESPONDING TIMELINE TASK */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
                  {language === 'ar' ? 'النشاط المقابل في الخط الزمني لمطابقة تتبع الإنتاجية' : 'CORRESPONDING TIMELINE ACTIVITY (REQUIRED)'}
                </label>
                <select
                  value={doTaskId ?? ''}
                  onChange={e => {
                    const val = e.target.value;
                    setDoTaskId(val);
                    const projectTasks = tasks.filter(t => t.projectId === selectedId && t.taskType === 'Task');
                    const chosen = projectTasks.find(t => t.id === val);
                    if (chosen) {
                      setDoWorkersType(chosen.allowedRole || '');
                      setDoExpectedMeters(chosen.expectedMeters || 100);
                      // Pre-fill date to the task's first day
                      if (chosen.date) {
                        setDoDate(chosen.date);
                      }
                      // Count active workers assigned to this task
                      const activeCount = workers.filter(w => w.projectId === selectedId && w.assignedTaskId === chosen.id).length;
                      setDoWorkersCount(activeCount || 10);
                    }
                  }}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none text-slate-900 font-bold"
                >
                  <option value="">-- {language === 'ar' ? 'اختر نشاط الوردية من الجدول' : 'Select Active Timeline Task'} --</option>
                  {tasks.filter(t => t.projectId === selectedId && t.taskType === 'Task').map(t => (
                    <option key={t.id} value={t.id}>
                      {t.task} ({t.location || 'No Loc'}) - {t.expectedMeters || 100}m targets
                    </option>
                  ))}
                </select>
                {doTaskId && (() => {
                  const activeTask = tasks.find(t => t.id === doTaskId);
                  const loggedMetersSum = dailyOutputs
                    .filter(item => item.projectId === selectedId && item.taskId === doTaskId && item.id !== editingDailyOutput?.id)
                    .reduce((sum, item) => sum + (Number(item.actualMeters) || 0), 0);
                  const assignedStaffList = workers.filter(w => w.projectId === selectedId && w.assignedTaskId === doTaskId);

                  return activeTask ? (
                    <div className="mt-2 p-2.5 bg-slate-50 rounded border border-slate-150 text-[10px] space-y-1 text-slate-600 animate-in fade-in duration-200">
                      <div className="flex justify-between">
                        <span className="font-bold">Timeline Bounds:</span>
                        <span>Day {activeTask.startDay || 1} to {activeTask.endDay || 1} ({activeTask.date} - {activeTask.endDate})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold">Expected Specialty Check:</span>
                        <span className="text-red-700 font-bold">{activeTask.allowedRole || 'Any Specialty'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold">Meters Cumulative Status:</span>
                        <span className="font-mono text-slate-900 font-bold">Logged {loggedMetersSum}m / Max {activeTask.expectedMeters || 100}m limit</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold">Operational Staff Roster:</span>
                        <span className="font-mono text-slate-900 font-bold">{assignedStaffList.length} workers currently assigned on site with job title "{activeTask.allowedRole || 'Any'}"</span>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
                    {language === 'ar' ? 'تاريخ الوردية' : 'SHIFT DATE'}
                  </label>
                  <input
                    type="date"
                    required
                    value={doDate ?? ''}
                    onChange={e => setDoDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
                    {language === 'ar' ? 'الإطار الزمني' : 'SHIFT TIMEFRAME'}
                  </label>
                  <input
                    type="text"
                    required
                    value={doTimeframe ?? ''}
                    onChange={e => setDoTimeframe(e.target.value)}
                    placeholder="e.g. 07:00 - 16:00"
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
                    {language === 'ar' ? 'عدد العمالة المشاركة' : 'WORKERS COUNT'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={doWorkersCount ?? ''}
                    onChange={e => setDoWorkersCount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
                    {language === 'ar' ? 'مجموع الأيام الكلية المطلوبة' : 'EST. DAYS REQUIRED'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={doDaysRequired ?? ''}
                    onChange={e => setDoDaysRequired(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-mono text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
                  {language === 'ar' ? 'فئات وقوى العمالة' : 'WORKERS SPECIALTY DEPLOYED'}
                </label>
                <input
                  type="text"
                  required
                  value={doWorkersType ?? ''}
                  onChange={e => setDoWorkersType(e.target.value)}
                  placeholder="e.g. Excavators, Drillers & Masonry trades"
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border border-slate-100">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                    {language === 'ar' ? 'المستهدف اليومي (متر)' : 'EXPECTED TARGET (METERS)'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={doExpectedMeters ?? ''}
                    onChange={e => setDoExpectedMeters(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                    {language === 'ar' ? 'الإنتاج الفعلي (متر)' : 'ACTUAL ACHIEVED (METERS)'}
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={doActualMeters ?? ''}
                    onChange={e => setDoActualMeters(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-mono text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
                  {language === 'ar' ? 'تقييم حالة التقدم وجدول التنفيذ' : 'SCHEDULE EFFICIENCY STATUS'}
                </label>
                <select
                  value={doStatus ?? 'On Track'}
                  onChange={e => setDoStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none text-slate-900"
                >
                  <option value="On Track">{language === 'ar' ? 'حسب الخطة وفي المسار (On Track)' : 'On Track'}</option>
                  <option value="Ahead of Schedule">{language === 'ar' ? 'متقدم عن الجدول المقدر (Ahead of Schedule)' : 'Ahead of Schedule'}</option>
                  <option value="Behind Schedule">{language === 'ar' ? 'متأخر عن الخطة الزمنية (Behind Schedule)' : 'Behind Schedule'}</option>
                </select>
                <p className="text-[9px] text-slate-400 mt-1">
                  * Status automatically recommended based on completion rate, feel free to override if required.
                </p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
                  {language === 'ar' ? 'ملاحظات الوردية وإجراءات الأداء اليومية' : 'DAILY SHIFT FIELD REMARKS'}
                </label>
                <textarea
                  value={doNotes ?? ''}
                  onChange={e => setDoNotes(e.target.value)}
                  rows={2}
                  placeholder={language === 'ar' ? 'اكتب ملاحظات وتفاصيل المعوقات أو التسهيلات الملحوظة للوردية والتقدم...' : 'Write shift wrap up comments, machine health, delays or support requests...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none text-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => { setIsDailyOutputModalOpen(false); setEditingDailyOutput(null); }}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-slate-600 hover:text-slate-900 rounded text-xs font-bold uppercase tracking-widest"
                >
                  {language === 'ar' ? 'إلغاء' : 'Abort'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold uppercase tracking-widest transition-all shadow-md"
                >
                  {language === 'ar' ? 'حفظ المخرجات' : 'Submit Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
