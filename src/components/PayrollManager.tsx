import React, { useState, useMemo, useRef } from 'react';
import { 
  Users, DollarSign, Clock, TrendingUp, TrendingDown, FileText, Download, 
  Plus, Search, Filter, ChevronRight, CheckCircle2, AlertCircle, Clock3,
  Calendar, Building2, Projector, Wallet, Printer, FileSpreadsheet,
  ArrowLeft, CheckCircle, XCircle, Eye, User, CreditCard, Building, 
  Trash2, Copy, FileSignature, Save, DownloadCloud, Mail, FileCheck
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie, Cell as PieCell
} from 'recharts';
import { cn, formatCurrency, formatDate, getCleanLogoBase64 } from '@/src/lib/utils';
import { 
  PayrollPeriod, PayrollRecord, Worker, Project, PayrollStatus, CompanyData 
} from '@/src/types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { numberToWords, numberToWordsAr } from '../lib/numberToWords';

interface PayrollManagerProps {
  workers: Worker[];
  projects: Project[];
  company?: CompanyData;
  language: 'en' | 'ar';
}

export function PayrollManager({ workers, projects, company, language }: PayrollManagerProps) {
  const [periods, setPeriods] = useFirestoreCollection<PayrollPeriod>('payroll_periods', []);
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Control' | 'Archive'>('Dashboard');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [isCreatingPeriod, setIsCreatingPeriod] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PayrollRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const selectedPeriod = periods.find(p => p.id === selectedPeriodId);
  const selectedRecord = selectedPeriod?.records.find(r => r.id === selectedRecordId);

  // Statistics for Dashboard
  const stats = useMemo(() => {
    const totalEmployees = workers.length;
    let totalPayrollCost = 0;
    let totalDeductions = 0;
    let totalOvertime = 0;
    let empWithAbsence = 0;
    let empWithOvertime = 0;
    let empPendingApproval = 0;

    const currentPeriod = periods[0];
    if (currentPeriod) {
      totalPayrollCost = currentPeriod.totalPayrollCost;
      totalDeductions = currentPeriod.totalDeductions;
      totalOvertime = currentPeriod.totalOvertimeCost;
      
      currentPeriod.records.forEach(r => {
        if (r.attendance.absentDays > 0) empWithAbsence++;
        if (r.attendance.overtimeHours > 0) empWithOvertime++;
        if (r.status === 'Draft' || r.status === 'Under Review') empPendingApproval++;
      });
    }
    
    const avgSalary = totalEmployees > 0 ? totalPayrollCost / totalEmployees : 0;
    
    return {
      totalEmployees, totalPayrollCost, avgSalary, totalDeductions, totalOvertime,
      empWithAbsence, empWithOvertime, empPendingApproval,
      netPayrollCost: totalPayrollCost
    };
  }, [periods, workers]);

  const departmentData = useMemo(() => {
    const depts: Record<string, number> = {};
    workers.forEach(w => {
      const dept = w.department || 'Other';
      depts[dept] = (depts[dept] || 0) + (w.monthlySalary || 0);
    });
    return Object.entries(depts).map(([name, value]) => ({ name, value }));
  }, [workers]);

  const trendData = useMemo(() => {
    return periods.slice(0, 6).reverse().map(p => ({
      name: `${p.month} ${p.year}`,
      cost: p.totalPayrollCost
    }));
  }, [periods]);

  const handleCreatePeriod = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const month = formData.get('month') as string;
    const year = parseInt(formData.get('year') as string);
    const endDateStr = formData.get('endDate') as string;
    
    // Automatically calculate working days in this month
    const yearNum = parseInt(year.toString());
    const monthIndex = new Date(Date.parse(month + " 1, " + yearNum)).getMonth();
    const daysInMonth = new Date(yearNum, monthIndex + 1, 0).getDate();
    const workingDays = daysInMonth; // Or a fixed 30
    const reqHours = workingDays * 8; // Assuming 8 hours a day

    const newPeriod: PayrollPeriod = {
      id: `PR-${year}-${month.substring(0, 3).toUpperCase()}-${Date.now().toString().substring(8)}`,
      month,
      year,
      startDate: `${year}-${(monthIndex+1).toString().padStart(2,'0')}-01`,
      endDate: endDateStr || `${year}-${(monthIndex+1).toString().padStart(2,'0')}-${daysInMonth}`,
      status: 'Draft',
      records: workers.map(w => {
        const basic = w.monthlySalary || 0;
        const housing = w.housingAllowance || 0;
        const trans = w.transportationAllowance || 0;
        const otherAll = w.totalAllowances || 0;
        const totSalaryCalc = basic + housing + trans + otherAll;
        
        return buildRecordFromRaw(w, {
           basic, housing, trans, otherAll, totSalaryCalc, workingDays, reqHours, month, year 
        });
      }),
      totalEmployees: workers.length,
      totalPayrollCost: 0,
      totalOvertimeCost: 0,
      totalDeductions: 0
    };

    updatePeriodTotals(newPeriod);
    setPeriods([newPeriod, ...periods]);
    setIsCreatingPeriod(false);
  };

  const buildRecordFromRaw = (w: any, p: any): PayrollRecord => {
    const dailyRate = p.totSalaryCalc / p.workingDays;
    const hourlyRate = p.totSalaryCalc / p.reqHours;

    const absDays = 0;
    const otHours = 0;
    const lateHours = 0;

    const absDed = absDays * dailyRate;
    const lateDed = lateHours * hourlyRate;
    const otPay = otHours * hourlyRate * 1.5;
    
    const gosi = (p.basic + p.housing) * 0.0975; // Approx GOSI deduction

    const totEarnings = p.totSalaryCalc + otPay;
    const totDeductions = absDed + lateDed + gosi;
    const net = totEarnings - totDeductions;

    return {
      id: `REC-${w.id}-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      employeeId: w.id,
      employeeName: w.name,
      nationality: 'Default',
      idNumber: w.passportNumber || 'N/A',
      jobTitle: w.role,
      department: w.department || 'Operations',
      projectAssignment: p.projName || 'Head Office',
      costCenter: 'CC-101',
      hireDate: '2023-01-01',
      contractType: 'Unlimited',
      bankName: 'SNB',
      ibanNumber: 'SA12345678901234567890',
      employeeStatus: 'Active',
      payrollMonth: p.month,
      payrollYear: p.year,
      startDate: '2023-01-01',
      endDate: '2023-01-31',
      processingDate: new Date().toISOString().split('T')[0],
      salaryComponents: {
        basicSalary: p.basic,
        housingAllowance: p.housing,
        transportationAllowance: p.trans,
        foodAllowance: 0,
        mobileAllowance: 0,
        siteAllowance: 0,
        projectAllowance: 0,
        riskAllowance: 0,
        otherFixedAllowances: p.otherAll
      },
      attendance: {
        totalCalendarDays: Array.from({length: p.workingDays}).length,
        totalWorkingDays: p.workingDays,
        presentDays: p.workingDays - absDays,
        absentDays: absDays,
        sickLeaveDays: 0,
        annualLeaveDays: 0,
        unpaidLeaveDays: 0,
        officialHolidays: 0,
        restDays: 0,
        totalWorkedHours: p.reqHours + otHours,
        overtimeHours: otHours,
        nightShiftHours: 0
      },
      earnings: {
        basicSalaryEarned: p.basic,
        allowancesEarned: p.housing + p.trans + p.otherAll,
        overtimePay: otPay,
        bonus: 0,
        incentives: 0,
        productivityRewards: 0,
        sitePerformanceRewards: 0,
        otherEarnings: 0
      },
      deductions: {
        absenceDeductions: absDed,
        lateArrivalDeductions: lateDed,
        earlyDepartureDeductions: 0,
        unpaidLeaveDeductions: 0,
        loanDeductions: 0,
        salaryAdvanceDeductions: 0,
        trafficViolationDeductions: 0,
        companyAssetDamageDeductions: 0,
        penalties: 0,
        gosiDeduction: gosi,
        otherDeductions: 0
      },
      grossSalary: p.totSalaryCalc,
      totalEarnings: totEarnings,
      totalDeductions: totDeductions,
      netSalary: net,
      currency: 'SAR',
      paymentMethod: 'Bank Transfer',
      status: 'Draft',
      preparedBy: 'Admin User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  };

  const updatePeriodTotals = (period: PayrollPeriod) => {
    period.totalPayrollCost = period.records.reduce((acc, r) => acc + r.netSalary, 0);
    period.totalOvertimeCost = period.records.reduce((acc, r) => acc + r.earnings.overtimePay, 0);
    period.totalDeductions = period.records.reduce((acc, r) => acc + r.totalDeductions, 0);
  };

  const calculateRecord = (r: PayrollRecord, changedField?: {path: string, val: number}): PayrollRecord => {
    let rec = JSON.parse(JSON.stringify(r));
    
    if (changedField) {
      const keys = changedField.path.split('.');
      if (keys.length === 2) {
        rec[keys[0]][keys[1]] = changedField.val;
      }
    }

    // Auto formula 
    const c = rec.salaryComponents;
    const totSalary = c.basicSalary + c.housingAllowance + c.transportationAllowance + 
                      c.foodAllowance + c.mobileAllowance + c.siteAllowance + 
                      c.projectAllowance + c.riskAllowance + c.otherFixedAllowances;
    
    rec.grossSalary = totSalary;
    
    const workingDays = rec.attendance.totalWorkingDays || 30;
    const reqHours = workingDays * 8; // Assumed 8 hrs a day roughly 240/mo
    const dailyRate = totSalary / workingDays;
    const hourlyRate = totSalary / reqHours;

    // OT
    const otHours = rec.attendance.overtimeHours;
    const otMulti = 1.5; 
    const otPay = otHours * hourlyRate * otMulti;

    const absDays = rec.attendance.absentDays;
    const absDed = absDays * dailyRate;

    // Update derived
    rec.earnings.basicSalaryEarned = c.basicSalary;
    rec.earnings.allowancesEarned = totSalary - c.basicSalary;
    rec.earnings.overtimePay = otPay;

    rec.deductions.absenceDeductions = absDed;
    
    // Totals
    const e = rec.earnings;
    rec.totalEarnings = e.basicSalaryEarned + e.allowancesEarned + e.overtimePay + e.bonus + e.incentives + e.productivityRewards + e.sitePerformanceRewards + e.otherEarnings;

    const d = rec.deductions;
    rec.totalDeductions = d.absenceDeductions + d.lateArrivalDeductions + d.earlyDepartureDeductions + d.unpaidLeaveDeductions + d.loanDeductions + d.salaryAdvanceDeductions + d.trafficViolationDeductions + d.companyAssetDamageDeductions + d.penalties + d.gosiDeduction + d.otherDeductions;
    
    rec.netSalary = rec.totalEarnings - rec.totalDeductions;
    rec.updatedAt = new Date().toISOString();

    return rec;
  };

  const handleSaveEditedRecord = () => {
    if (!editingRecord || !selectedPeriodId) return;
    
    const calculatedRec = calculateRecord(editingRecord);
    setPeriods(periods.map(p => {
      if (p.id === selectedPeriodId) {
        const newRecords = p.records.map(r => r.id === calculatedRec.id ? calculatedRec : r);
        const updatedPeriod = { ...p, records: newRecords };
        updatePeriodTotals(updatedPeriod);
        return updatedPeriod;
      }
      return p;
    }));
    setEditingRecord(null);
  };

  const handleDeleteRecord = (periodId: string, recordId: string) => {
    if(confirm('Delete this payroll record?')) {
      setPeriods(periods.map(p => {
        if (p.id === periodId) {
          const newRecords = p.records.filter(r => r.id !== recordId);
          const updatedPeriod = { ...p, records: newRecords };
          updatePeriodTotals(updatedPeriod);
          return updatedPeriod;
        }
        return p;
      }));
    }
  };

  const generatePayslipPdf = (record: PayrollRecord) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const isAr = language === 'ar';
    
    // Header
    let startX = 105;
    const logoBase64 = getCleanLogoBase64(company?.logo);
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 14, 15, 25, 25);
      } catch (e) {
        console.error("Could not add company logo", e);
      }
    }

    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text(company?.name || 'CIVIL WORKS COMPANY LTD', startX, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`CR Number: ${company?.crNumber || '1010XXXXXX'}`, 105, 26, { align: 'center' });
    doc.text(`VAT Number: ${company?.vatNumber || '310XXXXXX'}`, 105, 31, { align: 'center' });

    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text('Monthly Payroll Statement', 105, 42, { align: 'center' });
    doc.setFontSize(11);
    doc.text(`Period: ${record.payrollMonth} ${record.payrollYear}`, 105, 48, { align: 'center' });

    // Employee Info
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, 55, pageWidth - 28, 45);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Employee Name:', 18, 62); doc.setTextColor(15, 23, 42); doc.text(record.employeeName, 50, 62);
    doc.setTextColor(100, 116, 139); doc.text('Employee ID:', 18, 69); doc.setTextColor(15, 23, 42); doc.text(record.employeeId, 50, 69);
    doc.setTextColor(100, 116, 139); doc.text('Department:', 18, 76); doc.setTextColor(15, 23, 42); doc.text(record.department, 50, 76);
    doc.setTextColor(100, 116, 139); doc.text('Position:', 18, 83); doc.setTextColor(15, 23, 42); doc.text(record.jobTitle, 50, 83);
    doc.setTextColor(100, 116, 139); doc.text('Project:', 18, 90); doc.setTextColor(15, 23, 42); doc.text(record.projectAssignment, 50, 90);

    doc.setTextColor(100, 116, 139); doc.text('Status:', 110, 62); doc.setTextColor(15, 23, 42); doc.text(record.status, 140, 62);
    doc.setTextColor(100, 116, 139); doc.text('Bank Name:', 110, 69); doc.setTextColor(15, 23, 42); doc.text(record.bankName, 140, 69);
    doc.setTextColor(100, 116, 139); doc.text('IBAN:', 110, 76); doc.setTextColor(15, 23, 42); doc.text(record.ibanNumber, 140, 76);
    doc.setTextColor(100, 116, 139); doc.text('Working Days:', 110, 83); doc.setTextColor(15, 23, 42); doc.text(record.attendance.totalWorkingDays.toString(), 140, 83);
    doc.setTextColor(100, 116, 139); doc.text('Absent Days:', 110, 90); doc.setTextColor(220, 38, 38); doc.text(record.attendance.absentDays.toString(), 140, 90);

    // Earnings Table
    autoTable(doc, {
      startY: 105,
      head: [['Earnings description', 'Amount (SAR)']],
      body: [
        ['Basic Salary', record.salaryComponents.basicSalary.toLocaleString()],
        ['Housing Allowance', record.salaryComponents.housingAllowance.toLocaleString()],
        ['Transportation Allowance', record.salaryComponents.transportationAllowance.toLocaleString()],
        ['Other Allowances', (record.salaryComponents.foodAllowance + record.salaryComponents.mobileAllowance + record.salaryComponents.siteAllowance + record.salaryComponents.projectAllowance + record.salaryComponents.riskAllowance + record.salaryComponents.otherFixedAllowances).toLocaleString()],
        ['Overtime (' + record.attendance.overtimeHours + ' hrs)', record.earnings.overtimePay.toLocaleString()],
        ['Bonuses & Incentives', (record.earnings.bonus + record.earnings.incentives).toLocaleString()],
        [{ content: 'Total Earnings', styles: { fontStyle: 'bold' } }, { content: record.totalEarnings.toLocaleString(), styles: { fontStyle: 'bold' } }]
      ],
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85] }
    });

    // Deductions Table
    const eqY = (doc as any).lastAutoTable.finalY + 10;
    autoTable(doc, {
      startY: eqY,
      head: [['Deductions description', 'Amount (SAR)']],
      body: [
        ['Absence Deductions', record.deductions.absenceDeductions.toLocaleString()],
        ['Late/Early Deductions', (record.deductions.lateArrivalDeductions + record.deductions.earlyDepartureDeductions).toLocaleString()],
        ['Loans & Advances', (record.deductions.loanDeductions + record.deductions.salaryAdvanceDeductions).toLocaleString()],
        ['GOSI / Social Insurance', record.deductions.gosiDeduction.toLocaleString()],
        ['Penalties & Others', (record.deductions.penalties + record.deductions.otherDeductions).toLocaleString()],
        [{ content: 'Total Deductions', styles: { fontStyle: 'bold' } }, { content: record.totalDeductions.toLocaleString(), styles: { fontStyle: 'bold' } }]
      ],
      theme: 'striped',
      headStyles: { fillColor: [153, 27, 27] }
    });

    // Net Summary
    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFillColor(248, 250, 252);
    doc.rect(14, finalY + 10, pageWidth - 28, 25, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Net Salary:', 20, finalY + 20);
    doc.text(`SAR ${record.netSalary.toLocaleString()}`, pageWidth - 20, finalY + 20, { align: 'right' });
    
    // Amount in Words
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(71, 85, 105);
    const amountInWords = numberToWords(record.netSalary);
    doc.text(`(${amountInWords})`, 20, finalY + 28);

    // Acknowledgement
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text("I acknowledge that I have received the salary amount stated in this payroll statement and confirm that the information is correct.", 14, finalY + 50);

    // Signatures
    const sigY = finalY + 70;
    doc.setDrawColor(200, 200, 200);
    
    // Employee
    doc.line(14, sigY, 50, sigY);
    doc.text('Employee Signature', 32, sigY + 5, { align: 'center' });
    
    // HR
    doc.line(60, sigY, 96, sigY);
    doc.text('HR Officer', 78, sigY + 5, { align: 'center' });
    
    // Payroll
    doc.line(106, sigY, 142, sigY);
    doc.text('Payroll Officer', 124, sigY + 5, { align: 'center' });

    // Finance
    doc.line(152, sigY, 188, sigY);
    doc.text('Finance Manager', 170, sigY + 5, { align: 'center' });

    doc.save(`Payslip_${record.employeeName.replace(/\s+/g, '_')}_${record.payrollMonth}.pdf`);
  };

  const exportPeriodToExcel = (period: PayrollPeriod) => {
    const data = period.records.map(r => ({
      'Employee ID': r.employeeId,
      'Name': r.employeeName,
      'Role': r.jobTitle,
      'Department': r.department,
      'Project': r.projectAssignment,
      'Basic Salary': r.earnings.basicSalaryEarned,
      'Allowances': r.earnings.allowancesEarned,
      'OT Hours': r.attendance.overtimeHours,
      'OT Pay': r.earnings.overtimePay,
      'Earnings Total': r.totalEarnings,
      'Absent Days': r.attendance.absentDays,
      'Absent Ded': r.deductions.absenceDeductions,
      'GOSI': r.deductions.gosiDeduction,
      'Penalties': r.deductions.penalties,
      'Loans': r.deductions.loanDeductions,
      'Deductions Total': r.totalDeductions,
      'Net Salary': r.netSalary,
      'Bank': r.bankName,
      'IBAN': r.ibanNumber,
      'Status': r.status
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll Register');
    XLSX.writeFile(wb, `Payroll_Register_${period.month}_${period.year}.xlsx`);
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500"><Users className="w-24 h-24" /></div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Employees</p>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-black text-slate-800">{stats.totalEmployees}</span>
            <div className="flex flex-col items-end">
               <span className="text-xs font-bold text-rose-500 flex items-center gap-1"><User className="w-3 h-3"/> {stats.empWithAbsence} Absent</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500"><DollarSign className="w-24 h-24" /></div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Net Payroll Cost</p>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-black text-slate-800">{formatCurrency(stats.netPayrollCost)}</span>
            <div className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded shadow-sm">SAR</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500"><Clock3 className="w-24 h-24" /></div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Overtime</p>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-black text-slate-800">{formatCurrency(stats.totalOvertime)}</span>
            <div className="flex flex-col items-end">
               <span className="text-xs font-bold text-amber-500 flex items-center gap-1">{stats.empWithOvertime} Emp OT</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500"><AlertCircle className="w-24 h-24" /></div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Deductions</p>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-black text-slate-800">{formatCurrency(stats.totalDeductions)}</span>
            <div className="text-[9px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded shadow-sm">SAR</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-black text-slate-800 mb-6 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            Payroll Expenditure Trend
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#64748B'}} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `SAR ${v/1000}k`} tick={{fill: '#64748B'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [formatCurrency(value), 'Cost']}
                />
                <Line type="monotone" dataKey="cost" stroke="#10B981" strokeWidth={3} dot={{ r: 4, fill: '#10B981' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-black text-slate-800 mb-6 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-500" />
            Salary by Department
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#64748B'}} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `SAR ${v/1000}k`} tick={{fill: '#64748B'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [formatCurrency(value), 'Total Salary']}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={50}>
                  {departmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  const renderControl = () => {
    if (!selectedPeriodId) {
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
             <div>
               <h3 className="text-lg font-black text-slate-800 tracking-tight">Payroll Processing Cycles</h3>
               <p className="text-xs text-slate-500 font-medium">Manage monthly salaries and employee payslips.</p>
             </div>
             <button 
                onClick={() => setIsCreatingPeriod(true)}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
              >
                <Plus className="w-4 h-4" /> New Payroll Cycle
             </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-black text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">Period</th>
                  <th className="px-6 py-4">Employees</th>
                  <th className="px-6 py-4 border-l border-slate-200">Net Cost</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {periods.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                          {p.month.substring(0,3)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{p.month} {p.year}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{p.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>{p.totalEmployees}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 border-l border-slate-200">
                      <span className="font-bold text-emerald-600">{formatCurrency(p.totalPayrollCost)}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={cn(
                        "px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md",
                        p.status === 'Draft' ? 'bg-amber-100 text-amber-700' :
                        p.status === 'Under Review' ? 'bg-blue-100 text-blue-700' :
                        p.status === 'Approved' ? 'bg-indigo-100 text-indigo-700' :
                        p.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-100 text-slate-700'
                      )}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setSelectedPeriodId(p.id)}
                          className="px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors inline-flex items-center gap-2"
                        >
                          <Eye className="w-3.5 h-3.5" /> Manage
                        </button>
                        <button
                          onClick={() => {
                            const newPeriod = JSON.parse(JSON.stringify(p));
                            newPeriod.id = `PR-${p.year}-${p.month.substring(0, 3).toUpperCase()}-COPY-${Date.now().toString().substring(8)}`;
                            newPeriod.status = 'Draft';
                            newPeriod.records.forEach((r: any) => { r.status = 'Draft'; r.id = `REC-${r.employeeId}-${Date.now()}-${Math.floor(Math.random()*1000)}`; });
                            setPeriods([newPeriod, ...periods]);
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Copy Period"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if(confirm('Are you sure you want to delete this payroll period?')) {
                              setPeriods(periods.filter(x => x.id !== p.id));
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Period"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {periods.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center">
                        <Wallet className="w-12 h-12 text-slate-200 mb-3" />
                        <p className="font-medium text-slate-900">No payroll cycles yet</p>
                        <p className="text-xs text-slate-400 mt-1">Create a new cycle to get started</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    const filteredRecords = selectedPeriod.records.filter(r => {
      const matchSearch = r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDept = filterDept === 'all' || r.department === filterDept;
      const matchStatus = filterStatus === 'all' || r.status === filterStatus;
      return matchSearch && matchDept && matchStatus;
    });

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-center gap-4 border-b border-slate-200 pb-4 flex-wrap">
          <div className="flex items-center gap-4">
             <button 
               onClick={() => { setSelectedPeriodId(null); setSelectedRecordId(null); }}
               className="p-2 hover:bg-slate-100 rounded-full transition-colors"
             >
               <ArrowLeft className="w-5 h-5 text-slate-600" />
             </button>
             <div>
               <h2 className="text-xl font-black text-slate-800 tracking-tight">{selectedPeriod.month} {selectedPeriod.year} Payroll Registry</h2>
               <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 font-medium">
                 <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5"/> {selectedPeriod.startDate} to {selectedPeriod.endDate}</span>
                 <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                 <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5"/> {selectedPeriod.totalEmployees} Employees</span>
               </div>
             </div>
          </div>
          <div className="flex gap-3">
             <button
               onClick={() => exportPeriodToExcel(selectedPeriod)}
               className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors uppercase tracking-wider"
             >
               <FileSpreadsheet className="w-4 h-4" /> Export Excel
             </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search employee..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value="all">All Departments</option>
              {Array.from(new Set(workers.map(w => w.department).filter(Boolean))).map(d => (
                <option key={d as string} value={d as string}>{d as string}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            {selectedPeriod.status === 'Draft' && (
              <button 
                onClick={() => {
                  if(!confirm('Are you sure you want to submit this period for approval?')) return;
                  const p = JSON.parse(JSON.stringify(selectedPeriod));
                  p.status = 'Under Review';
                  p.records.forEach((r: any) => r.status = 'Under Review');
                  setPeriods(periods.map(x => x.id === p.id ? p : x));
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-blue-700 transition"
              >
                <CheckCircle className="w-4 h-4" /> Submit for Approval
              </button>
            )}
            {selectedPeriod.status === 'Under Review' && (
              <button 
                onClick={() => {
                  if(!confirm('Are you sure you want to approve this period?')) return;
                  const p = JSON.parse(JSON.stringify(selectedPeriod));
                  p.status = 'Approved';
                  p.records.forEach((r: any) => r.status = 'Approved');
                  setPeriods(periods.map(x => x.id === p.id ? p : x));
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-emerald-700 transition"
              >
                <CheckCircle2 className="w-4 h-4" /> Approve Payroll
              </button>
            )}
          </div>
        </div>

        {/* Data Grid */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Basic + Allowances</th>
                  <th className="px-4 py-3 border-l border-slate-100">OT Pay</th>
                  <th className="px-4 py-3 text-red-500 border-l border-slate-100">Deductions</th>
                  <th className="px-4 py-3 text-emerald-600 border-l border-slate-100">Net Salary</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700 text-xs">
                {filteredRecords.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{r.employeeName}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{r.employeeId} • {r.jobTitle}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-700">{formatCurrency(r.grossSalary)}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Basic: {formatCurrency(r.salaryComponents.basicSalary)}</div>
                    </td>
                    <td className="px-4 py-3 border-l border-slate-100">
                      <div className="font-bold text-amber-600">{formatCurrency(r.earnings.overtimePay)}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{r.attendance.overtimeHours} hrs</div>
                    </td>
                    <td className="px-4 py-3 border-l border-slate-100">
                      <div className="font-bold text-red-600">{formatCurrency(r.totalDeductions)}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Abs: {r.attendance.absentDays} days</div>
                    </td>
                    <td className="px-4 py-3 border-l border-slate-100">
                      <div className="font-bold text-emerald-600 text-sm bg-emerald-50 px-2 py-1 inline-block rounded">{formatCurrency(r.netSalary)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded",
                        r.status === 'Draft' ? 'bg-amber-100 text-amber-700' :
                        r.status === 'Under Review' ? 'bg-blue-100 text-blue-700' :
                        r.status === 'Approved' ? 'bg-indigo-100 text-indigo-700' :
                        'bg-slate-100 text-slate-700'
                      )}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                       <div className="flex items-center justify-end gap-1">
                          <button 
                            title="Edit Record"
                            onClick={() => setEditingRecord(JSON.parse(JSON.stringify(r)))}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          >
                            <FileSignature className="w-4 h-4" />
                          </button>
                          <button 
                            title="Print Payslip"
                            onClick={() => generatePayslipPdf(r)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button 
                            title="Delete"
                            onClick={() => handleDeleteRecord(selectedPeriod.id, r.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 mb-20 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 right-40 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl -mb-20"></div>
        
        <div className="relative z-10 w-full">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/20 rounded-xl">
              <Wallet className="w-6 h-6 text-indigo-300" />
            </div>
            <span className="text-sm font-bold text-indigo-300 uppercase tracking-widest">Enterprise HR</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">Payroll & Salary Management</h1>
          <p className="text-slate-400 font-medium max-w-xl text-sm leading-relaxed">
            Complete monthly payroll workflow, automated calculations, payslip generation, and analytics for contracting and field workforce companies.
          </p>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-8 overflow-x-auto pb-2 scrollbar-hide">
            {['Dashboard', 'Control', 'Archive'].map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab as any); setSelectedPeriodId(null); setSelectedRecordId(null); }}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap tracking-wider uppercase",
                  activeTab === tab 
                    ? "bg-white text-slate-900 shadow-xl shadow-white/10" 
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === 'Dashboard' && renderDashboard()}
      {activeTab === 'Control' && renderControl()}

      {/* Creation Modal */}
      {isCreatingPeriod && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                    <Calendar className="w-5 h-5" />
                 </div>
                 <div>
                   <h3 className="text-base font-black text-slate-800 tracking-tight">New Payroll Cycle</h3>
                   <p className="text-xs text-slate-500 font-medium mt-0.5">Initialize automated payroll</p>
                 </div>
              </div>
              <button onClick={() => setIsCreatingPeriod(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-2 transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreatePeriod} className="p-6 space-y-5 flex flex-col">
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Month</label>
                <select name="month" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50" required defaultValue={new Date().toLocaleString('default', { month: 'long' })}>
                  {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Year</label>
                <input type="number" name="year" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50" required defaultValue={new Date().getFullYear()} />
              </div>

              <div className="bg-indigo-50 text-indigo-700 p-4 rounded-xl flex gap-3 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Starting a new cycle will copy current employee basic salaries and fixed allowances automatically. Overtime and absences can be adjusted in the next step.</p>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsCreatingPeriod(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-700 transition-colors shadow-xl shadow-indigo-600/20">
                  Initialize Cycle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Editing Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col justify-center items-center p-4 sm:p-6 overflow-y-auto pt-20 pb-20">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
               <div>
                 <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2"><User className="w-5 h-5 text-indigo-600"/> Edit Payroll Record: {editingRecord.employeeName}</h3>
                 <p className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-wider">{editingRecord.jobTitle} • {editingRecord.department}</p>
               </div>
               <button onClick={() => setEditingRecord(null)} className="p-2 bg-slate-200 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-full transition-colors">
                 <XCircle className="w-5 h-5" />
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 
                 <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Salary Components</h4>
                   {[
                     {label: 'Basic Salary', path: 'salaryComponents.basicSalary'},
                     {label: 'Housing Allowance', path: 'salaryComponents.housingAllowance'},
                     {label: 'Transportation', path: 'salaryComponents.transportationAllowance'},
                     {label: 'Food Allowance', path: 'salaryComponents.foodAllowance'},
                     {label: 'Mobile Allowance', path: 'salaryComponents.mobileAllowance'},
                     {label: 'Site Allowance', path: 'salaryComponents.siteAllowance'},
                     {label: 'Project Allowance', path: 'salaryComponents.projectAllowance'},
                     {label: 'Risk Allowance', path: 'salaryComponents.riskAllowance'},
                     {label: 'Other Fix Allowances', path: 'salaryComponents.otherFixedAllowances'},
                   ].map(f => (
                     <div key={f.path} className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-600">{f.label}</label>
                        <input 
                          type="number"
                          value={(editingRecord as any)[f.path.split('.')[0]][f.path.split('.')[1]]}
                          onChange={(e) => setEditingRecord(calculateRecord(editingRecord, {path: f.path, val: parseFloat(e.target.value) || 0}))}
                          className="w-24 text-right border border-slate-200 rounded px-2 py-1 text-xs font-mono font-bold focus:border-indigo-500 outline-none"
                        />
                     </div>
                   ))}
                   
                   <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <label className="text-xs font-black text-indigo-700">Gross Salary</label>
                      <span className="text-xs font-black font-mono text-indigo-700">{formatCurrency(editingRecord.grossSalary)}</span>
                   </div>
                 </div>

                 <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Attendance & Overtime</h4>
                   {[
                     {label: 'Working Days', path: 'attendance.totalWorkingDays'},
                     {label: 'Absent Days', path: 'attendance.absentDays'},
                     {label: 'Overtime Hours', path: 'attendance.overtimeHours'},
                   ].map(f => (
                     <div key={f.path} className="flex justify-between items-center bg-amber-50 p-2 rounded-lg border border-amber-100">
                        <label className="text-xs font-bold text-slate-700">{f.label}</label>
                        <input 
                          type="number"
                          value={(editingRecord as any)[f.path.split('.')[0]][f.path.split('.')[1]]}
                          onChange={(e) => setEditingRecord(calculateRecord(editingRecord, {path: f.path, val: parseFloat(e.target.value) || 0}))}
                          className="w-20 text-right border border-amber-200 rounded px-2 py-1 text-xs font-mono font-bold focus:border-amber-500 outline-none bg-white"
                        />
                     </div>
                   ))}

                   <div className="pt-4 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                         <span className="font-bold text-slate-500">Daily Rate (Calc)</span>
                         <span className="font-mono text-slate-700 font-bold">{formatCurrency(editingRecord.grossSalary / (editingRecord.attendance.totalWorkingDays || 30))}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                         <span className="font-bold text-amber-600">Calculated OT Pay</span>
                         <span className="font-mono text-amber-600 font-bold">+{formatCurrency(editingRecord.earnings.overtimePay)}</span>
                      </div>
                   </div>
                 </div>

                 <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Other Deductions</h4>
                   <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-rose-600">Calculated Absence</label>
                        <span className="text-xs font-mono font-black text-rose-600">-{formatCurrency(editingRecord.deductions.absenceDeductions)}</span>
                   </div>
                   {[
                     {label: 'Late Arrival Ded.', path: 'deductions.lateArrivalDeductions'},
                     {label: 'Loans Deductions', path: 'deductions.loanDeductions'},
                     {label: 'Salary Advance', path: 'deductions.salaryAdvanceDeductions'},
                     {label: 'GOSI Contribution', path: 'deductions.gosiDeduction'},
                     {label: 'Penalties & Violations', path: 'deductions.penalties'},
                     {label: 'Other Deductions', path: 'deductions.otherDeductions'},
                   ].map(f => (
                     <div key={f.path} className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-600">{f.label}</label>
                        <input 
                          type="number"
                          value={(editingRecord as any)[f.path.split('.')[0]][f.path.split('.')[1]]}
                          onChange={(e) => setEditingRecord(calculateRecord(editingRecord, {path: f.path, val: parseFloat(e.target.value) || 0}))}
                          className="w-24 text-right border border-slate-200 rounded px-2 py-1 text-xs font-mono font-bold focus:border-red-500 outline-none"
                        />
                     </div>
                   ))}

                   <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <label className="text-xs font-black text-rose-700">Total Deductions</label>
                      <span className="text-xs font-black font-mono text-rose-700">-{formatCurrency(editingRecord.totalDeductions)}</span>
                   </div>
                 </div>

               </div>
               
               <div className="mt-8 bg-slate-900 rounded-xl p-6 flex items-center justify-between shadow-inner">
                  <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Calculated Net Salary</h4>
                    <p className="text-3xl font-black text-emerald-400 font-mono mt-1">{formatCurrency(editingRecord.netSalary)} <span className="text-sm">SAR</span></p>
                  </div>
                  <div className="text-right max-w-xs">
                     <p className="text-[10px] text-slate-500 italic leading-snug">{numberToWords(editingRecord.netSalary)}</p>
                  </div>
               </div>

            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 shrink-0 flex gap-3 justify-end">
               <button onClick={() => setEditingRecord(null)} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-slate-50 transition">
                 Cancel
               </button>
               <button onClick={handleSaveEditedRecord} className="px-6 py-2.5 bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20 flex items-center gap-2">
                 <Save className="w-4 h-4"/> Save Record
               </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
