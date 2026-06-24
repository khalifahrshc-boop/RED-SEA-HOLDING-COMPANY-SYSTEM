import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  TrendingUp, 
  AlertCircle, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  FileText
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { formatCurrency, cn } from '@/src/lib/utils';

const data = [
  { name: 'Jan', revenue: 4000, expenses: 2400 },
  { name: 'Feb', revenue: 3000, expenses: 1398 },
  { name: 'Mar', revenue: 2000, expenses: 9800 },
  { name: 'Apr', revenue: 2780, expenses: 3908 },
  { name: 'May', revenue: 1890, expenses: 4800 },
  { name: 'Jun', revenue: 2390, expenses: 3800 },
];

const stats = [
  { label: 'Active Projects', value: '12', icon: TrendingUp, change: '+2.5%', isPositive: true },
  { label: 'Workforce Size', value: '1,240', icon: Users, change: '+140', isPositive: true },
  { label: 'High Risk Alerts', value: '3', icon: AlertCircle, change: '-2', isPositive: true },
  { label: 'Open Invoices', value: '$45k', icon: Clock, change: '+12%', isPositive: false },
];

import { Project, Invoice, Worker } from '@/src/types';
import { useTranslation, Language } from '../lib/translations';
import { useAuth } from '../contexts/AuthContext';

interface DashboardProps {
  projects: Project[];
  invoices: Invoice[];
  workers: Worker[];
  language: Language;
  company?: any;
  onViewChange?: (view: any) => void;
}

