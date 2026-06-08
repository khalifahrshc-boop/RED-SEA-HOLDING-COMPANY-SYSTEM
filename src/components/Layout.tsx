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
  FileText
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
    { title: 'External Administration', views: ['procurement', 'contracts', 'inventory'] },
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
      <header className="h-[80px] bg-white border-t-4 border-t-red-600 flex items-center justify-between px-6 lg:px-10 shrink-0 shadow-sm relative z-20 print:hidden">
        <div className="flex items-center gap-2 lg:gap-3 cursor-pointer" onClick={() => onViewChange('dashboard')}>
          {company?.logo && (
            <img 
              src={company.logo} 
              alt="Company Logo" 
              className="h-9 w-auto object-contain shrink-0" 
              referrerPolicy="no-referrer"
            />
          )}
          <span className="text-xl lg:text-3xl font-bold text-red-600 tracking-tight">REDSEA</span>
          <span className="text-xl lg:text-3xl font-light text-slate-400 tracking-widest hidden sm:inline-block">| RETAIL</span>
        </div>
        
        {/* Department/Role Indicator */}
        <div className="hidden lg:flex px-4 py-1.5 bg-slate-50 border border-slate-100 rounded text-[10px] items-center gap-2">
           <Building2 className="w-3 h-3 text-slate-400" />
           <span className="font-bold text-slate-500 uppercase tracking-widest">{userData?.department || 'Administrator'} UNIT</span>
        </div>
        
          <div className="hidden lg:flex items-center gap-10">
            <div className="flex items-center gap-4 text-slate-400">
      <button 
        onClick={() => setActiveCenter(activeCenter === 'messages' ? null : 'messages')}
        className={cn("p-2 transition-colors relative", activeCenter === 'messages' ? "text-red-600 bg-red-50 rounded-lg" : "hover:text-red-500")} 
        title="Messages"
      >
        <MessageSquare className="w-5 h-5" />
        {notifications.filter(n => !n.read && (n.type === 'Request' || n.type === 'Alert' || n.type === 'Message')).length > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>
      <button 
        onClick={() => setActiveCenter(activeCenter === 'notifications' ? null : 'notifications')}
        className={cn("p-2 transition-colors relative", activeCenter === 'notifications' ? "text-red-600 bg-red-50 rounded-lg" : "hover:text-red-500")} 
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {notifications.filter(n => !n.read && n.type !== 'Request' && n.type !== 'Alert' && n.type !== 'Message').length > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>
            </div>

          <div className="flex items-center gap-6 text-sm font-medium text-slate-400">
            <button 
              className={cn("pb-2 px-1 relative top-[1px]", language === 'en' ? "text-red-500 border-b-2 border-red-500 font-bold" : "hover:text-slate-600 transition-colors")}
              onClick={() => language !== 'en' && onLanguageToggle()}
            >
              En
            </button>
            <button 
              className={cn("pb-2 px-1 relative top-[1px]", language === 'ar' ? "text-red-500 border-b-2 border-red-500 font-bold" : "hover:text-slate-600 transition-colors")}
              onClick={() => language !== 'ar' && onLanguageToggle()}
            >
              Ar
            </button>
          </div>
          
          <div className="w-[48px] h-[48px] bg-red-600 rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] cursor-pointer" onClick={() => onViewChange('dashboard')}>
            <LayoutGrid className="w-5 h-5" />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-200 rounded-full overflow-hidden relative border border-slate-200">
              <img src="https://ui-avatars.com/api/?name=User&background=f1f5f9&color=64748b" alt="User" className="w-full h-full object-cover" />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="hidden sm:block text-sm">
              <span className="text-slate-400 block text-xs">Welcome</span>
              <span className="text-slate-700 font-medium block leading-tight">{userData?.name || 'Administrator'}</span>
            </div>
            <button onClick={logOut} className="ml-2 p-2 text-slate-400 hover:text-red-600 transition-colors" title="Log Out">
              <LogOut className="w-4 h-4" />
            </button>
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
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-80 bg-slate-50/50 p-8 shrink-0 border-r border-slate-200/60 overflow-y-auto print:hidden">
          
          {/* Red Highlights / Indicators */}
          <div className="space-y-6 mb-8">
            <div className="flex gap-4 text-xs font-medium text-slate-400 pl-2">
              <span onClick={() => setTimeFilter('Day')} className={cn("cursor-pointer transition-colors", timeFilter === 'Day' ? "text-red-500 relative before:content-[''] before:absolute before:bottom-[-4px] before:left-0 before:w-full before:h-[2px] before:bg-red-500" : "hover:text-slate-600")}>Day</span>
              <span onClick={() => setTimeFilter('Week')} className={cn("cursor-pointer transition-colors", timeFilter === 'Week' ? "text-red-500 relative before:content-[''] before:absolute before:bottom-[-4px] before:left-0 before:w-full before:h-[2px] before:bg-red-500" : "hover:text-slate-600")}>Week</span>
              <span onClick={() => setTimeFilter('Month')} className={cn("cursor-pointer transition-colors", timeFilter === 'Month' ? "text-red-500 relative before:content-[''] before:absolute before:bottom-[-4px] before:left-0 before:w-full before:h-[2px] before:bg-red-500" : "hover:text-slate-600")}>Month</span>
              <span onClick={() => setTimeFilter('Year')} className={cn("cursor-pointer transition-colors", timeFilter === 'Year' ? "text-red-500 relative before:content-[''] before:absolute before:bottom-[-4px] before:left-0 before:w-full before:h-[2px] before:bg-red-500" : "hover:text-slate-600")}>Year</span>
            </div>
            
            <div className="bg-red-600 text-white p-4 rounded bg-gradient-to-br from-red-500 to-red-700 shadow-[0_8px_20px_-6px_rgba(220,38,38,0.5)] flex items-center justify-between">
               <div>
                 <div className="text-2xl font-bold leading-none tracking-tight">{dateTop}</div>
                 <div className="text-[10px] uppercase tracking-widest opacity-80 mt-1">{dateBottom}</div>
               </div>
               <CalendarCheck className="w-6 h-6 opacity-80" />
            </div>

            <div className="flex gap-4 text-xs font-medium text-slate-400 pl-2 mt-8">
              <span onClick={() => setViewFilter('Views')} className={cn("cursor-pointer transition-colors", viewFilter === 'Views' ? "text-red-500 relative before:content-[''] before:absolute before:bottom-[-4px] before:left-0 before:w-full before:h-[2px] before:bg-red-500" : "hover:text-slate-600")}>Views</span>
              <span onClick={() => setViewFilter('Reports')} className={cn("cursor-pointer transition-colors", viewFilter === 'Reports' ? "text-red-500 relative before:content-[''] before:absolute before:bottom-[-4px] before:left-0 before:w-full before:h-[2px] before:bg-red-500" : "hover:text-slate-600")}>Reports</span>
            </div>
            
            <div className="bg-red-600 text-white p-4 rounded bg-gradient-to-r from-red-600 to-red-600 shadow-[0_8px_20px_-6px_rgba(220,38,38,0.5)] flex items-center gap-4 text-sm font-medium">
              <span onClick={() => setSubFilter('Total')} className={cn("cursor-pointer", subFilter === 'Total' ? "relative before:content-[''] before:absolute before:bottom-[-10px] before:left-1/2 before:-translate-x-1/2 before:w-1 before:h-1 before:bg-white before:rounded-full" : "opacity-70 hover:opacity-100")}>Total</span>
              <span onClick={() => setSubFilter('Sections')} className={cn("cursor-pointer", subFilter === 'Sections' ? "relative before:content-[''] before:absolute before:bottom-[-10px] before:left-1/2 before:-translate-x-1/2 before:w-1 before:h-1 before:bg-white before:rounded-full" : "opacity-70 hover:opacity-100")}>Sections</span>
              <span onClick={() => setSubFilter('Metrics')} className={cn("cursor-pointer", subFilter === 'Metrics' ? "relative before:content-[''] before:absolute before:bottom-[-10px] before:left-1/2 before:-translate-x-1/2 before:w-1 before:h-1 before:bg-white before:rounded-full" : "opacity-70 hover:opacity-100")}>Metrics</span>
            </div>
          </div>

          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 pl-2">
            Modules / Categories
          </div>

          <div className="relative mb-6">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search module" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-sm"
            />
          </div>

          <nav className="flex-1 space-y-2">
            {CATEGORIES.map((category) => {
              const categoryItems = navItems.filter(item => category.views.includes(item.id));
              if (categoryItems.length === 0) return null;

              const isExpanded = expandedCategories[category.title];

              return (
                <div key={category.title} className="space-y-1">
                  <button
                    onClick={() => toggleCategory(category.title)}
                    className="w-full flex items-center justify-between px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors"
                  >
                    {category.title}
                    <span className="text-slate-300">{isExpanded ? '−' : '+'}</span>
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        {categoryItems.map((item, index) => {
                          const isActive = activeView === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => onViewChange(item.id as View)}
                              title={item.label}
                              className={cn(
                                "w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm transition-all mb-1",
                                isActive 
                                  ? "bg-white border-l-2 border-red-500 text-slate-800 font-bold shadow-sm" 
                                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                              )}
                            >
                              <div className="flex items-center gap-3 pr-2 truncate">
                                <item.icon className="w-4 h-4 shrink-0 opacity-70" />
                                <span className="truncate">{item.label}</span>
                              </div>
                              {isActive && <div className="w-1.5 h-1.5 bg-red-600 shrink-0 rounded-full shadow-[0_0_8px_rgba(220,38,38,0.8)]" />}
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
        </aside>

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
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="w-[85vw] max-w-sm h-full bg-white shadow-2xl flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="h-[80px] border-b-4 border-red-600 flex items-center justify-between px-6 bg-slate-50 shrink-0 cursor-pointer" onClick={() => { onViewChange('dashboard'); setIsMobileMenuOpen(false); }}>
                <div className="flex items-center gap-2">
                  {company?.logo && (
                    <img 
                      src={company.logo} 
                      alt="Company Logo" 
                      className="h-8 w-auto object-contain shrink-0" 
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <span className="text-xl font-bold text-red-600 tracking-tight">REDSEA</span>
                </div>
                <div className="flex items-center gap-2">
           <button onClick={() => setActiveCenter('messages')} className="p-2 text-slate-400 relative">
             <MessageSquare className="w-5 h-5" />
             {notifications.filter(n => !n.read && (n.type === 'Request' || n.type === 'Alert' || n.type === 'Message')).length > 0 && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
             )}
           </button>
           <button onClick={() => setActiveCenter('notifications')} className="p-2 text-slate-400 relative">
             <Bell className="w-5 h-5" />
             {notifications.filter(n => !n.read && n.type !== 'Request' && n.type !== 'Alert' && n.type !== 'Message').length > 0 && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
             )}
           </button>
                   <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                     <X className="w-6 h-6 text-slate-500" />
                   </button>
                </div>
              </div>
              <nav className="p-4 space-y-2 overflow-y-auto flex-1">
                {CATEGORIES.map((category) => {
                  const categoryItems = navItems.filter(item => category.views.includes(item.id));
                  if (categoryItems.length === 0) return null;

                  const isExpanded = expandedCategories[category.title];

                  return (
                    <div key={category.title} className="space-y-1">
                      <button
                        onClick={() => toggleCategory(category.title)}
                        className="w-full flex items-center justify-between px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest"
                      >
                        {category.title}
                        <span className="text-slate-300">{isExpanded ? '−' : '+'}</span>
                      </button>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            {categoryItems.map((item, index) => {
                              const isActive = activeView === item.id;
                              return (
                                <button
                                  key={item.id}
                                  onClick={() => {
                                    onViewChange(item.id as View);
                                    setIsMobileMenuOpen(false);
                                  }}
                                  className={cn(
                                    "w-full flex items-center gap-4 px-4 py-3.5 rounded-lg text-sm transition-all mb-1",
                                    isActive 
                                      ? "bg-red-50 text-red-700 font-bold" 
                                      : "text-slate-600 hover:bg-slate-100"
                                  )}
                                >
                                  <item.icon className="w-5 h-5 shrink-0 opacity-70" />
                                  <span>{item.label}</span>
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

