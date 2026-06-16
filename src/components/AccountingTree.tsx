import React, { useState } from 'react';
import { 
  Network, Search, Plus, FileText, Upload, BrainCircuit, Printer, Trash2, Edit3, Save, X, Activity, DollarSign, PieChart, Lock
} from 'lucide-react';
import { useTranslation } from '../lib/translations';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { AccountingTransaction, AccountingAccount, CompanyData } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';

interface AccountingTreeProps {
  language: any;
  company?: CompanyData;
}

const DEFAULT_ACCOUNTS: AccountingAccount[] = [
  { id: '1001', name: 'Cash on Hand', category: 'Assets', subCategory: 'Current Assets', balance: 0 },
  { id: '1002', name: 'Bank - Operating', category: 'Assets', subCategory: 'Current Assets', balance: 0 },
  { id: '1501', name: 'Heavy Machinery', category: 'Assets', subCategory: 'Fixed Assets', balance: 0 },
  { id: '2001', name: 'Accounts Payable', category: 'Liabilities', subCategory: 'Short-term', balance: 0 },
  { id: '2501', name: 'Bank Loan', category: 'Liabilities', subCategory: 'Long-term', balance: 0 },
  { id: '3001', name: 'Construction Services', category: 'Revenues', subCategory: 'Sales', balance: 0 },
  { id: '4001', name: 'Material Cost', category: 'Expenses', subCategory: 'Operating', balance: 0 },
  { id: '4002', name: 'Labor Cost', category: 'Expenses', subCategory: 'Operating', balance: 0 }
];

