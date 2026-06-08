import React from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Save, 
  Edit2, 
  Search, 
  Printer, 
  FileDown, 
  CheckCircle2, 
  AlertCircle,
  Users,
  Briefcase,
  Clock,
  MapPin,
  Calendar,
  ChevronDown,
  Download
} from 'lucide-react';
import { cn, getCleanLogoBase64 } from '../lib/utils';
import { WorkAreaGroup, WorkAreaWorker, CompanyData } from '../types';
import { db } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firebase';

interface WorkAreaGroupManagerProps {
  onClose: () => void;
  company?: Partial<CompanyData>;
}

export function WorkAreaGroupManager({ onClose, company }: WorkAreaGroupManagerProps) {
  const [groups, setGroups] = React.useState<WorkAreaGroup[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isEditing, setIsEditing] = React.useState(false);
  const [currentGroup, setCurrentGroup] = React.useState<Partial<WorkAreaGroup> | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedGroupIds, setSelectedGroupIds] = React.useState<string[]>([]);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error', text: string } | null>(null);

  React.useEffect(() => {
    const q = query(collection(db, 'workAreaGroups'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const gList = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as WorkAreaGroup));
      setGroups(gList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'workAreaGroups');
    });
    return () => unsubscribe();
  }, []);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAddNew = () => {
    setCurrentGroup({
      workLocation: '',
      workDurationFrom: new Date().toISOString().split('T')[0],
      workDurationTo: '',
      shiftStartTime: '07:00',
      groupNumber: '',
      supervisor: {
        name: '',
        idNumber: '',
        badgeNumber: '',
        contactNumber: ''
      },
      projectManagerName: '',
      projectManagerContact: '',
      operationsManagerName: '',
      hrManagerName: '',
      workers: []
    });
    setIsEditing(true);
  };

  const handleEdit = (group: WorkAreaGroup) => {
    setCurrentGroup({ ...group });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this group?')) return;
    try {
      await deleteDoc(doc(db, 'workAreaGroups', id));
      showMessage('success', 'Group deleted successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `workAreaGroups/${id}`);
      showMessage('error', 'Failed to delete group');
    }
  };

  const validateGroup = (group: Partial<WorkAreaGroup>) => {
    if (!group.workLocation || !group.workDurationFrom || !group.workDurationTo || !group.groupNumber) {
      return "Main group information is required (Location, Duration, Group Number)";
    }
    if (!group.supervisor?.name || !group.supervisor?.badgeNumber) {
      return "Supervisor name and badge number are required";
    }
    if (group.workers && group.workers.some(w => !w.name || !w.badgeNumber || !w.profession)) {
      return "All worker fields (Name, Badge, Profession) are required for every row";
    }
    return null;
  };

  const handleSave = async () => {
    if (!currentGroup) return;
    
    const error = validateGroup(currentGroup);
    if (error) {
      showMessage('error', error);
      return;
    }

    try {
      const data = {
        ...currentGroup,
        updatedAt: serverTimestamp(),
      };
      
      if (currentGroup.id) {
        const { id, ...updateData } = data;
        await updateDoc(doc(db, 'workAreaGroups', id), updateData);
        showMessage('success', 'Group updated successfully');
      } else {
        await addDoc(collection(db, 'workAreaGroups'), {
          ...data,
          createdAt: serverTimestamp()
        });
        showMessage('success', 'Group created successfully');
      }
      setIsEditing(false);
      setCurrentGroup(null);
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, currentGroup.id ? OperationType.UPDATE : OperationType.CREATE, currentGroup.id ? `workAreaGroups/${currentGroup.id}` : 'workAreaGroups');
      showMessage('error', 'Failed to save group');
    }
  };

  const addWorkerRow = () => {
    if (!currentGroup) return;
    const newWorker: WorkAreaWorker = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      badgeNumber: '',
      profession: '',
      employmentType: 'Company employee',
      startTime: currentGroup.shiftStartTime || '07:00',
      endTime: '17:00'
    };
    setCurrentGroup({
      ...currentGroup,
      workers: [...(currentGroup.workers || []), newWorker]
    });
  };

  const removeWorkerRow = (workerId: string) => {
    if (!currentGroup) return;
    setCurrentGroup({
      ...currentGroup,
      workers: currentGroup.workers?.filter(w => w.id !== workerId)
    });
  };

  const updateWorker = (workerId: string, field: keyof WorkAreaWorker, value: any) => {
    if (!currentGroup) return;
    setCurrentGroup({
      ...currentGroup,
      workers: currentGroup.workers?.map(w => w.id === workerId ? { ...w, [field]: value } : w)
    });
  };

  const handleExportPDF = async (specificGroups?: WorkAreaGroup[]) => {
    const groupsToExport = specificGroups || groups.filter(g => selectedGroupIds.includes(g.id));
    if (groupsToExport.length === 0) {
      showMessage('error', 'No groups selected for export');
      return;
    }

    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    
    groupsToExport.forEach((group, index) => {
      if (index > 0) doc.addPage();
      
      // Header
      doc.setFontSize(18);
      doc.setTextColor(40);
      
      const logoBase64 = getCleanLogoBase64(company?.logo);
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', 14, 10, 30, 30);
        } catch (e) {
          console.error("Could not add company logo to PDF", e);
        }
      }

      doc.text(company?.name || 'WORK AREA GROUP REPORT', logoBase64 ? 50 : 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Group Number: ${group.groupNumber}`, logoBase64 ? 50 : 14, 30);
      doc.text(`Work Location: ${group.workLocation}`, logoBase64 ? 50 : 14, 35);
      doc.text(`Period: ${group.workDurationFrom} to ${group.workDurationTo}`, logoBase64 ? 50 : 14, 40);
      doc.text(`Shift Start: ${group.shiftStartTime}`, logoBase64 ? 50 : 14, 45);
      doc.text(`Total Personnel: ${group.workers.length}`, logoBase64 ? 50 : 14, 50);

      // Managers Metadata
      doc.setFontSize(8);
      doc.setTextColor(80);
      let managerY = 55;
      if (group.projectManagerName) {
        doc.text(`Project Manager: ${group.projectManagerName} (${group.projectManagerContact || 'N/A'})`, 14, managerY);
        managerY += 4;
      }
      if (group.operationsManagerName) {
        doc.text(`Operations Manager: ${group.operationsManagerName}`, 14, managerY);
        managerY += 4;
      }
      if (group.hrManagerName) {
        doc.text(`HR Manager: ${group.hrManagerName}`, 14, managerY);
        managerY += 4;
      }

      // Supervisor Section
      doc.setFontSize(12);
      doc.setTextColor(40);
      const supervisorStartY = Math.max(55, managerY + 2);
      doc.text('Supervisor Information', 14, supervisorStartY);
      
      autoTable(doc, {
        startY: supervisorStartY + 3,
        head: [['Name', 'ID Number', 'Badge Number', 'Contact']],
        body: [[
          group.supervisor.name,
          group.supervisor.idNumber,
          group.supervisor.badgeNumber,
          group.supervisor.contactNumber
        ]],
        styles: { fontSize: 9 },
        theme: 'grid',
        headStyles: { fillColor: [51, 65, 85] }
      });

      // Workers Section
      doc.setFontSize(12);
      doc.setTextColor(40);
      const workerStartY = (doc as any).lastAutoTable.finalY + 10;
      doc.text(`Workers List (${group.workers.length} Personnel)`, 14, workerStartY);

      const workerBody = group.workers.map(w => [
        w.name,
        w.badgeNumber,
        w.profession,
        w.employmentType === 'Labor supply company employee' ? `External (${w.laborSupplyCompanyName})` : 'Internal',
        w.startTime,
        w.endTime
      ]);

      autoTable(doc, {
        startY: workerStartY + 3,
        head: [['Name', 'Badge', 'Profession', 'Emp. Type', 'Start', 'End']],
        body: workerBody,
        styles: { fontSize: 8 },
        theme: 'striped',
        headStyles: { fillColor: [51, 65, 85] }
      });

      // Footer
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      doc.setFontSize(9);
      doc.text('Authorized Signature: _________________________', 14, finalY);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, finalY + 10);
    });

    doc.save(`Work_Area_Groups_${Date.now()}.pdf`);
  };

  const filteredGroups = groups.filter(g => 
    (g.workLocation || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (g.groupNumber || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (g.supervisor?.name || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-7xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200"
      >
        {/* Header */}
        <div className="bg-slate-900 px-8 py-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-600 rounded-xl shadow-lg shadow-red-600/20">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white uppercase tracking-tight">Work Area Group Management</h2>
              <p className="text-slate-400 text-xs font-medium">Supervisor assignments and worker deployment logistics.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-slate-50/50">
          {isEditing ? (
            <div className="p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-300">
              {/* Main Info Card */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3">
                      <MapPin className="w-3 h-3 text-red-600" />
                      Work Location & Context
                    </h3>
                    
                    <div className="space-y-4 text-slate-900">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Work Location</label>
                        <input 
                          type="text" 
                          value={currentGroup?.workLocation || ''}
                          onChange={e => setCurrentGroup({...currentGroup!, workLocation: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                          placeholder="e.g. Site Zone A, Sector 4"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">From Date</label>
                          <input 
                            type="date" 
                            value={currentGroup?.workDurationFrom || ''}
                            onChange={e => setCurrentGroup({...currentGroup!, workDurationFrom: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">To Date</label>
                          <input 
                            type="date" 
                            value={currentGroup?.workDurationTo || ''}
                            onChange={e => setCurrentGroup({...currentGroup!, workDurationTo: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Shift Start</label>
                          <input 
                            type="time" 
                            value={currentGroup?.shiftStartTime || '07:00'}
                            onChange={e => setCurrentGroup({...currentGroup!, shiftStartTime: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Group Number</label>
                          <input 
                            type="text" 
                            value={currentGroup?.groupNumber || ''}
                            onChange={e => setCurrentGroup({...currentGroup!, groupNumber: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                            placeholder="e.g. GP-501"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50 p-6 rounded-2xl border border-red-100 shadow-sm space-y-6">
                    <h3 className="text-xs font-bold text-red-700 uppercase tracking-widest flex items-center gap-2 border-b border-red-100 pb-3">
                      <Briefcase className="w-3 h-3" />
                      Supervisor Information
                    </h3>
                    
                    <div className="space-y-4 text-slate-900">
                      <div>
                        <label className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1.5 block">Full Name</label>
                        <input 
                          type="text" 
                          value={currentGroup?.supervisor?.name || ''}
                          onChange={e => setCurrentGroup({...currentGroup!, supervisor: {...currentGroup!.supervisor!, name: e.target.value}})}
                          className="w-full bg-white border border-red-100 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-slate-900">
                        <div>
                          <label className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1.5 block">ID Number</label>
                          <input 
                            type="text" 
                            value={currentGroup?.supervisor?.idNumber || ''}
                            onChange={e => setCurrentGroup({...currentGroup!, supervisor: {...currentGroup!.supervisor!, idNumber: e.target.value}})}
                            className="w-full bg-white border border-red-100 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1.5 block">Badge Number</label>
                          <input 
                            type="text" 
                            value={currentGroup?.supervisor?.badgeNumber || ''}
                            onChange={e => setCurrentGroup({...currentGroup!, supervisor: {...currentGroup!.supervisor!, badgeNumber: e.target.value}})}
                            className="w-full bg-white border border-red-100 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1.5 block">Contact Number</label>
                        <input 
                          type="text" 
                          value={currentGroup?.supervisor?.contactNumber || ''}
                          onChange={e => setCurrentGroup({...currentGroup!, supervisor: {...currentGroup!.supervisor!, contactNumber: e.target.value}})}
                          className="w-full bg-white border border-red-100 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-6 rounded-2xl shadow-sm space-y-6">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2 border-b border-slate-800 pb-3">
                      <Briefcase className="w-3 h-3 text-red-500" />
                      Management Assignment
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Project Manager Name</label>
                        <input 
                          type="text" 
                          value={currentGroup?.projectManagerName || ''}
                          onChange={e => setCurrentGroup({...currentGroup!, projectManagerName: e.target.value})}
                          className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Project Manager Contact</label>
                        <input 
                          type="text" 
                          value={currentGroup?.projectManagerContact || ''}
                          onChange={e => setCurrentGroup({...currentGroup!, projectManagerContact: e.target.value})}
                          className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Operations Manager Name</label>
                        <input 
                          type="text" 
                          value={currentGroup?.operationsManagerName || ''}
                          onChange={e => setCurrentGroup({...currentGroup!, operationsManagerName: e.target.value})}
                          className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">HR Manager Name</label>
                        <input 
                          type="text" 
                          value={currentGroup?.hrManagerName || ''}
                          onChange={e => setCurrentGroup({...currentGroup!, hrManagerName: e.target.value})}
                          className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full text-slate-900">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <Users className="w-4 h-4 text-red-600" />
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Workers List & Schedule</h3>
                        <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full">
                          {currentGroup?.workers?.length || 0} Personnel
                        </span>
                      </div>
                      <button 
                        onClick={addWorkerRow}
                        className="flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-black transition-all active:scale-95"
                      >
                        <Plus className="w-3 h-3" />
                        Add Worker
                      </button>
                    </div>

                    <div className="flex-1 overflow-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 sticky top-0 z-10">
                          <tr>
                            <th className="px-6 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Worker Details</th>
                            <th className="px-6 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Employment</th>
                            <th className="px-6 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Schedule</th>
                            <th className="px-6 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {currentGroup?.workers?.map((worker, idx) => (
                            <tr key={worker.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 space-y-2 min-w-[250px]">
                                <input 
                                  type="text" 
                                  value={worker.name}
                                  onChange={e => updateWorker(worker.id, 'name', e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-red-500 outline-none"
                                  placeholder="Full Name"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                  <input 
                                    type="text" 
                                    value={worker.badgeNumber}
                                    onChange={e => updateWorker(worker.id, 'badgeNumber', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] focus:ring-1 focus:ring-red-500 outline-none"
                                    placeholder="Badge #"
                                  />
                                  <input 
                                    type="text" 
                                    value={worker.profession}
                                    onChange={e => updateWorker(worker.id, 'profession', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] focus:ring-1 focus:ring-red-500 outline-none"
                                    placeholder="Profession"
                                  />
                                </div>
                              </td>
                              <td className="px-6 py-4 space-y-2 min-w-[200px]">
                                <select 
                                  value={worker.employmentType}
                                  onChange={e => updateWorker(worker.id, 'employmentType', e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs outline-none"
                                >
                                  <option value="Company employee">Company employee</option>
                                  <option value="Labor supply company employee">Labor supply company employee</option>
                                </select>
                                {worker.employmentType === 'Labor supply company employee' && (
                                  <input 
                                    type="text" 
                                    value={worker.laborSupplyCompanyName || ''}
                                    onChange={e => updateWorker(worker.id, 'laborSupplyCompanyName', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] focus:ring-1 focus:ring-red-500 outline-none animate-in fade-in"
                                    placeholder="Company Name"
                                  />
                                )}
                              </td>
                              <td className="px-6 py-4 min-w-[150px]">
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="time" 
                                    value={worker.startTime}
                                    onChange={e => updateWorker(worker.id, 'startTime', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] focus:ring-1 focus:ring-red-500 outline-none"
                                  />
                                  <span className="text-slate-400 text-xs">to</span>
                                  <input 
                                    type="time" 
                                    value={worker.endTime}
                                    onChange={e => updateWorker(worker.id, 'endTime', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] focus:ring-1 focus:ring-red-500 outline-none"
                                  />
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button 
                                  onClick={() => removeWorkerRow(worker.id)}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {(!currentGroup?.workers || currentGroup.workers.length === 0) && (
                            <tr>
                              <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                                <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                No workers added to this group yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-lg">
                <button 
                  onClick={() => {setIsEditing(false); setCurrentGroup(null);}}
                  className="px-6 py-2 border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  className="flex items-center gap-2 px-8 py-2 bg-red-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  Save Organization Group
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 space-y-6 flex flex-col h-full">
              {/* Toolbar */}
              <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search by location, group, or supervisor..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-slate-900"
                  />
                </div>
                <div className="flex gap-3">
                   <div className="dropdown relative group">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition-all">
                      <Download className="w-4 h-4" />
                      Bulk Export
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </button>
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden hidden group-hover:block z-20">
                      <button 
                        onClick={() => handleExportPDF()}
                        className="w-full px-4 py-2.5 text-left text-[10px] font-bold uppercase text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <FileDown className="w-4 h-4 text-red-600" />
                        Selected ({selectedGroupIds.length})
                      </button>
                      <button 
                         onClick={() => handleExportPDF(groups)}
                        className="w-full px-4 py-2.5 text-left text-[10px] font-bold uppercase text-slate-600 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100"
                      >
                        <Printer className="w-4 h-4 text-slate-400" />
                        All Groups
                      </button>
                    </div>
                  </div>
                  <button 
                    onClick={handleAddNew}
                    className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-lg"
                  >
                    <Plus className="w-4 h-4" />
                    New Group
                  </button>
                </div>
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-auto min-h-0">
                {loading ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin"></div>
                  </div>
                ) : filteredGroups.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                    <Users className="w-16 h-16 opacity-10" />
                    <p className="text-sm font-medium italic">No work area groups found matching your criteria.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-8">
                    {filteredGroups.map(group => (
                      <motion.div 
                        key={group.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden group/card flex flex-col"
                      >
                        <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox"
                              checked={selectedGroupIds.includes(group.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedGroupIds(prev => [...prev, group.id]);
                                else setSelectedGroupIds(prev => prev.filter(id => id !== group.id));
                              }}
                              className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                            />
                            <div>
                              <h4 className="text-sm font-bold text-slate-900">{group.workLocation}</h4>
                              <p className="text-[10px] text-slate-400 font-mono">GROUP: {group.groupNumber}</p>
                            </div>
                          </div>
                          <div className="flex gap-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleEdit(group)}
                              className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleExportPDF([group])}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDelete(group.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="p-5 space-y-4 flex-1">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Duration</p>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-700 font-medium">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {group.workDurationFrom} → {group.workDurationTo}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Shift Time</p>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-700 font-medium">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {group.shiftStartTime}
                              </div>
                            </div>
                          </div>

                          <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                             <p className="text-[8px] font-bold text-red-400 uppercase tracking-widest mb-1.5">Supervisor</p>
                             <div className="flex items-center gap-2">
                               <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-[10px] font-bold text-red-600">
                                 {group.supervisor.name.split(' ').map(n => n[0]).join('')}
                               </div>
                               <div>
                                 <p className="text-[10px] font-bold text-slate-900">{group.supervisor.name}</p>
                                 <p className="text-[8px] text-slate-500 font-mono">BADGE: {group.supervisor.badgeNumber}</p>
                               </div>
                             </div>
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <div className="flex -space-x-2 overflow-hidden">
                              {group.workers.slice(0, 5).map((w, i) => (
                                <div key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center text-[7px] font-bold text-slate-600 border border-slate-300">
                                  {w.name.charAt(0)}
                                </div>
                              ))}
                              {group.workers.length > 5 && (
                                <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-slate-900 flex items-center justify-center text-[7px] font-bold text-white">
                                  +{group.workers.length - 5}
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">{group.workers.length} Personnel Total</span>
                          </div>
                        </div>

                        <div className="px-5 pb-4 space-y-2">
                          {group.projectManagerName && (
                            <div className="flex justify-between text-[8px] font-medium text-slate-500">
                              <span>PM:</span>
                              <span className="text-slate-900">{group.projectManagerName}</span>
                            </div>
                          )}
                          {group.operationsManagerName && (
                            <div className="flex justify-between text-[8px] font-medium text-slate-500">
                              <span>OPS:</span>
                              <span className="text-slate-900">{group.operationsManagerName}</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Status Toast */}
        <AnimatePresence>
          {message && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100]"
            >
              <div className={cn(
                "px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border backdrop-blur-md",
                message.type === 'success' ? "bg-emerald-500/90 text-white border-emerald-400" : "bg-red-600/90 text-white border-red-500"
              )}>
                {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <p className="text-sm font-bold uppercase tracking-tight">{message.text}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
