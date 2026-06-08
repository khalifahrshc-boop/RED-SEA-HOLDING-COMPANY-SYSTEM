import React, { useState } from 'react';
import { 
  Building2, 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  Users, 
  Bed, 
  Trash2, 
  Edit3, 
  X,
  CheckCircle2,
  AlertCircle,
  Home,
  MapPin,
  Printer,
  Coffee,
  PackageCheck
} from 'lucide-react';
// ... rest of the imports

// (Assuming this exists from line 22)
import { cn } from '@/src/lib/utils';
import { Accommodation as AccommodationType } from '@/src/types';
import { useTranslation, Language } from '../lib/translations';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useLocalStorage } from '../hooks/useLocalStorage';

// We add the types and initial state for catering
interface FoodInventory {
  id: string;
  item: string;
  category: string;
  quantity: number;
  unit: string;
}

const initialAccommodations: AccommodationType[] = [
  { id: '1', campName: 'East Camp A', roomNumber: '204', capacity: 4, currentOccupancy: 3, status: 'Active' },
  { id: '2', campName: 'West Hub B', roomNumber: '112', capacity: 2, currentOccupancy: 2, status: 'Full' },
  { id: '3', campName: 'North Villa', roomNumber: '05', capacity: 6, currentOccupancy: 2, status: 'Active' },
  { id: '4', campName: 'Staff Residences', roomNumber: 'B2', capacity: 2, currentOccupancy: 1, status: 'Active' },
  { id: '5', campName: 'East Camp A', roomNumber: '205', capacity: 4, currentOccupancy: 0, status: 'Available' },
];

const initialFoodInventory: FoodInventory[] = [
  { id: 'F1', item: 'Rice (Basmati)', category: 'Staples', quantity: 500, unit: 'kg' },
  { id: 'F2', item: 'Chicken (Frozen)', category: 'Meat', quantity: 200, unit: 'kg' },
  { id: 'F3', item: 'Vegetable Oil', category: 'Cooking', quantity: 50, unit: 'Liters' },
];

interface AccommodationProps {
  language: Language;
  company?: any;
}

