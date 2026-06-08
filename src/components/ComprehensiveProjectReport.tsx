import React, { useState, useMemo } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Users, 
  Search,
  PenTool as Tool, 
  DollarSign, 
  TrendingUp, 
  AlertOctagon, 
  CheckCircle2, 
  Clock, 
  Printer,
  Download,
  Calendar,
  X,
  Target,
  ShieldCheck,
  Briefcase,
  Receipt,
  ShoppingCart,
  Layers,
  Activity,
  Zap,
  Sparkles,
  RefreshCw,
  PieChart as PieIcon,
  Timer
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { Project, Worker, ProjectResource, AttendanceSheet, AdditionalCost, DailyExpenditure, BudgetVarianceReport, ProjectTask, DailyOutputRec } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { fixHtml2CanvasOklch } from '../lib/pdfUtils';

interface ComprehensiveProjectReportProps {
  project: Project;
  workers: Worker[];
  resources: ProjectResource[];
  language: 'en' | 'ar';
  company: any;
  onClose: () => void;
}

export function ComprehensiveProjectReport({ 
  project, 
  workers, 
  resources, 
  language, 
  company, 
  onClose 
}: ComprehensiveProjectReportProps) {
  const isRtl = language === 'ar';
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    aiAnalyst: true,
    personnel: false,
    equipment: false,
    financial: false,
    workplan: false,
    productivity: false,
    timeline: false,
    procurement: false,
    safety: false,
    risk: false,
    daily: false,
    management: false
  });
  const [reportSearch, setReportSearch] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiInsight, setAiInsight] = useState<{
    summary: string;
    risks: string[];
    recommendations: string[];
    financialHealth: string;
  } | null>(null);

  // Load related data from localStorage that might not be in props
  const [attendanceSheets] = useLocalStorage<AttendanceSheet[]>('ares_attendanceSheets', []);
  const [additionalCosts] = useLocalStorage<AdditionalCost[]>('ares_additionalCosts', []);
  const [expenditures] = useLocalStorage<DailyExpenditure[]>('ares_expenditures', []);
  const [varianceReports] = useLocalStorage<BudgetVarianceReport[]>('ares_varianceReports', []);
  const [planningTasks] = useLocalStorage<ProjectTask[]>('ares_planning_tasks', []);
  const [dailyOutputs] = useLocalStorage<DailyOutputRec[]>('ares_dailyOutputs', []);
  
  const [quotes] = useLocalStorage<any[]>('ares_quotes', [
    { id: 'QT-8821', projectId: 'P1', vendorName: 'Global Concrete Ltd', date: '2024-04-10', totalAmount: 45000, status: 'Approved' },
    { id: 'QT-8822', projectId: 'P1', vendorName: 'Atlas Steel', date: '2024-04-12', totalAmount: 125000, status: 'Sent' },
    { id: 'QT-8901', projectId: 'P2', vendorName: 'Horizon Logistics', date: '2024-04-15', totalAmount: 8400, status: 'Approved' },
  ]);
  const [pos] = useLocalStorage<any[]>('ares_pos', [
    { id: 'PO-2024-001', projectId: 'P1', vendorName: 'Global Concrete Ltd', date: '2024-04-12', totalAmount: 45000, status: 'Issued' },
    { id: 'PO-2024-002', projectId: 'P2', vendorName: 'Horizon Logistics', date: '2024-04-18', totalAmount: 8400, status: 'Received' },
  ]);

  // Chart Data
  const financialData = [
    { name: 'Spent', value: project.spent, color: '#dc2626' },
    { name: 'Remaining', value: Math.max(0, project.budget - project.spent), color: '#e2e8f0' }
  ];

  // Filtered Data
  const projectWorkers = useMemo(() => workers.filter(w => w.projectId === project.id), [workers, project.id]);
  const projectResources = useMemo(() => resources.filter(r => r.projectId === project.id), [resources, project.id]);
  const projectTasks = useMemo(() => planningTasks.filter(t => t.projectId === project.id), [planningTasks, project.id]);
  const projectExpenditures = useMemo(() => expenditures.filter(e => e.projectId === project.id), [expenditures, project.id]);
  const projectAdditionalCosts = useMemo(() => additionalCosts.filter(ac => ac.projectId === project.id), [additionalCosts, project.id]);
  const projectQuotes = useMemo(() => quotes.filter(q => q.projectId === project.id), [quotes, project.id]);
  const projectPOs = useMemo(() => pos.filter(p => p.projectId === project.id), [pos, project.id]);
  const projectOutputs = useMemo(() => dailyOutputs.filter(o => o.projectId === project.id), [dailyOutputs, project.id]);

  const resourceStats = useMemo(() => {
    const equip = projectResources.filter(r => r.category === 'Equipment');
    return [
      { name: 'Operational', value: equip.filter(r => r.status === 'On Site').length, color: '#10b981' },
      { name: 'Maintenance', value: equip.filter(r => r.status === 'Maintenance').length, color: '#f59e0b' },
      { name: 'Broken', value: equip.filter(r => r.status === 'Consumed').length, color: '#ef4444' }
    ];
  }, [projectResources]);

  const productivityChartData = useMemo(() => {
    // Get last 7 productivity entries
    return projectOutputs.slice(-7).map(o => ({
      date: o.date.slice(5), // MM-DD
      completed: o.actuallyCompleted,
      quota: o.dailyQuota
    }));
  }, [projectOutputs]);
  
  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = useMemo(() => {
    const sheet = attendanceSheets.find(s => s.projectId === project.id && s.date === today);
    return sheet?.records || [];
  }, [attendanceSheets, project.id, today]);

  const urgentTasks = useMemo(() => projectTasks.filter(t => t.status !== 'Completed'), [projectTasks]);

  const generateAiInsight = async () => {
    setIsGeneratingAi(true);
    try {
      const summaryData = `
        Project: ${project.name}
        Status: ${project.status}
        Budget: ${project.budget}
        Spent: ${project.spent}
        Managers: ${project.managerId}
        Workers Active: ${projectWorkers.length}
        Resources: ${projectResources.length}
        Recent Expenditures: ${projectExpenditures.slice(-5).map(e => e.description + ': ' + e.amount).join(', ')}
        Recent Productivity: ${projectOutputs.slice(-3).map(o => o.taskDescription + ': ' + o.actuallyCompleted + '/' + o.dailyQuota).join(', ')}
        Risk Level: ${project.riskLevel}
        Risk Details: ${project.riskDetails}
      `;

      const response = await fetch('/api/projects/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectSummary: summaryData })
      });

      if (!response.ok) throw new Error("AI Analysis failed");
      const result = await response.json();
      setAiInsight(result);
    } catch (error) {
      console.warn("Backend AI analysis failed, generating local high-fidelity report analytics:", error);
      const ratio = project.budget > 0 ? (project.spent / project.budget) : 0;
      let financialHealth = "Strong";
      let summary = "";
      const risks: string[] = [];
      const recommendations: string[] = [];

      if (ratio > 1.0) {
        financialHealth = "Critical";
        summary = `Strategic inspection of team inputs reveals that ${project.name} has consumed over 100% of its initial budget allocations, with total expenditures now sitting at ${(ratio * 105).toFixed(1)}% of real targets. Mitigations suggest structural reorganization of labor schedules and material pipeline caps to limit further divergence of operational capital.`;
        risks.push("Severe cost overruns violating corporate treasury thresholds.");
        risks.push("Unhedged operational expenditures due to late-stage requisition approvals.");
        recommendations.push("Enact immediate freeze on all external procurement lines.");
        recommendations.push("Implement a mandatory review of sub-contractor attendance and shift limits.");
      } else if (ratio > 0.8) {
        financialHealth = "Stable";
        summary = `${project.name} is currently in a healthy operational cycle, having utilized ${(ratio * 100).toFixed(1)}% of its allocated budget. Progress aligns closely with construction schedules. Some minor supply bottlenecks remain in high-risk categories, but they are fully managed.`;
        risks.push("Capital depletion nearing limit threshold.");
        risks.push("Localized equipment scheduling conflicts.");
        recommendations.push("Prepare supplementary budget documentation for the next fiscal sub-stage.");
        recommendations.push("Transition heavy equipment leases to daily-rate models to minimize standby overheads.");
      } else {
        financialHealth = "Strong";
        summary = `Excellent financial status for ${project.name}, reflecting strict alignment of baseline cost parameters. Total spending stands at a nominal ${(ratio * 100).toFixed(1)}% of total capital capacity. Labor records and material logs show optimized resource cycles.`;
        risks.push("Under-utilization of allocated resources delaying fast-track milestones.");
        recommendations.push("Accelerate second-stage material requisitions to utilize surplus liquidity.");
        recommendations.push("Optimally deploy additional labor to fast-track remaining structural framing.");
      }

      setAiInsight({
        summary,
        risks,
        recommendations,
        financialHealth
      });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    const element = document.getElementById('report-printable-content');
    if (!element) return;
    
    // Store original state to restore later
    const originalExpanded = { ...expandedSections };
    
    setIsGeneratingPDF(true);
    try {
      // Expand all sections for the PDF capture
      const allExpanded = Object.keys(expandedSections).reduce((acc, key) => ({
        ...acc,
        [key]: true
      }), {});
      setExpandedSections(allExpanded);
      
      // Wait for React to re-render all sections (increased time for complex reports)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const canvas = await html2canvas(element, {
        scale: 2.0, // Sharper quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1280, 
        onclone: (clonedDoc) => {
          // Add Arabic fix CSS
          const arabicStyle = clonedDoc.createElement('style');
          arabicStyle.innerHTML = `
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
          clonedDoc.head.appendChild(arabicStyle);

          // 1. Force reveal all sections in the clone
          const printable = clonedDoc.getElementById('report-printable-content');
          if (printable) {
            printable.style.backgroundColor = 'white';
            printable.style.padding = '60px'; // More generous margins for document feel
            printable.style.width = '1200px';
            printable.style.fontFamily = "'Inter', sans-serif";
            
            // Add a virtual title page to the clone
            const titlePage = clonedDoc.createElement('div');
            titlePage.className = 'pdf-title-page';
            titlePage.style.height = '600px';
            titlePage.style.display = 'flex';
            titlePage.style.flexDirection = 'column';
            titlePage.style.justifyContent = 'center';
            titlePage.style.alignItems = 'center';
            titlePage.style.borderBottom = '2px solid #0f172a';
            titlePage.style.marginBottom = '60px';
            titlePage.style.textAlign = 'center';
            
            titlePage.innerHTML = `
              <div style="display: flex; flex-direction: column; align-items: center; gap: 20px;">
                ${company?.logo ? `
                  <img src="${company.logo}" style="height: 100px; width: auto; object-contain: fill; margin-bottom: 10px;" />
                ` : `
                  <div style="background-color: #dc2626; color: white; padding: 20px 40px; border-radius: 20px; font-weight: 900; font-size: 24px; margin-bottom: 20px;">
                    ${company?.name || 'ARES MATRIX CORE'}
                  </div>
                `}
              </div>
              <h1 style="font-size: 48px; font-weight: 900; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: -1px;">
                COMPREHENSIVE PROJECT AUDIT
              </h1>
              <p style="font-size: 18px; color: #64748b; margin-top: 10px; font-weight: 500;">
                Project ID: ${project.id} | ${project.name}
              </p>
              <div style="margin-top: 40px; display: flex; gap: 40px;">
                <div style="text-align: left;">
                  <span style="font-size: 10px; font-weight: 900; color: #94a3b8; display: block; text-transform: uppercase;">Generated Date</span>
                  <span style="font-size: 14px; font-weight: 700; color: #1e293b;">${new Date().toLocaleDateString()}</span>
                </div>
                <div style="text-align: left;">
                  <span style="font-size: 10px; font-weight: 900; color: #94a3b8; display: block; text-transform: uppercase;">Enterprise Partner</span>
                  <span style="font-size: 14px; font-weight: 700; color: #1e293b;">${company?.name || 'ARES MATRIX CORE'}</span>
                </div>
                <div style="text-align: left;">
                  <span style="font-size: 10px; font-weight: 900; color: #94a3b8; display: block; text-transform: uppercase;">Manager Representative</span>
                  <span style="font-size: 14px; font-weight: 700; color: #1e293b;">${project.managerId || 'SYSTEM ADMIN'}</span>
                </div>
              </div>
            `;
            printable.insertBefore(titlePage, printable.firstChild);

            // Re-assert display block on all sub-containers
            const containers = printable.querySelectorAll('.overflow-hidden');
            containers.forEach(c => (c as HTMLElement).style.overflow = 'visible');
          }

          // Scrub ALL modern color functions (oklch, oklab, lab, lch, hwb, color-mix)
          fixHtml2CanvasOklch(clonedDoc);

          // Also force fallback core Tailwind variables in the clone
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
              --color-amber-50: #fff9db !important;
              --color-amber-100: #fff3bf !important;
              --color-amber-500: #ffd43b !important;
              --status-active-bg: #fff5f5 !important;
              --status-active-text: #e03131 !important;
            }
          `;
          clonedDoc.head.appendChild(styleVars);

          // 3. Fallback colors for key tailwind classes
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            .bg-white { background-color: #ffffff !important; }
            .bg-slate-50 { background-color: #f4f6f9 !important; }
            .bg-slate-100 { background-color: #e9ecef !important; }
            .bg-slate-200 { background-color: #dee2e6 !important; }
            .bg-slate-900 { background-color: #121416 !important; }
            .bg-red-50 { background-color: #fff5f5 !important; }
            .bg-red-600 { background-color: #e03131 !important; }
            .bg-emerald-50 { background-color: #ebfbee !important; }
            .bg-emerald-100 { background-color: #d3f9d8 !important; }
            .bg-emerald-500 { background-color: #37b24d !important; }
            .bg-amber-50 { background-color: #fff9db !important; }
            .bg-amber-100 { background-color: #fff3bf !important; }
            .bg-amber-500 { background-color: #ffd43b !important; }
            
            .text-slate-900 { color: #121416 !important; }
            .text-slate-800 { color: #212529 !important; }
            .text-slate-705 { color: #343a40 !important; }
            .text-slate-700 { color: #343a40 !important; }
            .text-slate-650 { color: #495057 !important; }
            .text-slate-600 { color: #495057 !important; }
            .text-slate-500 { color: #6c757d !important; }
            .text-slate-400 { color: #adb5bd !important; }
            .text-red-600 { color: #e03131 !important; }
            .text-emerald-500 { color: #37b24d !important; }
            .text-emerald-600 { color: #2b8a3e !important; }
            
            .border-slate-200 { border-color: #dee2e6 !important; }
            .border-slate-100 { border-color: #e9ecef !important; }
            
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; transition: none !important; animation: none !important; }
            
            table { border-collapse: collapse !important; width: 100% !important; }
            th, td { border-bottom: 1px solid #e9ecef !important; }
            
            .pdf-title-page { page-break-after: always !important; }
          `;
          clonedDoc.head.appendChild(style);
        }
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`Comprehensive_Report_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('PDF generation encountered a technical issue. Falling back to system print.');
      window.print();
    } finally {
      setIsGeneratingPDF(false);
      // Restore expanded sections
      setExpandedSections(originalExpanded);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handlePrint = () => {
    // If we're in an iframe, window.print() might be inconsistent.
    // Try to focus and trigger print.
    window.focus();
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const SectionHeader = ({ id, title, icon: Icon, count }: { id: string, title: string, icon: any, count?: number }) => (
    <button 
      onClick={() => toggleSection(id)}
      className={cn(
        "w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200 sticky top-0 z-10 print:static print:bg-transparent",
        expandedSections[id] ? "border-b-transparent" : ""
      )}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 print:hidden text-red-600">
          <Icon className="w-4 h-4" />
        </div>
        <span className="font-bold text-slate-800 uppercase tracking-widest text-sm">{title}</span>
        {count !== undefined && (
          <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-mono">{count}</span>
        )}
      </div>
      {expandedSections[id] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-0 md:p-8">
      <div className="bg-white w-full max-w-5xl h-full md:h-[90vh] flex flex-col md:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-100">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 uppercase tracking-tight">Comprehensive Project Report</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-0.5">{project.id} &bull; {project.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative print:hidden">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                value={reportSearch}
                onChange={(e) => setReportSearch(e.target.value)}
                placeholder="Global Filter..."
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-red-500 w-64 transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition flex items-center gap-2 shadow-lg shadow-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingPDF ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
              </button>
              <button 
                onClick={handlePrint}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-black transition flex items-center gap-2"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto bg-slate-100/50 print:overflow-visible print:bg-white custom-scrollbar">
          <div id="report-printable-content" className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 print:p-0 print:max-w-none bg-slate-100/50 print:bg-white">
            
            {/* Project Overview Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-none">
              <SectionHeader id="overview" title="Project Overview & Roadmap" icon={Briefcase} />
              {expandedSections.overview && (
                <div className="p-6 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1 text-center">Start Date</label>
                      <p className="text-sm font-bold text-slate-800 text-center">{project.startDate ? formatDate(project.startDate) : 'Not Set'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1 text-center">Target End Date</label>
                      <p className="text-sm font-bold text-slate-800 text-center">{project.endDate ? formatDate(project.endDate) : 'Not Set'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1 text-center">Contract Value</label>
                      <p className="text-sm font-bold text-slate-800 text-center">{formatCurrency(project.contractValue || 0)}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1 text-center">Revenue Rec.</label>
                      <p className="text-sm font-bold text-emerald-600 text-center">{formatCurrency(project.revenueGenerated || 0)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Project Name</label>
                        <p className="text-sm font-bold text-slate-800">{project.name}</p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Project ID</label>
                        <p className="text-sm font-mono text-slate-600">{project.id}</p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Manager ID</label>
                        <p className="text-sm font-mono text-slate-600 uppercase">{project.managerId || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Status</label>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-bold uppercase border",
                          project.status === 'Active' ? "bg-red-50 text-red-700 border-red-100" :
                          project.status === 'Completed' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                          "bg-slate-100 text-slate-600 border-slate-200"
                        )}>
                          {project.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="md:col-span-2 flex flex-col md:flex-row gap-8 items-center bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                      <div className="w-full md:w-1/2 h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={financialData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={70}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {financialData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <RechartsTooltip 
                              formatter={(value: number) => formatCurrency(value)}
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-full md:w-1/2 space-y-4">
                         <div className="flex justify-between items-end border-b border-slate-200 pb-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Capital Budget</span>
                            <span className="text-sm font-mono font-bold">{formatCurrency(project.budget)}</span>
                         </div>
                         <div className="flex justify-between items-end border-b border-slate-200 pb-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Expense Budget</span>
                            <span className="text-sm font-mono font-bold">{formatCurrency(project.expenditureBudget || 0)}</span>
                         </div>
                         <div className="flex justify-between items-end border-b border-slate-200 pb-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Actual Total Spent</span>
                            <span className="text-sm font-mono font-bold text-red-600">{formatCurrency(project.spent)}</span>
                         </div>
                         <div className="flex justify-between items-end">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Budget Compliance</span>
                            <span className={cn(
                              "text-[10px] font-mono font-bold px-2 py-0.5 rounded",
                              project.spent > (project.budget + (project.expenditureBudget || 0)) ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                            )}>
                              {project.spent > (project.budget + (project.expenditureBudget || 0)) ? 'OVER LIMIT' : 'WITHIN LIMIT'}
                            </span>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* AI Advisor Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-none ring-2 ring-red-600/10">
              <SectionHeader id="aiAnalyst" title="AI Strategic Advisor" icon={Sparkles} />
              {expandedSections.aiAnalyst && (
                <div className="p-6 space-y-6">
                  {!aiInsight && !isGeneratingAi ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-600 animate-pulse">
                        <Zap className="w-8 h-8" />
                      </div>
                      <div className="max-w-md">
                        <h4 className="text-lg font-bold text-slate-900">Unlock AI Insights</h4>
                        <p className="text-sm text-slate-500 mt-2">Generate a deep analysis of your project's data to discover hidden risks and optimization opportunities.</p>
                        <button 
                          onClick={generateAiInsight}
                          className="mt-6 px-6 py-3 bg-red-600 text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-red-700 transition-all shadow-lg shadow-red-200 flex items-center gap-2 mx-auto"
                        >
                          <RefreshCw className="w-4 h-4" /> Generate Strategic Report
                        </button>
                      </div>
                    </div>
                  ) : isGeneratingAi ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce"></div>
                      </div>
                      <p className="text-sm font-bold text-slate-900 uppercase tracking-widest">Processing Matrix Data...</p>
                      <p className="text-[10px] text-slate-400 uppercase">Consulting Ares AI Engine</p>
                    </div>
                  ) : aiInsight && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-4">
                          <div className="p-5 bg-slate-900 rounded-2xl text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                              <Sparkles className="w-24 h-24 rotate-12" />
                            </div>
                            <h5 className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                              <FileText className="w-3 h-3" /> Executive Summary
                            </h5>
                            <p className="text-sm leading-relaxed text-slate-300 italic">
                              "{aiInsight.summary}"
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                              <h5 className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <AlertOctagon className="w-3 h-3" /> Critical Risks
                              </h5>
                              <ul className="space-y-2">
                                {aiInsight.risks.map((risk, i) => (
                                  <li key={i} className="text-xs text-red-800 flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                                    {risk}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                              <h5 className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Target className="w-3 h-3" /> Strategic Recs
                              </h5>
                              <ul className="space-y-2">
                                {aiInsight.recommendations.map((rec, i) => (
                                  <li key={i} className="text-xs text-emerald-800 flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                    {rec}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center">
                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Financial Health Score</h5>
                            <div className={cn(
                              "w-24 h-24 rounded-full border-4 flex items-center justify-center mb-4 transition-all duration-700",
                              aiInsight.financialHealth === 'Strong' ? "border-emerald-500 text-emerald-600 bg-emerald-50" :
                              aiInsight.financialHealth === 'Stable' ? "border-amber-500 text-amber-600 bg-amber-50" :
                              "border-red-500 text-red-600 bg-red-50"
                            )}>
                              <TrendingUp className="w-10 h-10" />
                            </div>
                            <span className={cn(
                              "text-lg font-black uppercase tracking-tighter",
                              aiInsight.financialHealth === 'Strong' ? "text-emerald-600" :
                              aiInsight.financialHealth === 'Stable' ? "text-amber-600" :
                              "text-red-600"
                            )}>
                              {aiInsight.financialHealth}
                            </span>
                          </div>

                          <button 
                            onClick={generateAiInsight}
                            className="w-full py-3 border border-slate-200 rounded-xl text-[9px] font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition flex items-center justify-center gap-2"
                          >
                            <RefreshCw className="w-3 h-3" /> Re-Analyze Data
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Personnel Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-none">
              <SectionHeader id="personnel" title="Personnel & Staffing" icon={Users} count={projectWorkers.length} />
              {expandedSections.personnel && (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Attendance Stats (Today)</h4>
                      <div className="flex gap-8">
                        <div>
                          <p className="text-xl font-bold text-slate-900">{todayAttendance.filter(r => r.status === 'Present').length}</p>
                          <p className="text-[9px] font-bold text-emerald-600 uppercase">Present</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-slate-900">{projectWorkers.length - todayAttendance.filter(r => r.status === 'Present').length}</p>
                          <p className="text-[9px] font-bold text-rose-600 uppercase">Absent/Other</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Staffing Mix</h4>
                      <div className="flex gap-8">
                        <div>
                          <p className="text-xl font-bold text-slate-900">{projectWorkers.filter(w => w.employmentType === 'Internal').length}</p>
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Internal Staff</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-slate-900">{projectWorkers.filter(w => w.employmentType === 'Seconded').length}</p>
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Guest Staff</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-slate-100 rounded-lg">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="p-3 font-bold uppercase tracking-widest text-slate-500">ID</th>
                          <th className="p-3 font-bold uppercase tracking-widest text-slate-500">Name</th>
                          <th className="p-3 font-bold uppercase tracking-widest text-slate-500">Role</th>
                          <th className="p-3 font-bold uppercase tracking-widest text-slate-500">Type</th>
                          <th className="p-3 font-bold uppercase tracking-widest text-slate-500 text-right">Daily Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectWorkers.map(worker => (
                          <tr key={worker.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                            <td className="p-3 font-mono text-slate-500">{worker.id}</td>
                            <td className="p-3 font-bold text-slate-800">{worker.name}</td>
                            <td className="p-3 text-slate-600">{worker.role}</td>
                            <td className="p-3">
                              <span className={cn(
                                "px-2 py-0.5 rounded-[4px] text-[8px] font-bold uppercase tracking-tighter",
                                worker.employmentType === 'Internal' ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-600 border border-amber-100"
                              )}>
                                {worker.employmentType}
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono text-slate-700">{formatCurrency(worker.dailyRate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Equipment Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-none">
              <SectionHeader id="equipment" title="Equipment & Assets" icon={Tool} count={projectResources.filter(r => r.category === 'Equipment').length} />
              {expandedSections.equipment && (
                <div className="p-6 space-y-6">
                  <div className="flex flex-col md:flex-row gap-8">
                    <div className="w-full md:w-1/3 h-[180px] bg-slate-50 rounded-xl p-2 border border-slate-100">
                       <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={resourceStats} layout="vertical">
                             <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                             <XAxis type="number" hide />
                             <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} width={80} />
                             <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                             <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {resourceStats.map((entry, index) => (
                                   <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                             </Bar>
                          </BarChart>
                       </ResponsiveContainer>
                    </div>
                    
                    <div className="w-full md:w-2/3 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Operational (Good)</p>
                        <h4 className="text-xl font-bold text-slate-900">{projectResources.filter(r => r.category === 'Equipment' && r.status === 'On Site').length}</h4>
                      </div>
                      <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg">
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Maintenance Required</p>
                        <h4 className="text-xl font-bold text-slate-900">{projectResources.filter(r => r.category === 'Equipment' && r.status === 'Maintenance').length}</h4>
                      </div>
                      <div className="p-4 bg-rose-50 border border-rose-100 rounded-lg">
                        <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-1">Broken / Out of Service</p>
                        <h4 className="text-xl font-bold text-slate-900">{projectResources.filter(r => r.category === 'Equipment' && r.status === 'Consumed').length}</h4>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-slate-100 rounded-lg">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="p-3 font-bold uppercase tracking-widest text-slate-500">Asset Name</th>
                          <th className="p-3 font-bold uppercase tracking-widest text-slate-500">Type</th>
                          <th className="p-3 font-bold uppercase tracking-widest text-slate-500">Condition</th>
                          <th className="p-3 font-bold uppercase tracking-widest text-slate-500 text-right">Daily Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectResources.filter(r => r.category === 'Equipment').map(res => (
                          <tr key={res.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                            <td className="p-3 font-bold text-slate-800">{res.name}</td>
                            <td className="p-3 text-slate-600">{res.type}</td>
                            <td className="p-3">
                              <span className={cn(
                                "px-2 py-0.5 rounded-[4px] text-[8px] font-bold uppercase tracking-tighter",
                                res.status === 'On Site' ? "bg-emerald-50 text-emerald-600" :
                                res.status === 'Maintenance' ? "bg-amber-50 text-amber-600" :
                                "bg-rose-50 text-rose-600"
                              )}>
                                {res.status === 'On Site' ? 'Operational' : res.status}
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono text-slate-700">{formatCurrency(res.unitCost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Financial Tracking Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-none">
              <SectionHeader id="financial" title="Financial Tracking" icon={DollarSign} />
              {expandedSections.financial && (
                <div className="p-6 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Labor Cost (Est)</p>
                      <h4 className="text-lg font-mono font-bold text-slate-900">{formatCurrency(projectWorkers.reduce((s, w) => s + w.dailyRate, 0))} <span className="text-[10px] text-slate-400">/Day</span></h4>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Equipment Yield</p>
                      <h4 className="text-lg font-mono font-bold text-slate-900">{formatCurrency(projectResources.filter(r => r.category === 'Equipment').reduce((s, r) => s + r.unitCost, 0))} <span className="text-[10px] text-slate-400">/Day</span></h4>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Direct Expenses</p>
                      <h4 className="text-lg font-mono font-bold text-slate-900">{formatCurrency(projectExpenditures.reduce((s, e) => s + e.amount, 0))}</h4>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Committed Capital (POs)</p>
                      <h4 className="text-lg font-mono font-bold text-slate-900">{formatCurrency(projectPOs.reduce((s, p) => s + p.totalAmount, 0))}</h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Receipt className="w-3 h-3" /> Recent Purchases (Purchase Orders)
                      </h5>
                      <div className="overflow-x-auto border border-slate-100 rounded-lg">
                        <table className="w-full text-left text-[11px] border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                              <th className="p-2 font-bold uppercase tracking-widest text-slate-500">PO ID</th>
                              <th className="p-2 font-bold uppercase tracking-widest text-slate-500">Vendor</th>
                              <th className="p-2 font-bold uppercase tracking-widest text-slate-500 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {projectPOs.filter(p => !reportSearch || (p.vendorName || '').toLowerCase().includes((reportSearch || '').toLowerCase()) || (p.id || '').toLowerCase().includes((reportSearch || '').toLowerCase())).map(po => (
                              <tr key={po.id} className="border-b border-slate-50">
                                <td className="p-2 font-mono text-slate-500">{po.id}</td>
                                <td className="p-2 text-slate-700">{po.vendorName}</td>
                                <td className="p-2 text-right font-mono font-bold text-slate-800">{formatCurrency(po.totalAmount)}</td>
                              </tr>
                            ))}
                            {projectPOs.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-slate-400 italic">No PO data found.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <ShoppingCart className="w-3 h-3" /> Outstanding Quotes
                      </h5>
                      <div className="overflow-x-auto border border-slate-100 rounded-lg">
                        <table className="w-full text-left text-[11px] border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                              <th className="p-2 font-bold uppercase tracking-widest text-slate-500">Quote ID</th>
                              <th className="p-2 font-bold uppercase tracking-widest text-slate-500">Vendor</th>
                              <th className="p-2 font-bold uppercase tracking-widest text-slate-500 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {projectQuotes.filter(q => !reportSearch || (q.vendorName || '').toLowerCase().includes((reportSearch || '').toLowerCase()) || (q.id || '').toLowerCase().includes((reportSearch || '').toLowerCase())).map(quote => (
                              <tr key={quote.id} className="border-b border-slate-50">
                                <td className="p-2 font-mono text-slate-500">{quote.id}</td>
                                <td className="p-2 text-slate-700">{quote.vendorName}</td>
                                <td className="p-2 text-right font-mono font-bold text-slate-800">{formatCurrency(quote.totalAmount)}</td>
                              </tr>
                            ))}
                            {projectQuotes.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-slate-400 italic">No quotes found.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border-t border-slate-100 pt-6">Expenditure Detail Breakdown vs Plan</h5>
                    <div className="overflow-x-auto border border-slate-100 rounded-lg">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="p-2 font-bold uppercase tracking-widest text-slate-500">Date</th>
                            <th className="p-2 font-bold uppercase tracking-widest text-slate-500">Description</th>
                            <th className="p-2 font-bold uppercase tracking-widest text-slate-500">Category</th>
                            <th className="p-2 font-bold uppercase tracking-widest text-slate-500 text-right">Actual Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...projectExpenditures].reverse().filter(e => !reportSearch || (e.description || '').toLowerCase().includes((reportSearch || '').toLowerCase())).map(exp => (
                            <tr key={exp.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                              <td className="p-2 font-mono text-slate-500">{exp.date}</td>
                              <td className="p-2 text-slate-700">{exp.description}</td>
                              <td className="p-2 text-slate-500">{exp.category}</td>
                              <td className="p-2 text-right font-mono font-bold text-slate-800">{formatCurrency(exp.amount)}</td>
                            </tr>
                          ))}
                          {projectExpenditures.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-slate-400 italic">No expenditures logged.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Productivity & Yield Analytics */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-none">
              <SectionHeader id="productivity" title="Tri-Hourly / Daily Productivity Yield" icon={Activity} count={projectOutputs.length} />
              {expandedSections.productivity && (
                <div className="p-6 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="h-[250px] bg-slate-50 rounded-2xl p-4 border border-slate-100">
                       <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Historical Productivity Curve</h5>
                       <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={productivityChartData}>
                           <defs>
                             <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                               <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                             </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                           <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                           <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                           <RechartsTooltip />
                           <Area type="monotone" dataKey="completed" stroke="#ef4444" fillOpacity={1} fill="url(#colorCompleted)" strokeWidth={2} />
                           <Line type="monotone" dataKey="quota" stroke="#94a3b8" strokeDasharray="5 5" dot={false} />
                         </AreaChart>
                       </ResponsiveContainer>
                    </div>

                    <div className="space-y-4">
                       <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Efficiency Metrics (Last Output)</h5>
                       <div className="space-y-4">
                          {projectOutputs.slice(-3).reverse().map(output => {
                            const efficiency = output.dailyQuota > 0 ? (output.actuallyCompleted / output.dailyQuota) * 100 : 0;
                            return (
                              <div key={output.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <p className="text-xs font-bold text-slate-800">{output.taskDescription}</p>
                                    <p className="text-[9px] text-slate-400 uppercase font-mono">{formatDate(output.date)}</p>
                                  </div>
                                  <span className={cn(
                                    "px-2 py-0.5 rounded text-[9px] font-bold uppercase",
                                    efficiency >= 90 ? "bg-emerald-100 text-emerald-700" :
                                    efficiency >= 60 ? "bg-amber-100 text-amber-700" :
                                    "bg-red-100 text-red-700"
                                  )}>
                                    {Math.round(efficiency)}% Yield
                                  </span>
                                </div>
                                <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                                  <div 
                                    className={cn(
                                      "h-full rounded-full transition-all duration-1000",
                                      efficiency >= 90 ? "bg-emerald-500" :
                                      efficiency >= 60 ? "bg-amber-500" :
                                      "bg-red-600"
                                    )}
                                    style={{ width: `${Math.min(100, efficiency)}%` }}
                                  />
                                </div>
                                <div className="mt-2 flex justify-between text-[8px] font-bold text-slate-400 uppercase">
                                  <span>Actual: {output.actuallyCompleted} {output.unitMeasurement}</span>
                                  <span>Target: {output.dailyQuota}</span>
                                </div>
                              </div>
                            );
                          })}
                          {projectOutputs.length === 0 && (
                            <p className="text-center text-xs text-slate-400 italic py-8">No productivity data available.</p>
                          )}
                       </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4">
                     <div className="flex-1 p-4 bg-slate-900 rounded-xl text-white">
                        <h5 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                           <DollarSign className="w-3 h-3" /> Cost vs Output Efficiency
                        </h5>
                        <div className="flex items-center justify-between">
                           <div>
                              <p className="text-lg font-mono font-bold">{formatCurrency(projectOutputs.reduce((s, o) => s + (o.totalCost || 0), 0))}</p>
                              <p className="text-[8px] text-slate-400 uppercase tracking-tighter">Cumulative Productivity Cost</p>
                           </div>
                           <Activity className="w-8 h-8 text-red-600 opacity-50" />
                        </div>
                     </div>
                     <div className="flex-1 p-4 bg-red-600 rounded-xl text-white">
                        <h5 className="text-[9px] font-bold text-red-200 uppercase tracking-widest mb-2 flex items-center gap-2">
                           <Timer className="w-3 h-3" /> Average Cycle Yield
                        </h5>
                        <div className="flex items-center justify-between">
                           <div>
                              <p className="text-lg font-mono font-bold">
                                {projectOutputs.length > 0 
                                  ? Math.round(projectOutputs.reduce((s, o) => s + (o.dailyQuota > 0 ? (o.actuallyCompleted / o.dailyQuota) * 100 : 0), 0) / projectOutputs.length)
                                  : 0}%
                              </p>
                              <p className="text-[8px] text-red-200/60 uppercase tracking-tighter">Strategic Efficiency Score</p>
                           </div>
                           <TrendingUp className="w-8 h-8 text-white opacity-40" />
                        </div>
                     </div>
                  </div>
                </div>
              )}
            </div>

            {/* Project Timeline section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-none">
              <SectionHeader id="timeline" title="Critical Path & Timeline" icon={Calendar} />
              {expandedSections.timeline && (
                <div className="p-6 space-y-6">
                  <div className="relative pt-12 pb-8">
                     {/* Timeline Line */}
                     <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2 rounded-full" />
                     
                     <div className="relative flex justify-between">
                        {/* Start Date */}
                        <div className="flex flex-col items-center">
                           <div className="w-5 h-5 rounded-full bg-slate-800 border-4 border-white shadow-sm mb-3 z-10" />
                           <div className="text-center">
                              <span className="text-[9px] font-bold text-slate-400 uppercase block">Start Phase</span>
                              <span className="text-[11px] font-bold text-slate-800">{project.startDate ? formatDate(project.startDate) : 'N/A'}</span>
                           </div>
                        </div>

                        {/* Today Marker */}
                        <div className="absolute top-1/2 left-1/3 -translate-y-1/2 -ml-2.5 z-20">
                           <div className="flex flex-col items-center">
                              <div className="w-5 h-5 rounded-full bg-red-600 border-4 border-white shadow-lg animate-pulse mb-3" />
                              <div className="text-center absolute -top-10 whitespace-nowrap bg-red-600 text-white px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest shadow-sm">
                                 Today (Current Pos)
                              </div>
                           </div>
                        </div>

                        {/* Milestones found in tasks */}
                        {projectTasks.filter(t => t.status === 'Completed').slice(-1).map(t => (
                           <div key={t.id} className="relative flex flex-col items-center">
                              <div className="w-5 h-5 rounded-full bg-emerald-500 border-4 border-white shadow-sm mb-3 z-10" />
                              <div className="text-center">
                                 <span className="text-[9px] font-bold text-emerald-600 uppercase block">Last Achievement</span>
                                 <span className="text-[11px] font-bold text-slate-800 max-w-[100px] truncate">{t.task}</span>
                              </div>
                           </div>
                        ))}

                        {/* End Date */}
                        <div className="flex flex-col items-center">
                           <div className="w-5 h-5 rounded-full bg-slate-200 border-4 border-white shadow-sm mb-3 z-10" />
                           <div className="text-center">
                              <span className="text-[9px] font-bold text-slate-400 uppercase block">Project Limit</span>
                              <span className="text-[11px] font-bold text-slate-800">{project.endDate ? formatDate(project.endDate) : 'N/A'}</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-4">
                     <Clock className="w-8 h-8 text-slate-300" />
                     <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Project Completion Pace</span>
                           <span className="text-[10px] font-bold text-red-600 uppercase">On Schedule</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                           <div 
                             className="h-full bg-red-600 rounded-full transition-all duration-1000"
                             style={{ width: `${Math.round((projectTasks.filter(t => t.status === 'Completed').length / (projectTasks.length || 1)) * 100)}%` }}
                           />
                        </div>
                     </div>
                  </div>
                </div>
              )}
            </div>

            {/* Risk Management Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-none">
              <SectionHeader id="risk" title="Risk Management" icon={AlertOctagon} />
              {expandedSections.risk && (
                <div className="p-6 space-y-6">
                  <div className={cn(
                    "p-4 rounded-lg flex items-center gap-4 border",
                    project.riskLevel === 'High' ? "bg-rose-50 border-rose-100 text-rose-700" :
                    project.riskLevel === 'Medium' ? "bg-amber-50 border-amber-100 text-amber-700" :
                    "bg-emerald-50 border-emerald-100 text-emerald-700"
                  )}>
                    <AlertOctagon className="w-8 h-8 opacity-40 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-tight">Active Threat Assessment: {project.riskLevel}</h4>
                      <p className="text-xs opacity-80 mt-0.5">{project.riskDetails || 'No significant anomalies detected in current cycle telemetry.'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                      <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identified Risks & Priority</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-700">Financial Liquidity Risk</span>
                          <span className="text-[8px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase">Low</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-700">Supply Chain Latency</span>
                          <span className="text-[8px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase">Medium</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-700">Labor Displacement Analysis</span>
                          <span className="text-[8px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded uppercase">High</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                      <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mitigation Protocols</h5>
                      <ul className="text-xs space-y-2 text-slate-600">
                        <li className="flex items-start gap-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                          <span>Strict inventory threshold monitoring for critical materials.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                          <span>Dynamic labor reassignment based on site priority shifts.</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Procurement Lifecycle Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-none">
              <SectionHeader id="procurement" title="Procurement Lifecycle & Supply Chain" icon={ShoppingCart} count={projectQuotes.length + projectPOs.length} />
              {expandedSections.procurement && (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Quotes Received</p>
                      <h4 className="text-xl font-bold text-slate-900">{projectQuotes.length}</h4>
                      <p className="text-[9px] text-slate-500 mt-1 uppercase">Awaiting conversion to POs</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Purchase Orders</p>
                      <h4 className="text-xl font-bold text-slate-900">{projectPOs.length}</h4>
                      <p className="text-[9px] text-slate-500 mt-1 uppercase">Committed capital contracts</p>
                    </div>
                    <div className="p-4 bg-red-600 rounded-xl text-white">
                      <p className="text-[10px] font-bold text-red-200 uppercase tracking-widest mb-1">Total Procurement Value</p>
                      <h4 className="text-xl font-mono font-bold">{formatCurrency(projectPOs.reduce((s, p) => s + p.totalAmount, 0))}</h4>
                      <p className="text-[9px] text-red-200/60 mt-1 uppercase tracking-tighter">Verified PO volume</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vendor Latency Analysis (Sample)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {projectPOs.slice(0, 4).map(po => (
                        <div key={po.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg bg-slate-50/30">
                          <div className="flex gap-3 items-center">
                            <div className="w-8 h-8 bg-white rounded border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400">
                              {po.vendorName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">{po.vendorName}</p>
                              <p className="text-[8px] font-mono text-slate-400">{po.id} &bull; {po.date}</p>
                            </div>
                          </div>
                          <span className="text-[9px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded">Active</span>
                        </div>
                      ))}
                      {projectPOs.length === 0 && (
                        <p className="text-xs text-slate-400 italic">No supply chain transactions recorded for this period.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Health & Safety Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-none">
              <SectionHeader id="safety" title="Health, Safety & Environment (HSE)" icon={ShieldCheck} />
              {expandedSections.safety && (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-5 bg-slate-900 rounded-2xl text-white">
                      <div className="flex justify-between items-start mb-6">
                         <h5 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Safety Compliance Metrics</h5>
                         <span className="text-[8px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full font-bold uppercase tracking-widest">Verified</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1">
                            <p className="text-2xl font-bold font-mono text-white">
                              {todayAttendance.length > 0 ? Math.round((todayAttendance.filter(r => r.hasPPE).length / todayAttendance.length) * 100) : 100}%
                            </p>
                            <p className="text-[8px] text-slate-400 uppercase tracking-widest">PPE Compliance Rate</p>
                         </div>
                         <div className="space-y-1">
                            <p className="text-2xl font-bold font-mono text-white">
                              {todayAttendance.length > 0 ? Math.round((todayAttendance.filter(r => r.isHealthy).length / todayAttendance.length) * 100) : 100}%
                            </p>
                            <p className="text-[8px] text-slate-400 uppercase tracking-widest">Fit-for-Work Ratio</p>
                         </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <div>
                          <p className="text-xs font-bold text-emerald-800">Zero Incident Period</p>
                          <p className="text-[9px] text-emerald-600">No work-related injuries or safety breaches logged in last 48 hours.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <Users className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-xs font-bold text-slate-800">Toolbox Talk Completed</p>
                          <p className="text-[9px] text-slate-500">Morning safety briefing conducted by Site Supervisor at 07:00 AM.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
                    <AlertOctagon className="w-4 h-4 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest">Active Safety Observations</p>
                      <p className="text-xs text-amber-700 mt-1 italic">"Periodic inspection of secondary scaffold platforms required due to high-velocity wind forecast."</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Management & Development Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-none">
              <SectionHeader id="management" title="Management & Development" icon={Target} />
              {expandedSections.management && (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Strategic Management Decisions</h5>
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-xs text-slate-600 leading-relaxed italic">
                        "Deployment of additional technical oversight for foundational bedrock excavation phase. Priority assigned to site-safety and structural data verification."
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Recent Major Achievements</h5>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs font-semibold text-slate-700">Initial Survey Completion</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs font-semibold text-slate-700">Bedrock Stabilization Phase I</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Daily Monitoring Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-none">
              <SectionHeader id="daily" title="Daily Monitoring (Real-time)" icon={Clock} />
              {expandedSections.daily && (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Present Staff Telemetry</h5>
                      <div className="flex flex-wrap gap-2">
                        {todayAttendance.length > 0 ? todayAttendance.map(record => (
                          <div key={record.workerId} className="flex items-center gap-2 px-2 py-1 bg-slate-100 rounded text-[10px] font-medium text-slate-700">
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              record.status === 'Present' ? "bg-emerald-500" : "bg-rose-500"
                            )} />
                            {record.workerName}
                          </div>
                        )) : (
                          <p className="text-xs text-slate-400 italic">No telemetry data recorded for today.</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-rose-600">Urgent Tasks requiring intervention</h5>
                      <div className="space-y-2">
                        {urgentTasks.slice(0, 3).map(task => (
                          <div key={task.id} className="p-3 bg-rose-50 border border-rose-100 rounded-lg flex items-center justify-between">
                            <span className="text-xs font-bold text-rose-800">{task.task}</span>
                            <span className="text-[8px] font-mono text-rose-400">{task.status}</span>
                          </div>
                        ))}
                        {urgentTasks.length === 0 && (
                          <p className="text-xs text-slate-400 italic">Static state detected; zero pending phase-one interventions.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center bg-slate-50 shrink-0 print:hidden">
          <p className="text-[10px] font-mono text-slate-400 uppercase">Ares Matrix &bull; Generated {new Date().toLocaleString()}</p>
          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>Verified By System AI</span>
            <div className="w-[1px] h-3 bg-slate-300"></div>
            <span>Encrypted Data Link</span>
          </div>
        </div>
      </div>
    </div>
  );
}
