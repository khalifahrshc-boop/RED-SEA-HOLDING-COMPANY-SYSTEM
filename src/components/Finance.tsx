import React from 'react';
import { 
  Receipt, 
  Download, 
  Share2, 
  Search,
  Filter,
  CheckCircle2, 
  Clock, 
  AlertCircle,
  FileText,
  QrCode,
  ShieldCheck,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ArrowRight,
  Trash2,
  Users,
  Plus,
  FileSpreadsheet,
  Upload,
  Calculator,
  Save,
  Printer,
  ChevronRight,
  ShoppingCart,
  X,
  Edit3
} from 'lucide-react';
import { cn, formatCurrency, formatDate, generateZatcaQrClientSide, getCleanLogoBase64 } from '@/src/lib/utils';
import { Invoice, InvoiceItem, ProjectCostSheet, ProjectCostItem, Worker, Project, View } from '@/src/types';
import { auth } from '../lib/firebase';
import { useTranslation, Language } from '../lib/translations';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { AccountingTree } from './AccountingTree';
import { PayrollManager } from './PayrollManager';
import { generateZatcaBase64, getZatcaTimestamp } from '../lib/pdfUtils';

import { notificationService } from '../lib/notificationService';

import { useAuth } from '../contexts/AuthContext';

type InvoiceStatus = Invoice['status'];
type SortKey = keyof Invoice;

const NEXT_STATUS: Record<string, InvoiceStatus> = {
  'Draft': 'Pending Finance',
  'Pending Finance': 'Pending Official Approval',
  'Pending Official Approval': 'Approved',
  'Approved': 'Sent',
};

interface FinanceProps {
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  costSheets: ProjectCostSheet[];
  setCostSheets: React.Dispatch<React.SetStateAction<ProjectCostSheet[]>>;
  workers: Worker[];
  language: Language;
  projects: Project[];
  onUpdateProject: (p: Project) => void;
  company?: any;
  onNavigate?: (view: View) => void;
}

