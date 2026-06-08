import React, { useState, useEffect } from 'react';
import { useTranslation, Language } from '../lib/translations';
import { Hammer, Plus, Search, Filter, Briefcase, UserCircle, CheckCircle, XCircle, Printer, Settings, Trash2, Edit2 } from 'lucide-react';
import { DailyOutputRec, Project, Worker, ProductivityWorkerDetail } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface ProductivityProps {
  language: Language;
  projects?: Project[];
  workers?: Worker[];
  company?: any;
  records?: DailyOutputRec[];
  setRecords?: React.Dispatch<React.SetStateAction<DailyOutputRec[]>>;
}

export function Productivity({ 
  language, 
  projects = [], 
  workers = [], 
  company,
  records: propsRecords,
  setRecords: propsSetRecords
}: ProductivityProps) {
  const { t, d } = useTranslation(language);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  
  const [localRecords, setLocalRecords] = useLocalStorage<DailyOutputRec[]>('ares_productivity_records', [
    {
      id: 'OP-001',
      projectId: 'PRJ-24-001',
      projectName: 'Riyadh Metro Station',
      workerId: '10045',
      workerName: 'Ahmed Hassan',
      workerRecords: [{
        workerId: '10045',
        workerName: 'Ahmed Hassan',
        actuallyCompleted: 45,
        unitCost: 15,
        totalCost: 675
      }],
      date: new Date().toISOString().split('T')[0],
      taskDescription: 'Block Work (External)',
      dailyQuota: 50,
      actuallyCompleted: 45,
      unitMeasurement: 'Square Meters',
      unitCost: 15,
      totalCost: 675,
      notes: 'Slight delay due to material shortage in the morning.'
    }
  ]);
  const records = propsRecords !== undefined ? propsRecords : localRecords;
  const setRecords = propsSetRecords !== undefined ? propsSetRecords : setLocalRecords;

  const [formData, setFormData] = useState<Partial<DailyOutputRec>>({
    date: new Date().toISOString().split('T')[0],
    workerRecords: []
  });
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);

  const filteredRecords = records.filter(r => 
    (r.projectName || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (r.workerName || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (r.workerNames?.join(', ') || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (r.taskDescription || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  useEffect(() => {
    // If workerRecords is missing in state, build it from selected worker ids so user can edit it
    const currentWorkerRecords = formData.workerRecords || [];
    const newWorkerRecords = selectedWorkerIds.map(id => {
      const existing = currentWorkerRecords.find(wr => wr.workerId === id);
      if (existing) return existing;
      const w = workers.find(w => w.id === id);
      return {
        workerId: id,
        workerName: w?.name || 'Unknown',
        triHourlyQuota: formData.triHourlyQuota || 0,
        triHourlyCompleted: 0,
        dailyQuota: formData.dailyQuota || 0,
        dailyCompleted: 0,
        weeklyQuota: formData.weeklyQuota || 0,
        weeklyCompleted: 0,
        monthlyQuota: formData.monthlyQuota || 0,
        monthlyCompleted: 0,
        actuallyCompleted: 0,
        unitCost: formData.unitCost || 0,
        totalCost: 0
      };
    });
    setFormData(prev => ({ ...prev, workerRecords: newWorkerRecords }));
  }, [selectedWorkerIds, formData.unitCost, formData.triHourlyQuota, formData.dailyQuota, formData.weeklyQuota, formData.monthlyQuota, workers]);

  const handleWorkerRecordChange = (workerId: string, field: keyof ProductivityWorkerDetail, value: number) => {
    setFormData(prev => {
      const wrs = [...(prev.workerRecords || [])];
      const idx = wrs.findIndex(w => w.workerId === workerId);
      if (idx !== -1) {
        wrs[idx] = { ...wrs[idx], [field]: value };
        if (field === 'dailyCompleted') {
          wrs[idx].actuallyCompleted = value;
        }
        wrs[idx].totalCost = (wrs[idx].actuallyCompleted || 0) * (wrs[idx].unitCost || 0);
      }
      return { ...prev, workerRecords: wrs };
    });
  };

  const openAddModal = () => {
    setEditingRecordId(null);
    setFormData({ date: new Date().toISOString().split('T')[0], workerRecords: [] });
    setSelectedWorkerIds([]);
    setIsModalOpen(true);
  };

  const openEditModal = (rec: DailyOutputRec) => {
    setEditingRecordId(rec.id);
    setFormData(rec);
    const wIds = rec.workerRecords?.map(wr => wr.workerId) || rec.workerIds || (rec.workerId ? [rec.workerId] : []);
    setSelectedWorkerIds(wIds);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this productivity sheet?')) {
      setRecords(records.filter(r => r.id !== id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const workerNames = selectedWorkerIds.map(id => workers.find(w => w.id === id)?.name || 'Unknown');
    const primaryWorkerId = selectedWorkerIds.length === 1 ? selectedWorkerIds[0] : (selectedWorkerIds.length > 0 ? 'Multiple' : '00000');
    const primaryWorkerName = selectedWorkerIds.length === 1 ? workerNames[0] : (selectedWorkerIds.length > 0 ? `${selectedWorkerIds.length} Workers` : 'Unknown Worker');

    const actuallyCompletedTotal = formData.workerRecords?.reduce((sum, wr) => sum + (Number(wr.actuallyCompleted) || 0), 0) || 0;
    const totalCostTotal = formData.workerRecords?.reduce((sum, wr) => sum + (Number(wr.totalCost) || 0), 0) || 0;

    const newRecord: DailyOutputRec = {
      id: editingRecordId || `OP-${String(records.length + 1).padStart(3, '0')}-${Date.now().toString().slice(-4)}`,
      projectId: formData.projectId || 'PRJ-000',
      projectName: formData.projectName || 'General Project',
      workerId: primaryWorkerId,
      workerName: primaryWorkerName,
      workerIds: selectedWorkerIds,
      workerNames: workerNames,
      workerRecords: formData.workerRecords,
      date: formData.date || new Date().toISOString().split('T')[0],
      taskDescription: formData.taskDescription || '',
      dailyQuota: Number(formData.dailyQuota) || 0,
      triHourlyQuota: Number(formData.triHourlyQuota) || 0,
      weeklyQuota: Number(formData.weeklyQuota) || 0,
      monthlyQuota: Number(formData.monthlyQuota) || 0,
      actuallyCompleted: actuallyCompletedTotal,
      unitMeasurement: formData.unitMeasurement || 'Units',
      unitCost: Number(formData.unitCost) || 0,
      totalCost: totalCostTotal,
      notes: formData.notes
    };
    
    if (editingRecordId) {
      setRecords(records.map(r => r.id === editingRecordId ? newRecord : r));
    } else {
      setRecords([newRecord, ...records]);
    }
    
    setIsModalOpen(false);
    setSelectedWorkerIds([]);
    setFormData({ date: new Date().toISOString().split('T')[0], workerRecords: [] });
  };

  const handlePrintAll = () => {
    import('../lib/pdfUtils').then(({ generateStandardPDF, applyAutoTable }) => {
        const recordsToPrint = selectedRecordIds.length > 0 ? filteredRecords.filter(r => selectedRecordIds.includes(r.id)) : filteredRecords;
        const { doc, startY } = generateStandardPDF('DAILY OUTPUT & PRODUCTIVITY REPORT', company || {});
        let y = startY;
        
        const tableData = recordsToPrint.map(record => {
            const totalDailyQuota = record.dailyQuota * (record.workerRecords?.length || record.workerIds?.length || 1);
            const completionPct = totalDailyQuota > 0 ? Math.round((record.actuallyCompleted / totalDailyQuota) * 100) : 0;
            return [
                record.date,
                record.projectName,
                record.workerName,
                `${record.taskDescription}\n(3H: ${record.triHourlyQuota || '-'} | Mo: ${record.monthlyQuota || '-'})`,
                `${record.actuallyCompleted} / ${totalDailyQuota} ${record.unitMeasurement} (${completionPct}%)`,
                `SAR ${record.totalCost.toLocaleString()}`,
                record.notes || ''
            ];
        });

        applyAutoTable(doc, {
            startY: y,
            head: [['Date', 'Project', 'Worker', 'Task', 'Completion', 'Cost', 'Follow-up Notes']],
            body: tableData,
            styles: { fontSize: 8 },
        });

        const finalY = (doc as any).lastAutoTable.finalY + 20;
        doc.text('Supervisor Authorization: _________________________', 14, finalY);
        doc.text('Manager Authorization: _________________________', 14, finalY + 15);

        doc.save('Productivity_Report_All.pdf');
    });
  };

  const handlePrintDepartment = () => {
    import('../lib/pdfUtils').then(({ generateStandardPDF, applyAutoTable }) => {
        const recordsToPrint = selectedRecordIds.length > 0 ? filteredRecords.filter(r => selectedRecordIds.includes(r.id)) : filteredRecords;
        const { doc, startY } = generateStandardPDF('DEPARTMENT WORKERS PRODUCTIVITY', company || {});
        let y = startY;
        
        doc.setFontSize(10);
        doc.text(`Reporting Period: Current View`, 14, y); y += 10;

        const allWorkers: any[] = [];
        recordsToPrint.forEach(record => {
            if (record.workerRecords && record.workerRecords.length > 0) {
               record.workerRecords.forEach(wr => {
                   allWorkers.push({
                      date: record.date,
                      project: record.projectName,
                      task: record.taskDescription,
                      ...wr,
                      unitMeasurement: record.unitMeasurement
                   });
               });
            } else {
               allWorkers.push({
                  date: record.date,
                  project: record.projectName,
                  task: record.taskDescription,
                  workerId: record.workerId || '00000',
                  workerName: record.workerName || 'Unknown',
                  dailyQuota: record.dailyQuota,
                  dailyCompleted: record.actuallyCompleted,
                  triHourlyQuota: record.triHourlyQuota,
                  monthlyQuota: record.monthlyQuota,
                  actuallyCompleted: record.actuallyCompleted,
                  unitCost: record.unitCost,
                  totalCost: record.totalCost,
                  unitMeasurement: record.unitMeasurement
               });
            }
        });

        const tableData = allWorkers.map(wr => {
            const pct3H = wr.triHourlyQuota && wr.triHourlyQuota > 0 ? Math.round(((wr.triHourlyCompleted || 0) / wr.triHourlyQuota) * 100) : 0;
            const pctDaily = wr.dailyQuota && wr.dailyQuota > 0 ? Math.round(((wr.dailyCompleted || wr.actuallyCompleted || 0) / wr.dailyQuota) * 100) : 0;
            const pctMonthly = wr.monthlyQuota && wr.monthlyQuota > 0 ? Math.round(((wr.monthlyCompleted || 0) / wr.monthlyQuota) * 100) : 0;

            const unit = wr.unitMeasurement || '';
            const str3H = wr.triHourlyQuota ? `${wr.triHourlyCompleted || 0}/${wr.triHourlyQuota} ${unit}\n(${pct3H}%)` : '-';
            const strDaily = wr.dailyQuota ? `${wr.dailyCompleted || wr.actuallyCompleted || 0}/${wr.dailyQuota} ${unit}\n(${pctDaily}%)` : '-';
            const strMonthly = wr.monthlyQuota ? `${wr.monthlyCompleted || 0}/${wr.monthlyQuota} ${unit}\n(${pctMonthly}%)` : '-';

            return [
                wr.date,
                `${wr.workerName}\n(${wr.workerId})`,
                `${wr.project}\n${wr.task}`,
                str3H,
                strDaily,
                strMonthly,
                `SAR ${wr.totalCost}`
            ];
        });

        applyAutoTable(doc, {
            startY: y,
            head: [['Date', 'Personnel', 'Project/Task', '3H Progress', 'Daily Progress', 'Monthly Progress', 'Total Cost']],
            body: tableData,
            styles: { fontSize: 8 },
        });

        const finalY = (doc as any).lastAutoTable.finalY + 20;
        doc.text('Department Head Authorization: _________________________', 14, finalY);

        doc.save('Department_Workers_Productivity.pdf');
    });
  };

  const toggleSelectAll = () => {
    if (selectedRecordIds.length === filteredRecords.length && filteredRecords.length > 0) {
      setSelectedRecordIds([]);
    } else {
      setSelectedRecordIds(filteredRecords.map(r => r.id));
    }
  };

  const handlePrintSheet = (record: DailyOutputRec) => {
    import('../lib/pdfUtils').then(({ generateStandardPDF, applyAutoTable }) => {
        const { doc, startY } = generateStandardPDF(`PRODUCTIVITY SHEET: ${record.id}`, company || {});
        let y = startY;
        
        doc.setFontSize(10);
        doc.text(`Date: ${record.date}`, 14, y); y += 6;
        doc.text(`Project: ${record.projectName}`, 14, y); y += 6;
        doc.text(`Task: ${record.taskDescription}`, 14, y); y += 12;

        const tableData = (record.workerRecords || []).map(wr => {
            const pct3H = wr.triHourlyQuota && wr.triHourlyQuota > 0 ? Math.round(((wr.triHourlyCompleted || 0) / wr.triHourlyQuota) * 100) : 0;
            const pctDaily = wr.dailyQuota && wr.dailyQuota > 0 ? Math.round(((wr.dailyCompleted || 0) / wr.dailyQuota) * 100) : 0;
            const pctMonthly = wr.monthlyQuota && wr.monthlyQuota > 0 ? Math.round(((wr.monthlyCompleted || 0) / wr.monthlyQuota) * 100) : 0;

            const unit = record.unitMeasurement || '';
            const str3H = wr.triHourlyQuota ? `${wr.triHourlyCompleted || 0}/${wr.triHourlyQuota} ${unit}\n(${pct3H}%)` : '-';
            const strDaily = wr.dailyQuota ? `${wr.dailyCompleted || 0}/${wr.dailyQuota} ${unit}\n(${pctDaily}%)` : '-';
            const strMonthly = wr.monthlyQuota ? `${wr.monthlyCompleted || 0}/${wr.monthlyQuota} ${unit}\n(${pctMonthly}%)` : '-';

            return [
                `${wr.workerName}\n(${wr.workerId})`,
                str3H,
                strDaily,
                strMonthly,
                `SAR ${wr.unitCost}`,
                `SAR ${wr.totalCost}`
            ];
        });

        applyAutoTable(doc, {
            startY: y,
            head: [['Personnel', '3H Progress', 'Daily Progress', 'Monthly Progress', 'Unit Cost', 'Total Cost']],
            body: tableData,
            styles: { fontSize: 8 },
        });

        const finalY = (doc as any).lastAutoTable.finalY + 20;
        doc.text(`Total Sheet Cost: SAR ${record.totalCost.toLocaleString()}`, 14, finalY);
        doc.text('Supervisor Authorization: _________________________', 14, finalY + 20);
        
        doc.save(`Productivity_Sheet_${record.id}.pdf`);
    });
  };

  return (
    <div className="p-8 pb-32">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2 flex items-center gap-3">
            <Hammer className="w-8 h-8 text-red-600" />
            Daily Output & Productivity
          </h2>
          <p className="text-slate-500 font-medium">Monitor worker quotas, track task completion percentages, and analyze productivity costs.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-red-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search records..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none w-64 transition-all"
            />
          </div>
          <button className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors bg-white shadow-sm">
            <Filter className="w-5 h-5" />
          </button>
          <button 
            onClick={handlePrintAll}
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors bg-white shadow-sm"
            title={selectedRecordIds.length > 0 ? `Print Summary (${selectedRecordIds.length} selected)` : 'Print Summary (All Filtered)'}
          >
            <Printer className="w-5 h-5" />
          </button>
          <button 
            onClick={handlePrintDepartment}
            className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors bg-white shadow-sm flex items-center gap-2"
            title={selectedRecordIds.length > 0 ? `Print Dept. Workers (${selectedRecordIds.length} selected)` : 'Print Dept. Workers (All Filtered)'}
          >
            <Printer className="w-4 h-4" />
            <span className="text-sm font-semibold hidden md:block">Print Dept. Workers</span>
          </button>
          <button 
            onClick={openAddModal}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors shadow-md shadow-red-100 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Output Record
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-600 uppercase tracking-widest text-xs">Total Records</h3>
            <div className="p-2 bg-red-50 rounded-lg text-red-600">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{records.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-600 uppercase tracking-widest text-xs">Avg Completion</h3>
            <div className="p-2 bg-green-50 rounded-lg text-green-600">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900">
            {records.length > 0 
              ? Math.round((records.reduce((acc, r) => {
                  const totalDailyQuota = r.workerRecords?.reduce((sum, wr) => sum + (wr.dailyQuota || r.dailyQuota), 0) || (r.dailyQuota * (r.workerRecords?.length || r.workerIds?.length || 1));
                  return acc + (totalDailyQuota > 0 ? (r.actuallyCompleted / totalDailyQuota) : 0);
                }, 0) / records.length) * 100)
              : 0}%
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-auto resize-y">
        <div className="overflow-x-auto">
          <div className="overflow-x-auto w-full min-w-full"><div className="min-w-max">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="p-4 w-12 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">
                  <input 
                    type="checkbox"
                    checked={selectedRecordIds.length > 0 && selectedRecordIds.length === filteredRecords.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Date & Project</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Worker</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Task & Quota</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Completion</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Cost</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((record) => {
                const totalDailyQuota = record.workerRecords?.reduce((sum, wr) => sum + (wr.dailyQuota || record.dailyQuota), 0) || (record.dailyQuota * (record.workerIds?.length || 1));
                const total3HQuota = record.workerRecords?.reduce((sum, wr) => sum + (wr.triHourlyQuota || record.triHourlyQuota || 0), 0) || ((record.triHourlyQuota || 0) * (record.workerIds?.length || 1));
                const totalMonthlyQuota = record.workerRecords?.reduce((sum, wr) => sum + (wr.monthlyQuota || record.monthlyQuota || 0), 0) || ((record.monthlyQuota || 0) * (record.workerIds?.length || 1));

                const completionPct = totalDailyQuota > 0 ? Math.round((record.actuallyCompleted / totalDailyQuota) * 100) : 0;
                const nonCompletionPct = 100 - completionPct;
                return (
                  <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-center">
                      <input 
                        type="checkbox"
                        checked={selectedRecordIds.includes(record.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedRecordIds([...selectedRecordIds, record.id]);
                          else setSelectedRecordIds(selectedRecordIds.filter(id => id !== record.id));
                        }}
                        className="rounded border-slate-300 w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-900">{record.projectName}</div>
                      <div className="text-sm text-slate-500">{record.date}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <UserCircle className="w-4 h-4 text-slate-400" />
                        <div className="font-medium text-slate-900">{record.workerName}</div>
                      </div>
                      <div className="text-xs text-slate-500" title={record.workerNames?.join(', ')}>{record.workerId} {record.workerIds && record.workerIds.length > 1 && `(${record.workerIds.length} workers)`}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-900">{record.taskDescription}</div>
                      <div className="text-sm text-slate-600">
                        Total Daily Req: {totalDailyQuota} {record.unitMeasurement}
                        {total3HQuota > 0 ? <><br/><span className="text-slate-400 text-xs text-nowrap">3H: {total3HQuota}</span></> : null}
                        {totalMonthlyQuota > 0 ? <><br/><span className="text-slate-400 text-xs text-nowrap">Mo: {totalMonthlyQuota}</span></> : null}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex gap-2 items-center text-sm">
                          <span className={completionPct >= 100 ? 'text-green-600 font-bold' : 'text-slate-700'}>
                            {record.actuallyCompleted} / {totalDailyQuota} {record.unitMeasurement}
                          </span>
                        </div>
                        <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden flex">
                          <div 
                            className="bg-green-500 h-full" 
                            style={{ width: `${Math.min(completionPct, 100)}%` }}
                          />
                          {completionPct < 100 && (
                            <div 
                              className="bg-red-400 h-full" 
                              style={{ width: `${Math.max(0, nonCompletionPct)}%` }}
                            />
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {completionPct}% achieved {completionPct < 100 && `(${nonCompletionPct}% missing)`}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-bold text-slate-900">SAR {record.totalCost.toLocaleString()}</div>
                      <div className="text-xs text-slate-500">
                        {record.workerRecords && record.workerRecords.length > 1 ? '@ Varies / unit' : `@ ${record.workerRecords?.[0]?.unitCost || record.unitCost} / unit`}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handlePrintSheet(record)}
                          className="text-slate-400 hover:text-slate-600 transition-colors"
                          title="Print productivity sheet"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(record)}
                          className="text-slate-400 hover:text-red-600 transition-colors"
                          title="Edit productivity sheet"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="text-slate-400 hover:text-red-600 transition-colors"
                          title="Delete productivity sheet"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No productivity records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div></div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh] mt-10 max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">{editingRecordId ? 'Edit Daily Output' : 'Add Daily Output'}</h3>
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Log Worker Productivity Quota</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="outputForm" onSubmit={handleSubmit} className="space-y-6 overflow-y-auto min-h-0 flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Date</label>
                    <input 
                      type="date"
                      required
                      value={formData.date || ''}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Project</label>
                    <select
                      required
                      value={formData.projectId || ''}
                      onChange={(e) => {
                        const proj = projects.find(p => p.id === e.target.value);
                        setFormData({
                          ...formData, 
                          projectId: proj?.id || '', 
                          projectName: proj?.name || '',
                          taskDescription: '',
                          unitMeasurement: '',
                          unitCost: 0,
                          dailyQuota: 0
                        });
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                    >
                      <option value="">Select a Project...</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Workers (Select Multiple)</label>
                    <select
                      multiple
                      required
                      value={selectedWorkerIds}
                      onChange={(e) => {
                        const options = Array.from(e.target.selectedOptions as HTMLCollectionOf<HTMLOptionElement>).map(option => option.value);
                        setSelectedWorkerIds(options);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none h-32"
                    >
                      {workers
                        .filter(w => !formData.projectId || w.projectId === formData.projectId)
                        .map(w => (
                          <option key={w.id} value={w.id}>{w.name} ({w.role})</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400">Hold Ctrl/Cmd to select multiple. Current: {selectedWorkerIds.length}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Task Description</label>
                    <select 
                      required
                      value={formData.taskDescription || ''}
                      onChange={(e) => {
                        const p = projects.find(p => p.id === formData.projectId);
                        const metric = p?.productivityMetrics?.find(m => m.targetTask === e.target.value);
                        if (metric) {
                          setFormData({
                            ...formData, 
                            taskDescription: e.target.value,
                            unitMeasurement: metric.unitMeasurement,
                            unitCost: metric.defaultUnitCost,
                            dailyQuota: metric.defaultDailyQuota
                          });
                        } else {
                          setFormData({
                            ...formData,
                            taskDescription: e.target.value,
                          });
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                    >
                      <option value="">Select Task...</option>
                      {projects.find(p => p.id === formData.projectId)?.productivityMetrics?.map(m => (
                        <option key={m.id} value={m.targetTask}>{m.targetTask}</option>
                      ))}
                      <option value="Custom Task">Other / Custom Task</option>
                    </select>
                    {formData.taskDescription === 'Custom Task' && (
                      <input 
                        type="text"
                        placeholder="Describe custom task..."
                        onChange={(e) => setFormData({...formData, taskDescription: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm mt-2 focus:ring-1 focus:ring-red-500 outline-none"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Unit of Measurement</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Square Meters, kg, Pieces"
                      value={formData.unitMeasurement || ''}
                      onChange={(e) => setFormData({...formData, unitMeasurement: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Unit Cost (SAR)</label>
                    <input 
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={formData.unitCost || ''}
                      onChange={(e) => setFormData({...formData, unitCost: Number(e.target.value)})}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                    />
                  </div>

                  <div className="col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 border border-slate-200 rounded-lg">
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest block h-8">3-Hour Quota (Per Emp)</label>
                      <input 
                        type="number"
                        min="0"
                        value={formData.triHourlyQuota || ''}
                        onChange={(e) => setFormData({...formData, triHourlyQuota: Number(e.target.value)})}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                      />
                      <p className="text-[9px] text-slate-500 font-bold">Total: {(Number(formData.triHourlyQuota) || 0) * Math.max(1, selectedWorkerIds.length)}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest block h-8">Daily Quota (Per Emp)</label>
                      <input 
                        type="number"
                        required
                        min="0"
                        value={formData.dailyQuota || ''}
                        onChange={(e) => setFormData({...formData, dailyQuota: Number(e.target.value)})}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                      />
                      <p className="text-[9px] text-slate-500 font-bold">Total: {(Number(formData.dailyQuota) || 0) * Math.max(1, selectedWorkerIds.length)}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest block h-8">Weekly Quota (Per Emp)</label>
                      <input 
                        type="number"
                        min="0"
                        value={formData.weeklyQuota || ''}
                        onChange={(e) => setFormData({...formData, weeklyQuota: Number(e.target.value)})}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                      />
                      <p className="text-[9px] text-slate-500 font-bold">Total: {(Number(formData.weeklyQuota) || 0) * Math.max(1, selectedWorkerIds.length)}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest block h-8">Monthly Quota (Per Emp)</label>
                      <input 
                        type="number"
                        min="0"
                        value={formData.monthlyQuota || ''}
                        onChange={(e) => setFormData({...formData, monthlyQuota: Number(e.target.value)})}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                      />
                      <p className="text-[9px] text-slate-500 font-bold">Total: {(Number(formData.monthlyQuota) || 0) * Math.max(1, selectedWorkerIds.length)}</p>
                    </div>
                  </div>

                  <div className="col-span-2 space-y-4">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block border-b border-slate-200 pb-2">Worker Outputs & Costs</label>
                    {formData.workerRecords && formData.workerRecords.length > 0 ? (
                      <div className="space-y-3">
                        {formData.workerRecords.map(wr => {
                          const complete3H = wr.triHourlyQuota && wr.triHourlyQuota > 0 ? Math.round(((wr.triHourlyCompleted || 0) / wr.triHourlyQuota) * 100) : 0;
                          const completeDaily = wr.dailyQuota && wr.dailyQuota > 0 ? Math.round(((wr.dailyCompleted || 0) / wr.dailyQuota) * 100) : 0;
                          const completeMonthly = wr.monthlyQuota && wr.monthlyQuota > 0 ? Math.round(((wr.monthlyCompleted || 0) / wr.monthlyQuota) * 100) : 0;

                          return (
                          <div key={wr.workerId} className="flex flex-col gap-3 bg-white p-4 rounded border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                              <div>
                                <p className="text-sm font-bold text-slate-800">{wr.workerName}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{wr.workerId}</p>
                              </div>
                              <div className="text-right flex items-center gap-4">
                                <div>
                                  <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Unit Cost</label>
                                  <input 
                                    type="number" min="0" step="0.01" required
                                    value={wr.unitCost !== undefined ? wr.unitCost : (formData.unitCost || 0)}
                                    onChange={e => handleWorkerRecordChange(wr.workerId, 'unitCost', Number(e.target.value))}
                                    className="w-20 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-red-500 outline-none text-right"
                                  />
                                </div>
                                <div>
                                  <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Total</label>
                                  <p className="text-sm font-bold text-red-600">SAR {wr.totalCost || 0}</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4">
                              {/* 3-Hour Productivity */}
                              <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest block mb-2">3-Hour</label>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <span className="text-[8px] text-slate-400 block mb-1">Quota</span>
                                    <input type="number" min="0" value={wr.triHourlyQuota || ''} onChange={e => handleWorkerRecordChange(wr.workerId, 'triHourlyQuota', Number(e.target.value))} className="w-full border border-slate-200 rounded px-2 py-1 text-xs" />
                                  </div>
                                  <div>
                                    <span className="text-[8px] text-slate-400 block mb-1">Completed</span>
                                    <input type="number" min="0" value={wr.triHourlyCompleted || ''} onChange={e => handleWorkerRecordChange(wr.workerId, 'triHourlyCompleted', Number(e.target.value))} className="w-full border border-slate-200 rounded px-2 py-1 text-xs" />
                                  </div>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-slate-500">
                                  <span>Progress</span>
                                  <span className={complete3H >= 100 ? 'text-green-600' : ''}>{complete3H}%</span>
                                </div>
                              </div>
                              
                              {/* Daily Productivity */}
                              <div className="bg-red-50/50 p-2 rounded border border-red-100">
                                <label className="text-[9px] font-bold text-red-800 uppercase tracking-widest block mb-2">Daily (Primary)</label>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <span className="text-[8px] text-red-400 block mb-1">Quota</span>
                                    <input type="number" min="0" value={wr.dailyQuota || ''} onChange={e => handleWorkerRecordChange(wr.workerId, 'dailyQuota', Number(e.target.value))} className="w-full border border-red-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-red-500 outline-none" />
                                  </div>
                                  <div>
                                    <span className="text-[8px] text-red-400 block mb-1">Completed</span>
                                    <input type="number" min="0" value={wr.dailyCompleted || ''} onChange={e => handleWorkerRecordChange(wr.workerId, 'dailyCompleted', Number(e.target.value))} className="w-full border border-red-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-red-500 outline-none" />
                                  </div>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-red-800">
                                  <span>Progress</span>
                                  <span className={completeDaily >= 100 ? 'text-green-600' : ''}>{completeDaily}%</span>
                                </div>
                              </div>

                              {/* Monthly Productivity */}
                              <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest block mb-2">Monthly</label>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <span className="text-[8px] text-slate-400 block mb-1">Quota</span>
                                    <input type="number" min="0" value={wr.monthlyQuota || ''} onChange={e => handleWorkerRecordChange(wr.workerId, 'monthlyQuota', Number(e.target.value))} className="w-full border border-slate-200 rounded px-2 py-1 text-xs" />
                                  </div>
                                  <div>
                                    <span className="text-[8px] text-slate-400 block mb-1">Completed</span>
                                    <input type="number" min="0" value={wr.monthlyCompleted || ''} onChange={e => handleWorkerRecordChange(wr.workerId, 'monthlyCompleted', Number(e.target.value))} className="w-full border border-slate-200 rounded px-2 py-1 text-xs" />
                                  </div>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-slate-500">
                                  <span>Progress</span>
                                  <span className={completeMonthly >= 100 ? 'text-green-600' : ''}>{completeMonthly}%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )})}
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 text-center text-slate-500 text-sm rounded border border-slate-200 border-dashed">
                        Select at least one worker above to configure outputs.
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 col-span-2">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Additional Notes</label>
                    <textarea 
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none h-20"
                    />
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 border border-slate-200 rounded text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-colors"
                >
                Cancel
              </button>
              <button 
                type="submit"
                form="outputForm"
                className="px-6 py-2 bg-red-600 text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-colors shadow-md shadow-red-100"
              >
                Save Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