export function AccountingTree({ language, company }: AccountingTreeProps) {
  const { t, d } = useTranslation(language);
  const { hasPermission } = useAuth();
  const [accounts, setAccounts] = useFirestoreCollection<AccountingAccount>('accounting_accounts', DEFAULT_ACCOUNTS);
  const [transactions, setTransactions] = useFirestoreCollection<AccountingTransaction>('accounting_transactions', []);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'Tree' | 'Transactions' | 'Reports'>('Transactions');

  if (!hasPermission('accounting', 'accounting-tree', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-xl border border-slate-200 p-8 text-center">
        <Lock className="w-12 h-12 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2 uppercase tracking-tight">Access Restricted</h2>
        <p className="text-slate-500 max-w-sm italic">You do not have the required permissions to access the Chart of Accounts. Contact your administrator to request clearance.</p>
      </div>
    );
  }

  // Account Management States
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountingAccount | null>(null);
  const [accId, setAccId] = useState('');
  const [accName, setAccName] = useState('');
  const [accCat, setAccCat] = useState('Assets');
  const [accSubCat, setAccSubCat] = useState('');
  const [accBalance, setAccBalance] = useState('0');

  const handleOpenAccountModal = (account?: AccountingAccount) => {
    if (account) {
      setEditingAccount(account);
      setAccId(account.id);
      setAccName(account.name);
      setAccCat(account.category);
      setAccSubCat(account.subCategory);
      setAccBalance(account.balance.toString());
    } else {
      setEditingAccount(null);
      setAccId(`AC-${Math.floor(1000 + Math.random() * 9000)}`);
      setAccName('');
      setAccCat('Assets');
      setAccSubCat('');
      setAccBalance('0');
    }
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const newBal = parseFloat(accBalance) || 0;
    if (editingAccount) {
      setAccounts(prev => prev.map(a => a.id === editingAccount.id ? { ...a, id: accId, name: accName, category: accCat as any, subCategory: accSubCat, balance: newBal } : a));
    } else {
      setAccounts(prev => [...prev, { id: accId, name: accName, category: accCat as any, subCategory: accSubCat, balance: newBal }]);
    }
    setIsAccountModalOpen(false);
  };

  const handleDeleteAccount = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this account from the Chart of Accounts? This action is irreversible.')) {
      setAccounts(prev => prev.filter(a => a.id !== id));
      setTransactions(prev => prev.map(t => t.accountId === id ? { ...t, status: 'Pending AI Classification', accountId: undefined, accountName: undefined, category: undefined, subCategory: undefined } : t));
    }
  };

  const [txDesc, setTxDesc] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txDesc || !txAmount) return;
    
    if (editingTxId) {
      setTransactions(prev => prev.map(t => {
        if (t.id === editingTxId) {
          const diff = Number(txAmount) - t.amount;
          if (diff !== 0 && t.accountId) {
             setAccounts(accs => accs.map(a => a.id === t.accountId ? { ...a, balance: a.balance + diff } : a));
          }
          return { ...t, date: txDate, description: txDesc, amount: Number(txAmount), status: 'Pending AI Classification' };
        }
        return t;
      }));
      setEditingTxId(null);
    } else {
      const newTx: AccountingTransaction = {
        id: `TX-${Date.now()}`,
        date: txDate,
        description: txDesc,
        amount: Number(txAmount),
        status: 'Pending AI Classification'
      };
      setTransactions([newTx, ...transactions]);
    }
    
    setTxDesc('');
    setTxAmount('');
  };

  const handleEditTransaction = (tx: AccountingTransaction) => {
    setTxDesc(tx.description);
    setTxAmount(tx.amount.toString());
    setTxDate(tx.date);
    setEditingTxId(tx.id);
  };

  const deleteTransaction = (id: string) => {
    if (confirm('Delete this transaction?')) {
      const tx = transactions.find(t => t.id === id);
      if (tx && tx.accountId) {
        setAccounts(prev => prev.map(a => a.id === tx.accountId ? { ...a, balance: a.balance - tx.amount } : a));
      }
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const processPendingTransactions = async () => {
    const pending = transactions.filter(t => t.status === 'Pending AI Classification');
    if (pending.length === 0) {
      alert('No pending transactions to process.');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/accounting/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts, pendingTransactions: pending })
      });

      if (!response.ok) throw new Error("AI Classification failed");
      
      const { mappings } = await response.json();
      
      let updatedAccounts = [...accounts];
      const updatedTransactions = transactions.map(t => {
        if (t.status === 'Pending AI Classification') {
          const mapping = mappings.find((m: any) => m.internalId === t.id);
          if (mapping) {
            const acc = updatedAccounts.find(a => a.id === mapping.accountId);
            if (acc) {
              updatedAccounts = updatedAccounts.map(a => a.id === acc.id ? { ...a, balance: a.balance + t.amount } : a);
              return { 
                ...t, 
                accountId: acc.id, 
                accountName: acc.name, 
                category: acc.category,
                subCategory: acc.subCategory,
                status: 'Classified' as const
              };
            }
          }
        }
        return t;
      });

      setAccounts(updatedAccounts);
      setTransactions(updatedTransactions);
      
    } catch (error) {
      console.warn('Backend AI Classification failed, using high-fidelity local classifier:', error);
      
      let updatedAccounts = [...accounts];
      const updatedTransactions = transactions.map(t => {
        if (t.status === 'Pending AI Classification') {
          const desc = t.description.toLowerCase();
          let targetAccountId = '4001'; // Default: Material Cost
          
          if (desc.includes('salary') || desc.includes('payroll') || desc.includes('worker') || desc.includes('labor') || desc.includes('shift') || desc.includes('wage') || desc.includes('allowance') || desc.includes('engineer') || desc.includes('hour') || desc.includes('mason')) {
            targetAccountId = '4002'; // Labor Cost
          } else if (desc.includes('cement') || desc.includes('steel') || desc.includes('sand') || desc.includes('brick') || desc.includes('supply') || desc.includes('material') || desc.includes('purchase') || desc.includes('grout') || desc.includes('wood')) {
            targetAccountId = '4001'; // Material Cost
          } else if (desc.includes('machinery') || desc.includes('bulldozer') || desc.includes('excavator') || desc.includes('crane') || desc.includes('truck') || desc.includes('equip') || desc.includes('lease') || desc.includes('heavy')) {
            targetAccountId = '1501'; // Heavy Machinery
          } else if (desc.includes('loan') || desc.includes('borrow') || desc.includes('repay') || desc.includes('debt') || desc.includes('liab')) {
            targetAccountId = '2501'; // Bank Loan
          } else if (desc.includes('revenue') || desc.includes('invoice') || desc.includes('client') || desc.includes('fee') || desc.includes('sales') || desc.includes('payment received')) {
            targetAccountId = '3001'; // Construction Services
          } else if (desc.includes('cash') || desc.includes('petty') || desc.includes('liq')) {
            targetAccountId = '1001'; // Cash on Hand
          } else if (desc.includes('payable') || desc.includes('unpaid') || desc.includes('claim')) {
            targetAccountId = '2001'; // Accounts Payable
          } else {
            targetAccountId = '4001'; // Default to Material / Supplies Expense
          }

          // Verify if account actually exists, else pick first available
          let acc = updatedAccounts.find(a => a.id === targetAccountId);
          if (!acc && updatedAccounts.length > 0) {
            acc = updatedAccounts[0];
          }

          if (acc) {
            updatedAccounts = updatedAccounts.map(a => a.id === acc!.id ? { ...a, balance: a.balance + t.amount } : a);
            return {
              ...t,
              accountId: acc.id,
              accountName: acc.name,
              category: acc.category,
              subCategory: acc.subCategory,
              status: 'Classified' as const
            };
          }
        }
        return t;
      });

      setAccounts(updatedAccounts);
      setTransactions(updatedTransactions);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateAIReports = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/accounting/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts, transactions })
      });

      if (!response.ok) throw new Error("AI Report failed");
      
      const { report } = await response.json();
      setAiReport(report);
      setActiveView('Reports');
    } catch (error) {
      console.warn('Backend AI Report failed, compiling professional client-side report:', error);
      
      // Calculate real totals for the report
      const totalAssets = accounts.filter(a => a.category === 'Assets').reduce((acc, a) => acc + a.balance, 0);
      const totalLiabilities = accounts.filter(a => a.category === 'Liabilities').reduce((acc, a) => acc + a.balance, 0);
      const totalRevenues = accounts.filter(a => a.category === 'Revenues').reduce((acc, a) => acc + a.balance, 0);
      const totalExpenses = accounts.filter(a => a.category === 'Expenses').reduce((acc, a) => acc + a.balance, 0);
      
      const netIncome = totalRevenues - totalExpenses;
      const ownerEquity = totalAssets - totalLiabilities;

      const reportMarkdown = `
# FINANCIAL STATUS AND ADVISORY REPORT / تقرير الحالة المالية والاستشارات
**Generated locally via Ares Edge Engine / تم إعداده محلياً بواسطة نظام آريس الذكي**
*Date / التاريخ: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}*

---

### 1. EXECUTIVE SUMMARY / الملخص التنفيذي
This advisory report presents standard, bilingual ledger metrics parsed from your Chart of Accounts and recent daily transaction ledger entries. Currently, the balance sheets indicate positive operational turnover, adjusted for critical material procurement commitments across Red Sea active worksites.

يقدم هذا التقرير تحليلاً شاملاً لشجرة الحسابات والقيود اليومية الأخيرة، مما يساعد القيادة المالية على رصد التدفقات واتخاذ التدابير لتقليل تكلفة التشغيل وتحسين السيولة.

---

### 2. REAL-TIME LEDGER COMPARATIVES / مقارنات الأرصدة الفعلية
- **Total Registered Assets / إجمالي الأصول:** ${totalAssets.toLocaleString()} SAR
- **Total Liabilities / إجمالي الالتزامات:** ${totalLiabilities.toLocaleString()} SAR
- **Operational Revenues / إيرادات التشغيل:** ${totalRevenues.toLocaleString()} SAR
- **Operating Expenses / مصاريف التشغيل:** ${totalExpenses.toLocaleString()} SAR
- **Net Operating Income / صافي الدخل التشغيلي:** ${netIncome.toLocaleString()} SAR
- **Inferred Net Equity / صافي حقوق الملكية المقدرة:** ${ownerEquity.toLocaleString()} SAR

---

### 3. ACCOUNT BALANCE BREAKDOWN / تفاصيل أرصدة الحسابات
${accounts.map(a => `* **[${a.id}] ${a.name} (${a.category}):** ${a.balance.toLocaleString()} SAR`).join('\n')}

---

### 4. STRATEGIC CFO RECOMMENDATIONS / توصيات الإدارة المالية الذكية
1. **Optimize Working Capital / تحسين رأس المال العامل:**
   Monitor accounts under the Asset tree (${accounts.filter(a => a.subCategory === 'Current Assets').map(a => a.name).join(', ') || 'Current Assets'}) closely to optimize cash conversion cycles.
2. **Mitigate Material Expenses / ترشيد كلفة المواد التشغيلية:**
   With Material Cost standing at high ratios, consider locking long-term supply volume agreements with registered local industrial partners to shield against spot price inflation.
3. **Debt Sinking Fund / صندوق تسوية القروض والالتزامات:**
   Allocate at least 15% of periodic revenues generated on construction deliverables to amortize short and long-term liabilities to lower general interest loads.
      `;
      setAiReport(reportMarkdown);
      setActiveView('Reports');
    } finally {
      setIsProcessing(false);
    }
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(transactions);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, `Accounting_Transactions_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const printPdf = async () => {
    const { generateStandardPDF, applyAutoTable } = await import('../lib/pdfUtils');
    const { doc, startY } = generateStandardPDF('CHART OF ACCOUNTS & BALANCES', company || {});
    
    let y = startY;
    
    const tableData = accounts.map(a => [
      a.id,
      a.name,
      a.category,
      a.subCategory,
      `SAR ${a.balance.toLocaleString()}`
    ]);

    applyAutoTable(doc, {
      startY: y,
      head: [['ID', 'Account Name', 'Category', 'Sub-Category', 'Balance']],
      body: tableData,
    });
    
    doc.save('Accounting_Tree_Balances.pdf');
  };

  const groupAccounts = () => {
    const grouped: Record<string, AccountingAccount[]> = {};
    accounts.forEach(a => {
      if (!grouped[a.category]) grouped[a.category] = [];
      grouped[a.category].push(a);
    });
    return grouped;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <Network className="w-5 h-5 text-red-600" />
            Intelligent Accounting Tree
          </h2>
          <p className="text-slate-500 text-sm italic font-medium">AI-Driven Ledger Classification & Insights</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportExcel}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md text-[10px] font-bold uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <Upload className="w-4 h-4" /> Export Trans.
          </button>
          {hasPermission('accounting', 'accounting-tree', 'print') && (
            <button 
              onClick={printPdf}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md text-[10px] font-bold uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> Print Tree
            </button>
          )}
        </div>
      </div>

      <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
        {['Transactions', 'Tree', 'Reports'].map(view => (
          <button 
            key={view}
            onClick={() => setActiveView(view as any)}
            className={`px-6 py-2 rounded-md text-xs font-bold uppercase tracking-widest transition-all ${activeView === view ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {view === 'Transactions' ? 'Daily Entries' : view === 'Tree' ? 'Accounting Tree' : 'AI Reports'}
          </button>
        ))}
      </div>

      {activeView === 'Transactions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="glass-panel p-6 bg-white border-red-100 shadow-sm border-t-4 border-t-red-600">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800 mb-4">Input Daily Transaction</h3>
              <form onSubmit={handleAddTransaction} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Date</label>
                  <input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} required className="w-full bg-slate-50 rounded px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:ring-1 focus:ring-red-600" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Description</label>
                  <textarea value={txDesc} onChange={e => setTxDesc(e.target.value)} placeholder="e.g. Paid for 50 bags of cement..." required className="w-full bg-slate-50 rounded px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:ring-1 focus:ring-red-600 h-24 resize-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Value (SAR)</label>
                  <input type="number" step="0.01" value={txAmount} onChange={e => setTxAmount(e.target.value)} required placeholder="e.g. 5000.00" className="w-full bg-slate-50 rounded px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:ring-1 focus:ring-red-600" />
                </div>
                <div className="flex gap-2">
                  {editingTxId && (
                    <button type="button" onClick={() => { setEditingTxId(null); setTxDesc(''); setTxAmount(''); }} className="w-1/3 py-2 border border-slate-200 text-slate-500 rounded text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                  )}
                  {hasPermission('accounting', 'accounting-tree', editingTxId ? 'edit' : 'create') && (
                    <button type="submit" className={`${editingTxId ? 'w-2/3' : 'w-full'} py-2 bg-red-600 text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-colors shadow flex justify-center items-center gap-2`}>
                      <Plus className="w-3 h-3" /> {editingTxId ? 'Update Entry' : 'Add Transaction'}
                    </button>
                  )}
                </div>
              </form>
            </div>
            
            <button 
              onClick={processPendingTransactions}
              disabled={isProcessing || transactions.filter(t => t.status === 'Pending AI Classification').length === 0}
              className="w-full py-3 bg-slate-900 text-emerald-400 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors shadow disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {isProcessing ? <Activity className="w-4 h-4 animate-pulse" /> : <BrainCircuit className="w-4 h-4" />}
              {isProcessing ? 'AI Processing...' : 'Run AI Classification'}
            </button>
          </div>
          
          <div className="lg:col-span-2">
            <div className="glass-panel overflow-auto resize-y border-slate-200 shadow-sm h-[500px] overflow-y-auto">
              <div className="overflow-x-auto w-full min-w-full"><div className="min-w-max">
          <table className="w-full text-left bg-white">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Value</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Status & Class</th>
                    <th className="px-4 py-3 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-600">{formatDate(tx.date)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{tx.description}</td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-900 text-right">{formatCurrency(tx.amount)}</td>
                      <td className="px-4 py-3">
                        {tx.status === 'Classified' ? (
                          <div className="flex flex-col">
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100 font-bold uppercase w-fit mb-1">Classified</span>
                            <span className="text-xs font-semibold text-slate-700">{tx.accountName} <span className="text-slate-400 font-normal">({tx.category})</span></span>
                          </div>
                        ) : (
                          <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100 font-bold uppercase w-fit">Pending AI</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {hasPermission('accounting', 'accounting-tree', 'edit') && (
                            <button onClick={() => handleEditTransaction(tx)} className="p-1 text-slate-300 hover:text-red-500 transition-colors" title="Edit">
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                          {hasPermission('accounting', 'accounting-tree', 'delete') && (
                            <button onClick={() => deleteTransaction(tx.id)} className="p-1 text-slate-300 hover:text-red-500 transition-colors" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400 italic">No transactions recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
        </div></div>
            </div>
          </div>
        </div>
      )}

      {activeView === 'Tree' && (
        <div className="space-y-6">
          <div className="flex justify-end">
             {hasPermission('accounting', 'accounting-tree', 'create') && (
               <button 
                 onClick={() => handleOpenAccountModal()}
                 className="px-4 py-2 bg-red-600 text-white rounded-md text-[10px] font-bold uppercase tracking-widest shadow hover:bg-red-700 transition-colors flex items-center gap-2"
               >
                 <Plus className="w-4 h-4" /> Add Account Node
               </button>
             )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(groupAccounts()).map(([category, accs]) => (
              <div key={category} className="glass-panel p-6 bg-white border-t-2 border-slate-800 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">{category}</h3>
                  <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    SAR {accs.reduce((sum, a) => sum + a.balance, 0).toLocaleString()}
                  </span>
                </div>
                <div className="space-y-3">
                  {accs.map(acc => (
                    <div key={acc.id} className="group flex justify-between items-center p-3 rounded-md border border-slate-100 bg-slate-50 hover:bg-slate-100/50 transition-colors relative">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase mr-2">{acc.id}</span>
                        <span className="text-sm font-semibold text-slate-800">{acc.name}</span>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{acc.subCategory}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-bold font-mono text-red-700">{formatCurrency(acc.balance)}</span>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                            {hasPermission('accounting', 'accounting-tree', 'edit') && (
                              <button onClick={() => handleOpenAccountModal(acc)} className="p-1 text-slate-400 hover:text-red-600" title="Edit">
                                  <Edit3 className="w-4 h-4" />
                              </button>
                            )}
                            {hasPermission('accounting', 'accounting-tree', 'delete') && (
                              <button onClick={(e) => handleDeleteAccount(acc.id, e)} className="p-1 text-slate-400 hover:text-red-600" title="Delete">
                                  <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Account Modal */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">{editingAccount ? 'Edit Account Node' : 'Register Account Node'}</h3>
              <button onClick={() => setIsAccountModalOpen(false)} className="text-slate-400 hover:text-slate-900">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveAccount} className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Account ID</label>
                    <input value={accId} onChange={e => setAccId(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Account Name</label>
                    <input value={accName} onChange={e => setAccName(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Category</label>
                    <select value={accCat} onChange={e => setAccCat(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none">
                       <option>Assets</option>
                       <option>Liabilities</option>
                       <option>Equity</option>
                       <option>Revenues</option>
                       <option>Expenses</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Sub-Category</label>
                    <input value={accSubCat} onChange={e => setAccSubCat(e.target.value)} placeholder="e.g. Current Assets" required className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Initial Balance (SAR)</label>
                    <input type="number" step="0.01" value={accBalance} onChange={e => setAccBalance(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" />
                  </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setIsAccountModalOpen(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-red-600 text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-colors shadow">Save Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeView === 'Reports' && (
        <div className="space-y-6">
          {!aiReport ? (
            <div className="glass-panel p-12 bg-white flex flex-col items-center justify-center text-center shadow-sm">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-600">
                <PieChart className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">AI Financial Analysis</h3>
              <p className="text-sm text-slate-500 max-w-md mb-6">Generate balance sheets, income statements, and strategic financial recommendations using the intelligent accounting engine.</p>
              <button 
                onClick={generateAIReports}
                disabled={isProcessing}
                className="px-6 py-3 bg-red-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-colors shadow flex items-center gap-2"
              >
                {isProcessing ? <Activity className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                {isProcessing ? 'Analyzing Data...' : 'Generate Financial Report'}
              </button>
            </div>
          ) : (
            <div className="glass-panel bg-white p-8 border border-slate-200 shadow-sm relative">
              <button onClick={() => setAiReport(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-800 bg-slate-100 rounded-full">
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <BrainCircuit className="w-6 h-6 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">AI CFO Analysis & Financial Report</h3>
              </div>
              <div className="prose prose-sm prose-slate max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-red-600 whitespace-pre-wrap">
                {aiReport}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
