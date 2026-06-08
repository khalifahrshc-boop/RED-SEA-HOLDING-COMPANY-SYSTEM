/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { translations, Language } from './lib/translations';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Workforce } from './components/Workforce';
import { AlertCircle } from 'lucide-react';
import { PayrollManager } from './components/PayrollManager';
import { Finance } from './components/Finance';
import { RiskDetector } from './components/RiskDetector';
import { Projects } from './components/Projects';
import { Settings } from './components/Settings';
import { Procurement } from './components/Procurement';
import { Accommodation } from './components/Accommodation';
import { Inventory } from './components/Inventory';
import { Attendance } from './components/Attendance';
import { AdditionalCosts } from './components/AdditionalCosts';
import { DailyExpenditures } from './components/DailyExpenditures';
import { BudgetVariance } from './components/BudgetVariance';
import { Equipment } from './components/Equipment';
import { Planning } from './components/Planning';
import { DocumentCenter } from './components/DocumentCenter';
import { AccountingTree } from './components/AccountingTree';
import { UserGuide } from './components/UserGuide';
import { Productivity } from './components/Productivity';
import { ContractorClaims } from './components/ContractorClaims';
import { ProjectCharter } from './components/ProjectCharter';
import { DailyPlanningReport } from './components/DailyPlanningReport';
import { View, Project, Invoice, ProjectCostSheet, Worker, ProjectResource, Asset, AttendanceSheet, AdditionalCost, DailyExpenditure, BudgetVarianceReport, CompanyData } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useFirestoreCollection } from './hooks/useFirestore';
import { db } from './lib/firebase';
import { collection, onSnapshot, query, deleteDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/firebase';

function convertTimestamps(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (typeof obj.toDate === 'function') {
    return obj.toDate().toISOString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertTimestamps);
  }
  
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val && typeof val === 'object' && typeof val.toDate === 'function') {
      result[key] = val.toDate().toISOString();
    } else if (val && typeof val === 'object') {
      result[key] = convertTimestamps(val);
    } else {
      result[key] = val;
    }
  }
  return result;
}
import { Trash2 } from 'lucide-react';

const initialResources: ProjectResource[] = [
  { id: 'R1', projectId: 'P1', name: 'Cement Mix X-100', category: 'Material', type: 'Consumable', quantity: 500, unit: 'Bags', unitCost: 45, totalCost: 22500, status: 'On Site' },
  { id: 'R2', projectId: 'P1', name: 'Bulldozer D9R', category: 'Equipment', type: 'Heavy Machinery', quantity: 2, unit: 'Units', unitCost: 150000, totalCost: 300000, status: 'On Site' },
];

const initialWorkers: Worker[] = [
  { id: '10045', name: 'Ahmed Ali', role: 'Masonry Specialist', campus: 'East Camp A', room: '204', meals: 'Standard', status: 'Working', employmentType: 'Internal', approvalStatus: 'Approved', projectId: 'P1', dailyRate: 150, equipmentDailyRate: 45 },
  { id: '10046', name: 'Mohammad Khan', role: 'Steel Fixer', campus: 'West Hub B', room: '112', meals: 'Premium', status: 'Off Duty', employmentType: 'Seconded', approvalStatus: 'Pending Manager', projectId: 'P2', dailyRate: 120, equipmentDailyRate: 30 },
  { id: '10047', name: 'Raj Kumar', role: 'Site Engineer', campus: 'North Villa', room: '05', meals: 'Standard', status: 'On Site', employmentType: 'Internal', approvalStatus: 'Pending HR', projectId: 'P1', dailyRate: 250, equipmentDailyRate: 75 },
];

