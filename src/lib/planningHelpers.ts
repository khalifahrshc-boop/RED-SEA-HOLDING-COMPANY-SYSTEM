import { Project } from '../types';

export interface WbsNode {
  id: string;
  projectId: string;
  code: string;
  name: string;
  parentId: string | null; // null for top-level phases
  progress: number; // calculated or custom % (0-100)
}

export interface ActivityDependency {
  targetActivityId: string; // The predecessor activity ID
  type: 'FS' | 'SS' | 'FF' | 'SF';
  lag: number; // in days
}

export interface Activity {
  id: string;
  projectId: string;
  wbsId: string; // WBS node associated with
  code: string; // e.g., ACT-1010
  name: string;
  description: string;
  duration: number; // duration in days
  startDate: string; // YYYY-MM-DD
  finishDate: string; // YYYY-MM-DD
  plannedStart: string;
  plannedFinish: string;
  actualStart?: string;
  actualFinish?: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  progress: number; // 0 to 100
  priority: 'Low' | 'Medium' | 'High';
  keyMilestone: boolean;
  assignedResources: string[]; // PlanningResource IDs
  dependencies: ActivityDependency[];
  
  // CPM results
  earlyStart: number;
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  totalFloat: number;
  isCritical: boolean;
}

export interface PlanningResource {
  id: string;
  projectId: string;
  name: string;
  role: 'Project Manager' | 'Lead Engineer' | 'Planner' | 'Supervisor' | 'Foreman' | 'Labor' | 'Equipment Operator' | 'Excavator' | 'Scaffolder' | 'Material Stock';
  category: 'Labor' | 'Equipment' | 'Material';
  costRate: number; // cost per day / unit
  unit: string; // e.g., "Day", "Hour", "Bag", "Ton"
  availability: boolean; // active/on-site
  allocatedDays: number; // total load
}

export interface PrimaveraAuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  details: string;
}

export interface UserRoleProfile {
  id: string;
  role: 'Admin' | 'Project Manager' | 'Planner' | 'Engineer' | 'Supervisor' | 'Viewer';
  permissions: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    print: boolean;
  };
}

// Default initial roles & permissions list
export const INITIAL_USER_PROFILES: UserRoleProfile[] = [
  { id: '1', role: 'Admin', permissions: { create: true, read: true, update: true, delete: true, print: true } },
  { id: '2', role: 'Project Manager', permissions: { create: true, read: true, update: true, delete: true, print: true } },
  { id: '3', role: 'Planner', permissions: { create: true, read: true, update: true, delete: false, print: true } },
  { id: '4', role: 'Engineer', permissions: { create: false, read: true, update: true, delete: false, print: true } },
  { id: '5', role: 'Supervisor', permissions: { create: false, read: true, update: true, delete: false, print: true } },
  { id: '6', role: 'Viewer', permissions: { create: false, read: true, update: false, delete: false, print: true } },
];

// Seed initial WBS items
export const INITIAL_WBS_NODES: WbsNode[] = [
  // NEOM Project (P1)
  { id: 'WBS-P1-1', projectId: 'P1', code: '1.0', name: 'Engineering & Design', parentId: null, progress: 85 },
  { id: 'WBS-P1-2', projectId: 'P1', code: '2.0', name: 'Procurement Stage', parentId: null, progress: 60 },
  { id: 'WBS-P1-3', projectId: 'P1', code: '3.0', name: 'Civil Construction', parentId: null, progress: 25 },
  { id: 'WBS-P1-3-1', projectId: 'P1', code: '3.1', name: 'Substructure Works', parentId: 'WBS-P1-3', progress: 40 },
  { id: 'WBS-P1-3-2', projectId: 'P1', code: '3.2', name: 'Superstructure Works', parentId: 'WBS-P1-3', progress: 10 },
  { id: 'WBS-P1-4', projectId: 'P1', code: '4.0', name: 'Quality Signoff', parentId: null, progress: 0 },
  
  // Red Sea Resort (P2)
  { id: 'WBS-P2-1', projectId: 'P2', code: '1.0', name: 'Site Mobilization', parentId: null, progress: 100 },
  { id: 'WBS-P2-2', projectId: 'P2', code: '2.0', name: 'Concrete Treatment & Coatings', parentId: null, progress: 45 },
  { id: 'WBS-P2-3', projectId: 'P2', code: '3.0', name: 'Testing & Handover', parentId: null, progress: 0 },
];

