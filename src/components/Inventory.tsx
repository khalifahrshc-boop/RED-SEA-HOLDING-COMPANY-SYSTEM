import React from 'react';
import { 
  Package, 
  Barcode, 
  Wrench, 
  Truck, 
  Monitor, 
  MoreVertical, 
  Plus, 
  Search, 
  FileSpreadsheet, 
  Trash2, 
  Edit3,
  Calendar,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  X,
  History
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/src/lib/utils';
import { Asset, Project } from '@/src/types';
import { useTranslation, Language } from '../lib/translations';
import * as XLSX from 'xlsx';

const initialAssets: Asset[] = [
  { 
    id: '1', 
    referenceNumber: 'HE-CAT-2024-884A', 
    name: 'Caterpillar 320 Excavator', 
    model: '320GC', 
    category: 'Heavy Equipment', 
    ownershipType: 'Owned',
    serialNumber: 'CAT320-X9921',
    acquisitionDate: '2024-01-15',
    condition: 'Mint',
    status: 'Active',
    location: 'NEOM Site B',
    value: 850000
  },
  { 
    id: '2', 
    referenceNumber: 'VH-TOY-2023-112B', 
    name: 'Toyota Hilux 4x4', 
    model: 'Hilux Revo', 
    category: 'Vehicles', 
    ownershipType: 'Owned',
    serialNumber: 'VIN-99212883',
    acquisitionDate: '2023-11-20',
    condition: 'Good',
    status: 'Active',
    location: 'Riyadh Head Office',
    value: 125000
  },
  { 
    id: '3', 
    referenceNumber: 'IT-DEL-2024-005C', 
    name: 'Dell Precision Workstation', 
    model: 'T7920', 
    category: 'IT Assets', 
    ownershipType: 'Rented',
    rentalSource: 'United Rentals Saudi',
    dailyCost: 450,
    serialNumber: 'TAG-882199',
    acquisitionDate: '2024-02-10',
    condition: 'Fair',
    status: 'Under Repair',
    location: 'Project Hub Room 4',
    value: 18500
  }
];

const CAT_PREFIXES = {
  'Heavy Equipment': 'HE',
  'Vehicles': 'VH',
  'Tools': 'TL',
  'IT Assets': 'IT',
  'Other': 'OT'
};

interface InventoryProps {
  language: Language;
  projects: Project[];
  onUpdateProject: (p: Project) => void;
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  company?: any;
}

export function Inventory({ language, projects, onUpdateProject, assets, setAssets }: InventoryProps) {
  const { t, d } = useTranslation(language);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingAsset, setEditingAsset] = React.useState<Asset | null>(null);
  const [ownership, setOwnership] = React.useState<'Owned' | 'Rented'>(editingAsset?.ownershipType || 'Owned');

  React.useEffect(() => {
    if (editingAsset) setOwnership(editingAsset.ownershipType);
    else setOwnership('Owned');
  }, [editingAsset, isModalOpen]);

  const filteredAssets = assets.filter(a => 
    (a.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
    (a.referenceNumber || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (a.model || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  const generateRef = (category: Asset['category'], model: string) => {
    const prefix = CAT_PREFIXES[category] || 'OT';
    const modelShort = model.slice(0, 3).toUpperCase();
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${prefix}-${modelShort}-${year}-${random}`;
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const category = formData.get('category') as Asset['category'];
    const model = formData.get('model') as string;
    const ownershipType = formData.get('ownershipType') as Asset['ownershipType'];
    const projectId = formData.get('projectId') as string;
    const dailyCost = Number(formData.get('dailyCost'));

    const assetData: Asset = {
      id: editingAsset?.id || `${Date.now()}`,
      referenceNumber: editingAsset?.referenceNumber || generateRef(category, model),
      name: formData.get('name') as string,
      model: model,
      category: category,
      ownershipType: ownershipType,
      rentalSource: formData.get('rentalSource') as string,
      dailyCost: dailyCost,
      serialNumber: formData.get('serialNumber') as string,
      acquisitionDate: formData.get('acquisitionDate') as string,
      condition: formData.get('condition') as Asset['condition'],
      status: formData.get('status') as Asset['status'],
      location: formData.get('location') as string,
      value: Number(formData.get('value')),
      projectId: projectId,
      accountingApproved: false,
    };

    if (editingAsset) {
      setAssets(prev => prev.map(a => a.id === editingAsset.id ? assetData : a));
    } else {
      setAssets(prev => [assetData, ...prev]);
      
      // If rented and linked to project, deduct from expenditure budget
      if (ownershipType === 'Rented' && projectId && dailyCost > 0) {
        const project = projects.find(p => p.id === projectId);
        if (project) {
          // Assume 30 day initial booking for deduction or just a base cost
          const initialCost = dailyCost * 30; 
          onUpdateProject({
            ...project,
            expenditureBudget: project.expenditureBudget - initialCost,
            spent: project.spent + initialCost
          });
          console.log(`Deducted ${initialCost} SAR from ${project.name} expenditure budget for rented equipment.`);
        }
      }
    }

    setIsModalOpen(false);
    setEditingAsset(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Verify asset removal from registry?')) {
      setAssets(prev => prev.filter(a => a.id !== id));
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(assets.map(a => ({
      'Reference No': a.referenceNumber,
      'Name': a.name,
      'Model': a.model,
      'Category': a.category,
      'Serial Number': a.serialNumber,
      'Acquisition Date': a.acquisitionDate,
      'Condition': a.condition,
      'Status': a.status,
      'Location': a.location,
      'Value (SAR)': a.value
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory_Ledger");
    XLSX.writeFile(wb, `Asset_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Heavy Equipment': return <Wrench className="w-4 h-4" />;
      case 'Vehicles': return <Truck className="w-4 h-4" />;
      case 'IT Assets': return <Monitor className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">{t.inventory}</h2>
          <p className="text-slate-500 text-sm italic font-medium">Unified Tracking and Asset Node Identification.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
            Export Ledger
          </button>
          <button 
            onClick={() => { setEditingAsset(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md text-xs font-bold uppercase tracking-widest shadow-lg hover:bg-black transition-all active:scale-95"
          >
            <Plus className="w-3 h-3" />
            Register Asset
          </button>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Assets', value: assets.length, icon: Package, color: 'blue' },
          { label: 'Inventory Value', value: formatCurrency(assets.reduce((acc, a) => acc + a.value, 0)), icon: ShieldCheck, color: 'emerald' },
          { label: 'Needs Repair', value: assets.filter(a => a.status === 'Under Repair').length, icon: AlertTriangle, color: 'rose' },
          { label: 'Deployable', value: assets.filter(a => a.status === 'Active').length, icon: History, color: 'blue' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`p-2 bg-${stat.color}-50 text-${stat.color}-600 rounded-lg`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-lg font-mono font-bold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by ID, Model, or Serial Number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500 transition-all"
          />
        </div>
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {filteredAssets.map((asset) => (
          <div key={asset.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-auto resize-y">
            <div className="p-5 border-b border-slate-100 flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 text-slate-400 rounded-lg group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                  {getCategoryIcon(asset.category)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition-colors leading-tight">{d(asset.name)}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{d(asset.category)}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => { setEditingAsset(asset); setIsModalOpen(true); }}
                  className="p-1.5 text-slate-300 hover:text-red-600 transition-colors rounded-md hover:bg-red-50"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
                <button 
                  onClick={() => handleDelete(asset.id)}
                  className="p-1.5 text-slate-300 hover:text-rose-600 transition-colors rounded-md hover:bg-rose-50"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <div className="flex items-center gap-2">
                  <Barcode className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-mono font-bold text-slate-900 uppercase tracking-tight">{asset.referenceNumber}</span>
                </div>
                <span className={cn(
                  "text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter",
                  asset.status === 'Active' ? "bg-emerald-500 text-white" : 
                  asset.status === 'Under Repair' ? "bg-amber-500 text-white" : "bg-slate-400 text-white"
                )}>
                  {d(asset.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Model Node</p>
                  <p className="text-xs font-bold text-slate-800">{asset.model}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">S/N Code</p>
                  <p className="text-xs font-mono font-bold text-slate-600">{asset.serialNumber}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <MapPin className="w-3 h-3" />
                  <span className="font-bold uppercase tracking-wide">{asset.location}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <Calendar className="w-3 h-3" />
                  <span className="font-bold uppercase tracking-wide">Acquired: {formatDate(asset.acquisitionDate)}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <ShieldCheck className="w-3 h-3" />
                  <span className={cn(
                    "font-bold uppercase tracking-wide",
                    asset.condition === 'Mint' ? "text-emerald-600" :
                    asset.condition === 'Good' ? "text-red-600" : "text-amber-600"
                  )}>Condition: {asset.condition}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Asset Value</p>
                  <p className="text-sm font-mono font-bold text-slate-900">{formatCurrency(asset.value)}</p>
                </div>
                <button className="p-2 bg-slate-900 text-white rounded-lg hover:bg-red-600 transition-all shadow-md active:scale-95">
                  <History className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filteredAssets.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center bg-white rounded-xl border border-dashed border-slate-200">
            <Package className="w-12 h-12 text-slate-200 mb-4" />
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No matching assets found in registry</p>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">
                  {editingAsset ? 'Modify Asset Record' : 'Register New Equipment'}
                </h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Enter comprehensive equipment data node.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 overflow-y-auto min-h-0 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Asset Name</label>
                  <input name="name" required defaultValue={editingAsset?.name} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" placeholder="e.g., Cat Excavator 320" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Model Node</label>
                  <input name="model" required defaultValue={editingAsset?.model} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" placeholder="e.g., Ultra-320X" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Category</label>
                  <select name="category" required defaultValue={editingAsset?.category} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none">
                    <option value="Heavy Equipment">Heavy Equipment</option>
                    <option value="Vehicles">Vehicles</option>
                    <option value="Tools">Tools</option>
                    <option value="IT Assets">IT Assets</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Serial Number / VIN</label>
                  <input name="serialNumber" required defaultValue={editingAsset?.serialNumber} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm font-mono focus:ring-1 focus:ring-red-500 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Acquisition Date</label>
                  <input type="date" name="acquisitionDate" required defaultValue={editingAsset?.acquisitionDate} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Condition Tier</label>
                  <select name="condition" required defaultValue={editingAsset?.condition} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none">
                    <option>Mint</option>
                    <option>Good</option>
                    <option>Fair</option>
                    <option>Maintenance Required</option>
                  </select>
                </div>
                <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Ownership Track</label>
                    <select name="ownershipType" required defaultValue={editingAsset?.ownershipType || 'Owned'} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" onChange={(e) => setOwnership(e.target.value as any)}>
                      <option value="Owned">Company Owned</option>
                      <option value="Rented">External Rental</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Project Linkage</label>
                    <select name="projectId" defaultValue={editingAsset?.projectId} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none">
                      <option value="">Standby Pool</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                {ownership === 'Rented' && (
                  <>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Rental Source</label>
                      <input name="rentalSource" required defaultValue={editingAsset?.rentalSource} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" placeholder="Vendor Name" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Daily Rental Cost (SAR)</label>
                      <input name="dailyCost" type="number" required defaultValue={editingAsset?.dailyCost} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm font-mono focus:ring-1 focus:ring-red-500 outline-none" />
                    </div>
                  </>
                )}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Operational Status</label>
                  <select name="status" required defaultValue={editingAsset?.status} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none">
                    <option>Active</option>
                    <option>Under Repair</option>
                    <option>Retired</option>
                    <option>Auctioned</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Asset Value (SAR)</label>
                  <input type="number" name="value" required defaultValue={editingAsset?.value} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm font-mono focus:ring-1 focus:ring-red-500 outline-none" />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Current Location / Node</label>
                  <input name="location" required defaultValue={editingAsset?.location} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" placeholder="e.g., Zone A Central Hub" />
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-slate-900 text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-black shadow-lg">
                  {editingAsset ? 'Update Node' : 'Register Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