const initialProjects: Project[] = [
  { 
    id: 'P1', 
    name: 'NEOM Site Preparation', 
    status: 'Active', 
    budget: 12000000, 
    expenditureBudget: 2000000,
    spent: 4500000, 
    contractValue: 15000000,
    revenueGenerated: 5000000,
    startDate: '2024-01-15', 
    endDate: '2025-06-30', 
    managerId: 'M-001', 
    riskLevel: 'Low',
    riskDetails: 'Standard operational environmental variables.',
    attendancePrepTime: '07:00',
    attendanceCloseTime: '08:00',
    dailyBudget: 50000
  },
  { 
    id: 'P2', 
    name: 'Red Sea Luxury Resort', 
    status: 'Active', 
    budget: 45000000, 
    expenditureBudget: 8000000,
    spent: 32000000, 
    contractValue: 55000000,
    revenueGenerated: 35000000,
    startDate: '2023-11-01', 
    endDate: '2026-03-15', 
    managerId: 'M-002', 
    riskLevel: 'Medium',
    riskDetails: 'Global supply chain delay on specialized glass.',
    attendancePrepTime: '06:30',
    attendanceCloseTime: '07:30',
    dailyBudget: 150000
  },
  { 
    id: 'P3', 
    name: 'Jeddah Central Tower', 
    status: 'On Hold', 
    budget: 150000000, 
    expenditureBudget: 25000000,
    spent: 12000000, 
    contractValue: 185000000,
    revenueGenerated: 15000000,
    startDate: '2024-03-10', 
    endDate: '2028-12-01', 
    managerId: 'M-003', 
    riskLevel: 'High',
    riskDetails: 'Geological instability detected in bedrock samples.',
    attendancePrepTime: '08:00',
    attendanceCloseTime: '09:30',
    dailyBudget: 250000
  },
  { 
    id: 'P4', 
    name: 'Qiddiya Entertainment Hub', 
    status: 'Completed', 
    budget: 8500000, 
    expenditureBudget: 1500000,
    spent: 8350000, 
    contractValue: 10000000,
    revenueGenerated: 10000000,
    startDate: '2023-05-01', 
    endDate: '2024-04-10', 
    managerId: 'M-001', 
    riskLevel: 'Low',
    attendancePrepTime: '07:00',
    attendanceCloseTime: '08:30',
    dailyBudget: 45000
  },
];

const initialInvoices: Invoice[] = [
  { id: 'INV-2024-001', projectId: 'P1', project: 'NEOM Site Prep', date: '2024-04-10', amount: 45000, tax: 6750, total: 51750, status: 'Paid', qrCodeData: '', createdAt: '2024-04-10' },
  { id: 'INV-2024-002', projectId: 'P2', project: 'Red Sea Resort', date: '2024-04-20', amount: 12000, tax: 1800, total: 13800, status: 'Pending Finance', qrCodeData: '', createdAt: '2024-04-20' },
  { id: 'INV-2024-003', projectId: 'P3', project: 'Jeddah Central', date: '2024-04-25', amount: 89000, tax: 13350, total: 102350, status: 'Draft', qrCodeData: '', createdAt: '2024-04-25' },
];

const initialCostSheets: ProjectCostSheet[] = [
  {
    id: 'COST-001',
    projectId: 'P1',
    projectName: 'NEOM Site Prep',
    date: '2024-04-15',
    items: [
      { id: '1', description: 'Excavation Equipment Rental', category: 'Equipment', quantity: 1, unit: 'Week', unitPrice: 15000, total: 15000 },
      { id: '2', description: 'Reinforced Steel', category: 'Material', quantity: 50, unit: 'Ton', unitPrice: 2400, total: 120000 },
    ],
    subtotal: 135000,
    tax: 20250,
    grandTotal: 155250,
    status: 'Finalized',
    finalizedAt: '2024-04-15T10:00:00Z'
  }
];


