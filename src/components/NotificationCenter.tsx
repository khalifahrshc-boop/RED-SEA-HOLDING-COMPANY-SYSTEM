import React from 'react';
import { 
  Bell, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Trash2, 
  User, 
  Building2,
  X,
  Mail,
  Info,
  Volume2,
  VolumeX
} from 'lucide-react';
import { cn } from '../lib/utils';
import { AppNotification } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../lib/notificationService';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'notifications' | 'messages';
}

export function NotificationCenter({ isOpen, onClose, type }: NotificationCenterProps) {
  const { userData } = useAuth();
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [soundEnabled, setSoundEnabled] = useLocalStorage('ares_notification_sound', true);
  
  const userDept = userData?.department || 'User';
  const isAdmin = userData?.role === 'Admin';

  React.useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = notificationService.subscribe(userDept, isAdmin, (items) => {
      setNotifications(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, userDept, isAdmin]);

  // Filter for user: Admin sees all, others see their department's or 'All'
  const filteredItems = notifications.filter(n => {
    const isMessageType = n.type === 'Request' || n.type === 'Alert' || n.type === 'Message'; 
    if (type === 'messages' && !isMessageType) return false;
    if (type === 'notifications' && isMessageType) return false;

    return true; // The service already filtered by department
  });

  const markAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
  };

  const deleteNotification = async (id: string) => {
    await notificationService.delete(id);
  };

  const clearAll = async () => {
    await notificationService.clearAll(type, filteredItems);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl z-[200] flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
        <div className="flex items-center gap-3">
          {type === 'notifications' ? <Bell className="w-5 h-5 text-red-500" /> : <MessageSquare className="w-5 h-5 text-red-500" />}
          <div>
            <h3 className="font-bold text-sm uppercase tracking-widest">{type === 'notifications' ? 'System Notifications' : 'Departmental Messages'}</h3>
            <p className="text-[10px] text-slate-400 font-medium">{filteredItems.filter(n => !n.read).length} Unread Updates</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)} 
            className={cn("p-2 rounded-full transition", soundEnabled ? "text-slate-300 hover:text-white" : "text-slate-500 hover:text-slate-300")}
            title={soundEnabled ? "Disable notification sounds" : "Enable notification sounds"}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {filteredItems.length > 0 ? (
          filteredItems.map(item => (
            <div 
              key={item.id} 
              className={cn(
                "p-4 rounded-xl border transition-all relative group",
                item.read ? "bg-white border-slate-100 opacity-75" : "bg-white border-red-100 shadow-sm ring-1 ring-red-500/5"
              )}
            >
              <div className="flex gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg shrink-0 flex items-center justify-center",
                  item.type === 'Alert' ? "bg-red-50 text-red-600" :
                  item.type === 'Request' ? "bg-blue-50 text-blue-600" :
                  item.type === 'Success' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-600"
                )}>
                  {item.type === 'Alert' ? <AlertCircle className="w-5 h-5" /> :
                   item.type === 'Request' ? <Mail className="w-5 h-5" /> :
                   item.type === 'Success' ? <CheckCircle2 className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.department}</span>
                    <span className="text-[10px] font-medium text-slate-400">
                      {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{item.title}</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.message}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-50 translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                {!item.read && (
                  <button 
                    onClick={() => markAsRead(item.id)}
                    className="flex-1 py-1.5 bg-slate-900 text-white rounded text-[10px] font-bold uppercase tracking-widest hover:bg-black transition"
                  >
                    Mark Read
                  </button>
                )}
                <button 
                  onClick={() => deleteNotification(item.id)}
                  className="p-1.5 text-slate-300 hover:text-red-500 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                <CheckCircle2 className="w-8 h-8 text-slate-200" />
            </div>
            <p className="text-sm font-medium">Clear as a desert sky</p>
            <p className="text-[10px] uppercase tracking-widest mt-1">No pending updates</p>
          </div>
        )}
      </div>

      {filteredItems.length > 0 && (
        <div className="p-4 border-t border-slate-100 shrink-0">
          <button 
            onClick={clearAll}
            className="w-full py-2 border border-slate-200 text-slate-500 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition"
          >
            Clear All {type}
          </button>
        </div>
      )}
    </div>
  );
}
