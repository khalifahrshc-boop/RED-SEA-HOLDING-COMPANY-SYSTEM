export interface Project {
  id: string;
  name: string;
  status: 'Active' | 'On Hold' | 'Completed';
  budget: number; // Total Project Budget
  expenditureBudget: number; // Separate Expenditure Budget
  spent: number; // Total spent (labor + equipment + materials + invoices)
  contractValue: number;
  revenueGenerated: number;
  startDate: string;
  endDate: string;
  managerId: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  riskDetails?: string;
  attendancePrepTime: string; // e.g. "07:00"
  attendanceCloseTime: string; // e.g. "09:00"
  dailyBudget: number; // Daily allocated limit
  productivityMetrics?: { id: string; targetTask: string; unitMeasurement: string; defaultUnitCost: number; defaultDailyQuota: number; }[];
  createdAt?: any;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'On Leave';

export interface AttendanceRecord {
  workerId: string;
  workerName: string;
  status: AttendanceStatus;
  checkInTime?: string;
  notes?: string;
  hasPPE?: boolean;
  isHealthy?: boolean;
  requiredHours?: number;
  completedHours?: number;
  breaksCount?: number;
  breakDuration?: number; // in minutes
  endTime?: string;
}

export interface AttendanceSheet {
  id: string;
  projectId: string;
  projectName?: string;
  date: string;
  supervisorName: string;
  supervisorId: string;
  records: AttendanceRecord[];
  status: 'Draft' | 'Pending Project Manager' | 'Pending HR Manager' | 'Pending Accounting' | 'Pending Operations' | 'Pending Executive' | 'Approved';
}

export interface ScheduleDayDetail {
  present: boolean;
  dutyStartTime: string;
  workStartTime: string;
  workEndTime: string;
  workedHours: number;
}

export interface ScheduleEmpDetail {
  id: string;
  workerId?: string;
  name: string;
  badgeNumber: string;
  companyType: 'Our Company' | 'Rental/External Company';
  rentalCompanyName?: string;
  occupation: string;
  days: Record<string, ScheduleDayDetail>; // Keys "1" to "31"
}

export interface DailyAttendanceSchedule {
  id: string;
  projectName: string;
  projectLocation: string;
  prepTime: string;
  month: string; // YYYY-MM
  employees: ScheduleEmpDetail[];
  createdAt?: any;
  updatedAt?: any;
}

export type WorkerStatus = 'Working' | 'On Site' | 'Off Duty' | 'Vacation' | 'On Leave' | 'Sick Leave';
export type EmploymentType = 'Internal' | 'Seconded';

export interface Worker {
  id: string;
  name: string;
  role: string;
  campus: string;
  room: string;
  meals: 'Standard' | 'Premium' | 'Vip';
  status: WorkerStatus;
  employmentType: EmploymentType;
  approvalStatus: 'Pending HR' | 'Pending Manager' | 'Approved';
  projectId?: string;
  assignedTaskId?: string;
  assignmentLocation?: string;
  assignmentArea?: string;
  passportNumber?: string;
  accommodationId?: string;
  dailyRate: number;
  equipmentDailyRate: number;
  monthlySalary?: number;
  totalAllowances?: number;
  housingAllowance?: number;
  transportationAllowance?: number;
  incentives?: number;
  department?: string;
  idExpiryDate?: string;
  insuranceStartDate?: string;
  insuranceExpiryDate?: string;
  attachmentUrls?: string[]; // base64 encoded strings
}

export interface ProjectResource {
  id: string;
  projectId: string;
  name: string;
  category: 'Material' | 'Equipment';
  type: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  status: 'Ordered' | 'On Site' | 'Consumed' | 'Maintenance';
}

export interface Accommodation {
  id: string;
  campName: string;
  roomNumber: string;
  capacity: number;
  currentOccupancy: number;
  status: string;
}

export interface CompanyData {
  name: string;
  vatNumber: string;
  crNumber: string;
  headquarters: string;
  website: string;
  email: string;
  phone: string;
  department?: string;
  footerText?: string;
  logo?: string;
  projectManager?: { name: string; contact: string };
  operationsManager?: { name: string };
  hrManager?: { name: string };
}

export interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  rate: number;
  taxableValue: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export interface Invoice {
  id: string;
  projectId: string;
  project: string;
  date: string;
  amount: number;
  tax: number;
  total: number;
  status: 'Draft' | 'Pending Finance' | 'Pending Official Approval' | 'Approved' | 'Sent' | 'Paid';
  qrCodeData: string;
  createdAt: string;
  recipientName?: string;
  recipientTaxId?: string;
  recipientAddress?: string;
  items?: InvoiceItem[];
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountAmount?: number;
  type?: 'Sales' | 'Purchase';
}

export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PriceQuote {
  id: string;
  projectId: string;
  vendorName: string;
  date: string;
  items: QuoteItem[];
  totalAmount: number;
  status: 'Draft' | 'Internal Review' | 'Awaiting Finance' | 'Approved' | 'Rejected';
}

export interface PurchaseOrder {
  id: string;
  quoteId?: string;
  projectId: string;
  vendorName: string;
  date: string;
  items: QuoteItem[];
  totalAmount: number;
  status: 'Draft' | 'Awaiting Issuance' | 'Issued' | 'Received' | 'Cancelled';
}

export interface ProjectCostItem {
  id: string;
  description: string;
  category: 'Labor' | 'Material' | 'Equipment' | 'Overhead' | 'Subcontract';
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface ProjectCostSheet {
  id: string;
  projectId: string;
  projectName: string;
  date: string;
  items: ProjectCostItem[];
  subtotal: number;
  tax: number;
  grandTotal: number;
  status: 'In Progress' | 'Finalized';
  finalizedAt?: string;
}

export interface Asset {
  id: string;
  referenceNumber: string;
  name: string;
  model: string;
  category: 'Heavy Equipment' | 'Vehicles' | 'Tools' | 'IT Assets' | 'Other';
  ownershipType: 'Owned' | 'Rented';
  rentalSource?: string;
  dailyCost?: number;
  serialNumber: string;
  acquisitionDate: string;
  condition: 'Mint' | 'Good' | 'Fair' | 'Maintenance Required';
  status: 'Active' | 'Under Repair' | 'Retired' | 'Auctioned';
  location: string;
  value: number;
  projectId?: string;
  quantity?: number;
  unit?: string;
  accountingApproved?: boolean;
  accountingApprovedBy?: string;
  accountingApprovedAt?: string;
}

export interface AdditionalCost {
  id: string;
  projectId: string;
  description: string;
  category: string;
  totalAmount: number;
  startDate: string;
  endDate: string;
  dailyDistribution: number;
  reason: string;
  status: 'Pending HR' | 'Pending Accounting' | 'Pending Management' | 'Pending Project Manager' | 'Approved' | 'Rejected';
  createdAt: string;
}

export interface DailyExpenditure {
  id: string;
  projectId: string;
  date: string;
  amount: number;
  description: string;
  category: string;
  status: 'Pending HR' | 'Pending Accounting' | 'Pending Operations' | 'Pending Project Manager' | 'Approved' | 'Rejected';
  accountingStaffId: string;
  accountingStaffName: string;
  createdAt: string;
}

export interface BudgetVarianceReport {
  id: string;
  projectId: string;
  date: string;
  dailyBudget: number;
  actualSpent: number;
  variance: number;
  reason: string;
  status: 'Pending Review' | 'Awaiting Manager' | 'Awaiting Official' | 'Approved' | 'Rejected';
  reportedById: string;
  reportedByName: string;
  createdAt: string;
}

export interface AccountingTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  accountId?: string;
  accountName?: string;
  category?: 'Assets' | 'Liabilities' | 'Revenues' | 'Expenses';
  subCategory?: string;
  status: 'Pending AI Classification' | 'Classified';
}

export interface AccountingAccount {
  id: string;
  name: string;
  category: 'Assets' | 'Liabilities' | 'Revenues' | 'Expenses';
  subCategory: string;
  balance: number;
}

export interface ProductivityWorkerDetail {
  workerId: string;
  workerName: string;
  
  triHourlyQuota?: number;
  triHourlyCompleted?: number;
  
  dailyQuota?: number;
  dailyCompleted?: number;
  
  weeklyQuota?: number;
  weeklyCompleted?: number;

  monthlyQuota?: number;
  monthlyCompleted?: number;

  actuallyCompleted: number; // Will be used as the source of truth if others are missing or for legacy
  unitCost: number;
  totalCost: number;
}

export interface DailyOutputRec {
  id: string;
  projectId: string;
  projectName: string;
  workerId?: string; // primary or legacy
  workerName?: string; // primary or legacy
  workerIds?: string[];
  workerNames?: string[];
  workerRecords?: ProductivityWorkerDetail[];
  date: string;
  taskDescription: string;
  dailyQuota: number; // per employee
  triHourlyQuota?: number; // per employee
  monthlyQuota?: number; // per employee
  weeklyQuota?: number; // per employee
  actuallyCompleted: number;
  unitMeasurement: string;
  unitCost?: number;
  totalCost: number;
  notes?: string;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  date: string;
  endDate?: string;
  time?: string;
  task: string;
  goal: string;
  taskType?: string;
  achievement?: string;
  expectedMeters?: number;
  maxWorkers?: number;
  maxManagers?: number;
  allowedRole?: string;
  location?: string;
  startDay?: number;
  endDay?: number;
  assignedTo: {
    type: 'Department' | 'Person' | 'Team' | 'Group';
    value: string;
  };
  department: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  createdAt: string;
}

export interface AppNotification {
  id: string;
  type: 'Approval' | 'Task' | 'Message' | 'System' | 'Request' | 'Alert' | 'Success' | 'Info';
  title: string;
  message: string;
  department: string;
  relatedId?: string;
  relatedType?: View;
  read: boolean;
  createdAt: string;
}

// Payroll System Types
export type PayrollStatus = 'Draft' | 'Under Review' | 'Approved' | 'Paid' | 'Archived';

export interface SalaryComponents {
  basicSalary: number;
  housingAllowance: number;
  transportationAllowance: number;
  foodAllowance: number;
  mobileAllowance: number;
  siteAllowance: number;
  projectAllowance: number;
  riskAllowance: number;
  otherFixedAllowances: number;
}

export interface AttendanceMetrics {
  totalCalendarDays: number;
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  sickLeaveDays: number;
  annualLeaveDays: number;
  unpaidLeaveDays: number;
  officialHolidays: number;
  restDays: number;
  totalWorkedHours: number;
  overtimeHours: number;
  nightShiftHours: number;
}

export interface Earnings {
  basicSalaryEarned: number;
  allowancesEarned: number;
  overtimePay: number;
  bonus: number;
  incentives: number;
  productivityRewards: number;
  sitePerformanceRewards: number;
  otherEarnings: number;
}

export interface Deductions {
  absenceDeductions: number;
  lateArrivalDeductions: number;
  earlyDepartureDeductions: number;
  unpaidLeaveDeductions: number;
  loanDeductions: number;
  salaryAdvanceDeductions: number;
  trafficViolationDeductions: number;
  companyAssetDamageDeductions: number;
  penalties: number;
  gosiDeduction: number;
  otherDeductions: number;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  nationality: string;
  idNumber: string;
  jobTitle: string;
  department: string;
  projectAssignment: string;
  costCenter: string;
  hireDate: string;
  contractType: string;
  bankName: string;
  ibanNumber: string;
  employeeStatus: string;
  
  payrollMonth: string;
  payrollYear: number;
  startDate: string;
  endDate: string;
  processingDate: string;
  paymentDate?: string;
  
  salaryComponents: SalaryComponents;
  attendance: AttendanceMetrics;
  earnings: Earnings;
  deductions: Deductions;
  
  grossSalary: number;
  totalEarnings: number;
  totalDeductions: number;
  netSalary: number;
  
  currency: string;
  paymentMethod: 'Bank Transfer' | 'Cash' | 'Cheque';
  bankTransferRef?: string;
  
  preparedBy: string;
  reviewedBy?: string;
  approvedBy?: string;
  approvalDate?: string;
  status: PayrollStatus;
  
  createdAt: string;
  updatedAt: string;
}

export interface PayrollPeriod {
  id: string;
  month: string; // e.g. "January"
  year: number;
  startDate: string;
  endDate: string;
  status: PayrollStatus;
  records: PayrollRecord[];
  totalEmployees: number;
  totalPayrollCost: number;
  totalOvertimeCost: number;
  totalDeductions: number;
}

export interface ContractDraft {
  id: string;
  date: string;
  type: string;
  partyTwo: {
    name: string;
    phone: string;
    email: string;
    crNumber: string;
    taxId: string;
    address: string;
  };
  content: {
    preamble: { en: string; ar: string };
    duration: { en: string; ar: string };
    terms: { en: string; ar: string };
    paymentTerms: { en: string; ar: string };
    termination: { en: string; ar: string };
    obligations: { en: string; ar: string };
    notes: { en: string; ar: string };
  };
  status: 'Draft' | 'Finalized';
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  target: string;
  details: any;
  timestamp: string;
}

export interface MonthlyAttendanceDay {
  day: number;
  status: 'Present' | 'Absent';
  workingHours: number;
  startTime: string;
  endTime: string;
}

export interface EmployeeAttendanceRec {
  id: string;
  name: string;
  idNumber: string;
  badgeNumber: string;
  jobTitle: string;
  employeeType: 'Company' | 'Rental';
  rentalCompanyName?: string;
  month: string; // YYYY-MM
  dailyRecords: MonthlyAttendanceDay[];
}

export interface WorkAreaWorker {
  id: string;
  name: string;
  badgeNumber: string;
  profession: string;
  employmentType: 'Company employee' | 'Labor supply company employee';
  laborSupplyCompanyName?: string;
  startTime: string;
  endTime: string;
}

export interface WorkAreaGroup {
  id: string;
  workLocation: string;
  workDurationFrom: string;
  workDurationTo: string;
  shiftStartTime: string;
  groupNumber: string;
  supervisor: {
    name: string;
    idNumber: string;
    badgeNumber: string;
    contactNumber: string;
  };
  workers: WorkAreaWorker[];
  projectManagerName?: string;
  projectManagerContact?: string;
  operationsManagerName?: string;
  hrManagerName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionStep {
  id: string;
  step: string;
}

export interface WorkforceMember {
  id: string;
  name: string;
  badgeNumber: string;
  occupation: string;
}

export interface WorkPlanTask {
  id: string;
  itemType: string;
  workerCount: number;
  workerJobType: string;
  workerSelectionType: 'Random' | 'Selective';
  workerList?: WorkforceMember[];
  totalMeters: number;
  requiredMeters: number;
  itemLocation: string;
  detailedLocation: string;
  executionMethod: 'Individual execution' | 'Combined execution';
  individualDescription?: string;
  executionSteps?: ExecutionStep[];
  isExpanded?: boolean;
}

export interface DailyWorkPlan {
  id: string;
  projectId: string;
  projectType: 'internal' | 'external';
  projectName: string;
  externalLocation?: string;
  planDate: string;
  shift: 'Morning' | 'Evening';
  planSupervisor: string;
  projectManager: string;
  planNumber: string;
  tasks: WorkPlanTask[];
  operationsManagerName: string;
  createdAt: string;
  updatedAt: string;
}

export type View = 'dashboard' | 'projects' | 'hr' | 'accommodation' | 'finance' | 'procurement' | 'risk' | 'inventory' | 'attendance' | 'additional-costs' | 'daily-expenditures' | 'budget-variance' | 'equipment' | 'user-guide' | 'settings' | 'productivity' | 'planning' | 'contracts' | 'accounting-tree' | 'contractor-claims' | 'project-charter' | 'daily-planning' | 'payroll';

export interface SectionPermission {
  sectionId: string;
  sectionName: string;
  actions: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    [key: string]: boolean; // For custom actions like "record"
  };
}

export interface DepartmentPermission {
  departmentId: string;
  departmentName: string;
  sections: SectionPermission[];
}

export interface UserPermissions {
  departments: DepartmentPermission[];
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'User';
  department: string;
  permissions: string[]; // Legacy
  structuredPermissions?: UserPermissions;
  status: 'Active' | 'Inactive';
  createdAt: any;
}

export interface SirHistoryLog {
  id: string;
  action: string;
  actor: string;
  role: 'Admin' | 'Inspector' | 'Contractor';
  date: string;
  remarks?: string;
}

export interface SirComment {
  id: string;
  author: string;
  role: string;
  text: string;
  date: string;
}

export interface SirRequest {
  id: string;
  sirNumber: string;
  projectName: string;
  projectNumber: string;
  contractorName: string;
  consultantName: string;
  clientName: string;
  date: string;
  requestedInspectionDate: string;
  locationZone: string;
  drawingRef: string;
  methodStatementRef: string;
  workDescription: string;
  inspectionType: 'Civil Works' | 'Painting Works' | 'Electrical Works' | 'Mechanical Works' | 'Plumbing Works' | 'Finishing Works' | 'Waterproofing' | 'Other';
  checklist: { id: string; label: string; checked: boolean }[];
  contractorRepresentative: string;
  consultantRemarks: string;
  status: 'Approved' | 'Approved with Comments' | 'Rejected' | 'Under Review';
  attachments?: { name: string; type: string; dataUrl: string; size: string }[];
  comments?: SirComment[];
  history: SirHistoryLog[];
  qrCodeValue?: string;
}