// Seed initial Resources
export const INITIAL_RESOURCES: PlanningResource[] = [
  { id: 'PR-1', projectId: 'P1', name: 'Eng. Salem Al-Hazmi', role: 'Lead Engineer', category: 'Labor', costRate: 450, unit: 'Day', availability: true, allocatedDays: 120 },
  { id: 'PR-2', projectId: 'P1', name: 'Eng. Tariq Al-Sayed', role: 'Planner', category: 'Labor', costRate: 380, unit: 'Day', availability: true, allocatedDays: 85 },
  { id: 'PR-3', projectId: 'P1', name: 'Abdurahman Fore', role: 'Foreman', category: 'Labor', costRate: 200, unit: 'Day', availability: true, allocatedDays: 15 },
  { id: 'PR-4', projectId: 'P1', name: 'Excavator Cat 320D', role: 'Excavator', category: 'Equipment', costRate: 650, unit: 'Day', availability: true, allocatedDays: 45 },
  { id: 'PR-5', projectId: 'P1', name: 'Epoxy Coating Premium Grade', role: 'Material Stock', category: 'Material', costRate: 35, unit: 'Bag', availability: true, allocatedDays: 150 },
  { id: 'PR-6', projectId: 'P2', name: 'Concrete Grinder G40', role: 'Equipment Operator', category: 'Equipment', costRate: 300, unit: 'Day', availability: true, allocatedDays: 30 },
  { id: 'PR-7', projectId: 'P2', name: 'Faisal Maqsood Supervisor', role: 'Supervisor', category: 'Labor', costRate: 280, unit: 'Day', availability: true, allocatedDays: 50 },
];

