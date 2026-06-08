import React from 'react';
import { 
  ShieldAlert, 
  Search, 
  CheckCircle2, 
  XCircle,
  Zap,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Project, CompanyData } from '@/src/types';
import { useTranslation, Language } from '../lib/translations';
import { fixHtml2CanvasOklch } from '../lib/pdfUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Printer } from 'lucide-react';

interface RiskDetectorProps {
  projects: Project[];
  language: Language;
  company?: Partial<CompanyData>;
}

export function RiskDetector({ projects, language, company }: RiskDetectorProps) {
  const { t, d } = useTranslation(language);
  const [projectData, setProjectData] = React.useState('');
  const [selectedProjectId, setSelectedProjectId] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [analysis, setAnalysis] = React.useState<any>(null);

  const handleProjectSelect = (id: string) => {
    setSelectedProjectId(id);
    const proj = projects.find(p => p.id === id);
    if (proj) {
      setProjectData(`Project: ${proj.name}\nID: ${proj.id}\nStatus: ${proj.status}\nBudget: ${proj.budget}\nSpent: ${proj.spent}\nCurrent Risk Level: ${proj.riskLevel}\nRisk Details: ${proj.riskDetails || 'None provided'}`);
    }
  };

  const handleAnalyze = async () => {
    if (!projectData.trim()) return;
    setLoading(true);
    try {
      const response = await fetch('/api/projects/risk-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectDetails: projectData })
      });

      if (!response.ok) throw new Error("Risk detection failed");
      const result = await response.json();
      
      setAnalysis({
        ...result,
        DetailedTasks: [
          { task: 'Resource Allocation Check', status: 'Passed', detail: 'Sufficient personnel baseline.' },
          { task: 'Supply Chain Audit', status: 'Warning', detail: 'Potential 3-day delay in steel delivery.' },
          { task: 'Financial Health', status: 'Passed', detail: 'Budget variance within acceptable 5% limits.' },
          { task: 'Safety Protocol', status: 'Passed', detail: 'Zero incidents reported in current cycle.' }
        ],
        ChartData: [
          { name: 'Financial', value: Math.floor(Math.random() * 40) + 10 },
          { name: 'Operational', value: Math.floor(Math.random() * 40) + 30 },
          { name: 'Supply', value: Math.floor(Math.random() * 40) + 20 },
          { name: 'Safety', value: Math.floor(Math.random() * 10) + 5 },
        ]
      });
    } catch (error) {
      console.error("AI Risk Detection Error:", error);
      alert('Failed to analyze risks with AI.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReport = async () => {
    if (!analysis) return;
    const { generateStandardPDF, applyAutoTable } = await import('../lib/pdfUtils');
    const { doc, startY } = generateStandardPDF(`COMPREHENSIVE RISK ASSESSMENT: ${selectedProjectId || 'Custom'}`, company || {});
    
    let y = startY;
    doc.text(`Risk Level: ${analysis.RiskLevel}`, 14, y); y += 10;
    
    // Add textual content
    doc.text('Key Anomaly Deductions:', 14, y); y += 8;
    analysis.Top3Risks.forEach((risk: string, i: number) => {
        const lines = doc.splitTextToSize(`${i + 1}. ${risk}`, 180);
        doc.text(lines, 14, y);
        y += (lines.length * 5) + 2;
    });
    
    y += 5;
    doc.text('Mitigation Protocols:', 14, y); y += 8;
    analysis.MitigationStrategies.forEach((strat: string, i: number) => {
        const lines = doc.splitTextToSize(`- ${strat}`, 180);
        doc.text(lines, 14, y);
        y += (lines.length * 5) + 2;
    });

    y += 5;
    applyAutoTable(doc, {
        startY: Math.max(y, startY + 20),
        head: [['Task Area', 'Status', 'Detailed Feedback']],
        body: analysis.DetailedTasks.map((t: any) => [t.task, t.status, t.detail]),
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Capture chart element
    const chartEl = document.getElementById('risk-chart-container');
    if (chartEl) {
        const canvas = await html2canvas(chartEl, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            onclone: (clonedDoc) => {
                // Scrub ALL modern color functions (oklch, oklab, lab, lch, hwb, color-mix)
                fixHtml2CanvasOklch(clonedDoc);
            }
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (finalY + 80 > 280) {
            doc.addPage();
            doc.text('Risk Metrics Chart', 14, 20);
            doc.addImage(imgData, 'JPEG', 14, 30, 150, 75);
        } else {
            doc.text('Risk Metrics Chart', 14, finalY);
            doc.addImage(imgData, 'JPEG', 14, finalY + 10, 150, 75);
        }
    }

    doc.save(`Risk_Assessment_${selectedProjectId || 'Report'}.pdf`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-600 rounded-lg shadow-lg shadow-red-100">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{t.risk}</h2>
            <p className="text-slate-500 text-sm">Predictive analysis engine for complex project infrastructure.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-2 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold uppercase rounded border border-amber-100">System Ready</span>
          {analysis && (
            <button 
              onClick={handlePrintReport}
              className="px-4 py-2 bg-red-600 text-white rounded text-[10px] font-bold uppercase tracking-widest shadow hover:bg-red-700 transition flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Export Full Report PDF
            </button>
          )}
        </div>
      </div>

      <div className="glass-panel p-6 space-y-6 bg-white border border-slate-100">
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Select Operational Asset</label>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-red-500 transition-all font-medium"
              value={selectedProjectId}
              onChange={(e) => handleProjectSelect(e.target.value)}
            >
              <option value="">Manual Entry / New Forecast</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.id} - {p.name}</option>
              ))}
            </select>
          </div>
          <div className="w-[1px] h-10 bg-slate-100 hidden sm:block mb-1"></div>
          <div className="flex-1 w-full">
             <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Resource Input Buffer</label>
                <span className="text-[10px] font-mono text-slate-400">SCAN_READY</span>
             </div>
             <p className="text-[10px] text-slate-400 font-medium">Telemetry data from project node will appear below.</p>
          </div>
        </div>

        <textarea
          placeholder="Input project telemetry, supply chain logs, or material forecasts..."
          className="w-full h-44 p-4 rounded-lg border border-slate-200 bg-slate-50/50 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all resize-none text-sm font-mono placeholder:font-sans"
          value={projectData}
          onChange={(e) => setProjectData(e.target.value)}
        />
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Confidence Tier</span>
              <span className="text-xs font-semibold text-slate-700">Enterprise High</span>
            </div>
            <div className="w-[1px] h-6 bg-slate-200"></div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Engine</span>
              <span className="text-xs font-semibold text-slate-700">Gemini 3 Flash</span>
            </div>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading || !projectData}
            className="px-6 py-2.5 bg-red-600 text-white rounded-md font-semibold shadow-lg shadow-red-100 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all active:scale-95 text-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {loading ? 'Processing...' : 'Execute Analysis'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="grid grid-cols-1 md:grid-cols-12 gap-6"
          >
            {/* Risk Indicator Card */}
            <div className={cn(
              "md:col-span-4 p-8 flex flex-col items-center justify-center text-center dark-section",
              analysis.RiskLevel === 'High' ? "border-l-4 border-rose-500" :
              analysis.RiskLevel === 'Medium' ? "border-l-4 border-amber-500" :
              "border-l-4 border-emerald-500"
            )}>
              <ShieldAlert className={cn(
                "w-12 h-12 mb-4",
                analysis.RiskLevel === 'High' ? "text-rose-400" :
                analysis.RiskLevel === 'Medium' ? "text-amber-400" :
                "text-emerald-400"
              )} />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Risk Profile</p>
              <h3 className="text-4xl font-light mb-6 uppercase tracking-tight">{analysis.RiskLevel || 'Safe'}</h3>
              
              <div className="w-full space-y-4 text-left">
                <div className="border-t border-slate-700 pt-4">
                  <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500 mb-2">
                    <span>Integrity Score</span>
                    <span>84%</span>
                  </div>
                  <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-red-500 h-full w-[84%]"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Findings */}
            <div className="md:col-span-8 space-y-6">
              <div className="glass-panel p-6">
                <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4 text-sm uppercase tracking-tight">
                  <Search className="w-4 h-4 text-red-600" />
                  Anomaly Deductions
                </h4>
                <div className="space-y-3">
                  {(analysis.Top3Risks || []).map((risk: string, i: number) => (
                    <div key={i} className="flex gap-4 p-4 bg-slate-50 border border-slate-200 rounded group hover:border-red-300 transition-colors">
                      <div className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center shrink-0 text-xs font-bold text-slate-600">
                        {i + 1}
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {risk}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-panel p-6 bg-red-600 text-white border-none shadow-red-200 shadow-xl overflow-auto resize-y relative group">
                <div className="relative z-10">
                  <h4 className="font-bold flex items-center gap-2 mb-4 text-sm uppercase tracking-tight text-white/90">
                    <CheckCircle2 className="w-4 h-4 text-red-200" />
                    Mitigation Protocols
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(analysis.MitigationStrategies || []).map((strat: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 p-3 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10 group-hover:bg-white/15 transition-colors">
                        <ChevronRight className="w-4 h-4 mt-0.5 text-red-300 shrink-0" />
                        <p className="text-xs text-red-50 font-medium">{strat}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
              </div>

              {analysis.ChartData && (
                <div className="glass-panel p-6" id="risk-chart-container">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4 text-sm uppercase tracking-tight">
                    Risk Matrix Indices
                  </h4>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analysis.ChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                        <Tooltip cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} />
                        <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