export const Dashboard = React.memo(({ projects, invoices, workers, language, onViewChange }: DashboardProps) => {
  const { t, d } = useTranslation(language);
  const { hasPermission } = useAuth();
  
  const activeProjectsCount = useMemo(() => projects.filter(p => p.status === 'Active').length, [projects]);
  const highRiskCount = useMemo(() => projects.filter(p => p.riskLevel === 'High').length, [projects]);
  const openInvoicesValue = useMemo(() => invoices
    .filter(inv => inv.status !== 'Paid')
    .reduce((acc, inv) => acc + inv.total, 0), [invoices]);

  const dashboardStats = useMemo(() => [
    { label: t.stats.projects, value: activeProjectsCount.toString(), icon: TrendingUp, change: '+2.5%', isPositive: true },
    { label: t.stats.workforce, value: workers.length.toLocaleString(), icon: Users, change: '+140', isPositive: true },
    { label: t.risk, value: highRiskCount.toString(), icon: AlertCircle, change: '-2', isPositive: true },
    { label: t.stats.budget, value: formatCurrency(openInvoicesValue), icon: Clock, change: '+12%', isPositive: false },
  ], [t, activeProjectsCount, workers.length, highRiskCount, openInvoicesValue]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 bg-red-600 rounded-full"></span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{t.dashboard}</h1>
          </div>
          <p className="text-slate-500 text-sm font-medium flex items-center gap-2">
            Enterprise Command Center 
            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
            <span className="text-slate-400 italic">North Delta Infrastructure Matrix</span>
          </p>
        </div>
        <div className="flex gap-3 print:hidden">
          <button className="enterprise-btn-secondary flex items-center gap-2">
             <FileText className="w-4 h-4" />
             {t.common.view} Report
          </button>
          <button className="enterprise-btn-primary flex items-center gap-2">
             <ArrowUpRight className="w-4 h-4" />
             New Directive
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {dashboardStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="glass-panel p-6 bg-white group hover:scale-[1.02] transition-all cursor-default overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-red-600/0 group-hover:bg-red-600 transition-all"></div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-red-50 group-hover:text-red-600 transition-all shadow-inner">
                  <Icon className="w-6 h-6" />
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border tracking-wider",
                  stat.isPositive ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                )}>
                  {stat.isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {stat.change}
                </div>
              </div>
              <div>
                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.1em]">{stat.label}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{stat.value}</h3>
                  <span className="text-[10px] font-bold text-slate-300 uppercase">Unit Load</span>
                </div>
              </div>
              
              <div className="mt-6 flex gap-1 h-1 rounded-full bg-slate-50 overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-1000", stat.isPositive ? "bg-emerald-500 w-[70%]" : "bg-rose-500 w-[40%]")}></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts & Intel Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-panel p-8 bg-white overflow-hidden relative">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-red-600" />
                Revenue vs Operational Expenditure
              </h4>
              <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">H1 2026 Fiscal Performance Vector</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-600"></span>
                <span className="text-[10px] font-bold text-slate-500 uppercase">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-900"></span>
                <span className="text-[10px] font-bold text-slate-500 uppercase">Expenses</span>
              </div>
            </div>
          </div>
          
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700, fontFamily: 'var(--font-mono)' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700, fontFamily: 'var(--font-mono)' }} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', outline: 'none' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#dc2626" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="expenses" stroke="#0f172a" strokeWidth={2} strokeDasharray="5 5" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-8 bg-slate-900 text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <div className="relative z-10 flex flex-col h-full">
            <h4 className="text-[11px] font-black text-red-500 uppercase tracking-[0.2em] mb-2">Project Vitality</h4>
            <h3 className="text-2xl font-black tracking-tighter mb-8 leading-tight">North Delta Matrix Completion Stats</h3>
            
            <div className="space-y-8 flex-1">
              {[
                { label: 'Engineering Output', val: 88 },
                { label: 'Site Logistics', val: 42 },
                { label: 'Resource Efficiency', val: 65 }
              ].map((m, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.label}</span>
                    <span className="text-xs font-mono font-bold text-white">{m.val}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${m.val}%` }}
                      transition={{ duration: 1, delay: i * 0.2 }}
                      className="h-full bg-red-600 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full py-4 mt-8 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all">
              Launch Global Audit
            </button>
          </div>
        </div>
      </div>

      {/* Asset Tracking Matrix */}
      <div className="glass-panel bg-white overflow-hidden shadow-2xl">
        <div className="card-header-vibrant px-8">
          <div>
            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Active Operation Monitoring</h4>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Live Asset Stream • High-Tier Infrastructure</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex -space-x-2">
               {[1,2,3,4].map(i => (
                 <img key={i} src={`https://ui-avatars.com/api/?name=${i}&background=random`} className="w-7 h-7 rounded-full border-2 border-white" alt="Avatar" />
               ))}
               <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-500">+12</div>
             </div>
             <button className="text-red-600 text-[11px] font-black uppercase tracking-[0.2em] hover:text-red-700 transition-colors ml-4 bg-red-50 px-4 py-2 rounded-xl">Full Directory &rarr;</button>
          </div>
        </div>
        <div className="overflow-x-auto selection:bg-red-50 modern-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Matrix Asset</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Node Commander</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Fiscal Payload</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Security Tier</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Vector Efficiency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {projects.slice(0, 5).map((project) => (
                <tr key={project.id} className="table-row-hover group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 group-hover:bg-white group-hover:border-slate-200 transition-all font-mono text-[10px] font-bold text-slate-400 shadow-inner">
                         {project.id.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 group-hover:text-red-600 transition-colors leading-none">{d(project.name)}</p>
                        <p className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter mt-1.5">{project.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-xs text-slate-600 font-bold uppercase tracking-tight flex items-center gap-2">
                       <div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>
                       {project.managerId}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <p className="text-sm text-slate-900 font-mono font-black tracking-tight">{formatCurrency(project.budget)}</p>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className={cn(
                      "status-badge",
                      project.riskLevel === 'Low' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                      project.riskLevel === 'Medium' ? "bg-amber-50 text-amber-700 border-amber-100" :
                      "bg-rose-50 text-rose-700 border-rose-100"
                    )}>
                      {d(project.riskLevel)} Tier
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.round((project.spent / project.budget) * 100)}%` }}
                          className={cn(
                            "h-full rounded-full shadow-lg",
                            (project.spent / project.budget) > 0.9 ? "bg-red-600" : "bg-slate-900"
                          )}
                        />
                      </div>
                      <span className="text-xs font-mono font-black text-slate-500">{Math.round((project.spent / project.budget) * 100)}%</span>
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
});