// Seed initial Activities with standard dependencies for NEOM Preparation & Red Sea Resort
export const INITIAL_ACTIVITIES: Activity[] = [
  // NEOM Project (P1)
  {
    id: 'ACT-101',
    projectId: 'P1',
    wbsId: 'WBS-P1-1',
    code: 'ACT-1010',
    name: 'Topographical Analysis & Boundary Survey',
    description: 'Establish absolute boundary levels, geotechnical checkpoints, and digital height models.',
    duration: 10,
    startDate: '2024-01-15',
    finishDate: '2024-01-25',
    plannedStart: '2024-01-15',
    plannedFinish: '2024-01-25',
    status: 'Completed',
    progress: 100,
    priority: 'High',
    keyMilestone: false,
    assignedResources: ['PR-1'],
    dependencies: [],
    earlyStart: 0, earlyFinish: 10, lateStart: 0, lateFinish: 10, totalFloat: 0, isCritical: true
  },
  {
    id: 'ACT-102',
    projectId: 'P1',
    wbsId: 'WBS-P1-1',
    code: 'ACT-1020',
    name: 'Geotechnical Soil Sampling & Boring Tests',
    description: 'Run bedrock pressure tests and seismic variables across Sector 03.',
    duration: 8,
    startDate: '2024-01-25',
    finishDate: '2024-02-02',
    plannedStart: '2024-01-25',
    plannedFinish: '2024-02-02',
    status: 'Completed',
    progress: 100,
    priority: 'Medium',
    keyMilestone: false,
    assignedResources: ['PR-1', 'PR-4'],
    dependencies: [{ targetActivityId: 'ACT-101', type: 'FS', lag: 0 }],
    earlyStart: 10, earlyFinish: 18, lateStart: 10, lateFinish: 18, totalFloat: 0, isCritical: true
  },
  {
    id: 'ACT-103',
    projectId: 'P1',
    wbsId: 'WBS-P1-2',
    code: 'ACT-1030',
    name: 'Issue Foundation Rebar Procurement orders',
    description: 'Confirm raw grade 60 structural reinforced steel bulk orders with local distributor.',
    duration: 12,
    startDate: '2024-02-02',
    finishDate: '2024-02-14',
    plannedStart: '2024-02-02',
    plannedFinish: '2024-02-14',
    status: 'In Progress',
    progress: 60,
    priority: 'High',
    keyMilestone: false,
    assignedResources: ['PR-2'],
    dependencies: [{ targetActivityId: 'ACT-102', type: 'FS', lag: 0 }],
    earlyStart: 18, earlyFinish: 30, lateStart: 18, lateFinish: 30, totalFloat: 0, isCritical: true
  },
  {
    id: 'ACT-104',
    projectId: 'P1',
    wbsId: 'WBS-P1-3-1',
    code: 'ACT-1040',
    name: 'Excavation & Ground Preparation Phase 1',
    description: 'Heavy digging, surface grinding, and level compaction to reach 10m target depth.',
    duration: 15,
    startDate: '2024-02-14',
    finishDate: '2024-02-29',
    plannedStart: '2024-02-14',
    plannedFinish: '2024-02-29',
    status: 'Not Started',
    progress: 0,
    priority: 'High',
    keyMilestone: false,
    assignedResources: ['PR-3', 'PR-4'],
    dependencies: [{ targetActivityId: 'ACT-103', type: 'FS', lag: 0 }],
    earlyStart: 30, earlyFinish: 45, lateStart: 30, lateFinish: 45, totalFloat: 0, isCritical: true
  },
  {
    id: 'ACT-105',
    projectId: 'P1',
    wbsId: 'WBS-P1-3-1',
    code: 'ACT-1050',
    name: 'Concrete Foundation Pouring & Treatment',
    description: 'Cast prime high-durability C40 structural concrete layout for core column anchor points.',
    duration: 10,
    startDate: '2024-02-29',
    finishDate: '2024-03-10',
    plannedStart: '2024-02-29',
    plannedFinish: '2024-03-10',
    status: 'Not Started',
    progress: 0,
    priority: 'High',
    keyMilestone: false,
    assignedResources: ['PR-1', 'PR-3'],
    dependencies: [{ targetActivityId: 'ACT-104', type: 'FS', lag: 0 }],
    earlyStart: 45, earlyFinish: 55, lateStart: 45, lateFinish: 55, totalFloat: 0, isCritical: true
  },
  {
    id: 'ACT-106',
    projectId: 'P1',
    wbsId: 'WBS-P1-4',
    code: 'ACT-1060',
    name: 'Structural Loading Handover Ceremony',
    description: 'Key milestone highlighting successful substructure signoff by municipal consultant.',
    duration: 1,
    startDate: '2024-03-11',
    finishDate: '2024-03-12',
    plannedStart: '2024-03-11',
    plannedFinish: '2024-03-12',
    status: 'Not Started',
    progress: 0,
    priority: 'Medium',
    keyMilestone: true,
    assignedResources: ['PR-1', 'PR-2'],
    dependencies: [{ targetActivityId: 'ACT-105', type: 'FS', lag: 1 }],
    earlyStart: 56, earlyFinish: 57, lateStart: 56, lateFinish: 57, totalFloat: 0, isCritical: true
  },

  // Red Sea Resort Project (P2)
  {
    id: 'ACT-201',
    projectId: 'P2',
    wbsId: 'WBS-P2-1',
    code: 'ACT-2010',
    name: 'Mobilize Grinders & Surface Sprayers to Site',
    description: 'Check transport of high precision industrial grinding machinery and protective wear.',
    duration: 5,
    startDate: '2023-11-01',
    finishDate: '2023-11-06',
    plannedStart: '2023-11-01',
    plannedFinish: '2023-11-06',
    status: 'Completed',
    progress: 100,
    priority: 'High',
    keyMilestone: false,
    assignedResources: ['PR-6', 'PR-7'],
    dependencies: [],
    earlyStart: 0, earlyFinish: 5, lateStart: 0, lateFinish: 5, totalFloat: 0, isCritical: true
  },
  {
    id: 'ACT-202',
    projectId: 'P2',
    wbsId: 'WBS-P2-2',
    code: 'ACT-2020',
    name: 'Surface Preparation: Heavy grinding of Concrete base',
    description: 'Remove aggregate laitance and prepare high suction profile on base area.',
    duration: 10,
    startDate: '2023-11-06',
    finishDate: '2023-11-16',
    plannedStart: '2023-11-06',
    plannedFinish: '2023-11-16',
    status: 'In Progress',
    progress: 50,
    priority: 'High',
    keyMilestone: false,
    assignedResources: ['PR-6'],
    dependencies: [{ targetActivityId: 'ACT-201', type: 'FS', lag: 0 }],
    earlyStart: 5, earlyFinish: 15, lateStart: 5, lateFinish: 15, totalFloat: 0, isCritical: true
  },
  {
    id: 'ACT-203',
    projectId: 'P2',
    wbsId: 'WBS-P2-2',
    code: 'ACT-2030',
    name: 'Apply Primer Coats to Cement Plinth',
    description: 'Apply high penetrative chemical grade primer to avoid micro-osmosis bubbling.',
    duration: 4,
    startDate: '2023-11-16',
    finishDate: '2023-11-20',
    plannedStart: '2023-11-16',
    plannedFinish: '2023-11-20',
    status: 'Not Started',
    progress: 0,
    priority: 'Medium',
    keyMilestone: false,
    assignedResources: ['PR-5', 'PR-7'],
    dependencies: [{ targetActivityId: 'ACT-202', type: 'FS', lag: 0 }],
    earlyStart: 15, earlyFinish: 19, lateStart: 15, lateFinish: 19, totalFloat: 0, isCritical: true
  }
];

