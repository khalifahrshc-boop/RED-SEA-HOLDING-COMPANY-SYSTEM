import React from 'react';
import { 
  Users, 
  TrendingUp, 
  AlertCircle, 
  Clock,
  ArrowUpRight,
  ArrowDownRight
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

export function Dashboard({ projects, invoices, workers, language, onViewChange }: DashboardProps) {
  const { t, d } = useTranslation(language);
  const { hasPermission } = useAuth();
  const activeProjectsCount = projects.filter(p => p.status === 'Active').length;
  const highRiskCount = projects.filter(p => p.riskLevel === 'High').length;
  const openInvoicesValue = invoices
    .filter(inv => inv.status !== 'Paid')
    .reduce((acc, inv) => acc + inv.total, 0);

  const dashboardStats = [
    { label: t.stats.projects, value: activeProjectsCount.toString(), icon: TrendingUp, change: '+2.5%', isPositive: true },
    { label: t.stats.workforce, value: workers.length.toLocaleString(), icon: Users, change: '+140', isPositive: true },
    { label: t.risk, value: highRiskCount.toString(), icon: AlertCircle, change: '-2', isPositive: true },
    { label: t.stats.budget, value: formatCurrency(openInvoicesValue), icon: Clock, change: '+12%', isPositive: false },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight">{t.dashboard}</h1>
          <p className="text-slate-500 text-sm italic font-medium mt-0.5">Enterprise summary for North Delta Infrastructure Projects.</p>
        </div>
        <div className="flex gap-3 print:hidden">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-md text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm active:scale-95">
            {t.common.view}
          </button>
          <button className="px-4 py-2 bg-slate-900 text-white rounded-md text-xs font-bold uppercase tracking-widest hover:bg-black transition-all shadow-md active:scale-95">
            {t.common.save}
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 mb-8">
        <div className="glass-panel p-6 bg-white border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              Quick Actions
            </h4>
            <p className="text-sm font-bold text-slate-800 mt-1">Access essential modules instantly</p>
          </div>
          <div className="flex gap-3">
             {hasPermission('finance', 'payroll_cycles', 'view') && (
               <button
                 onClick={() => {
                   if (onViewChange) onViewChange('payroll');
                 }}
                 className="px-4 py-2.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-indigo-100 transition-colors uppercase tracking-wider"
               >
                 <Users className="w-4 h-4" /> Go to Payroll Manager
               </button>
             )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="glass-panel p-6 bg-white border border-slate-100 hover:border-slate-300 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-slate-50 rounded text-slate-600 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                  <Icon className="w-5 h-5" />
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-[8px] font-bold uppercase px-2 py-0.5 rounded border tracking-tighter",
                  stat.isPositive ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                )}>
                  {stat.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.change}
                </div>
              </div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-2xl font-mono font-bold text-slate-900 mt-1">{stat.value}</h3>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-panel p-8 h-80 bg-white border border-slate-100">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
            <TrendingUp className="w-3 h-3 text-red-500" />
            Enterprise Burn Rate
            <span className="text-[8px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded ml-auto">REAL-TIME TELEMETRY</span>
          </h4>
          <ResponsiveContainer width="100%" height="80%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600, fontFamily: 'monospace' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600, fontFamily: 'monospace' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontFamily: 'monospace' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#dc2626" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />

            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-panel p-8 h-80 bg-white border border-slate-100">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
             <AlertCircle className="w-3 h-3 text-slate-400" />
             Resource Allocation Matrix
          </h4>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600, fontFamily: 'monospace' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600, fontFamily: 'monospace' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontFamily: 'monospace' }}
              />
              <Bar dataKey="expenses" fill="#0f172a" radius={[2, 2, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-panel overflow-auto resize-y bg-white border border-slate-100">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Active Operation Monitoring</h4>
          <button className="text-red-600 text-[10px] font-bold uppercase tracking-widest hover:underline">Full Directory &rarr;</button>
        </div>
        <div className="overflow-x-auto">
          <div className="overflow-x-auto w-full min-w-full"><div className="min-w-max">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Asset Name</th>
                <th className="px-6 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Manager ID</th>
                <th className="px-6 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Budget Value</th>
                <th className="px-6 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Risk Tier</th>
                <th className="px-6 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Efficiency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.slice(0, 5).map((project) => (
                <tr key={project.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-slate-900 group-hover:text-red-600 transition-colors">{d(project.name)}</p>
                    <p className="text-[8px] font-mono text-slate-400 uppercase tracking-tighter">{project.id}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-tight">{project.managerId}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-xs text-slate-900 font-mono font-bold leading-none">{formatCurrency(project.budget)}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-[8px] font-bold uppercase border",
                      project.riskLevel === 'Low' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                      project.riskLevel === 'Medium' ? "bg-amber-50 text-amber-700 border-amber-100" :
                      "bg-rose-50 text-rose-700 border-rose-100"
                    )}>
                      {d(project.riskLevel)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-full bg-slate-100 rounded-full h-1 max-w-[80px] overflow-hidden">
                        <div className="bg-slate-900 h-full" style={{ width: `${Math.round((project.spent / project.budget) * 100)}%` }}></div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-400">{Math.round((project.spent / project.budget) * 100)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
        </div>
      </div>
    </div>
  );
}