function AppContent() {
  const { user, loading, error } = useAuth();
  const [activeView, setActiveView] = useLocalStorage<View>('ares_activeView', 'dashboard');
  const [projects, setProjects] = React.useState<Project[]>(initialProjects);
  const [invoices, setInvoices] = React.useState<Invoice[]>(initialInvoices);
  const [costSheets, setCostSheets] = useFirestoreCollection<ProjectCostSheet>('costSheets', initialCostSheets);
  const [workers, setWorkers] = React.useState<Worker[]>(initialWorkers);
  const [resources, setResources] = useFirestoreCollection<ProjectResource>('resources', initialResources);
  const [assets, setAssets] = useFirestoreCollection<Asset>('assets', [
    { id: 'A1', referenceNumber: 'EQ-HE-001', name: 'Bulldozer D9R', model: 'Cat D9R', category: 'Heavy Equipment', ownershipType: 'Owned', serialNumber: 'SN-001389', acquisitionDate: '2021-05-12', condition: 'Good', status: 'Active', location: 'East Camp A', value: 150000, projectId: 'P1', quantity: 1, unit: 'Item', accountingApproved: true },
    { id: 'A2', referenceNumber: 'EQ-VH-002', name: 'Transport Bus', model: 'Mercedes Sprinter', category: 'Vehicles', ownershipType: 'Rented', rentalSource: 'Auto Lease Inc.', dailyCost: 200, serialNumber: 'SN-V8829', acquisitionDate: '2023-11-20', condition: 'Mint', status: 'Active', location: 'HQ', value: 45000, quantity: 2, unit: 'Item', accountingApproved: true }
  ]);
  const [attendanceSheets, setAttendanceSheets] = React.useState<AttendanceSheet[]>([]);
  const [additionalCosts, setAdditionalCosts] = useFirestoreCollection<AdditionalCost>('additionalCosts', [
    {
      id: 'AC-3321',
      projectId: 'P1',
      description: 'Emergency Foundation Reinforcement',
      category: 'Technical Design Change',
      totalAmount: 125000,
      startDate: '2024-04-20',
      endDate: '2024-05-20',
      dailyDistribution: 4032.25,
      reason: 'Unforeseen soil condition required additional reinforcement mesh and high-grade concrete.',
      status: 'Approved',
      createdAt: '2024-04-20T09:00:00Z'
    },
    {
      id: 'AC-3322',
      projectId: 'P2',
      description: 'Expedited Glass Delivery',
      category: 'Supply Chain Expediting',
      totalAmount: 85000,
      startDate: '2024-04-22',
      endDate: '2024-04-30',
      dailyDistribution: 9444.44,
      reason: 'Critical path item: specialized glass panels for the resort lobby delayed in transit, requiring air freight.',
      status: 'Pending Accounting',
      createdAt: '2024-04-22T14:30:00Z'
    }
  ]);
  const [expenditures, setExpenditures] = useFirestoreCollection<DailyExpenditure>('expenditures', [
    {
      id: 'EXP-1102',
      projectId: 'P1',
      date: '2024-04-24',
      amount: 4500,
      description: 'Site safety barrier maintenance and replenishment',
      category: 'Site Maintenance',
      status: 'Approved',
      accountingStaffId: 'ACC-4492',
      accountingStaffName: 'Faisal bin Salman',
      createdAt: '2024-04-24T10:00:00Z'
    }
  ]);
  const [varianceReports, setVarianceReports] = useFirestoreCollection<BudgetVarianceReport>('varianceReports', [
    {
      id: 'VAR-5521',
      projectId: 'P1',
      date: '2024-04-23',
      dailyBudget: 50000,
      actualSpent: 32000,
      variance: 18000,
      reason: 'Scheduled concrete delivery delayed to next fiscal window; site labor optimized for groundwork preparation.',
      status: 'Approved',
      reportedById: 'ACC-4492',
      reportedByName: 'Faisal bin Salman',
      createdAt: '2024-04-23T17:00:00Z'
    }
  ]);
  const [language, setLanguage] = useLocalStorage<Language>('ares_language', 'ar');
  const [company, setCompany] = useLocalStorage<any>('ares_company', {
    name: 'RED SEA HOLDING COMPANY SYSTEM',
    logo: 'https://images.unsplash.com/photo-1599305090748-364e646fa360?q=80&w=200&h=200&auto=format&fit=crop',
    vatNumber: '312345678900003',
    crNumber: '1010123456',
    headquarters: 'Riyadh, KSA - King Fahd Rd',
    website: 'https://redseaholding.net',
    email: 'ops@redseaholding.net',
    phone: '+966 11 000 0000',
    projectManager: { name: 'Eng. Khalid Al-Otaibi', contact: '+966 50 123 4567' },
    operationsManager: { name: 'Eng. Mohammad Al-Dosary' },
    hrManager: { name: 'Sami bin Abdullah' }
  });

  const [dailyOutputs, setDailyOutputs] = useFirestoreCollection<any>('project_daily_outputs', [
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

  const [productivityRecords, setProductivityRecords] = useFirestoreCollection<any>('productivity_records', [
    {
      id: 'OP-001',
      projectId: 'PRJ-24-001',
      projectName: 'Riyadh Metro Station',
      workerId: '10045',
      workerName: 'Ahmed Hassan',
      workerRecords: [{
        workerId: '10045',
        workerName: 'Ahmed Hassan',
        actuallyCompleted: 45,
        unitCost: 15,
        totalCost: 675
      }],
      date: new Date().toISOString().split('T')[0],
      taskDescription: 'Block Work (External)',
      dailyQuota: 50,
      actuallyCompleted: 45,
      unitMeasurement: 'Square Meters',
      unitCost: 15,
      totalCost: 675,
      notes: 'Slight delay due to material shortage in the morning.'
    }
  ]);

  React.useEffect(() => {
    // Bi-directional sync of daily outputs & productivity records based on active view
    if (activeView === 'projects') {
      let changed = false;
      const updatedProductivity = [...productivityRecords];

      dailyOutputs.forEach(doRec => {
        const matchingIdx = updatedProductivity.findIndex(p => p.id === doRec.id);
        const proj = projects.find(p => p.id === doRec.projectId);
        const projectName = proj ? proj.projectName : 'General Project';

        const prTaskWorkers = workers.filter(w => w.projectId === doRec.projectId && (doRec.taskId ? w.assignedTaskId === doRec.taskId : true));
        const workerIds = prTaskWorkers.map(w => w.id);
        const workerNames = prTaskWorkers.map(w => w.name);
        
        const workerRecords = prTaskWorkers.map(w => ({
          workerId: w.id,
          workerName: w.name,
          actuallyCompleted: Math.round((doRec.actualMeters || 100) / (prTaskWorkers.length || 1)),
          unitCost: 15,
          totalCost: Math.round((doRec.actualMeters || 100) / (prTaskWorkers.length || 1)) * 15,
          dailyQuota: Math.round((doRec.expectedMeters || 100) / (prTaskWorkers.length || 1)),
          triHourlyQuota: Math.round(((doRec.expectedMeters || 100) / (prTaskWorkers.length || 1)) / 3)
        }));

        const primaryWorkerName = workerNames.length === 1 ? workerNames[0] : (workerNames.length > 0 ? `${workerNames.length} Workers` : 'Unknown Worker');
        const primaryWorkerId = workerIds.length === 1 ? workerIds[0] : (workerIds.length > 0 ? 'Multiple' : '00000');

        const expectedCompleted = doRec.actualMeters || 0;
        const expectedQuota = doRec.expectedMeters || 100;

        const newProdRec = {
          id: doRec.id,
          projectId: doRec.projectId,
          projectName: projectName,
          workerId: primaryWorkerId,
          workerName: primaryWorkerName,
          workerIds: workerIds,
          workerNames: workerNames,
          workerRecords: workerRecords,
          date: doRec.date,
          taskDescription: doRec.workersType || 'Site Activity',
          dailyQuota: expectedQuota,
          triHourlyQuota: Math.round(expectedQuota / 3),
          weeklyQuota: expectedQuota * 5,
          monthlyQuota: expectedQuota * 22,
          actuallyCompleted: expectedCompleted,
          unitMeasurement: 'Square Meters',
          unitCost: 15,
          totalCost: expectedCompleted * 15,
          notes: doRec.notes || '',
          _timeframe: doRec.timeframe,
          _workersCount: doRec.workersCount,
          _workersType: doRec.workersType,
          _daysRequired: doRec.daysRequired,
          _status: doRec.status,
          _taskId: doRec.taskId
        };

        if (matchingIdx === -1) {
          updatedProductivity.push(newProdRec);
          changed = true;
        } else {
          const existing = updatedProductivity[matchingIdx];
          if (
            existing.date !== doRec.date ||
            existing.projectId !== doRec.projectId ||
            existing.actuallyCompleted !== expectedCompleted ||
            existing.dailyQuota !== expectedQuota ||
            existing.notes !== (doRec.notes || '') ||
            existing.taskDescription !== (doRec.workersType || 'Site Activity') ||
            existing._timeframe !== doRec.timeframe ||
            existing._workersCount !== doRec.workersCount ||
            existing._daysRequired !== doRec.daysRequired ||
            existing._status !== doRec.status ||
            existing._taskId !== doRec.taskId
          ) {
            updatedProductivity[matchingIdx] = { ...existing, ...newProdRec };
            changed = true;
          }
        }
      });

      const activeIds = new Set(dailyOutputs.map(d => d.id));
      const filteredProductivity = updatedProductivity.filter(p => p.id === 'OP-001' || activeIds.has(p.id));
      if (filteredProductivity.length !== updatedProductivity.length) {
        changed = true;
      }

      if (changed) {
        setProductivityRecords(filteredProductivity);
      }
    } else if (activeView === 'productivity') {
      let changed = false;
      const updatedDailyOutputs = [...dailyOutputs];

      productivityRecords.forEach(prodRec => {
        const matchingIdx = updatedDailyOutputs.findIndex(d => d.id === prodRec.id);
        const newDoRec = {
          id: prodRec.id,
          projectId: prodRec.projectId,
          date: prodRec.date,
          timeframe: prodRec._timeframe || '07:00 - 16:00',
          workersCount: prodRec.workerIds?.length || prodRec._workersCount || 10,
          workersType: prodRec.taskDescription || prodRec._workersType || 'Site Activity',
          expectedMeters: prodRec.dailyQuota || 100,
          actualMeters: prodRec.actuallyCompleted || 0,
          daysRequired: prodRec._daysRequired || 10,
          status: prodRec._status || (prodRec.actuallyCompleted >= prodRec.dailyQuota ? 'On Track' : 'Behind Schedule'),
          notes: prodRec.notes || '',
          taskId: prodRec._taskId || ''
        };

        if (matchingIdx === -1) {
          updatedDailyOutputs.push(newDoRec);
          changed = true;
        } else {
          const existing = updatedDailyOutputs[matchingIdx];
          if (
            existing.date !== prodRec.date ||
            existing.projectId !== prodRec.projectId ||
            existing.actualMeters !== prodRec.actuallyCompleted ||
            existing.expectedMeters !== prodRec.dailyQuota ||
            existing.notes !== (prodRec.notes || '') ||
            existing.workersType !== (prodRec.taskDescription || prodRec._workersType || 'Site Activity') ||
            existing.timeframe !== (prodRec._timeframe || '07:00 - 16:00') ||
            existing.workersCount !== (prodRec.workerIds?.length || prodRec._workersCount || 10)
          ) {
            updatedDailyOutputs[matchingIdx] = newDoRec;
            changed = true;
          }
        }
      });

      const activeIds = new Set(productivityRecords.map(p => p.id));
      const filteredDailyOutputs = updatedDailyOutputs.filter(d => (d.id.startsWith('DO-') && d.id.length <= 6) || activeIds.has(d.id));
      if (filteredDailyOutputs.length !== updatedDailyOutputs.length) {
        changed = true;
      }

      if (changed) {
        setDailyOutputs(filteredDailyOutputs);
      }
    }
  }, [activeView, dailyOutputs, productivityRecords, projects, workers]);

  const workersRef = React.useRef(workers);
  React.useEffect(() => {
    workersRef.current = workers;
  }, [workers]);

  const invoicesRef = React.useRef(invoices);
  React.useEffect(() => {
    invoicesRef.current = invoices;
  }, [invoices]);

  // Firestore Sync
  React.useEffect(() => {
    if (!user) return;

    const unsubProjects = onSnapshot(collection(db, 'projects'), (snap) => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...convertTimestamps(d.data()) } as Project)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'projects'));

    const unsubWorkers = onSnapshot(collection(db, 'workers'), (snap) => {
      setWorkers(snap.docs.map(d => ({ id: d.id, ...convertTimestamps(d.data()) } as Worker)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'workers'));

    const unsubAttendance = onSnapshot(collection(db, 'attendanceSheets'), (snap) => {
      setAttendanceSheets(snap.docs.map(d => ({ id: d.id, ...convertTimestamps(d.data()) } as AttendanceSheet)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'attendanceSheets'));

    const unsubInvoices = onSnapshot(collection(db, 'invoices'), (snap) => {
      setInvoices(snap.docs.map(d => ({ id: d.id, ...convertTimestamps(d.data()) } as Invoice)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'invoices'));

    return () => {
      unsubProjects();
      unsubWorkers();
      unsubAttendance();
      unsubInvoices();
    };
  }, [user]);

  const handleSetWorkers = async (action: React.SetStateAction<Worker[]>) => {
    const currentWorkers = workersRef.current;
    const nextWorkers = typeof action === 'function' ? action(currentWorkers) : action;
    
    // Local update for snappiness
    setWorkers(nextWorkers);

    // Sync any additions or modifications
    for (const nw of nextWorkers) {
      const existing = currentWorkers.find(w => w.id === nw.id);
      if (!existing || JSON.stringify(existing) !== JSON.stringify(nw)) {
        try {
          const { id, ...data } = nw;
          const cleanData = { ...data };
          Object.keys(cleanData).forEach(key => {
            if (cleanData[key] === undefined) {
              delete cleanData[key];
            }
          });
          await setDoc(doc(db, 'workers', id), cleanData, { merge: true });
        } catch (e) {
          console.error("Error setting worker in Firestore:", e);
        }
      }
    }

    // Sync any deletions
    for (const ew of currentWorkers) {
      if (!nextWorkers.some(nw => nw.id === ew.id)) {
        try {
          await deleteDoc(doc(db, 'workers', ew.id));
        } catch (e) {
          console.error("Error deleting worker from Firestore:", e);
        }
      }
    }
  };

  const handleSetInvoices = async (action: React.SetStateAction<Invoice[]>) => {
    const currentInvoices = invoicesRef.current;
    const nextInvoices = typeof action === 'function' ? action(currentInvoices) : action;
    
    // Local update for snappiness
    setInvoices(nextInvoices);

    // Sync any additions or modifications
    for (const ni of nextInvoices) {
      const existing = currentInvoices.find(i => i.id === ni.id);
      if (!existing || JSON.stringify(existing) !== JSON.stringify(ni)) {
        try {
          const { id, ...data } = ni;
          const cleanData = { ...data };
          Object.keys(cleanData).forEach(key => {
            if (cleanData[key] === undefined) {
              delete cleanData[key];
            }
          });
          
          if (!existing) {
            cleanData.createdAt = serverTimestamp();
          } else {
            delete cleanData.createdAt;
          }
          await setDoc(doc(db, 'invoices', id), cleanData, { merge: true });
        } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `invoices/${ni.id}`);
        }
      }
    }

    // Sync any deletions
    for (const ei of currentInvoices) {
      if (!nextInvoices.some(ni => ni.id === ei.id)) {
        try {
          await deleteDoc(doc(db, 'invoices', ei.id));
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `invoices/${ei.id}`);
        }
      }
    }
  };

  const handleDeleteSheet = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'attendanceSheets', id));
      setAttendanceSheets(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `attendanceSheets/${id}`);
    }
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'ar' : 'en');
  };

  const createDraftInvoice = async (project: Project) => {
    // Check if a full completion invoice already exists for this project to avoid duplicates
    const exists = invoices.some(inv => inv.projectId === project.id && inv.amount === project.contractValue);
    if (exists) return;

    const id = `INV-${Date.now().toString().slice(-6)}`;
    const newInvoice: any = {
      projectId: project.id,
      project: project.name,
      date: new Date().toISOString().split('T')[0],
      amount: project.contractValue,
      tax: project.contractValue * 0.15,
      total: project.contractValue * 1.15,
      status: 'Draft',
      qrCodeData: '',
      createdAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, 'invoices', id), newInvoice);
      console.log(`Auto-generated draft invoice for project: ${project.name}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `invoices/${id}`);
    }
  };

  React.useEffect(() => {
    if (!user) return;
    
    let needsUpdate = false;
    const newWorkers = workers.map((w: any) => {
      const isFiveDigits = /^\d{5}$/.test(w.id);
      if (!isFiveDigits) {
        needsUpdate = true;
        let newId = String(Math.floor(10000 + Math.random() * 90000));
        return { ...w, _oldId: w.id, id: newId };
      }
      return w;
    });

    if (needsUpdate) {
       const idMap = new Map();
       const cleanWorkers = newWorkers.map((w: any) => {
          if (w._oldId) {
             idMap.set(w._oldId, w.id);
             const copy = {...w};
             delete copy._oldId;
             return copy;
          }
          return w;
       });

       setWorkers(cleanWorkers);

       const syncRenumberedToFirestore = async () => {
         for (const [oldId, newId] of idMap.entries()) {
           const worker = cleanWorkers.find(w => w.id === newId);
           if (worker) {
             try {
               const { id, ...data } = worker;
               const cleanData = { ...data };
               Object.keys(cleanData).forEach(key => {
                 if (cleanData[key] === undefined) {
                   delete cleanData[key];
                 }
               });
               
               await setDoc(doc(db, 'workers', newId), cleanData);
               await deleteDoc(doc(db, 'workers', oldId));
               console.log(`Successfully renumbered worker ${oldId} -> ${newId} in Firestore`);
             } catch (err) {
               console.error(`Failed to renumber worker ${oldId} in Firestore:`, err);
             }
           }
         }
       };
       syncRenumberedToFirestore();

       setAttendanceSheets(prev => {
         const nextSheets = prev.map(sheet => {
           const newRecords = sheet.records.map((r: any) => 
             idMap.has(r.workerId) ? { ...r, workerId: idMap.get(r.workerId) } : r
           );
           return { ...sheet, records: newRecords };
         });
         
         const syncSheets = async () => {
           for (const sheet of nextSheets) {
             const { id, ...data } = sheet;
             const cleanData = { ...data };
             Object.keys(cleanData).forEach(key => {
               if (cleanData[key] === undefined) {
                 delete cleanData[key];
               }
             });
             try {
               await setDoc(doc(db, 'attendanceSheets', id), cleanData, { merge: true });
             } catch (err) {
               console.error(`Failed to sync updated attendance sheet ${id} post-renumbering:`, err);
             }
           }
         };
         syncSheets();

         return nextSheets;
       });

       try {
         const prodStr = localStorage.getItem('ares_productivity_records');
         if (prodStr) {
           const pRecs = JSON.parse(prodStr);
           let pUpdate = false;
           const newPRecs = pRecs.map((r: any) => {
             let rChanged = false;
             let newR = { ...r };
             if (newR.workerId && idMap.has(newR.workerId)) {
               newR.workerId = idMap.get(newR.workerId);
               rChanged = true;
             }
             if (newR.workerIds) {
               newR.workerIds = newR.workerIds.map((id: string) => idMap.has(id) ? idMap.get(id) : id);
               rChanged = true;
             }
             if (newR.workerRecords) {
               newR.workerRecords = newR.workerRecords.map((wr: any) => 
                 idMap.has(wr.workerId) ? { ...wr, workerId: idMap.get(wr.workerId) } : wr
               );
               rChanged = true;
             }
             if (rChanged) pUpdate = true;
             return newR;
           });
           if (pUpdate) localStorage.setItem('ares_productivity_records', JSON.stringify(newPRecs));
         }
       } catch (e) {}
    }
  }, [workers, user]);

  const handleUpdateProject = async (updatedProject: Project) => {
    try {
      const { id, ...data } = updatedProject;
      const cleanData = { ...data };
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) {
          delete cleanData[key];
        }
      });
      
      delete cleanData.createdAt;
      
      await setDoc(doc(db, 'projects', id), cleanData, { merge: true });
      
      const isNewCompletion = updatedProject.status === 'Completed' && projects.find(p => p.id === updatedProject.id)?.status !== 'Completed';
      if (isNewCompletion) {
        createDraftInvoice(updatedProject);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${updatedProject.id}`);
    }
  };

  const handleCreateProject = async (newProject: Project) => {
    try {
      const { id, ...data } = newProject;
      const cleanData: any = {
        ...data,
        createdAt: serverTimestamp()
      };
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) {
          delete cleanData[key];
        }
      });
      await setDoc(doc(db, 'projects', id), cleanData);
      
      if (newProject.status === 'Completed') {
        createDraftInvoice(newProject);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `projects/${newProject.id}`);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'projects', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${id}`);
    }
  };

  const handleDeleteExpenditure = (id: string) => {
    setExpenditures(prev => prev.filter(e => e.id !== id));
  };

  const handleDeleteAdditionalCost = (id: string) => {
    setAdditionalCosts(prev => prev.filter(c => c.id !== id));
  };

  const handleDeleteVarianceReport = (id: string) => {
    setVarianceReports(prev => prev.filter(r => r.id !== id));
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard projects={projects} invoices={invoices} workers={workers} language={language} company={company} onViewChange={setActiveView} />;
      case 'projects':
        return (
          <Projects 
            projects={projects} 
            onUpdateProject={handleUpdateProject}
            onCreateProject={handleCreateProject}
            onDeleteProject={handleDeleteProject}
            workers={workers}
            setWorkers={handleSetWorkers}
            resources={resources}
            setResources={setResources}
            language={language}
            company={company}
            assets={assets}
            setAssets={setAssets}
            dailyOutputs={dailyOutputs}
            setDailyOutputs={setDailyOutputs}
          />
        );
      case 'payroll':
        return <PayrollManager workers={workers} projects={projects} company={company} language={language} />;
      case 'hr':
        return <Workforce projects={projects} workers={workers} setWorkers={handleSetWorkers} language={language} company={company} />;
      case 'accommodation':
        return <Accommodation language={language} company={company} />;
      case 'finance':
        return (
          <Finance 
            invoices={invoices} 
            setInvoices={handleSetInvoices} 
            costSheets={costSheets}
            setCostSheets={setCostSheets}
            workers={workers}
            language={language}
            projects={projects}
            onUpdateProject={handleUpdateProject}
            company={company}
            onNavigate={setActiveView}
          />
        );
      case 'procurement':
        return <Procurement projects={projects} language={language} onUpdateProject={handleUpdateProject} company={company} />;
      case 'accounting-tree':
        return <AccountingTree language={language} company={company} />;
      case 'risk':
        return <RiskDetector projects={projects} language={language} company={company} />;
      case 'inventory':
        return <Inventory language={language} projects={projects} onUpdateProject={handleUpdateProject} company={company} assets={assets} setAssets={setAssets} />;
      case 'attendance':
        return (
          <Attendance 
            projects={projects} 
            workers={workers} 
            attendanceSheets={attendanceSheets} 
            setAttendanceSheets={setAttendanceSheets}
            onDeleteSheet={handleDeleteSheet}
            language={language} 
            company={company}
          />
        );
      case 'additional-costs':
        return (
          <AdditionalCosts
            projects={projects}
            additionalCosts={additionalCosts}
            setAdditionalCosts={setAdditionalCosts}
            onDeleteCost={handleDeleteAdditionalCost}
            language={language}
            onUpdateProject={handleUpdateProject}
            company={company}
          />
        );
      case 'daily-expenditures':
        return (
          <DailyExpenditures
            projects={projects}
            expenditures={expenditures}
            setExpenditures={setExpenditures}
            onDeleteExpenditure={handleDeleteExpenditure}
            language={language}
            onUpdateProject={handleUpdateProject}
            company={company}
          />
        );
      case 'budget-variance':
        return (
          <BudgetVariance
            projects={projects}
            expenditures={expenditures}
            varianceReports={varianceReports}
            setVarianceReports={setVarianceReports}
            onDeleteReport={handleDeleteVarianceReport}
            language={language}
            company={company}
          />
        );
      case 'settings':
        return <Settings language={language} company={company} setCompany={setCompany} />;
      case 'equipment':
        return <Equipment language={language} projects={projects} company={company} assets={assets} setAssets={setAssets} />;
      case 'productivity':
        return <Productivity language={language} projects={projects} workers={workers} company={company} records={productivityRecords} setRecords={setProductivityRecords} />;
      case 'user-guide':
        return <UserGuide language={language} company={company} />;
      case 'planning':
        return <Planning projects={projects} workers={workers} language={language} company={company} />;
      case 'contracts':
        return <DocumentCenter projects={projects} company={company} language={language} />;
      case 'contractor-claims':
        return <ContractorClaims projects={projects} company={company} language={language} />;
      case 'project-charter':
        return <ProjectCharter projects={projects} company={company} language={language} />;
      case 'daily-planning':
        return <DailyPlanningReport projects={projects} company={company} language={language} />;
      default:
        return <Dashboard projects={projects} invoices={invoices} workers={workers} language={language} company={company} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full border border-red-100 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2 uppercase tracking-tight">System Access Denied</h2>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            A critical error occurred while initializing your enterprise context. This may be due to account provisioning status or connectivity issues.
          </p>
          <div className="bg-slate-50 p-4 rounded-lg text-left mb-6 overflow-auto max-h-48 text-xs font-mono text-rose-600 border border-slate-200">
            {error}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-slate-900 text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-black transition-all"
          >
            Retry Authentication
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Layout 
      activeView={activeView} 
      onViewChange={setActiveView}
      language={language}
      onLanguageToggle={toggleLanguage}
      company={company}
    >
      {renderContent()}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