// Helper to convert date to offset from master start date in days
export function dateToOffsetDays(dateStr: string, baseDateStr: string): number {
  const base = new Date(baseDateStr);
  const target = new Date(dateStr);
  
  // Standard UTC/Day difference
  const diffTime = target.getTime() - base.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return isNaN(diffDays) ? 0 : diffDays;
}

// Helper to offset days back to date string
export function offsetDaysToDate(offset: number, baseDateStr: string): string {
  const base = new Date(baseDateStr);
  base.setDate(base.getDate() + offset);
  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, '0');
  const day = String(base.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Robust bellman-ford style iterative CPM scheduler that calculates:
 * - Early Start (ES), Early Finish (EF)
 * - Late Start (LS), Late Finish (LF)
 * - Total Float (TF)
 * - isCritical (Boolean)
 * Supporting cyclic graphs gracefully (supports convergence in V limits or resets)
 */
export function recalculateScheduleCPM(
  activities: Activity[],
  projectStartDateStr: string
): Activity[] {
  if (activities.length === 0) return [];

  // Deep copy so we don't modify state directly
  const acts: Activity[] = activities.map(a => ({
    ...a,
    earlyStart: 0,
    earlyFinish: a.duration,
    lateStart: 0,
    lateFinish: 0,
    totalFloat: 0,
    isCritical: false,
    dependencies: a.dependencies || []
  }));

  const n = acts.length;
  const projectBase = projectStartDateStr || acts[0].startDate || '2024-01-01';

  // --- FORWARD PASS (Early calculations) ---
  // We run up to N iterations to settle early starts for complex dependency logic (FS, SS, FF, SF)
  let changed = true;
  for (let iter = 0; iter < n + 5 && changed; iter++) {
    changed = false;
    for (let i = 0; i < n; i++) {
      const act = acts[i];
      let maxES = 0;

      for (const dep of act.dependencies) {
        const pred = acts.find(a => a.id === dep.targetActivityId);
        if (!pred) continue;
        
        // Check dependency logic
        let esCandidate = 0;
        if (dep.type === 'FS') {
          // Finish To Start: Target cannot start until Predecessor finishes
          esCandidate = pred.earlyFinish + dep.lag;
        } else if (dep.type === 'SS') {
          // Start To Start: Target cannot start until Predecessor starts
          esCandidate = pred.earlyStart + dep.lag;
        } else if (dep.type === 'FF') {
          // Finish To Finish: Target cannot finish until Predecessor finishes (ES = EF - duration)
          esCandidate = pred.earlyFinish + dep.lag - act.duration;
        } else if (dep.type === 'SF') {
          // Start To Finish: Target cannot finish until Predecessor starts (ES = EF - duration)
          esCandidate = pred.earlyStart + dep.lag - act.duration;
        }

        if (esCandidate > maxES) {
          maxES = esCandidate;
        }
      }

      // Check external constraints
      const originalOffset = dateToOffsetDays(act.plannedStart, projectBase);
      const targetES = Math.max(maxES, originalOffset >= 0 ? originalOffset : 0);

      if (act.earlyStart !== targetES) {
        act.earlyStart = targetES;
        act.earlyFinish = targetES + act.duration;
        changed = true;
      }
    }
  }

  // --- BACKWARD PASS (Late calculations) ---
  // Maximum project wrap size
  const maxEF = Math.max(...acts.map(a => a.earlyFinish), 1);

  // Initialize all late finishes with max project EF
  for (const act of acts) {
    act.lateFinish = maxEF;
    act.lateStart = maxEF - act.duration;
  }

  changed = true;
  for (let iter = 0; iter < n + 5 && changed; iter++) {
    changed = false;
    for (let i = 0; i < n; i++) {
      const act = acts[i];
      let minLF = maxEF;

      // Find all activities that DEPEND on act as a predecessor
      for (const succ of acts) {
        for (const dep of succ.dependencies) {
          if (dep.targetActivityId !== act.id) continue;

          let lfCandidate = maxEF;
          if (dep.type === 'FS') {
            lfCandidate = succ.lateStart - dep.lag;
          } else if (dep.type === 'SS') {
            lfCandidate = succ.lateStart - dep.lag + act.duration;
          } else if (dep.type === 'FF') {
            lfCandidate = succ.lateFinish - dep.lag;
          } else if (dep.type === 'SF') {
            lfCandidate = succ.lateFinish - dep.lag + act.duration;
          }

          if (lfCandidate < minLF) {
            minLF = lfCandidate;
          }
        }
      }

      if (act.lateFinish !== minLF) {
        act.lateFinish = minLF;
        act.lateStart = minLF - act.duration;
        changed = true;
      }
    }
  }

  // --- FLOATS & CRITICAL TRACKS ---
  for (const act of acts) {
    // Float = Late Start - Early Start (or LF - EF)
    act.totalFloat = Math.max(act.lateStart - act.earlyStart, 0);
    act.isCritical = act.totalFloat <= 0;

    // Shift real actual/planned dates to match calculated offsets for display
    act.startDate = offsetDaysToDate(act.earlyStart, projectBase);
    act.finishDate = offsetDaysToDate(act.earlyFinish, projectBase);
  }

  return acts;
}

// Construction Workflows metrics
export interface ConstructionProgress {
  id: string;
  projectId: string;
  activityId: string;
  date: string;
  stageName: 'Surface Preparation' | 'Grinding' | 'Concrete Treatment' | 'Primer' | 'Epoxy Coat 1' | 'Epoxy Coat 2' | 'Inspection' | 'Quality Approval' | 'Handover';
  squareMetersTotal: number;
  squareMetersCompleted: number;
  completedTodayMeters: number;
  activeWorkers: number;
  workerProductivity: number; // M2 per worker
  shift: 'Morning' | 'Evening';
  equipmentUsed: string; // PR name
}

export const INITIAL_CONSTRUCTION_PROGRESS: ConstructionProgress[] = [
  {
    id: 'CP-101',
    projectId: 'P2',
    activityId: 'ACT-202',
    date: '2026-05-18',
    stageName: 'Grinding',
    squareMetersTotal: 2500,
    squareMetersCompleted: 1250,
    completedTodayMeters: 450,
    activeWorkers: 6,
    workerProductivity: 75,
    shift: 'Morning',
    equipmentUsed: 'Concrete Grinder G40'
  },
  {
    id: 'CP-102',
    projectId: 'P2',
    activityId: 'ACT-202',
    date: '2026-05-19',
    stageName: 'Grinding',
    squareMetersTotal: 2500,
    squareMetersCompleted: 1700,
    completedTodayMeters: 450,
    activeWorkers: 6,
    workerProductivity: 75,
    shift: 'Evening',
    equipmentUsed: 'Concrete Grinder G40'
  },
  {
    id: 'CP-103',
    projectId: 'P2',
    activityId: 'ACT-203',
    date: '2026-05-20',
    stageName: 'Primer',
    squareMetersTotal: 2500,
    squareMetersCompleted: 350,
    completedTodayMeters: 350,
    activeWorkers: 4,
    workerProductivity: 87.5,
    shift: 'Morning',
    equipmentUsed: 'PR-5 Grade Spray and Mix'
  }
];