export function Accommodation({ language, company }: AccommodationProps) {
  const { t, d } = useTranslation(language);
  const [accommodations, setAccommodations] = useLocalStorage<AccommodationType[]>('ares_accommodations', initialAccommodations);
  const [foodInventory, setFoodInventory] = useLocalStorage<FoodInventory[]>('ares_foodInventory', initialFoodInventory);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingAccommodation, setEditingAccommodation] = React.useState<AccommodationType | null>(null);
  const [isFoodModalOpen, setIsFoodModalOpen] = React.useState(false);
  const [editingFood, setEditingFood] = React.useState<FoodInventory | null>(null);
  const [activeTab, setActiveTab] = useState<'housing' | 'catering'>('housing');

  const handleDeleteFood = (id: string) => {
    if (confirm('Verify removal of catering item?')) {
      setFoodInventory(prev => prev.filter(f => f.id !== id));
    }
  };

  const handleSaveFood = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const foodData: FoodInventory = {
      id: editingFood?.id || `F-${Date.now()}`,
      item: formData.get('item') as string,
      category: formData.get('category') as string,
      quantity: Number(formData.get('quantity')),
      unit: formData.get('unit') as string,
    };

    if (editingFood) {
      setFoodInventory(foodInventory.map(f => f.id === editingFood.id ? foodData : f));
    } else {
      setFoodInventory([...foodInventory, foodData]);
    }
    setIsFoodModalOpen(false);
    setEditingFood(null);
  };

  // ... (existing code for housing inside Accommodation component)
  const filteredAccommodations = accommodations.filter(acc => 
    (acc.campName || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
    (acc.roomNumber || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const capacity = Number(formData.get('capacity'));
    const currentOccupancy = Number(formData.get('currentOccupancy'));
    
    let status = 'Active';
    if (currentOccupancy === 0) status = 'Available';
    if (currentOccupancy >= capacity) status = 'Full';

    const accData: AccommodationType = {
      id: editingAccommodation?.id || `ACC-${Date.now()}`,
      campName: formData.get('campName') as string,
      roomNumber: formData.get('roomNumber') as string,
      capacity,
      currentOccupancy,
      status: status,
    };

    if (editingAccommodation) {
      setAccommodations(accommodations.map(a => a.id === editingAccommodation.id ? accData : a));
    } else {
      setAccommodations([...accommodations, accData]);
    }
    setIsModalOpen(false);
    setEditingAccommodation(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Decommission this housing unit?')) {
      setAccommodations(accommodations.filter(a => a.id !== id));
    }
  };

  const handlePrint = () => {
    import('../lib/pdfUtils').then(({ generateStandardPDF, applyAutoTable }) => {
        const { doc, startY } = generateStandardPDF(`${activeTab === 'housing' ? 'HOUSING' : 'CATERING'} LEDGER`, company || {});
        let y = startY;
        
        if (activeTab === 'housing') {
          const tableData = accommodations.map(a => [
            a.campName,
            a.roomNumber,
            `${a.currentOccupancy} / ${a.capacity}`,
            a.status
          ]);
          applyAutoTable(doc, {
            head: [['Camp Name', 'Room', 'Occupancy', 'Status']],
            body: tableData,
            startY: y,
          });
        } else {
          const tableData = foodInventory.map(f => [
            f.id,
            f.item,
            f.category,
            `${f.quantity} ${f.unit}`
          ]);
          applyAutoTable(doc, {
            head: [['Item Code', 'Item Name', 'Category', 'Stock Level']],
            body: tableData,
            startY: y,
          });
        }

        doc.save(`Accommodation_${activeTab}_Matrix.pdf`);
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
           <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">{t.accommodation}</h2>
          <p className="text-slate-500 text-sm italic font-medium">Managing site housing and catering for operational personnel.</p>
        </div>
        
        <div className="flex items-center p-1 bg-slate-200/50 rounded-lg">
          <button 
            onClick={() => setActiveTab('housing')}
            className={cn("px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest transition-all", activeTab === 'housing' ? "bg-white text-red-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
          >
            Housing
          </button>
          <button 
            onClick={() => setActiveTab('catering')}
            className={cn("px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest transition-all", activeTab === 'catering' ? "bg-white text-red-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
          >
            Catering & Meals
          </button>
        </div>
        
        <div className="flex gap-3 print:hidden">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-md text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all"
          >
            <Printer className="w-3 h-3" />
            Print Status
          </button>
          {activeTab === 'housing' ? (
             <button 
              onClick={() => { setEditingAccommodation(null); setIsModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md text-xs font-bold uppercase tracking-widest shadow-lg hover:bg-black transition-all active:scale-95"
            >
              <Plus className="w-3 h-3" />
              Register Unit
            </button>
          ) : (
            <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md text-xs font-bold uppercase tracking-widest shadow-lg hover:bg-red-700 transition">
              <Plus className="w-3 h-3" />
              Add Inventory
            </button>
          )}
        </div>
      </div>

      {activeTab === 'housing' ? (
        <>
          <div className="flex gap-4 print:hidden">
            <div className="flex-1 glass-panel px-4 py-2 rounded-lg flex items-center gap-3 bg-white border border-slate-200 shadow-sm focus-within:ring-1 focus-within:ring-red-500 transition-all">
              <Search className="w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by camp identity or room node..." 
                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400"
              />
            </div>
            <button className="glass-panel p-2 rounded-lg text-slate-600 hover:bg-slate-50 border border-slate-200">
              <Filter className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAccommodations.map((acc) => (
              <div key={acc.id} className="glass-panel bg-white border border-slate-100 p-6 hover:border-red-200 transition-all group relative overflow-auto resize-y">
                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex gap-1">
                    <button 
                      onClick={() => { setEditingAccommodation(acc); setIsModalOpen(true); }}
                      className="p-1.5 bg-white border border-slate-100 rounded text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => handleDelete(acc.id)}
                      className="p-1.5 bg-white border border-slate-100 rounded text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-6">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg",
                    acc.status === 'Available' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                    acc.status === 'Full' ? "bg-rose-50 text-rose-600 border border-rose-100" :
                    "bg-red-50 text-red-600 border border-red-100"
                  )}>
                    <Home className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">{d(acc.campName)}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{t.common.location.split(' ')[0]} {acc.roomNumber}</p>
                  </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div className="flex items-center gap-2 text-slate-500">
                  <Users className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-tighter">Occupancy</span>
                </div>
                <p className="text-sm font-mono font-bold text-slate-900">{acc.currentOccupancy} / {acc.capacity}</p>
              </div>
              
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-700",
                    (acc.currentOccupancy / acc.capacity) >= 1 ? "bg-rose-500" :
                    (acc.currentOccupancy / acc.capacity) >= 0.75 ? "bg-amber-500" :
                    "bg-red-500"
                  )}
                  style={{ width: `${(acc.currentOccupancy / acc.capacity) * 100}%` }}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                 <span className={cn(
                  "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border",
                  acc.status === 'Available' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                  acc.status === 'Full' ? "bg-rose-50 text-rose-700 border-rose-100" :
                  "bg-red-50 text-red-700 border-red-100"
                )}>
                  {d(acc.status)}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Strategic Tier 1 Housing</span>
              </div>
            </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="bg-white border text-left border-slate-200 rounded-lg shadow-sm overflow-auto resize-y">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-tight">
              <Coffee className="w-4 h-4" /> Food & Catering Resources
            </h3>
            <button 
              onClick={() => { setEditingFood(null); setIsFoodModalOpen(true); }}
              className="px-4 py-2 bg-slate-900 text-white rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-colors flex items-center gap-2"
            >
              <Plus className="w-3 h-3" /> Add Item
            </button>
          </div>
          <div className="overflow-x-auto w-full min-w-full"><div className="min-w-max">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Inventory Code</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Item Name</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Unit</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {foodInventory.map(food => (
                <tr key={food.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 text-xs font-mono font-medium text-slate-500">{food.id}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{food.item}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded text-xs">
                      {food.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-slate-700">{food.quantity}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{food.unit}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                       <button onClick={() => { setEditingFood(food); setIsFoodModalOpen(true); }} className="p-1 text-slate-300 hover:text-slate-900 transition-colors"><Edit3 className="w-4 h-4" /></button>
                       <button onClick={() => handleDeleteFood(food.id)} className="p-1 text-slate-300 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-200 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">
                {editingAccommodation ? 'Modify Housing Parameters' : 'Register Housing Unit'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto min-h-0 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Camp Facility Name</label>
                  <input name="campName" required defaultValue={editingAccommodation?.campName} placeholder="e.g. East Camp A" className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Room Node ID</label>
                  <input name="roomNumber" required defaultValue={editingAccommodation?.roomNumber} placeholder="e.g. 204" className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Max Capacity</label>
                  <input type="number" name="capacity" required defaultValue={editingAccommodation?.capacity} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-mono" />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Current Occupancy</label>
                  <input type="number" name="currentOccupancy" required defaultValue={editingAccommodation?.currentOccupancy} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-mono" />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors">Abort</button>
                 <button type="submit" className="flex-1 px-4 py-2 bg-slate-900 text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors">Commit Unit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isFoodModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-200 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">
                {editingFood ? 'Edit Catering Item' : 'New Catering Item'}
              </h3>
              <button onClick={() => setIsFoodModalOpen(false)} className="text-slate-400 hover:text-slate-900">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveFood} className="p-6 space-y-4 overflow-y-auto min-h-0 flex-1">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Item Name</label>
                  <input name="item" required defaultValue={editingFood?.item} placeholder="e.g. Rice (Basmati)" className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Category</label>
                  <select name="category" defaultValue={editingFood?.category || 'Staples'} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none">
                    <option>Staples</option>
                    <option>Meat</option>
                    <option>Vegetables</option>
                    <option>Cooking</option>
                    <option>Spices</option>
                    <option>Dairy</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Quantity</label>
                    <input type="number" name="quantity" required defaultValue={editingFood?.quantity} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-mono" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Unit</label>
                    <input name="unit" required defaultValue={editingFood?.unit} placeholder="e.g. kg, Liters" className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" />
                  </div>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                 <button type="button" onClick={() => setIsFoodModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors">Cancel</button>
                 <button type="submit" className="flex-1 px-4 py-2 bg-slate-900 text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors">Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
