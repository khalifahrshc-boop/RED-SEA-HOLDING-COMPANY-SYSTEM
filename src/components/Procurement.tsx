import React from 'react';
import { 
  FileText, 
  ShoppingCart, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Download, 
  Printer, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  X,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Package,
  Truck
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/src/lib/utils';
import { PriceQuote, PurchaseOrder, QuoteItem, Project } from '@/src/types';
import { useTranslation, Language } from '../lib/translations';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const dummyQuotes: PriceQuote[] = [
  {
    id: 'PQ-2024-001',
    projectId: 'P1',
    vendorName: 'Binladin Group',
    date: '2024-03-15',
    totalAmount: 1250000,
    status: 'Approved',
    items: [
      { id: '1', description: 'Structural Steel', quantity: 50, unitPrice: 20000, total: 1000000 },
      { id: '2', description: 'Concrete Reinforcement', quantity: 200, unitPrice: 1250, total: 250000 }
    ]
  },
  {
    id: 'PQ-2024-002',
    projectId: 'P2',
    vendorName: 'Al-Rashid Trading',
    date: '2024-03-18',
    totalAmount: 450000,
    status: 'Draft',
    items: [
      { id: '1', description: 'Electrical Converters', quantity: 15, unitPrice: 30000, total: 450000 }
    ]
  },
  {
    id: 'PQ-2024-003',
    projectId: 'P1',
    vendorName: 'Global Concrete',
    date: '2024-04-05',
    totalAmount: 150000,
    status: 'Internal Review',
    items: [{ id: '1', description: 'Concrete Mix', quantity: 100, unitPrice: 1500, total: 150000 }]
  }
];

const dummyPOs: PurchaseOrder[] = [
  {
    id: 'PO-2024-001',
    quoteId: 'PQ-2024-001',
    projectId: 'P1',
    vendorName: 'Binladin Group',
    date: '2024-03-20',
    totalAmount: 1250000,
    status: 'Issued',
    items: [
      { id: '1', description: 'Structural Steel', quantity: 50, unitPrice: 20000, total: 1000000 },
      { id: '2', description: 'Concrete Reinforcement', quantity: 200, unitPrice: 1250, total: 250000 }
    ]
  }
];

import { useLocalStorage } from '../hooks/useLocalStorage';

import { notificationService } from '../lib/notificationService';

interface ProcurementProps {
  projects: Project[];
  language: Language;
  onUpdateProject: (p: Project) => void;
  company?: any;
}

export function Procurement({ projects, language, onUpdateProject, company }: ProcurementProps) {
  const { t, d } = useTranslation(language);
  const [activeTab, setActiveTab] = React.useState<'quotes' | 'pos'>('quotes');
  const [quotes, setQuotes] = useLocalStorage<PriceQuote[]>('ares_quotes', dummyQuotes);
  const [pos, setPos] = useLocalStorage<PurchaseOrder[]>('ares_pos', dummyPOs);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [currentItem, setCurrentItem] = React.useState<any>(null);

  const handleApproval = (id: string, type: 'quote' | 'po', nextStatus: any) => {
    if (type === 'quote') {
      setQuotes(prev => prev.map(q => {
        if (q.id === id) {
          notificationService.send({
            type: nextStatus === 'Approved' ? 'Success' : 'Request',
            title: `Quote ${id}: ${nextStatus}`,
            message: `Quote from ${q.vendorName} is now ${nextStatus}. Value: ${formatCurrency(q.totalAmount)}`,
            department: nextStatus === 'Internal Review' ? 'Procurement' : 
                       nextStatus === 'Awaiting Finance' ? 'Finance' : 
                       nextStatus === 'Approved' ? 'Administrator' : 'All',
            relatedId: id,
            relatedType: 'procurement'
          });
          return { ...q, status: nextStatus };
        }
        return q;
      }));
    } else {
      setPos(prev => prev.map(p => {
        if (p.id === id) {
          notificationService.send({
            type: nextStatus === 'Issued' ? 'Success' : 'Request',
            title: `PO ${id}: ${nextStatus}`,
            message: `Purchase Order for ${p.vendorName} is now ${nextStatus}. Total: ${formatCurrency(p.totalAmount)}`,
            department: nextStatus === 'Awaiting Issuance' ? 'Administrator' : 'All',
            relatedId: id,
            relatedType: 'procurement'
          });
          return { ...p, status: nextStatus };
        }
        return p;
      }));
    }
  };

  const filteredQuotes = quotes.filter(q => 
    (q.id || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
    (q.vendorName || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  const filteredPOs = pos.filter(p => 
    (p.id || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
    (p.vendorName || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  const handleDelete = (id: string, type: 'quote' | 'po') => {
    if (window.confirm(`Are you sure you want to delete this ${type === 'quote' ? 'quote' : 'purchase order'}?`)) {
      if (type === 'quote') {
        setQuotes(quotes.filter(q => q.id !== id));
      } else {
        setPos(pos.filter(p => p.id !== id));
      }
    }
  };

  const handlePrint = (item: any) => {
    import('../lib/pdfUtils').then(({ generateStandardPDF, applyAutoTable }) => {
      const docType = activeTab === 'quotes' ? 'PRICE QUOTE' : 'PURCHASE ORDER';
      const { doc, startY } = generateStandardPDF(`${docType}: ${item.id}`, company || {});
      
      let y = startY;
      
      doc.text(`Reference ID: ${item.id}`, 14, y); y += 8;
      doc.text(`Date: ${item.date}`, 14, y += 8);
      doc.text(`Vendor: ${item.vendorName}`, 14, y += 8);
      doc.text(`Project Node: ${item.projectId}`, 14, y += 8);
      doc.text(`Status: ${item.status}`, 14, y += 8);
      
      if (item.quoteId) {
        doc.text(`Linked Quote: ${item.quoteId}`, 14, y += 8);
      }
      y += 6;

      if (item.items && item.items.length > 0) {
        const tableData = item.items.map((i: any) => [
          i.description,
          i.quantity,
          `SAR ${i.unitPrice?.toLocaleString()}`,
          `SAR ${i.total?.toLocaleString()}`
        ]);
        applyAutoTable(doc, {
          head: [['Description', 'Quantity', 'Unit Price', 'Total']],
          body: tableData,
          startY: y,
        });
        y = (doc as any).lastAutoTable.finalY + 12;
      }
      
      doc.setFont("courier", "bold");
      doc.text(`Total Value: SAR ${item.totalAmount?.toLocaleString()}`, 14, y);

      doc.setFontSize(8);
      doc.setFont("courier", "italic");
      doc.text(company?.footerText || `This is an automatically generated system ${(docType || '').toLowerCase()}.`, 14, y + 20);
      
      doc.save(`${item.id}_${docType.replace(/ /g, '_')}.pdf`);
    });
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Automatically retrieve the linked quote if selected 
    const quoteId = formData.get('quoteId') as string;
    let autoItems = currentItem?.items || [];
    let autoAmount = Number(formData.get('totalAmount'));
    
    if (activeTab === 'pos' && quoteId && !isEditMode) {
      const linkedQuote = quotes.find(q => q.id === quoteId);
      if (linkedQuote) {
        autoItems = linkedQuote.items;
        autoAmount = linkedQuote.totalAmount;
      }
    }

    const newItem = {
      id: isEditMode ? currentItem.id : (activeTab === 'quotes' ? `PQ-${new Date().getFullYear()}-${String(quotes.length + 1).padStart(3, '0')}` : `PO-${new Date().getFullYear()}-${String(pos.length + 1).padStart(3, '0')}`),
      projectId: formData.get('projectId') as string,
      vendorName: formData.get('vendorName') as string,
      date: formData.get('date') as string,
      totalAmount: autoAmount,
      status: formData.get('status') as any,
      items: autoItems,
      quoteId: quoteId || undefined,
    };

    if (activeTab === 'quotes') {
      if (isEditMode) {
        setQuotes(quotes.map(q => q.id === newItem.id ? newItem as PriceQuote : q));
      } else {
        setQuotes([...quotes, newItem as PriceQuote]);
      }
    } else {
      if (isEditMode) {
        setPos(pos.map(p => p.id === newItem.id ? newItem as PurchaseOrder : p));
      } else {
        setPos([...pos, newItem as PurchaseOrder]);
      }
    }
    setIsModalOpen(false);
    setIsEditMode(false);
    setCurrentItem(null);
  };

  const openForm = (item: any = null) => {
    if (item) {
      setIsEditMode(true);
      setCurrentItem(item);
    } else {
      setIsEditMode(false);
      setCurrentItem(null);
    }
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">{t.procurement}</h2>
          <p className="text-slate-500 text-sm italic font-medium">Managing strategic procurement and vendor commitments.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {
               if (activeTab === 'quotes') {
                 setQuotes(prev => prev.map(q => {
                   if (q.status === 'Draft') return { ...q, status: 'Internal Review' };
                   if (q.status === 'Internal Review') return { ...q, status: 'Awaiting Finance' };
                   if (q.status === 'Awaiting Finance') return { ...q, status: 'Approved' };
                   return q;
                 }));
               } else {
                 setPos(prev => prev.map(p => {
                   if (p.status === 'Draft') return { ...p, status: 'Awaiting Issuance' };
                   if (p.status === 'Awaiting Issuance') return { ...p, status: 'Issued' };
                   return p;
                 }));
               }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-emerald-700 transition-all active:scale-95"
          >
            <CheckCircle2 className="w-3 h-3" />
            Bulk Process Workflow
          </button>
          <button 
            onClick={() => openForm()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md text-xs font-bold uppercase tracking-widest shadow-lg hover:bg-black transition-all active:scale-95"
          >
            <Plus className="w-3 h-3" />
            {activeTab === 'quotes' ? 'New Price Quote' : 'Generate Purchase Order'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-slate-100">
        <button
          onClick={() => setActiveTab('quotes')}
          className={cn(
            "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all relative flex items-center gap-2",
            activeTab === 'quotes' ? "text-red-600" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <FileText className="w-4 h-4" />
          {activeTab === 'quotes' ? t.projects_view.resources : t.procurement}
          {activeTab === 'quotes' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]" />}
        </button>
        <button
          onClick={() => setActiveTab('pos')}
          className={cn(
            "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all relative flex items-center gap-2",
            activeTab === 'pos' ? "text-red-600" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <ShoppingCart className="w-4 h-4" />
          Purchase Orders
          {activeTab === 'pos' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]" />}
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by ID or Vendor..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-red-500 transition-all font-medium"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-red-600 transition-colors">
            <Filter className="w-4 h-4" />
          </button>
          <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-red-600 transition-colors">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="glass-panel bg-white border border-slate-200 overflow-x-auto rounded-xl">
        <div className="overflow-x-auto w-full min-w-full"><div className="min-w-max">
          <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descriptor</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vendor</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Project</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quantum</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(activeTab === 'quotes' ? filteredQuotes : filteredPOs).map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div>
                    <p className="text-xs font-mono font-bold text-slate-900">{item.id}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{formatDate(item.date)}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs font-bold text-slate-700">{item.vendorName}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[10px] font-bold py-1 px-2 bg-slate-100 text-slate-600 rounded">
                    {item.projectId}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs font-mono font-bold text-slate-900">{formatCurrency(item.totalAmount)}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                    item.status === 'Approved' || item.status === 'Issued' ? "bg-emerald-500 text-white border-emerald-600" :
                    item.status === 'Internal Review' || item.status === 'Awaiting Issuance' ? "bg-red-500 text-white border-red-600" :
                    item.status === 'Awaiting Finance' ? "bg-amber-500 text-white border-amber-600" :
                    item.status === 'Draft' ? "bg-slate-100 text-slate-500 border-slate-200" :
                    "bg-slate-50 text-slate-600 border-slate-200"
                  )}>
                    {item.status === 'Approved' || item.status === 'Issued' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {d(item.status)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {activeTab === 'quotes' && (
                       <>
                        {item.status === 'Draft' && (
                          <button 
                            onClick={() => handleApproval(item.id, 'quote', 'Internal Review')}
                            className="px-2 py-1 bg-red-50 text-red-700 rounded text-[9px] font-bold uppercase tracking-widest hover:bg-red-100"
                          >
                            Proc. Review
                          </button>
                        )}
                        {item.status === 'Internal Review' && (
                          <button 
                            onClick={() => handleApproval(item.id, 'quote', 'Awaiting Finance')}
                            className="px-2 py-1 bg-amber-50 text-amber-700 rounded text-[9px] font-bold uppercase tracking-widest hover:bg-amber-100"
                          >
                            Finance Check
                          </button>
                        )}
                        {item.status === 'Awaiting Finance' && (
                          <button 
                            onClick={() => handleApproval(item.id, 'quote', 'Approved')}
                            className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-[9px] font-bold uppercase tracking-widest hover:bg-emerald-100"
                          >
                            Official Appr.
                          </button>
                        )}
                       </>
                    )}
                    {activeTab === 'pos' && (
                       <>
                        {item.status === 'Draft' && (
                          <button 
                            onClick={() => handleApproval(item.id, 'po', 'Awaiting Issuance')}
                            className="px-2 py-1 bg-red-50 text-red-700 rounded text-[9px] font-bold uppercase tracking-widest hover:bg-red-100"
                          >
                            Manager Clear
                          </button>
                        )}
                        {item.status === 'Awaiting Issuance' && (
                          <button 
                            onClick={() => handleApproval(item.id, 'po', 'Issued')}
                            className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-[9px] font-bold uppercase tracking-widest hover:bg-emerald-100"
                          >
                            Dispatch PO
                          </button>
                        )}
                       </>
                    )}
                    <button 
                      onClick={() => handlePrint(item)}
                      className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors"
                      title="Print Matrix"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => openForm(item)}
                      className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                      title="Edit Parameters"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id, activeTab === 'quotes' ? 'quote' : 'po')}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Deactivate Node"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div></div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 font-mono">
                {isEditMode ? 'Modify Matrix' : 'Initialize Request'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto min-h-0 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Project Association</label>
                  <select 
                    name="projectId" 
                    defaultValue={currentItem?.projectId}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500 transition-all font-medium"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.id} - {p.name}</option>
                    ))}
                  </select>
                </div>
                
                {activeTab === 'pos' && (
                  <div className="col-span-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Link to Price Quote (Optional)</label>
                    <select 
                      name="quoteId" 
                      defaultValue={currentItem?.quoteId || ''}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500 transition-all font-medium"
                    >
                      <option value="">None</option>
                      {quotes.filter(q => q.status === 'Approved').map(q => (
                        <option key={q.id} value={q.id}>{q.id} - {q.vendorName} (SAR {q.totalAmount.toLocaleString()})</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div className="col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Strategic Vendor</label>
                  <input 
                    name="vendorName"
                    defaultValue={currentItem?.vendorName}
                    placeholder="Enter vendor identity..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500 transition-all font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Timeline Date</label>
                  <input 
                    type="date"
                    name="date"
                    defaultValue={currentItem?.date || new Date().toISOString().split('T')[0]}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500 transition-all font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Total Quantum (SAR)</label>
                  <input 
                    type="number"
                    name="totalAmount"
                    defaultValue={currentItem?.totalAmount}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500 transition-all font-medium font-mono"
                    required
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Operational Status</label>
                  <select 
                    name="status"
                    defaultValue={currentItem?.status || (activeTab === 'quotes' ? 'Draft' : 'Draft')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500 transition-all font-medium"
                  >
                    {activeTab === 'quotes' ? (
                      <>
                        <option value="Draft">Draft</option>
                        <option value="Internal Review">Internal Review</option>
                        <option value="Awaiting Finance">Awaiting Finance</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </>
                    ) : (
                      <>
                        <option value="Draft">Draft</option>
                        <option value="Awaiting Issuance">Awaiting Issuance</option>
                        <option value="Issued">Issued</option>
                        <option value="Received">Received</option>
                        <option value="Cancelled">Cancelled</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Abort
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg hover:bg-black transition-all active:scale-95"
                >
                  Commit Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
