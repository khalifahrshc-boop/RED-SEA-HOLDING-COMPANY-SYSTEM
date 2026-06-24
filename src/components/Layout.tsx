import React from 'react';
import { 
  LayoutDashboard, 
  Construction, 
  Users, 
  Building2, 
  ReceiptIndianRupee, 
  AlertTriangle,
  Settings,
  ShoppingCart,
  Menu,
  X,
  Bell,
  Search,
  User,
  Package,
  History,
  TrendingDown,
  Coins,
  Globe,
  CalendarCheck,
  BookOpen,
  Truck,
  Hammer,
  LayoutGrid,
  Mail,
  MessageSquare,
  FileText,
  ChevronLeft,
  PanelLeftOpen
} from 'lucide-react';
import { cn } from '../lib/utils';
import { View } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Language, translations } from '../lib/translations';
import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';
import { AppNotification } from '../types';
import { notificationService } from '../lib/notificationService';
import { playNotificationSound } from '../lib/soundUtils';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface LayoutProps {
  children: React.ReactNode;
  activeView: View;
  onViewChange: (view: View) => void;
  language: Language;
  onLanguageToggle: () => void;
  company?: any;
}

const getNavItems = (t: any, language: Language) => [
  { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
  { id: 'daily-planning', label: 'Daily Progress (DPR)', icon: CalendarCheck },
  { id: 'planning', label: 'Planning', icon: CalendarCheck },
  { id: 'projects', label: t.projects, icon: Construction },
  { id: 'hr', label: language === 'ar' ? 'الموظفين (Employees)' : 'Employees', icon: Users },
  { id: 'payroll', label: language === 'ar' ? 'مسؤول الرواتب' : 'Payroll Manager', icon: ReceiptIndianRupee },
  { id: 'attendance', label: language === 'ar' ? 'الحضور والغياب' : 'Attendance', icon: CalendarCheck },
  { id: 'productivity', label: 'Daily Output', icon: Hammer },
  { id: 'additional-costs', label: 'Add. Costs', icon: History },
  { id: 'daily-expenditures', label: 'Expenditures', icon: Coins },
  { id: 'budget-variance', label: 'Utilization', icon: TrendingDown },
  { id: 'accommodation', label: t.accommodation, icon: Building2 },
  { id: 'finance', label: t.finance, icon: ReceiptIndianRupee },
  { id: 'procurement', label: t.procurement, icon: ShoppingCart },
  { id: 'accounting-tree', label: 'General Ledger', icon: LayoutGrid },
  { id: 'inventory', label: t.inventory, icon: Package },
  { id: 'equipment', label: 'Equipment', icon: Truck },
  { id: 'risk', label: t.risk, icon: AlertTriangle },
  { id: 'contracts', label: 'Documents & SIR', icon: FileText },
  { id: 'daily-reports', label: language === 'ar' ? 'إدارة التقارير اليومية' : 'Daily Reports', icon: FileText },
  { id: 'contractor-claims', label: 'Contractor Claims', icon: FileText },
  { id: 'project-charter', label: 'Project Charter', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'user-guide', label: 'User Guide', icon: BookOpen },
] as const;

export function Layout({ children, activeView, onViewChange, language, onLanguageToggle, company }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [timeFilter, setTimeFilter] = React.useState<'Day'|'Week'|'Month'|'Year'>('Day');
  const [viewFilter, setViewFilter] = React.useState<'Views'|'Reports'>('Views');
  const [subFilter, setSubFilter] = React.useState<'Total'|'Sections'|'Metrics'>('Total');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [activeCenter, setActiveCenter] = React.useState<'notifications' | 'messages' | null>(null);
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const prevUnreadIdsRef = React.useRef<Set<string>>(new Set());
  const isInitialLoadRef = React.useRef(true);
  const [soundEnabled] = useLocalStorage('ares_notification_sound', true);

  const { userData, logOut, hasPermission } = useAuth();

  React.useEffect(() => {
    if (!userData) return;
    
    // Reset initial load flag if user changes
    isInitialLoadRef.current = true;
    
    const userDept = userData.department || 'User';
    const isAdmin = userData.role === 'Admin';

    const unsubscribe = notificationService.subscribe(userDept, isAdmin, (items) => {
      setNotifications(prev => {
        // Find if there are new unread notifications that weren't in the previous state
        const unreadIds = new Set(items.filter(n => !n.read).map(n => n.id));
        
        if (!isInitialLoadRef.current && soundEnabled) {
          let hasNew = false;
          for (const id of unreadIds) {
            if (!prevUnreadIdsRef.current.has(id)) {
              hasNew = true;
              break;
            }
          }
          if (hasNew) {
            playNotificationSound();
          }
        }
        
        isInitialLoadRef.current = false;
        prevUnreadIdsRef.current = unreadIds;
        return items;
      });
    });

    return () => unsubscribe();
  }, [userData, soundEnabled]);
  const t = translations[language];
  const isRtl = language === 'ar';
  
  const VIEW_MAP: Record<string, { dept: string, section: string }> = {
    dashboard: { dept: 'all', section: 'all' },
    'user-guide': { dept: 'all', section: 'all' },
    finance: { dept: 'accounting', section: 'finance' },
    'accounting-tree': { dept: 'accounting', section: 'accounting-tree' },
    'additional-costs': { dept: 'accounting', section: 'additional-costs' },
    'daily-expenditures': { dept: 'accounting', section: 'expenditures' },
    'budget-variance': { dept: 'accounting', section: 'budget-variance' },
    hr: { dept: 'hr', section: 'workforce' },
    attendance: { dept: 'hr', section: 'attendance' },
    payroll: { dept: 'hr', section: 'payroll' },
    projects: { dept: 'projects', section: 'projects' },
    'project-charter': { dept: 'projects', section: 'project-charter' },
    planning: { dept: 'projects', section: 'planning' },
    'daily-planning': { dept: 'projects', section: 'daily-planning' },
    'contractor-claims': { dept: 'projects', section: 'contractor-claims' },
    productivity: { dept: 'projects', section: 'productivity' },
    equipment: { dept: 'internal_admin', section: 'equipment' },
    accommodation: { dept: 'internal_admin', section: 'accommodation' },
    risk: { dept: 'internal_admin', section: 'risk' },
    procurement: { dept: 'external_admin', section: 'procurement' },
    contracts: { dept: 'external_admin', section: 'contracts' },
    'daily-reports': { dept: 'external_admin', section: 'daily-reports' },
    inventory: { dept: 'external_admin', section: 'inventory' },
    settings: { dept: 'system', section: 'settings' }
  };

  const navItems = getNavItems(t, language)
    .filter(item => {
      const perm = VIEW_MAP[item.id];
      if (!perm) return false;
      if (perm.dept === 'all') return true;
      if (userData?.role === 'Admin' || userData?.department === 'Administrator') return true;
      return hasPermission(perm.dept, perm.section, 'view');
    })
    .filter(item => (item.label || '').toLowerCase().includes((searchTerm || '').toLowerCase()));

  const CATEGORIES = [
    { title: 'Overview', views: ['dashboard'] },
    { title: 'Accounting', views: ['finance', 'accounting-tree', 'additional-costs', 'daily-expenditures', 'budget-variance', 'procurement'] },
    { title: 'Human Resources', views: ['hr', 'attendance', 'payroll'] },
    { title: 'Projects', views: ['projects', 'project-charter', 'planning', 'daily-planning', 'contractor-claims', 'productivity'] },
    { title: 'Internal Administration', views: ['equipment', 'accommodation', 'risk'] },
    { title: 'External Administration', views: ['procurement', 'contracts', 'inventory', 'daily-reports'] },
    { title: 'System', views: ['settings', 'user-guide'] }
  ];

  const [expandedCategories, setExpandedCategories] = React.useState<Record<string, boolean>>({
    'Overview': true,
    'Accounting': false,
    'Human Resources': false,
    'Projects': false,
    'Internal Administration': false,
    'External Administration': false,
    'System': false
  });

  const toggleCategory = (title: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const today = new Date();
  let dateTop = '';
  let dateBottom = '';
  if (timeFilter === 'Day') {
     dateTop = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase();
     dateBottom = "Today";
  } else if (timeFilter === 'Week') {
     const start = new Date(today); start.setDate(today.getDate() - today.getDay());
     const end = new Date(start); end.setDate(start.getDate() + 6);
     dateTop = `${start.getDate()} - ${end.getDate()} ${today.toLocaleDateString('en-GB', {month: 'short'}).toUpperCase()}`;
     dateBottom = "This Week";
  } else if (timeFilter === 'Month') {
     dateTop = today.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase();
     dateBottom = "This Month";
  } else if (timeFilter === 'Year') {
     dateTop = today.getFullYear().toString();
     dateBottom = "This Year";
  }

  return (
    <div className={cn(
      "flex flex-col h-[100dvh] bg-slate-50 font-sans print:h-auto print:bg-white w-full overflow-hidden print:overflow-visible",
      isRtl ? "font-arabic" : ""
    )} dir={isRtl ? "rtl" : "ltr"}>
      
      {/* Top Header */}
      <header className="h-[80px] bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-6 lg:px-10 shrink-0 shadow-sm relative z-20 print:hidden">
        <div className="flex items-center gap-6 cursor-pointer group" onClick={() => onViewChange('dashboard')}>
          {company?.logo && (
            <img 
              src={company.logo} 
              alt="Company Logo" 
              className="h-10 w-auto object-contain transition-transform group-hover:scale-105" 
              referrerPolicy="no-referrer"
            />
          )}
          <div className="flex flex-col border-l border-slate-200 pl-6">
            <span className="text-xl lg:text-3xl font-black text-red-600 tracking-tighter leading-none group-hover:text-red-700 transition-colors">REDSEA</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] leading-none mt-1">Holding Company</span>
          </div>
        </div>
        
        {/* Dynamic Search & Actions */}
        <div className="hidden lg:flex items-center gap-12">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-1 group">
               <Building2 className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors" />
               <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{userData?.department || 'Administration'}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-8 text-slate-400">
            <div className="flex items-center gap-1 h-10 px-1 bg-slate-50 rounded-xl border border-slate-100">
              <button 
                onClick={() => setActiveCenter(activeCenter === 'messages' ? null : 'messages')}
                className={cn("p-2 transition-all relative rounded-lg", activeCenter === 'messages' ? "text-red-600 bg-white shadow-sm" : "hover:text-red-500")} 
                title="Messages"
              >
                <MessageSquare className="w-5 h-5" />
                {notifications.filter(n => !n.read && (n.type === 'Request' || n.type === 'Alert' || n.type === 'Message')).length > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                )}
              </button>
              <button 
                onClick={() => setActiveCenter(activeCenter === 'notifications' ? null : 'notifications')}
                className={cn("p-2 transition-all relative rounded-lg", activeCenter === 'notifications' ? "text-red-600 bg-white shadow-sm" : "hover:text-red-500")} 
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {notifications.filter(n => !n.read && n.type !== 'Request' && n.type !== 'Alert' && n.type !== 'Message').length > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
              <button 
                className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", language === 'en' ? "bg-white text-red-600 shadow-sm" : "hover:text-slate-600 font-bold")}
                onClick={() => language !== 'en' && onLanguageToggle()}
              >
                En
              </button>
              <button 
                className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", language === 'ar' ? "bg-white text-red-600 shadow-sm" : "hover:text-slate-600 font-bold")}
                onClick={() => language !== 'ar' && onLanguageToggle()}
              >
                Ar
              </button>
            </div>
            
            <div className="flex items-center gap-4 pl-4 border-l border-slate-200">
              <div className="flex flex-col items-end">
                <span className="text-slate-900 font-bold text-sm leading-none">{userData?.name || 'User Name'}</span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1">{userData?.role || 'Guest'}</span>
              </div>
              <div className="w-12 h-12 bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-800 shadow-lg shadow-slate-200 group cursor-pointer">
                <img src={`https://ui-avatars.com/api/?name=${userData?.name || 'User'}&background=0f172a&color=fff`} alt="User" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-red-600/0 group-hover:bg-red-600/20 transition-colors"></div>
              </div>
              <button onClick={logOut} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Log Out">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Menu Button */}
        <button 
          className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <motion.aside 
          initial={false}
          animate={{ 
            width: isSidebarCollapsed ? '0px' : '288px',
            opacity: isSidebarCollapsed ? 0 : 1
          }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={cn(
            "hidden lg:flex flex-col h-full bg-white border-r border-slate-200/60 overflow-hidden print:hidden relative z-30",
            isSidebarCollapsed && "border-none"
          )}
        >
          {/* Collapse Toggle Button (Attached to sidebar) */}
          <button 
            onClick={() => setIsSidebarCollapsed(true)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors z-50 group"
          >
            <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition-colors" />
          </button>
          
          <div className="flex-1 overflow-y-auto px-4 py-6 modern-scrollbar relative z-10">
            {/* Quick Summary / Status - Corporate Style */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{timeFilter} ANALYTICS</span>
                <div className="flex gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200/50">
                  {['Day', 'Week', 'Month'].map((f) => (
                    <button 
                      key={f}
                      onClick={() => setTimeFilter(f as any)}
                      className={cn(
                        "px-2 py-1 rounded-md text-[9px] font-bold transition-all",
                        timeFilter === f ? "bg-white text-red-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      {f[0]}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden group transition-all hover:border-red-500/30">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-red-600/10 transition-colors"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-red-600/10 flex items-center justify-center">
                      <CalendarCheck className="w-4 h-4 text-red-500" />
                    </div>
                    <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">{dateBottom}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight tracking-tight mt-3">{dateTop}</h3>
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Performance</span>
                      <span className="text-[10px] font-mono font-bold text-red-600">65%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '65%' }}
                        className="bg-gradient-to-r from-red-600 to-red-500 h-full rounded-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <nav className="space-y-6">
              <div className="px-2">
                <div className="relative group">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-red-500 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Search systems..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-red-500/10 focus:border-red-500/50 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                {CATEGORIES.map((category) => {
                  const categoryItems = navItems.filter(item => category.views.includes(item.id));
                  if (categoryItems.length === 0) return null;

                  const isExpanded = expandedCategories[category.title];

                  return (
                    <div key={category.title} className="space-y-1">
                      <button
                        onClick={() => toggleCategory(category.title)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 text-[10px] font-black uppercase tracking-[0.25em] transition-all group",
                          isExpanded ? "text-slate-600" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        <span className="group-hover:translate-x-1 transition-transform">{category.title}</span>
                        <div className={cn(
                          "w-4 h-4 rounded flex items-center justify-center transition-all",
                          isExpanded ? "bg-red-50 text-red-500 rotate-180" : "bg-slate-100 text-slate-400"
                        )}>
                          <span className="text-[10px] leading-none">{isExpanded ? '▾' : '▸'}</span>
                        </div>
                      </button>
                      
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden space-y-0.5"
                          >
                            {categoryItems.map((item) => {
                              const isActive = activeView === item.id;
                              return (
                                <button
                                  key={item.id}
                                  onClick={() => onViewChange(item.id as View)}
                                  className={cn(
                                    "w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] transition-all group relative",
                                    isActive 
                                      ? "text-red-700 font-bold bg-red-50/50 border border-red-100" 
                                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                  )}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={cn(
                                      "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 shadow-sm",
                                      isActive 
                                        ? "bg-red-600 text-white ring-4 ring-red-500/10 scale-105" 
                                        : "bg-white text-slate-400 border border-slate-100 group-hover:border-slate-200 group-hover:text-slate-600"
                                    )}>
                                      <item.icon className="w-4 h-4" />
                                    </div>
                                    <span className="truncate tracking-tight">{item.label}</span>
                                  </div>
                                  {isActive && (
                                    <motion.div 
                                      layoutId="active-nav-glow"
                                      className="absolute left-0 w-1 h-4 bg-red-600 rounded-full"
                                    />
                                  )}
                                </button>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </nav>
          </div>
          
          {/* Sidebar Footer - Professional Info */}
          <div className="p-4 bg-slate-50 border-t border-slate-200/60 relative z-20">
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full absolute -top-0.5 -right-0.5 animate-ping opacity-75"></div>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full relative shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Core Active</span>
                </div>
                <span className="text-[9px] font-mono font-bold text-slate-300">v4.2.0</span>
              </div>
              <div className="h-px w-full bg-slate-100"></div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[9px] font-bold uppercase tracking-widest">Region: MENA</span>
                <Globe className="w-3 h-3 text-slate-300" />
              </div>
            </div>
          </div>
        </motion.aside>

        {/* Expand Sidebar Trigger (Floating when collapsed) */}
        {isSidebarCollapsed && (
          <button 
            onClick={() => setIsSidebarCollapsed(false)}
            className="hidden lg:flex fixed left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-slate-200 rounded-xl items-center justify-center shadow-lg hover:bg-slate-50 transition-all z-40 group hover:scale-110"
          >
            <PanelLeftOpen className="w-5 h-5 text-red-600" />
            <div className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Expand Menu
            </div>
          </button>
        )}


        {/* Content Area */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto print:overflow-visible print:p-0 bg-slate-50/50 print:bg-white">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100/80 min-h-full p-4 lg:p-8 print:p-0 print:border-none print:shadow-none">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <motion.div 
              initial={{ x: isRtl ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: isRtl ? '100%' : '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className={cn(
                "w-[85vw] max-w-sm h-full bg-white shadow-2xl flex flex-col absolute top-0 bottom-0",
                isRtl ? "right-0" : "left-0"
              )}
              onClick={e => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="h-[80px] border-b border-slate-100 flex items-center justify-between px-6 bg-slate-50/50 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => { onViewChange('dashboard'); setIsMobileMenuOpen(false); }}>
                  {company?.logo && (
                    <img 
                      src={company.logo} 
                      alt="Company Logo" 
                      className="h-8 w-auto object-contain shrink-0" 
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="flex flex-col">
                    <span className="text-xl font-black text-red-600 tracking-tighter leading-none">REDSEA</span>
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Holding</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)} 
                    className="p-2 hover:bg-slate-800 rounded-xl transition-colors ml-1"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-8 modern-scrollbar">
                
                {/* Mobile Specific Time Filters and Highlights */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-5">
                  <div className="flex justify-between items-center bg-white p-1 rounded-xl border border-slate-200">
                    {['Day', 'Week', 'Month', 'Year'].map(f => (
                      <button
                        key={f}
                        onClick={() => setTimeFilter(f as any)}
                        className={cn(
                          "flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all",
                          timeFilter === f ? "bg-red-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  
                  <div className="bg-gradient-to-br from-red-600 to-red-700 text-white p-5 rounded-2xl shadow-xl shadow-red-900/20 flex items-center justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12"></div>
                    <div className="relative z-10">
                      <div className="text-xl font-black leading-none tracking-tight">{dateTop}</div>
                      <div className="text-[9px] uppercase font-black tracking-[0.2em] opacity-70 mt-2">{dateBottom}</div>
                    </div>
                    <CalendarCheck className="w-6 h-6 opacity-40 relative z-10" />
                  </div>
                </div>

                {/* Module Search */}
                <div className="px-1">
                  <div className="relative group">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-red-500 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Find system..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-red-500/10 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Category Navigation List */}
                <nav className="space-y-4">
                  {CATEGORIES.map((category) => {
                    const categoryItems = navItems.filter(item => category.views.includes(item.id));
                    if (categoryItems.length === 0) return null;

                    const isExpanded = expandedCategories[category.title];

                    return (
                      <div key={category.title} className="space-y-1">
                        <button
                          onClick={() => toggleCategory(category.title)}
                          className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-600 transition-colors"
                        >
                          {category.title}
                          <span className={cn("transition-transform duration-300", isExpanded ? "rotate-180 text-red-500" : "")}>▾</span>
                        </button>
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden space-y-1 pt-1"
                            >
                              {categoryItems.map((item) => {
                                const isActive = activeView === item.id;
                                return (
                                  <button
                                    key={item.id}
                                    onClick={() => {
                                      onViewChange(item.id as View);
                                      setIsMobileMenuOpen(false);
                                    }}
                                    className={cn(
                                      "w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs transition-all",
                                      isActive 
                                        ? "bg-red-50 border border-red-100 text-red-700 font-bold" 
                                        : "text-slate-600 hover:bg-slate-50"
                                    )}
                                  >
                                    <div className="flex items-center gap-4">
                                      <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                                        isActive ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "bg-white text-slate-400 border border-slate-200"
                                      )}>
                                        <item.icon className="w-4 h-4" />
                                      </div>
                                      <span className="tracking-tight">{item.label}</span>
                                    </div>
                                    {isActive && <div className="w-1 h-3 bg-red-600 rounded-full" />}
                                  </button>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </nav>
              </div>

              {/* Drawer Sticky Footer with User Profile and Controls */}
              <div className="border-t border-slate-100 p-6 bg-slate-50/50 backdrop-blur-xl flex flex-col gap-5 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl overflow-hidden relative border border-slate-200 shrink-0 shadow-lg">
                    <img src={`https://ui-avatars.com/api/?name=${userData?.name || 'User'}&background=f1f5f9&color=64748b`} alt="User" className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                  </div>
                  <div className="text-xs overflow-hidden leading-tight">
                    <span className="text-slate-900 font-bold block truncate text-sm">{userData?.name || 'Administrator'}</span>
                    <span className="text-red-600 font-black text-[9px] uppercase tracking-widest block mt-1">{userData?.role || 'Administrator'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-200 text-[10px]">
                  <span className="text-slate-400 font-black uppercase tracking-widest">Interface</span>
                  <div className="flex items-center gap-2">
                    <button 
                      className={cn("px-3 py-1 rounded-lg text-[10px] font-black transition-all", language === 'en' ? "bg-red-600 text-white shadow-md shadow-red-900/20" : "text-slate-400 hover:text-slate-600")}
                      onClick={() => language !== 'en' && onLanguageToggle()}
                    >
                      EN
                    </button>
                    <button 
                      className={cn("px-3 py-1 rounded-lg text-[10px] font-black transition-all", language === 'ar' ? "bg-red-600 text-white shadow-md shadow-red-900/20" : "text-slate-400 hover:text-slate-600")}
                      onClick={() => language !== 'ar' && onLanguageToggle()}
                    >
                      AR
                    </button>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    logOut();
                  }} 
                  className="w-full py-3 bg-white hover:bg-red-50 text-slate-700 hover:text-red-600 border border-slate-200 hover:border-red-100 rounded-xl text-xs font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-3 shadow-sm group"
                >
                  <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  <span>{isRtl ? 'خروج' : 'Sign Out'}</span>
                </button>
              </div>
            </motion.div>

          </motion.div>
        )}
      </AnimatePresence>

      <NotificationCenter 
        isOpen={activeCenter !== null} 
        onClose={() => setActiveCenter(null)} 
        type={activeCenter || 'notifications'} 
      />
    </div>
  );
}