export function Finance({ invoices, setInvoices, costSheets, setCostSheets, workers, language, projects, onUpdateProject, company, onNavigate }: FinanceProps) {
  const { t, d } = useTranslation(language);
  const { hasPermission, userData, user } = useAuth();
  const [activeTab, setActiveTab] = React.useState<'Invoices' | 'Payrolls' | 'Costing' | 'Ledgers' | 'AccountingTree'>('Invoices');
  const [isCreatingCosting, setIsCreatingCosting] = React.useState(false);
  const [editingCostSheetId, setEditingCostSheetId] = React.useState<string | null>(null);
  const [isCreatingInvoice, setIsCreatingInvoice] = React.useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = React.useState<string | null>(null);
  const [invoiceType, setInvoiceType] = React.useState<'Sales' | 'Purchase'>('Sales');
  const [invoiceItems, setInvoiceItems] = React.useState<InvoiceItem[]>([]);
  const [invoiceDiscountType, setInvoiceDiscountType] = React.useState<'percentage' | 'fixed'>('fixed');
  const [invoiceDiscountValue, setInvoiceDiscountValue] = React.useState<number>(0);
  const [invoiceProjectMode, setInvoiceProjectMode] = React.useState<'linked' | 'custom' | 'none'>('linked');
  const [customProjectName, setCustomProjectName] = React.useState<string>('');

  const closeInvoiceModal = () => {
    setIsCreatingInvoice(false);
    setEditingInvoiceId(null);
    setInvoiceItems([]);
    setInvoiceDiscountValue(0);
    setInvoiceProjectMode('linked');
    setCustomProjectName('');
  };

  const [currentCostSheet, setCurrentCostSheet] = React.useState<Partial<ProjectCostSheet>>({
      items: [],
      date: new Date().toISOString().split('T')[0],
      status: 'In Progress'
    });
    const totalLaborDaily = workers.reduce((acc, w) => acc + (w.dailyRate || 0), 0);
    const activeHeadcount = workers.length;

    const [processingId, setProcessingId] = React.useState<string | null>(null);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [sortConfig, setSortConfig] = React.useState<{ key: SortKey; direction: 'asc' | 'desc' | null }>({
      key: 'id',
      direction: null,
    });

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const exportToExcel = () => {
      let data: any[] = [];
      if (activeTab === 'Invoices') data = invoices;
      else if (activeTab === 'Costing') {
        data = costSheets.map(cs => ({
          ID: cs.id,
          Project: cs.projectName,
          Date: cs.date,
          Total: cs.grandTotal,
          Status: cs.status
        }));
      }
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, activeTab);
      XLSX.writeFile(wb, `Financial_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleAddCostItem = () => {
      const newItem: ProjectCostItem = {
        id: Math.random().toString(36).substr(2, 9),
        description: '',
        category: 'Material',
        quantity: 1,
        unit: 'Pcs',
        unitPrice: 0,
        total: 0
      };
      setCurrentCostSheet(prev => ({
        ...prev,
        items: [...(prev.items || []), newItem]
      }));
    };

    const handleUpdateCostItem = (id: string, field: keyof ProjectCostItem, value: any) => {
      setCurrentCostSheet(prev => ({
        ...prev,
        items: (prev.items || []).map(item => {
          if (item.id === id) {
            const updatedItem = { ...item, [field]: value };
            if (field === 'quantity' || field === 'unitPrice') {
              updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
            }
            return updatedItem;
          }
          return item;
        })
      }));
    };

    const handleAddInvoiceItem = () => {
      setInvoiceItems(prev => [
        ...prev, 
        { id: Math.random().toString(36).substr(2, 9), name: '', quantity: 1, unit: 'Nos', rate: 0, taxableValue: 0, taxRate: 15, taxAmount: 0, total: 0 }
      ]);
    };

    const handleUpdateInvoiceItem = (id: string, field: keyof InvoiceItem, value: any) => {
      setInvoiceItems(prev => prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (['quantity', 'rate', 'taxRate'].includes(field)) {
               updated.taxableValue = updated.quantity * updated.rate;
               updated.taxAmount = (updated.taxableValue * updated.taxRate) / 100;
               updated.total = updated.taxableValue + updated.taxAmount;
          }
          return updated;
        }
        return item;
      }));
    };

    const handleRemoveInvoiceItem = (id: string) => {
      setInvoiceItems(prev => prev.filter(i => i.id !== id));
    };

    const handleCreateInvoice = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      
      let finalProjectId = '';
      let finalProjectName = '';

      if (invoiceProjectMode === 'linked') {
        const projectId = formData.get('projectId') as string;
        const project = projects.find(p => p.id === projectId);
        finalProjectId = projectId || '';
        finalProjectName = project?.name || '';
      } else if (invoiceProjectMode === 'custom') {
        finalProjectId = '';
        finalProjectName = customProjectName;
      } else {
        finalProjectId = '';
        finalProjectName = '';
      }
      
      const itemsSum = invoiceItems.reduce((sum, item) => sum + item.taxableValue, 0);
      const itemsTaxSum = invoiceItems.reduce((sum, item) => sum + item.taxAmount, 0);
      
      const discountVal = invoiceDiscountType === 'percentage' 
          ? (itemsSum * invoiceDiscountValue / 100) 
          : invoiceDiscountValue;
          
      // Ensure discount doesn't exceed total
      const actualDiscount = Math.min(itemsSum, discountVal);
      const discountedAmount = itemsSum - actualDiscount;
      
      // Calculate overall tax based on discounted amount (assuming uniform 15% for simplicity or proportional reduction)
      // Standard practice: if there is a global discount, it reduces the taxable amount proportionally
      const discountRatio = itemsSum > 0 ? (discountedAmount / itemsSum) : 1;
      const totalTax = itemsTaxSum * discountRatio;
      const finalTotal = discountedAmount + totalTax;

      const newInvoice: Invoice = {
        id: editingInvoiceId || (formData.get('invoiceId') as string) || `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`,
        projectId: finalProjectId,
        project: finalProjectName,
        date: formData.get('date') as string,
        amount: discountedAmount, // Taxable Value
        tax: totalTax, // VAT Amount
        total: finalTotal, // Grand Total
        status: invoices.find(i => i.id === editingInvoiceId)?.status || 'Draft',
        qrCodeData: invoices.find(i => i.id === editingInvoiceId)?.qrCodeData || '',
        createdAt: invoices.find(i => i.id === editingInvoiceId)?.createdAt || new Date().toISOString(),
        recipientName: formData.get('recipientName') as string,
        recipientTaxId: formData.get('recipientTaxId') as string,
        recipientAddress: formData.get('recipientAddress') as string,
        items: invoiceItems.length > 0 ? invoiceItems : undefined,
        discountType: invoiceDiscountType,
        discountValue: invoiceDiscountValue,
        discountAmount: actualDiscount,
        type: invoiceType,
        submittedBy: invoices.find(i => i.id === editingInvoiceId)?.submittedBy || (userData || user ? {
          uid: user?.uid || '',
          name: userData?.name || user?.displayName || 'Anonymous',
          email: userData?.email || user?.email || '',
        } : undefined),
      };

      if (editingInvoiceId) {
        setInvoices(prev => prev.map(inv => inv.id === editingInvoiceId ? newInvoice : inv));
      } else {
        setInvoices(prev => [newInvoice, ...prev]);
      }
      closeInvoiceModal();
    };

    const handleEditInvoice = (inv: Invoice) => {
      setEditingInvoiceId(inv.id);
      setInvoiceType(inv.type || 'Sales');
      setInvoiceItems(inv.items || []);
      setInvoiceDiscountType(inv.discountType || 'fixed');
      setInvoiceDiscountValue(inv.discountValue || 0);

      const hasLinkedProject = inv.projectId && projects.some(p => p.id === inv.projectId);
      if (hasLinkedProject) {
        setInvoiceProjectMode('linked');
        setCustomProjectName('');
      } else if (inv.project) {
        setInvoiceProjectMode('custom');
        setCustomProjectName(inv.project);
      } else {
        setInvoiceProjectMode('none');
        setCustomProjectName('');
      }

      setIsCreatingInvoice(true);
    };

    const handleDeleteInvoice = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
        setInvoices(prev => prev.filter(inv => inv.id !== id));
      }
    };

    const handleRegisterCosting = () => {
      if (!currentCostSheet.projectId || !currentCostSheet.projectName) {
        alert("Please select a project node first.");
        return;
      }

      const subtotal = (currentCostSheet.items || []).reduce((acc, item) => acc + item.total, 0);
      const tax = subtotal * 0.15;
      
      const newSheet: ProjectCostSheet = {
        id: editingCostSheetId || `COST-${Date.now().toString().slice(-6)}`,
        projectId: currentCostSheet.projectId!,
        projectName: currentCostSheet.projectName!,
        date: currentCostSheet.date!,
        items: currentCostSheet.items as ProjectCostItem[],
        subtotal,
        tax,
        grandTotal: subtotal + tax,
        status: 'Finalized',
        finalizedAt: new Date().toISOString()
      };

      if (editingCostSheetId) {
         setCostSheets(costSheets.map(cs => cs.id === editingCostSheetId ? newSheet : cs));
      } else {
         setCostSheets([newSheet, ...costSheets]);
      }
      setIsCreatingCosting(false);
      setEditingCostSheetId(null);
      setCurrentCostSheet({ items: [], date: new Date().toISOString().split('T')[0], status: 'In Progress' });
      alert(editingCostSheetId ? "Project Cost Sheet updated successfully." : "Project Cost Sheet registered successfully.");
    };

    const handleEditCostSheet = (sheet: ProjectCostSheet) => {
       setCurrentCostSheet({ ...sheet });
       setEditingCostSheetId(sheet.id);
       setIsCreatingCosting(true);
    };

    const handleDeleteCostSheet = (id: string, e: React.MouseEvent) => {
       e.stopPropagation();
       if (confirm('Are you sure you want to delete this cost sheet?')) {
           setCostSheets(prev => prev.filter(cs => cs.id !== id));
       }
    };

    const handlePrintCostSheet = (sheet: ProjectCostSheet) => {
      import('../lib/pdfUtils').then(({ generateStandardPDF, applyAutoTable }) => {
        const { doc, startY } = generateStandardPDF(`PROJECT COST SHEET: ${sheet.projectId}`, company || {}, 'l');
        let y = startY;

        doc.text(`Project ID: ${sheet.projectId}`, 14, y);
        doc.text(`Project Name: ${sheet.projectName || 'N/A'}`, 14, y += 8);
        doc.text(`Date: ${sheet.date}`, 14, y += 8);
        doc.text(`Status: ${sheet.status}`, 14, y += 8);
        
        y += 8;

        if (sheet.items && sheet.items.length > 0) {
          const tableData = sheet.items.map(i => [
            i.id,
            i.description,
            i.category,
            `${i.quantity} ${i.unit}`,
            `SAR ${i.unitPrice?.toLocaleString() || 0}`,
            `SAR ${i.total?.toLocaleString() || 0}`
          ]);
          applyAutoTable(doc, {
            startY: y,
            head: [['Item Code', 'Description', 'Category', 'Quantity', 'Unit Price', 'Total']],
            body: tableData,
          });
          y = (doc as any).lastAutoTable.finalY + 12;
        }

        doc.setFont("courier", "bold");
        doc.text(`Total Accrued Cost: SAR ${sheet.grandTotal.toLocaleString()}`, 14, y);

        doc.setFontSize(8);
        doc.setFont("courier", "italic");
        doc.text(company?.footerText || 'This is an automatically generated system record.', 14, y += 20);
        
        doc.save(`${sheet.projectId}_CostSheet_${sheet.date}.pdf`);
      });
    };

    const handleDownloadCostSheetExcel = (sheet: ProjectCostSheet) => {
      const ws = XLSX.utils.json_to_sheet(sheet.items);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Cost Breakdown");
      XLSX.writeFile(wb, `${sheet.projectName}_Costing_${sheet.id}.xlsx`);
    };

    const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        if (activeTab === 'Invoices') {
          setInvoices([...invoices, ...data as Invoice[]]);
        }
      };
      reader.readAsBinaryString(file);
    };
  
    const handleTransition = async (invoice: Invoice) => {
      const next = NEXT_STATUS[invoice.status];
      if (!next) return;
  
      setProcessingId(invoice.id);
      
      try {
        // Add a small artificial delay for realism and to show the processing state
        await new Promise(resolve => setTimeout(resolve, 800));

        let qrCodeData = invoice.qrCodeData;
  
        // If moving to Approved, generate ZATCA QR
        if (next === 'Approved') {
          try {
            const response = await fetch('/api/finance/generate-zatca-qr', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sellerName: "RED SEA HOLDING COMPANY SYSTEM",
                vatRegistration: "312345678900003",
                timestamp: new Date().toISOString(),
                total: invoice.total,
                vatTotal: invoice.tax
              })
            });

            if (!response.ok) {
              throw new Error(`ZATCA QR generation failed: ${response.statusText}`);
            }

            const data = await response.json();
            qrCodeData = data.qrCode;
          } catch (apiError) {
            console.warn("API ZATCA QR generation failed, falling back to client-side generation:", apiError);
            qrCodeData = generateZatcaQrClientSide(
              "RED SEA HOLDING COMPANY SYSTEM",
              "312345678900003",
              new Date().toISOString(),
              invoice.total,
              invoice.tax
            );
          }
        }
  
        setInvoices(prev => prev.map(inv => {
          if (inv.id === invoice.id) {
            console.log(`Transitioning invoice ${inv.id} from ${inv.status} to ${next}`);
            
            // Send notification for the transition
            notificationService.send({
              type: next === 'Approved' ? 'Success' : 'Request',
              title: `Invoice ${inv.id}: ${next}`,
              message: `Invoice for project ${inv.project} has been moved to ${next}. Value: ${formatCurrency(inv.total)}`,
              department: next === 'Pending Finance' ? 'Finance' : 
                         next === 'Pending Official Approval' ? 'Administrator' : 
                         next === 'Approved' ? 'Procurement' : 'All',
              relatedId: inv.id,
              relatedType: 'finance'
            });

            // Deduct from project budget on approval
            if (next === 'Approved') {
              const project = projects.find(p => p.id === inv.projectId);
              if (project) {
                onUpdateProject({
                  ...project,
                  spent: project.spent + inv.total
                });
              }
            }
            
            return { ...inv, status: next, qrCodeData };
          }
          return inv;
        }));
      } catch (error) {
        console.error("Workflow transition failed:", error);
        alert(`Operational Failure: Transition to ${next} failed. System logs updated.`);
      } finally {
        setProcessingId(null);
      }
    };

    const numberToWords = (amount: number) => {
        const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
        const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
        const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

        const convertTens = (n: number) => {
            if (n < 10) return units[n];
            if (n >= 10 && n < 20) return teens[n - 10];
            return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + units[n % 10] : "");
        };

        const convertHundreds = (n: number) => {
            if (n > 99) {
                return units[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " " + convertTens(n % 100) : "");
            } else {
                return convertTens(n);
            }
        };

        const convertThousands = (n: number) => {
            if (n >= 1000) {
                return convertHundreds(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + convertHundreds(n % 1000) : "");
            } else {
                return convertHundreds(n);
            }
        };

        const convertMillions = (n: number) => {
            if (n >= 1000000) {
                return convertThousands(Math.floor(n / 1000000)) + " Million" + (n % 1000000 !== 0 ? " " + convertThousands(n % 1000000) : "");
            } else {
                return convertThousands(n);
            }
        };

        if (amount === 0) return "Zero";
        let intPart = Math.floor(amount);
        let words = convertMillions(intPart);
        return "Saudi Arabian Riyal " + words;
    };

    const handleDownloadPdf = async (invoice: Invoice) => {
      try {
        const doc = new jsPDF();
        
        const isPurchase = invoice.type === 'Purchase';

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(isPurchase ? "Tax Invoice (Purchase)" : "Tax Invoice", 105, 15, { align: "center" });

        // Outer Upper Box
        doc.setLineWidth(0.3);
        doc.rect(10, 20, 190, 80);
        doc.line(100, 20, 100, 100);

        // Dynamically compute Seller and Buyer details for ZATCA alignment
        const sellerName = isPurchase ? (invoice.recipientName || 'Supplier') : (company?.name || 'RED SEA HOLDING COMPANY SYSTEM');
        const sellerVat = isPurchase ? (invoice.recipientTaxId || '300000000000003') : (company?.vatNumber || '312345678900003');
        const sellerCr = isPurchase ? '' : (company?.crNumber || '');
        const sellerPhone = isPurchase ? '' : (company?.phone || '');
        const sellerWeb = isPurchase ? '' : (company?.website || '');
        const sellerAddress = isPurchase ? (invoice.recipientAddress || 'Saudi Arabia') : (company?.headquarters || 'Saudi Arabia');

        const buyerName = isPurchase ? (company?.name || 'RED SEA HOLDING COMPANY SYSTEM') : (invoice.recipientName || 'Abdul Traders');
        const buyerVat = isPurchase ? (company?.vatNumber || '312345678900003') : (invoice.recipientTaxId || '098765432123456');
        const buyerAddress = isPurchase ? (company?.headquarters || 'Saudi Arabia') : (invoice.recipientAddress || 'Saudi Arabia');

        // Left section (Seller & Buyer)
        const logoBase64 = !isPurchase ? getCleanLogoBase64(company?.logo) : null;
        if (logoBase64) {
            try {
                doc.addImage(logoBase64, 'PNG', 12, 22, 16, 16);
            } catch (logoError) {
                console.warn("Could not draw logo in invoice PDF", logoError);
            }
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text(sellerName, 30, 26);
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.text(`VAT No. : ${sellerVat}`, 30, 31);
            if (sellerCr) {
                doc.text(`CR No.  : ${sellerCr}`, 30, 35);
            }
        } else {
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text(sellerName, 12, 26);
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.text(`VAT No. : ${sellerVat}`, 12, 31);
            if (sellerCr) {
                doc.text(`CR No.  : ${sellerCr}`, 12, 35);
            }
        }
        
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        if (isPurchase) {
            const splitSellerAddr = doc.splitTextToSize(`Address: ${sellerAddress?.replace(/\n/g, ', ')}`, 85);
            doc.text(splitSellerAddr, 12, 40);
        } else {
            doc.text(`Tel: ${sellerPhone} | Web: ${sellerWeb}`, 12, 42);
            doc.text(`Dept: ${company?.department || ''}`, 12, 46);
        }
        const issuer = auth.currentUser?.displayName || auth.currentUser?.email || 'System User';
        doc.text(`Issuer: ${issuer}`, 12, 50);

        doc.line(10, 54, 100, 54);
        
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(isPurchase ? "Buyer / Consignee (Our Company)" : "Buyer / Consignee", 12, 58);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(buyerName, 12, 63);
        
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text("Country      : Saudi Arabia", 12, 69);
        doc.text(`VAT No.      : ${buyerVat}`, 12, 74);
        
        let recipientAddr = buyerAddress.replace(/\n/g, ', ');
        const splitAddr = doc.splitTextToSize(`Address      : ${recipientAddr}`, 85);
        doc.text(splitAddr, 12, 79);

        // Right section
        doc.line(100, 32, 200, 32);
        doc.line(100, 44, 200, 44);
        doc.line(100, 56, 200, 56);
        doc.line(100, 68, 200, 68);
        doc.line(100, 80, 200, 80);

        // Vertical split lines in right section
        doc.line(150, 20, 150, 80);

        // Box 1
        doc.setFontSize(8);
        doc.text(isPurchase ? "Purchase Inv No." : "Invoice No.", 102, 24);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(invoice.id, 102, 29);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text("Dated", 152, 24);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(invoice.date, 152, 29);
        
        // e-Inv No inside Box 1 Left
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text("e-Inv No.: 02032211043211", 102, 31);

        // Box 2
        doc.setFontSize(8);
        doc.text("Delivery Note", 102, 36);
        doc.text("Mode/Terms of Payment", 152, 36);

        // Box 3
        doc.text("Supplier's Ref.", 102, 48);
        doc.text("Other Reference(s)", 152, 48);

        // Box 4
        doc.text("Buyer's Order No.", 102, 60);
        doc.text("Dated", 152, 60);

        // Box 5
        doc.text("Despatch Document No.", 102, 72);
        doc.text("Delivery Note Date", 152, 72);

        // Box 6
        doc.text("Despatched through", 102, 84);
        doc.text("Destination", 152, 84);

        // Box 7
        doc.text("Terms of Delivery", 102, 96);

        // Items Table Headers Function
        const drawTableHeader = (startY: number) => {
            doc.setFillColor(255,255,255);
            doc.rect(10, startY, 190, 10, "F");
            doc.rect(10, startY, 190, 10);
            
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.text("Sl", 12, startY + 4);
            doc.text("No.", 11, startY + 8);
            doc.text("Description of Goods", 55, startY + 6, {align: "center"});
            doc.text("Quantity", 120, startY + 6, {align: "center"});
            doc.text("Rate", 137.5, startY + 6, {align: "center"});
            doc.text("per", 150, startY + 6, {align: "center"});
            doc.text("VAT", 161.5, startY + 4, {align: "center"});
            doc.text("%", 161.5, startY + 8, {align: "center"});
            doc.text("Amount", 184, startY + 6, {align: "center"});
        };

        const drawTableVerticalLines = (startY: number, endY: number) => {
            doc.line(10, startY, 10, endY);
            doc.line(200, startY, 200, endY);
            doc.line(18, startY, 18, endY);
            doc.line(110, startY, 110, endY);
            doc.line(130, startY, 130, endY);
            doc.line(145, startY, 145, endY);
            doc.line(155, startY, 155, endY);
            doc.line(168, startY, 168, endY);
        };

        let currentY = 110;
        let tableStartY = 100;
        drawTableHeader(tableStartY);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        currentY += 6;

        const checkPagination = (requiredSpace: number) => {
            if (currentY + requiredSpace > 280) {
                // seal the table
                const finalY = currentY + 5;
                drawTableVerticalLines(tableStartY, finalY);
                doc.line(10, finalY, 200, finalY); // bottom border
                
                doc.addPage();
                tableStartY = 20;
                drawTableHeader(tableStartY);
                currentY = tableStartY + 16;
            }
        };

        if (invoice.items && invoice.items.length > 0) {
          invoice.items.forEach((item, idx) => {
            const splitName = doc.splitTextToSize(item.name, 85);
            checkPagination(splitName.length * 6);
            
            doc.setFont("helvetica", "normal");
            doc.text((idx + 1).toString(), 14, currentY);
            doc.setFont("helvetica", "bold");
            
            doc.text(splitName, 22, currentY);
            
            doc.text(`${item.quantity}`, 120, currentY, {align: "center"});
            doc.text(item.rate.toLocaleString(undefined, {minimumFractionDigits: 2}), 143, currentY, {align: "right"});
            doc.text(item.unit, 150, currentY, {align: "center"});
            doc.text(`${item.taxRate} %`, 161.5, currentY, {align: "center"});
            doc.text(item.taxableValue.toLocaleString(undefined, {minimumFractionDigits: 2}), 198, currentY, {align: "right"});
            
            currentY += (splitName.length * 6);
          });
          
          if (invoice.discountAmount && invoice.discountAmount > 0) {
            checkPagination(10);
            currentY += 4;
            doc.setFont("helvetica", "italic");
            let discText = `Less: Discount`;
            if (invoice.discountType === 'percentage') {
               discText += ` (${invoice.discountValue}%)`;
            }
            doc.text(discText, 22, currentY);
            doc.text(`-${invoice.discountAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}`, 198, currentY, {align: "right"});
            currentY += 6;
          }
        } else {
          doc.text("1", 14, currentY);
          doc.setFont("helvetica", "bold");
          doc.text(invoice.project, 22, currentY);
          doc.text("1", 120, currentY, {align: "center"});
          doc.text(invoice.amount.toLocaleString(undefined, {minimumFractionDigits: 2}), 143, currentY, {align: "right"});
          doc.text("LS", 150, currentY, {align: "center"});
          doc.text("15 %", 161.5, currentY, {align: "center"});
          doc.text(invoice.amount.toLocaleString(undefined, {minimumFractionDigits: 2}), 198, currentY, {align: "right"});
          currentY += 6;
        }

        // Draw final table lines up to Math.max(180, currentY)
        const finalTableEndY = Math.max(tableStartY + 80, currentY + 10);
        checkPagination(finalTableEndY - currentY + 40); // Need space for totals
        
        const endY = Math.max(tableStartY + 80, currentY + 10);
        drawTableVerticalLines(tableStartY, endY);
        doc.line(10, endY, 200, endY); // Table bottom border

        checkPagination(95); // Space for totals (40) + footer (50) + margin (5)

        // Totals Block starts exactly at 'endY'
        const totalsY = endY;
        doc.rect(10, totalsY, 190, 40);
        doc.line(110, totalsY, 110, totalsY + 40); // vertical split
        doc.line(168, totalsY, 168, totalsY + 40); // vertical split for amounts

        doc.line(110, totalsY + 8, 200, totalsY + 8); 
        doc.line(10, totalsY + 16, 200, totalsY + 16);
        doc.line(110, totalsY + 25, 200, totalsY + 25);

        // Left Side Totals Text
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("Amount Chargeable (in words)", 12, totalsY + 4);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        const amountWords = numberToWords(invoice.amount);
        const splitAmountWords = doc.splitTextToSize(`${amountWords} Only (SAR ${invoice.amount.toLocaleString(undefined, {minimumFractionDigits: 2})})`, 96);
        doc.text(splitAmountWords, 12, totalsY + 9);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("VAT Amount (in words)", 12, totalsY + 20);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        const taxWords = numberToWords(invoice.tax);
        const splitTaxWords = doc.splitTextToSize(`${taxWords} Only (SAR ${invoice.tax.toLocaleString(undefined, {minimumFractionDigits: 2})})`, 96);
        doc.text(splitTaxWords, 12, totalsY + 25);

        // Right Side Totals Text
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("Taxable Value", 112, totalsY + 5);
        doc.text("Value Added Tax 15 %", 112, totalsY + 13);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Invoice Total", 112, totalsY + 22);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(invoice.amount.toLocaleString(undefined, {minimumFractionDigits: 2}), 198, totalsY + 5, {align: "right"});
        doc.text(invoice.tax.toLocaleString(undefined, {minimumFractionDigits: 2}), 198, totalsY + 13, {align: "right"});
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(invoice.total.toLocaleString(undefined, {minimumFractionDigits: 2}), 198, totalsY + 22, {align: "right"});

        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.text("E. & O.E", 198, totalsY + 30, {align: "right"});

        // Footer Block
        const footerY = totalsY + 40;
        doc.rect(10, footerY, 190, 50);
        doc.line(110, footerY + 20, 110, footerY + 50); // vertical line for signature

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("Declaration", 12, footerY + 4);
        doc.text("We declare that this invoice shows the actual price of the", 12, footerY + 8);
        doc.text("goods described and that all particulars are true and", 12, footerY + 12);
        doc.text("correct.", 12, footerY + 16);

        // Signature area
        doc.line(10, footerY + 20, 200, footerY + 20); // Horizontal line above signatures
        doc.line(40, footerY + 20, 40, footerY + 50); // Vertical line separating QR and Customer Seal
        
        doc.text("Customer's Seal and Signature", 42, footerY + 24);
        doc.setFont("helvetica", "bold");
        doc.text(isPurchase ? `for ${buyerName}` : `for ${sellerName}`, 198, footerY + 24, {align: "right"});
        doc.setFont("helvetica", "normal");
        doc.text("Authorised Signatory", 198, footerY + 48, {align: "right"});

        // ZATCA Compliant QR Code (Saudi Arabia Zakat, Tax and Customs Authority)
        const compName = sellerName;
        const vatReg = sellerVat;
        const isoTimestamp = getZatcaTimestamp(invoice.date, invoice.createdAt);
        const qrContent = generateZatcaBase64(
          compName,
          vatReg,
          isoTimestamp,
          invoice.total,
          invoice.tax
        );
        
        let qrDataUrl = "";
        try {
          const qrEngine = (QRCode as any).toDataURL || ((QRCode as any).default && (QRCode as any).default.toDataURL);
          if (typeof qrEngine === "function") {
            qrDataUrl = await qrEngine(qrContent, { margin: 0 });
          } else {
            console.warn("Direct QRCode.toDataURL not found, falling back to direct call");
            qrDataUrl = await (QRCode as any)(qrContent, { margin: 0 });
          }
        } catch (qrError) {
          console.error("QR Code generation failed for invoice PDF:", qrError);
        }

        if (qrDataUrl) {
          try {
            doc.addImage(qrDataUrl, 'PNG', 11, footerY + 21, 28, 28);
          } catch (addImageError) {
            console.error("Failed to add QR image to PDF:", addImageError);
          }
        }

        // Centered Computer Generated Invoice text
        doc.setFontSize(8);
        doc.text("This is a Computer Generated Invoice", 105, footerY + 55, {align: "center"});

        doc.save(`Tax_Invoice_${invoice.id}.pdf`);
      } catch (error) {
        console.error("PDF download failed:", error);
      }
    };

    const handleDelete = (id: string) => {
      if (window.confirm('Are you sure you want to permanently decommission this financial node? This action is irreversible.')) {
        setInvoices(prev => prev.filter(inv => inv.id !== id));
      }
    };

    const handleSort = (key: SortKey) => {
      setSortConfig(prev => ({
        key,
        direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
      }));
    };

    const filteredInvoices = React.useMemo(() => {
      const filtered = invoices.filter(inv => {
        const matchesType = (inv.type || 'Sales') === invoiceType;
        const matchesSearch = (inv.id || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
          (inv.project || '').toLowerCase().includes((searchTerm || '').toLowerCase());
        return matchesType && matchesSearch;
      });

      if (!sortConfig.direction) return filtered;

      return [...filtered].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === bValue) return 0;
        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        const comparison = aValue < bValue ? -1 : 1;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }, [invoices, searchTerm, sortConfig]);

  const SortIndicator = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortConfig.key !== columnKey) return <ChevronsUpDown className="w-3 h-3 text-slate-300" />;
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="w-3 h-3 text-red-600" /> 
      : <ChevronDown className="w-3 h-3 text-red-600" />;
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">{t.finance}</h2>
          <p className="text-slate-500 text-sm italic font-medium">ZATCA e-Invoicing Phase 2 Integrity Node.</p>
        </div>
        <div className="flex gap-3 print:hidden">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportExcel} 
            className="hidden" 
            accept=".xlsx, .xls"
          />
          {hasPermission('accounting', 'finance', 'edit') && (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Import Excel
            </button>
          )}
          {hasPermission('accounting', 'finance', 'export') && (
            <button 
              onClick={exportToExcel}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export to Excel
            </button>
          )}
          {hasPermission('accounting', 'finance', 'create') && (
            <button 
              onClick={() => setIsCreatingInvoice(true)}
              className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-semibold hover:bg-slate-800 transition-colors shadow-md flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Invoice
            </button>
          )}
          {hasPermission('hr', 'payroll', 'create') && (
            <button 
              onClick={() => setActiveTab('Payrolls')}
              className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-semibold hover:bg-red-700 transition-colors shadow-md shadow-red-100"
            >
              Execute Payroll
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-slate-100 w-full overflow-x-auto whitespace-nowrap pb-px">
        {hasPermission('accounting', 'finance', 'view') && (
          <button
            onClick={() => setActiveTab('Invoices')}
            className={cn(
              "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all relative flex items-center gap-2",
              activeTab === 'Invoices' ? "text-red-600" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Receipt className="w-4 h-4" />
            A/P Ledgers
            {activeTab === 'Invoices' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />}
          </button>
        )}
        {hasPermission('hr', 'payroll', 'view') && (
          <button
            onClick={() => setActiveTab('Payrolls')}
            className={cn(
              "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all relative flex items-center gap-2",
              activeTab === 'Payrolls' ? "text-red-600" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Users className="w-4 h-4" />
            Payroll Cycles
            {activeTab === 'Payrolls' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />}
          </button>
        )}
        {hasPermission('accounting', 'finance', 'view') && (
          <button
            onClick={() => setActiveTab('Costing')}
            className={cn(
              "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all relative flex items-center gap-2",
              activeTab === 'Costing' ? "text-red-600" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Calculator className="w-4 h-4" />
            Project Costing
            {activeTab === 'Costing' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />}
          </button>
        )}
        {hasPermission('hr', 'workforce', 'view') && (
          <button
            onClick={() => setActiveTab('Ledgers')}
            className={cn(
              "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all relative flex items-center gap-2",
              activeTab === 'Ledgers' ? "text-red-600" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <FileText className="w-4 h-4" />
            Employee Ledgers
            {activeTab === 'Ledgers' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />}
          </button>
        )}
        {hasPermission('accounting', 'accounting-tree', 'view') && (
          <button
            onClick={() => setActiveTab('AccountingTree')}
            className={cn(
              "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all relative flex items-center gap-2 text-emerald-600",
              activeTab === 'AccountingTree' ? "text-emerald-700 bg-emerald-50" : "hover:text-emerald-700 hover:bg-slate-50"
            )}
          >
            <FileText className="w-4 h-4" />
            AI Accounting Tree
            {activeTab === 'AccountingTree' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />}
          </button>
        )}
        <button
          onClick={() => onNavigate && onNavigate('procurement')}
          className={cn(
            "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all relative flex items-center gap-2",
            "text-slate-400 hover:text-slate-600"
          )}
        >
          <FileText className="w-4 h-4" />
          Quotations
        </button>
        <button
          onClick={() => onNavigate && onNavigate('procurement')}
          className={cn(
            "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all relative flex items-center gap-2",
            "text-slate-400 hover:text-slate-600"
          )}
        >
          <ShoppingCart className="w-4 h-4" />
          Purchase Orders
        </button>
      </div>

      {/* Main Grid */}
      {activeTab === 'Invoices' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Invoice List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex bg-slate-100 p-1 rounded-lg w-fit mb-4">
            <button 
              onClick={() => setInvoiceType('Sales')}
              className={cn("px-6 py-2 rounded-md font-bold uppercase tracking-widest text-[10px] transition-all", invoiceType === 'Sales' ? "bg-white text-red-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Sales Invoices
            </button>
            <button 
              onClick={() => setInvoiceType('Purchase')}
              className={cn("px-6 py-2 rounded-md font-bold uppercase tracking-widest text-[10px] transition-all", invoiceType === 'Purchase' ? "bg-white text-red-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Purchase Invoices
            </button>
          </div>
          <div className="flex gap-4">
            <div className="flex-1 glass-panel px-4 py-2 rounded-lg flex items-center gap-3 bg-white border border-slate-200">
              <Search className="w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by reference node or asset group..." 
                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400"
              />
            </div>
            <button className="glass-panel p-2 rounded-lg text-slate-600 hover:bg-slate-50 border border-slate-200">
              <Filter className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-auto bg-transparent pb-4">
            <div className="overflow-x-auto w-full min-w-full"><div className="min-w-max">
          <table className="w-full text-left border-collapse" style={{borderCollapse: 'separate', borderSpacing: '0 8px'}}>
              <thead>
                <tr className="">
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100/50 transition-colors rounded-l-xl"
                    onClick={() => handleSort('id')}
                  >
                    <div className="flex items-center gap-2">
                       Node
                       <SortIndicator columnKey="id" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100/50 transition-colors"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-2">
                      Date
                      <SortIndicator columnKey="date" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100/50 transition-colors"
                    onClick={() => handleSort('project')}
                  >
                    <div className="flex items-center gap-2">
                      Project
                      <SortIndicator columnKey="project" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right cursor-pointer hover:bg-slate-100/50 transition-colors"
                    onClick={() => handleSort('total')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Liquidity
                      <SortIndicator columnKey="total" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center cursor-pointer hover:bg-slate-100/50 transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      Status
                      <SortIndicator columnKey="status" />
                    </div>
                  </th>
                  <th className="px-6 py-4 rounded-r-xl"></th>
                </tr>
              </thead>
              <tbody className="">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="bg-white hover:bg-slate-50 transition-colors group shadow-sm rounded-xl overflow-hidden">
                    <td className="px-6 py-4 rounded-l-xl border-l border-y border-slate-100">
                      <p className="text-sm font-mono font-bold text-slate-900">{inv.id}</p>
                    </td>
                    <td className="px-6 py-4 border-y border-slate-100">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">{formatDate(inv.date || inv.createdAt)}</p>
                    </td>
                    <td className="px-6 py-4 border-y border-slate-100">
                      <p className="text-sm text-slate-700 font-bold">
                        {inv.project ? d(inv.project) : <span className="text-slate-400 italic font-normal">{d('No Linked Project')}</span>}
                      </p>
                      {inv.submittedBy && (
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {d('Submitted by')}: <span className="font-semibold text-slate-500">{inv.submittedBy.name}</span>
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right border-y border-slate-100">
                      <p className="text-sm font-bold text-slate-900">{formatCurrency(inv.total)}</p>
                      <p className="text-[10px] text-slate-400 font-mono">VAT_INCL_15%</p>
                    </td>
                    <td className="px-6 py-4 text-center border-y border-slate-100">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-bold uppercase",
                        inv.status === 'Paid' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                        inv.status === 'Approved' ? "bg-emerald-600 text-white border-emerald-600" :
                        inv.status === 'Pending Official Approval' ? "bg-amber-600 text-white border-amber-600" :
                        inv.status === 'Pending Finance' ? "bg-red-600 text-white border-red-600" :
                        inv.status === 'Sent' ? "bg-red-50 text-red-700 border-red-100" :
                        "bg-slate-100 text-slate-600 border-slate-200"
                      )}>
                        {inv.status === 'Paid' || inv.status === 'Approved' ? <CheckCircle2 className="w-3 h-3" /> : 
                         inv.status === 'Pending Finance' || inv.status === 'Pending Official Approval' || inv.status === 'Sent' ? <Clock className="w-3 h-3" /> : 
                         <AlertCircle className="w-3 h-3" />}
                        {d(inv.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right rounded-r-xl border-r border-y border-slate-100">
                      <div className="flex items-center justify-end gap-2">
                        {NEXT_STATUS[inv.status] && hasPermission('accounting', 'finance', 'approve') && (
                          <button 
                            onClick={() => handleTransition(inv)}
                            disabled={processingId === inv.id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white rounded text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-sm disabled:opacity-50"
                          >
                            {processingId === inv.id ? (
                              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                              <>
                                {inv.status === 'Draft' ? 'Submit' : 
                                 inv.status === 'Pending Finance' ? 'Finance Verify' : 
                                 inv.status === 'Pending Official Approval' ? 'Official Approve' : 'Send'}
                                <ArrowRight className="w-3 h-3" />
                              </>
                            )}
                          </button>
                        )}
                        {!NEXT_STATUS[inv.status] && inv.qrCodeData && (
                          <div className="group relative">
                            <QrCode className="w-4 h-4 text-emerald-500 cursor-help" />
                            <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-900 text-[8px] text-white rounded hidden group-hover:block break-all font-mono z-10">
                              {inv.qrCodeData}
                            </div>
                          </div>
                        )}
                        {hasPermission('accounting', 'finance', 'print') && (
                          <button 
                            onClick={() => handleDownloadPdf(inv)}
                            className="p-1.5 text-slate-400 hover:text-red-600 border border-slate-100 rounded bg-white transition-colors"
                            title="Download PDF Invoice"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        {(inv.status === 'Draft' || inv.status === 'Pending Finance') && hasPermission('accounting', 'finance', 'edit') ? (
                          <button 
                            onClick={() => handleEditInvoice(inv)}
                            className="p-1.5 text-slate-400 hover:text-red-600 border border-slate-100 rounded bg-white transition-colors"
                            title="Edit Invoice"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        ) : null}
                        {hasPermission('accounting', 'finance', 'delete') && (
                          <button 
                            onClick={() => handleDeleteInvoice(inv.id, { stopPropagation: () => {} } as React.MouseEvent)}
                            className="p-1.5 text-slate-400 hover:text-red-600 border border-slate-100 rounded bg-white transition-colors"
                            title="Delete Invoice"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div></div>
          </div>
        </div>

        {/* Compliance & Approvals Queue */}
        <div className="lg:col-span-4 space-y-6">
          <div className="dark-section">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                Live Signature Queue
                <ShieldCheck className="w-4 h-4 text-red-400" />
              </h3>
              <button 
                onClick={async () => {
                   const pending = invoices.filter(inv => inv.status === 'Pending Finance' || inv.status === 'Pending Official Approval');
                   for (const inv of pending) {
                      await handleTransition(inv);
                   }
                }}
                className="text-[9px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors bg-red-400/10 hover:bg-red-400/20 px-2 py-1 rounded"
              >
                Bulk Sign
              </button>
            </div>
            <div className="space-y-3">
              {invoices.filter((inv) => inv.status === 'Pending Finance' || inv.status === 'Pending Official Approval').map((inv) => (
                <div 
                  key={inv.id} 
                  onClick={() => !processingId && handleTransition(inv)}
                  className={cn(
                    "p-3 bg-slate-700/50 rounded-lg border border-slate-600 hover:border-red-400 cursor-pointer transition-colors group relative overflow-hidden",
                    processingId === inv.id && "pointer-events-none opacity-50"
                  )}
                >
                  {processingId === inv.id && (
                    <div className="absolute inset-0 bg-slate-900/20 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-semibold text-slate-100">{inv.project}</p>
                    <span className={cn(
                      "text-[8px] font-bold uppercase tracking-tighter",
                      inv.status === 'Pending Finance' ? "text-red-400" : "text-amber-400"
                    )}>
                      {inv.status === 'Pending Finance' ? 'Finance Review' : 'Official Review'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[10px] text-slate-400 font-mono">{formatCurrency(inv.total)}</span>
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded-full border font-bold uppercase transition-colors",
                      inv.status === 'Pending Finance' 
                        ? "bg-red-500/20 text-red-400 border-red-500/30" 
                        : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    )}>
                      Signature req.
                    </span>
                  </div>
                </div>
              ))}
              {invoices.filter((inv) => inv.status === 'Pending Finance' || inv.status === 'Pending Official Approval').length === 0 && (
                <p className="text-[10px] text-slate-500 italic py-4 text-center">No items awaiting signature.</p>
              )}
            </div>
          </div>

          <div className="glass-panel p-6 bg-white">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Liquidity Outlook</h4>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-[11px] mb-2">
                  <span className="text-slate-500 font-medium tracking-tight">Operating Reserves</span>
                  <span className="font-bold text-slate-900">72%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-600" style={{ width: '72%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-2">
                  <span className="text-slate-500 font-medium tracking-tight">Tax Encumbrance</span>
                  <span className="font-bold text-slate-900">18.4%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-500" style={{ width: '18.4%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      ) : activeTab === 'Costing' ? (
        <div className="space-y-6">
          {isCreatingCosting ? (
            <div className="glass-panel p-8 bg-white border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                    <Calculator className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight leading-tight">New Project Cost Sheet</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Asset Node Financial Estimation</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setIsCreatingCosting(false); setEditingCostSheetId(null); }}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleRegisterCosting}
                    className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-red-700 shadow-md transition-all active:scale-95"
                  >
                    <Save className="w-4 h-4" />
                    {editingCostSheetId ? 'Update Calculation' : 'Register Calculation'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Reference Node</label>
                  <select 
                    value={`${currentCostSheet.projectId || ''}|${currentCostSheet.projectName || ''}`}
                    onChange={(e) => {
                      const [id, name] = e.target.value.split('|');
                      setCurrentCostSheet(prev => ({ ...prev, projectId: id, projectName: name }));
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500 transition-all"
                  >
                    <option value="">Select Project Node</option>
                    {projects && projects.length > 0 ? (
                       projects.map(p => (
                         <option key={p.id} value={`${p.id}|${p.name}`}>{p.name} ({p.id})</option>
                       ))
                    ) : (
                       <option disabled>No projects found. Please register a project.</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Calculation Date</label>
                  <input 
                    type="date" 
                    value={currentCostSheet.date}
                    onChange={(e) => setCurrentCostSheet(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm outline-none font-mono" 
                  />
                </div>
                <div>
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Node ID</label>
                   <div className="px-3 py-2 bg-slate-100 rounded text-sm font-mono text-slate-500 italic uppercase">
                     {currentCostSheet.projectId || "Awaiting Selection"}
                   </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-1">Cost Breakdown Matrix</h4>
                  <button 
                    onClick={handleAddCostItem}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Add Item Node</span>
                  </button>
                </div>

                <div className="border border-slate-100 rounded-lg overflow-auto resize-y">
                  <div className="overflow-x-auto w-full min-w-full"><div className="min-w-max">
          <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Category</th>
                        <th className="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                        <th className="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest w-24">QTY</th>
                        <th className="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest w-24">Unit</th>
                        <th className="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Unit Rate</th>
                        <th className="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Ext. Total</th>
                        <th className="px-4 py-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {(currentCostSheet.items || []).map((item) => (
                        <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2">
                            <select 
                              value={item.category}
                              onChange={(e) => handleUpdateCostItem(item.id, 'category', e.target.value)}
                              className="w-full bg-transparent border-none text-[11px] font-bold text-slate-700 outline-none uppercase"
                            >
                              <option>Labor</option>
                              <option>Material</option>
                              <option>Equipment</option>
                              <option>Overhead</option>
                              <option>Subcontract</option>
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              type="text" 
                              value={item.description}
                              onChange={(e) => handleUpdateCostItem(item.id, 'description', e.target.value)}
                              placeholder="Describe expense node..."
                              className="w-full bg-transparent border-none text-sm font-medium outline-none placeholder:text-slate-300"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              type="number" 
                              value={item.quantity}
                              onChange={(e) => handleUpdateCostItem(item.id, 'quantity', Number(e.target.value))}
                              className="w-full bg-transparent border-none text-sm font-mono outline-none" 
                            />
                          </td>
                          <td className="px-4 py-2">
                             <input 
                              type="text" 
                              value={item.unit}
                              onChange={(e) => handleUpdateCostItem(item.id, 'unit', e.target.value)}
                              className="w-full bg-transparent border-none text-[10px] font-bold uppercase tracking-widest text-slate-500 outline-none" 
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              type="number" 
                              value={item.unitPrice}
                              onChange={(e) => handleUpdateCostItem(item.id, 'unitPrice', Number(e.target.value))}
                              className="w-full bg-transparent border-none text-sm font-mono text-right outline-none" 
                            />
                          </td>
                          <td className="px-4 py-2 text-right">
                             <span className="text-sm font-mono font-bold text-slate-900">{formatCurrency(item.total)}</span>
                          </td>
                          <td className="px-4 py-2">
                            <button 
                              onClick={() => setCurrentCostSheet(prev => ({ ...prev, items: (prev.items || []).filter(i => i.id !== item.id) }))}
                              className="text-slate-200 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {(currentCostSheet.items || []).length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center">
                            <div className="flex flex-col items-center justify-center gap-3">
                              <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                                <Plus className="w-5 h-5" />
                              </div>
                              <p className="text-xs text-slate-400 italic">No line items initialized. Add an item node to begin calculation.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
        </div></div>
                </div>

                <div className="flex justify-end pt-6">
                  <div className="w-72 space-y-3">
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>Subtotal Aggregate</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatCurrency((currentCostSheet.items || []).reduce((acc, i) => acc + i.total, 0))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>VAT Commitment (15%)</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatCurrency((currentCostSheet.items || []).reduce((acc, i) => acc + i.total, 0) * 0.15)}
                      </span>
                    </div>
                    <div className="h-px bg-slate-100 my-2" />
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Grand Total utilization</span>
                      <span className="text-xl font-mono font-bold text-red-600">
                        {formatCurrency((currentCostSheet.items || []).reduce((acc, i) => acc + i.total, 0) * 1.15)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Registered Cost Sheets</h3>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-bold opacity-60">Archived Financial Node Estimations</p>
                </div>
                {hasPermission('accounting', 'finance', 'create') && (
                  <button 
                    onClick={() => setIsCreatingCosting(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    New Costing Node
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {costSheets.map((sheet) => (
                  <div key={sheet.id} className="glass-panel p-6 bg-white border border-slate-100 hover:border-red-400 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-slate-50 text-slate-400 rounded-lg group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter bg-emerald-500 text-white">
                          Registered
                        </span>
                        <p className="text-[9px] text-slate-400 font-mono mt-1">{sheet.id}</p>
                      </div>
                    </div>
                    
                    <h4 className="text-sm font-bold text-slate-900 mb-1">{sheet.projectName}</h4>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-4">{formatDate(sheet.date)}</p>
                    
                    <div className="flex flex-col gap-2 pt-4 border-t border-slate-50">
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Final Calculation</p>
                        <p className="text-lg font-mono font-bold text-slate-900 leading-none">{formatCurrency(sheet.grandTotal)}</p>
                      </div>
                      <div className="flex gap-2 mt-2">
                         {hasPermission('accounting', 'finance', 'print') && (
                          <button 
                              onClick={() => handlePrintCostSheet(sheet)}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 text-slate-600 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95 border border-slate-200"
                              title="Print Detail Report"
                          >
                              <Printer className="w-3 h-3" />
                              Print
                          </button>
                         )}
                         {hasPermission('accounting', 'finance', 'export') && (
                          <button 
                              onClick={() => handleDownloadCostSheetExcel(sheet)}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-red-100 transition-all active:scale-95 border border-red-100"
                              title="Export Breakdown"
                          >
                              <Download className="w-3 h-3" />
                              Excel
                          </button>
                         )}
                      </div>
                      <div className="flex justify-between border-t border-slate-100 pt-3 mt-2">
                          {hasPermission('accounting', 'finance', 'edit') && (
                            <button onClick={() => handleEditCostSheet(sheet)} className="text-[10px] font-bold uppercase tracking-wider text-red-500 hover:text-red-700 flex items-center gap-1">
                                <Edit3 className="w-3 h-3" /> Edit
                            </button>
                          )}
                          {hasPermission('accounting', 'finance', 'delete') && (
                            <button onClick={(e) => handleDeleteCostSheet(sheet.id, e)} className="text-[10px] font-bold uppercase tracking-wider text-red-500 hover:text-red-700 flex items-center gap-1">
                                <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          )}
                      </div>
                    </div>
                  </div>
                ))}
                {costSheets.length === 0 && (
                  <div className="col-span-full py-24 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4">
                      <Calculator className="w-8 h-8" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">No cost nodes detected</h4>
                    <p className="text-[10px] text-slate-300 italic">Initialize a new project cost sheet to begin financial tracking.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ) : activeTab === 'Payrolls' ? (
        <PayrollManager 
          workers={workers} 
          projects={projects} 
          company={company} 
          language={language} 
        />
      ) : activeTab === 'Ledgers' ? (
        <div className="space-y-6">
          <div className="glass-panel overflow-auto resize-y border border-slate-200 bg-white min-h-[400px] p-6">
            <h2 className="text-lg font-bold uppercase tracking-widest mb-4">Employee Financial Ledgers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workers.map(worker => (
                <div key={worker.id} className="glass-panel p-6 border border-slate-200 bg-slate-50/50">
                  <h3 className="font-bold text-slate-800">{worker.name}</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold">{worker.role}</p>
                  <p className="font-mono text-[11px] mb-1 text-slate-700">Daily Rate: {formatCurrency(worker.dailyRate)}</p>
                  <p className="font-mono text-[11px] mb-4 text-slate-700">Equipment Rate: {formatCurrency(worker.equipmentDailyRate)}</p>
                  <button 
                    onClick={() => {
                        import('../lib/pdfUtils').then(({ generateStandardPDF }) => {
                            const { doc, startY } = generateStandardPDF(`FINANCIAL LEDGER: ${worker.name}`, company);
                            let y = startY;
                            doc.text(`Employee ID: ${worker.id}`, 14, y); y+=8;
                            doc.text(`Name: ${worker.name}`, 14, y); y+=8;
                            doc.text(`Job Title: ${worker.role}`, 14, y); y+=8;
                            doc.text(`Department: ${worker.department || 'N/A'}`, 14, y); y+=8;
                            doc.text(`Status: ${worker.status}`, 14, y); y+=8;
                            doc.text(`Campus/Room: ${worker.campus} - Rm ${worker.room}`, 14, y); y+=8;
                            doc.text(`ID Expiry: ${worker.idExpiryDate || 'N/A'}`, 14, y); y+=8;
                            doc.text(`Ins. Start: ${worker.insuranceStartDate || 'N/A'}`, 14, y); y+=8;
                            doc.text(`Ins. Expiry: ${worker.insuranceExpiryDate || 'N/A'}`, 14, y); y+=16;
                            
                            doc.text(`FINANCIAL SUMMARY`, 14, y); y+=8;
                            doc.text(`Salary / Daily Rate: ${formatCurrency(worker.dailyRate)}`, 14, y); y+=8;
                            doc.text(`Equipment Allowance: ${formatCurrency(worker.equipmentDailyRate)}`, 14, y); y+=8;
                            doc.text(`Meals Category: ${worker.meals}`, 14, y); y+=8;
                            doc.text(`Vacations / Commissions / Deductions: Administered centrally`, 14, y); y+=16;

                            doc.text(`Authorized by: Financial Accounting`, 14, y);
                            
                            doc.save(`Ledger_${worker.id}.pdf`);
                        });
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-white text-red-700 font-bold text-[10px] uppercase px-4 py-2 rounded tracking-widest border border-slate-200 hover:border-red-300 hover:bg-red-50 transition-colors shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                    Print Full Ledger
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === 'AccountingTree' ? (
        <AccountingTree language={language} company={company} />
      ) : activeTab as string === 'Quotations' ? (
        <div className="glass-panel overflow-auto resize-y border border-slate-200 bg-white p-6 min-h-[400px] flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-2">Quotations Directory</h4>
          <p className="text-xs text-slate-500 max-w-md">Issue and manage pricing quotations for clients. Features including PDF export and approval workflow are initialized here.</p>
          <button onClick={() => onNavigate && onNavigate('procurement')} className="mt-6 flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded font-bold uppercase tracking-widest text-xs hover:bg-black transition-all shadow-md">
            <ArrowRight className="w-4 h-4" />
            Go to Procurement
          </button>
        </div>
      ) : activeTab as string === 'Purchase Orders' ? (
        <div className="glass-panel overflow-auto resize-y border border-slate-200 bg-white p-6 min-h-[400px] flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4">
            <ShoppingCart className="w-8 h-8" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-2">Purchase Orders Central</h4>
          <p className="text-xs text-slate-500 max-w-md">Manage outbound orders to suppliers and vendors. Track fulfillment and financial obligations.</p>
          <button onClick={() => onNavigate && onNavigate('procurement')} className="mt-6 flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded font-bold uppercase tracking-widest text-xs hover:bg-black transition-all shadow-md">
            <ArrowRight className="w-4 h-4" />
            Go to Procurement
          </button>
        </div>
      ) : null}

      {isCreatingInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mt-10 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">New {invoiceType} Invoice</h3>
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Generate {invoiceType === 'Sales' ? 'A/R' : 'A/P'} Ledger Document</p>
              </div>
              <button 
                onClick={closeInvoiceModal}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateInvoice} className="p-6 overflow-y-auto min-h-0 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 col-span-1 md:col-span-2">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">Internal Metadata</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Type</label>
                      <select 
                        value={invoiceType}
                        onChange={(e) => setInvoiceType(e.target.value as 'Sales' | 'Purchase')}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                      >
                        <option value="Sales">Sales Invoice</option>
                        <option value="Purchase">Purchase Invoice</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Project Association</label>
                      <select 
                        value={invoiceProjectMode}
                        onChange={(e) => setInvoiceProjectMode(e.target.value as 'linked' | 'custom' | 'none')}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-medium"
                      >
                        <option value="linked">Link Registered Project</option>
                        <option value="custom">Type Custom Project Name</option>
                        <option value="none">None (Optional / Stand-alone)</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Date</label>
                      <input 
                        type="date"
                        name="date"
                        required
                        defaultValue={new Date().toISOString().split('T')[0]}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                      />
                    </div>
                  </div>
                  
                  {/* Dynamic field selection */}
                  {invoiceProjectMode === 'linked' && (
                    <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-md animate-in fade-in duration-200">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-2">Linked Project Node</label>
                      <select 
                        name="projectId"
                        required
                        className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                        defaultValue={invoices.find(i => i.id === editingInvoiceId)?.projectId || ''}
                      >
                        <option value="">Select a registered project...</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.id} - {p.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {invoiceProjectMode === 'custom' && (
                    <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-md animate-in fade-in duration-200">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-2">Type Project Name</label>
                      <input 
                        type="text"
                        required
                        placeholder="Enter project name..."
                        value={customProjectName}
                        onChange={(e) => setCustomProjectName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-medium text-slate-900"
                      />
                    </div>
                  )}

                  {invoiceProjectMode === 'none' && (
                    <div className="mt-4 p-3 bg-slate-50/50 border border-dashed border-slate-200 rounded-md animate-in fade-in duration-150">
                      <p className="text-[10px] text-slate-400 font-medium italic">General operating costs: This invoice will not be registered under any project’s financial ledger.</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4 col-span-1 md:col-span-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Invoice Items</h4>
                    <button type="button" onClick={handleAddInvoiceItem} className="text-red-600 hover:text-red-700 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add Item
                    </button>
                  </div>
                  
                  {invoiceItems.length > 0 ? (
                    <div className="space-y-3">
                      {invoiceItems.map((item, idx) => (
                        <div key={item.id} className="flex gap-2 items-start bg-slate-50 p-2 rounded border border-slate-200">
                          <div className="flex-1 space-y-2">
                            <input 
                              placeholder="Description" 
                              value={item.name} 
                              onChange={e => handleUpdateInvoiceItem(item.id, 'name', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-red-500 outline-none" 
                              required
                            />
                            <div className="flex gap-2">
                              <input 
                                type="number" 
                                placeholder="Qty" 
                                value={item.quantity} 
                                onChange={e => handleUpdateInvoiceItem(item.id, 'quantity', Number(e.target.value))}
                                className="w-20 bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-red-500 outline-none"
                                required min="0.01" step="0.01"
                              />
                              <input 
                                placeholder="Unit (e.g. Nos)" 
                                value={item.unit} 
                                onChange={e => handleUpdateInvoiceItem(item.id, 'unit', e.target.value)}
                                className="w-24 bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-red-500 outline-none"
                                required
                              />
                              <input 
                                type="number" 
                                placeholder="Rate" 
                                value={item.rate} 
                                onChange={e => handleUpdateInvoiceItem(item.id, 'rate', Number(e.target.value))}
                                className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-red-500 outline-none"
                                required min="0" step="0.01"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col items-end pt-1 px-2 min-w-[100px]">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Line Total</span>
                            <span className="text-sm font-mono text-slate-900">{formatCurrency(item.taxableValue)}</span>
                            <span className="text-[9px] text-slate-400">Tax: {formatCurrency(item.taxAmount)} (15%)</span>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveInvoiceItem(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 bg-white rounded border border-slate-200 hover:border-red-200 transition-colors mt-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded">
                      <p className="text-xs text-slate-500 font-medium">No items added to invoice.</p>
                      <button type="button" onClick={handleAddInvoiceItem} className="mt-2 text-red-600 hover:text-red-700 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-1 mx-auto">
                        <Plus className="w-3 h-3" /> Add First Item
                      </button>
                    </div>
                  )}

                  {invoiceItems.length > 0 && (
                    <div className="bg-slate-50 p-4 border border-slate-200 rounded mt-4 flex flex-col gap-2">
                       <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-500 uppercase">Items Subtotal:</span>
                          <span className="font-mono">{formatCurrency(invoiceItems.reduce((acc, item) => acc + item.taxableValue, 0))}</span>
                       </div>
                       
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200 border-dashed">
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1 block">Discount Type</label>
                            <select 
                              value={invoiceDiscountType} 
                              onChange={e => setInvoiceDiscountType(e.target.value as any)}
                              className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-red-500 outline-none"
                            >
                               <option value="fixed">Fixed Amount (SAR)</option>
                               <option value="percentage">Percentage (%)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1 block">Discount Value</label>
                            <input 
                              type="number"
                              value={invoiceDiscountValue}
                              onChange={e => setInvoiceDiscountValue(Math.max(0, Number(e.target.value)))}
                              className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-red-500 outline-none"
                              min="0" step={invoiceDiscountType === 'percentage' ? '1' : '0.01'}
                            />
                          </div>
                       </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4 col-span-1 md:col-span-2">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">Recipient Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Recipient Company Name</label>
                      <input 
                        type="text"
                        name="recipientName"
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Recipient Tax ID (VAT Number)</label>
                      <input 
                        type="text"
                        name="recipientTaxId"
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2 col-span-1 md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Recipient Address</label>
                      <textarea 
                        name="recipientAddress"
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none h-20"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={closeInvoiceModal}
                  className="px-6 py-2 border border-slate-200 rounded text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-red-600 text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-colors flex items-center gap-2 shadow-md shadow-red-100"
                >
                  <Save className="w-4 h-4" />
                  Generate Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
