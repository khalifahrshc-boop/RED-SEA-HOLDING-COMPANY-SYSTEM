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
import { cn, formatCurrency, formatDate, getCleanLogoBase64 } from '@/src/lib/utils';
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
      { id: '1', description: 'Structural Steel', type: 'Material', unit: 'Ton', quantity: 50, unitPrice: 20000, total: 1000000 },
      { id: '2', description: 'Concrete Reinforcement', type: 'Material', unit: 'Ton', quantity: 200, unitPrice: 1250, total: 250000 }
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
      { id: '1', description: 'Electrical Converters', type: 'Equipment', unit: 'PC', quantity: 15, unitPrice: 30000, total: 450000 }
    ]
  },
  {
    id: 'PQ-2024-003',
    projectId: 'P1',
    vendorName: 'Global Concrete',
    date: '2024-04-05',
    totalAmount: 150000,
    status: 'Internal Review',
    items: [{ id: '1', description: 'Concrete Mix', type: 'Material', unit: 'm3', quantity: 100, unitPrice: 1500, total: 150000 }]
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
      { id: '1', description: 'Structural Steel', type: 'Material', unit: 'Ton', quantity: 50, unitPrice: 20000, total: 1000000 },
      { id: '2', description: 'Concrete Reinforcement', type: 'Material', unit: 'Ton', quantity: 200, unitPrice: 1250, total: 250000 }
    ]
  }
];

import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../contexts/AuthContext';

import { notificationService } from '../lib/notificationService';

interface ProcurementProps {
  projects: Project[];
  language: Language;
  onUpdateProject: (p: Project) => void;
  company?: any;
}

export function Procurement({ projects, language, onUpdateProject, company }: ProcurementProps) {
  const { t, d } = useTranslation(language);
  const { hasPermission } = useAuth();

  if (!hasPermission('external_admin', 'procurement', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-xl border border-slate-200 p-8 text-center ring-1 ring-slate-100">
        <Package className="w-12 h-12 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2 uppercase tracking-tight">Access Restricted</h2>
        <p className="text-slate-500 max-w-sm italic">You do not have the required permissions to access the Procurement Matrix. Contact your department lead for clearance.</p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = React.useState<'quotes' | 'pos'>('quotes');
  const [quotes, setQuotes] = useLocalStorage<PriceQuote[]>('ares_quotes', dummyQuotes);
  const [pos, setPos] = useLocalStorage<PurchaseOrder[]>('ares_pos', dummyPOs);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [currentItem, setCurrentItem] = React.useState<any>(null);
  const [quoteItems, setQuoteItems] = React.useState<QuoteItem[]>([]);
  const [terms, setTerms] = React.useState<string[]>([
    'Prices are valid for 30 days from the date of quotation.',
    'Delivery will be made within 7-10 working days after receiving the PO.',
    'Payment terms: 50% advance, 50% upon delivery.',
    'All prices are subject to 15% VAT calculation.',
    'Installation and commissioning are included unless stated otherwise.',
    'Warranty: 1 year manufacturer warranty on all items.'
  ]);
  const [quoteTaxRate, setQuoteTaxRate] = React.useState<number>(15);

  const addQuoteItem = () => {
    const newItem: QuoteItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: '',
      type: '',
      unit: 'PC',
      quantity: 1,
      unitPrice: 0,
      total: 0
    };
    setQuoteItems([...quoteItems, newItem]);
  };

  const removeQuoteItem = (id: string) => {
    setQuoteItems(quoteItems.filter(i => i.id !== id));
  };

  const updateQuoteItem = (id: string, field: keyof QuoteItem, value: any) => {
    setQuoteItems(quoteItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.total = updated.quantity * updated.unitPrice;
        }
        return updated;
      }
      return item;
    }));
  };

  const addTerm = () => setTerms([...terms, 'New term...']);
  const removeTerm = (idx: number) => setTerms(terms.filter((_, i) => i !== idx));
  const updateTerm = (idx: number, val: string) => {
    const newTerms = [...terms];
    newTerms[idx] = val;
    setTerms(newTerms);
  };

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
    import('../lib/pdfUtils').then(async ({ reshapeArabic, getZatcaTimestamp, generateZatcaBase64 }) => {
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const isQuote = activeTab === 'quotes';
      const docType = isQuote ? 'PRICE QUOTE' : 'PURCHASE ORDER';
      const colors = {
        primary: [185, 28, 28], // Red-700
        secondary: [248, 250, 252], // Slate-50
        text: [30, 41, 59], // Slate-900
        muted: [100, 116, 139], // Slate-500
        white: [255, 255, 255]
      };

      // Header Logic
      const logoBase64 = getCleanLogoBase64(company?.logo);
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', 14, 10, 25, 25);
        } catch (e) {
          console.error("Logo add failed", e);
        }
      }

      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(company?.name || 'RED SEA HOLDING COMPANY', 42, 18);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
      doc.text(company?.headquarters || 'RIYADH, SAUDI ARABIA', 42, 23);
      doc.text(`VAT: ${company?.vatNumber || 'N/A'} | CR: ${company?.crNumber || 'N/A'}`, 42, 27);

      // Page Title (Right Aligned)
      doc.setFontSize(32);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.text(isQuote ? "Quotation" : "Purchase Order", 196, 25, { align: 'right' });
      
      // Horizontal Line
      doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.setLineWidth(0.8);
      doc.line(14, 38, 196, 38);

      // Document Info Boxes
      let currentY = 52;
      const boxWidth = 58;
      const boxHeight = 12;
      
      // Labels
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
      doc.text(isQuote ? "QUOTATION NO:" : "PO NO:", 14, currentY - 2);
      doc.text("DATE:", 14 + boxWidth + 4, currentY - 2);
      doc.text("DUE DATE:", 14 + (boxWidth + 4) * 2, currentY - 2);

      // Box backgrounds
      doc.setFillColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      doc.rect(14, currentY, boxWidth, boxHeight, "F");
      doc.rect(14 + boxWidth + 4, currentY, boxWidth, boxHeight, "F");
      doc.rect(14 + (boxWidth + 4) * 2, currentY, boxWidth, boxHeight, "F");

      // Box contents
      doc.setFontSize(9);
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.text(item.id, 18, currentY + 7.5);
      doc.text(item.date, 18 + boxWidth + 4, currentY + 7.5);
      
      const dateObj = new Date(item.date);
      dateObj.setDate(dateObj.getDate() + 30);
      const dueDate = dateObj.toISOString().split('T')[0];
      doc.text(dueDate, 18 + (boxWidth + 4) * 2, currentY + 7.5);

      currentY += 28;

      // Information Grid
      // Left: Customer / Vendor Info
      doc.setFontSize(8);
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.text("RECIPIENT INFORMATION", 14, currentY);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.text(`[${item.receivingCompany?.toUpperCase() || (isQuote ? 'PROSPECTIVE CLIENT' : item.vendorName?.toUpperCase())}]`, 14, currentY + 6);
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const details = (item.receivingCompanyDetails || "Saudi Arabia, Site Location").split('\n');
      details.forEach((line, i) => {
        doc.text(line, 14, currentY + 12 + (i * 4));
      });
      doc.text(`Contact: ${item.contactPerson || "N/A"}`, 14, currentY + 12 + (details.length * 4) + 1);

      // Right: Project Information
      doc.setFontSize(8);
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.text("PROJECT INFORMATION", 120, currentY);

      const projInfo = [
        { label: "Project ID:", value: item.projectId },
        { label: "Location:", value: "Main Construction Site" },
        { label: "Manager:", value: company?.projectManager?.name || "Eng. Manager" }
      ];

      projInfo.forEach((info, idx) => {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        doc.text(info.label, 120, currentY + 6 + (idx * 5));
        doc.setFont("helvetica", "normal");
        doc.text(info.value, 145, currentY + 6 + (idx * 5));
      });

      // Total Due Box (Large)
      currentY += 32;
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.rect(14, currentY, 80, 10, "F");
      doc.setFontSize(8);
      doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
      doc.text("TOTAL DUE:", 18, currentY + 6.5);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`SAR ${item.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 42, currentY + 7);

      currentY += 20;

      // Items Table
      if (item.items && item.items.length > 0) {
        autoTable(doc, {
          startY: currentY,
          head: [['No.', 'Description', 'Type', 'Unit', 'Qty', 'Rate', 'Total']],
          body: item.items.map((i: any, idx: number) => [
            idx + 1,
            i.description,
            i.type || '-',
            i.unit || 'PC',
            i.quantity,
            i.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 }),
            i.total.toLocaleString(undefined, { minimumFractionDigits: 2 })
          ]),
          theme: 'grid',
          headStyles: { 
            fillColor: colors.primary as any, 
            textColor: colors.white as any,
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'center'
          },
          columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { cellWidth: 'auto' },
            2: { halign: 'center', cellWidth: 20 },
            3: { halign: 'center', cellWidth: 15 },
            4: { halign: 'center', cellWidth: 15 },
            5: { halign: 'right', cellWidth: 25 },
            6: { halign: 'right', cellWidth: 25 }
          },
          styles: { fontSize: 8, cellPadding: 3 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;
      }

      // Totals Summary (Right Aligned)
      const subtotal = item.subtotal || item.totalAmount;
      const taxRateValue = item.taxRate || 15;
      const taxAmount = item.taxAmount || (subtotal * taxRateValue / 100);
      const grandTotal = item.totalAmount;

      const summaryX = 140;
      const valueX = 196;

      const summaryData = [
        { label: "Sub Total", value: subtotal },
        { label: "Sales Tax Rate", value: `${taxRateValue.toFixed(2)}%`, isString: true },
        { label: "Sales Tax", value: taxAmount }
      ];

      doc.setFontSize(9);
      summaryData.forEach((row, idx) => {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
        doc.text(row.label, summaryX, currentY + (idx * 6));
        doc.setFont("helvetica", "bold");
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        const valStr = row.isString ? (row.value as string) : `SAR ${row.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        doc.text(valStr, valueX, currentY + (idx * 6), { align: 'right' });
      });

      currentY += summaryData.length * 6 + 2;
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.rect(summaryX - 5, currentY - 4, valueX - summaryX + 10, 8, "F");
      doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
      doc.text("TOTAL", summaryX, currentY + 1.5);
      doc.text(`SAR ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, valueX, currentY + 1.5, { align: 'right' });

      // Terms Section
      currentY += 20;
      doc.setFontSize(8);
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.text("TERMS AND CONDITIONS:", 14, currentY);
      doc.setFontSize(7);
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.setFont("helvetica", "normal");
      
      const termsToShow = item.termsAndConditions || [
        "Prices are valid for 30 days from the date of quotation.",
        "Delivery will be made within 7-10 working days after receiving the PO.",
        "Payment terms: 50% advance, 50% upon delivery.",
        "All prices are subject to 15% VAT calculation.",
        "Installation and commissioning are included unless stated otherwise.",
        "Warranty: 1 year manufacturer warranty on all items."
      ];

      termsToShow.forEach((term, idx) => {
        doc.text(`${idx + 1}. ${term}`, 14, currentY + 6 + (idx * 4.5));
      });

      // Signature Section
      currentY += (termsToShow.length * 4.5) + 15;
      if (currentY > 250) { doc.addPage(); currentY = 20; }

      doc.setDrawColor(colors.muted[0], colors.muted[1], colors.muted[2]);
      doc.setLineWidth(0.2);
      
      // Authorized Signature
      doc.line(14, currentY + 15, 80, currentY + 15);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("AUTHORIZED REPRESENTATIVE", 14, currentY + 20);
      doc.setFont("helvetica", "normal");
      doc.text(item.authorizedSignatureName || company?.name || "RED SEA HOLDING", 14, currentY + 25);

      // Client Approval
      doc.line(130, currentY + 15, 196, currentY + 15);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(isQuote ? "CLIENT ACCEPTANCE" : "VENDOR ACKNOWLEDGMENT", 130, currentY + 20);
      doc.setFont("helvetica", "normal");
      doc.text(item.clientRepresentativeName || "Authorized Signatory", 130, currentY + 25);

      // QR Code (ZATCA Compliant)
      currentY += 35;
      if (currentY > 260) { currentY = 240; } // Push to bottom if space permits or already on new page
      try {
        const qrContent = generateZatcaBase64(
          company?.name || "RED SEA HOLDING",
          company?.vatNumber || "312345678900003",
          getZatcaTimestamp(item.date),
          grandTotal,
          taxAmount
        );
        const QRCode = (await import('qrcode')).default;
        const qrDataUrl = await QRCode.toDataURL(qrContent, { margin: 1 });
        doc.addImage(qrDataUrl, 'PNG', 14, currentY + 25, 30, 30);
      } catch (qrErr) {
        console.error("QR Code generation failed", qrErr);
      }

      // Footer
      doc.setFontSize(7);
      doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
      doc.text("This is an electronically generated document. No signature required.", 105, 285, { align: 'center' });

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

    const subtotal = quoteItems.reduce((acc, item) => acc + item.total, 0);
    const taxAmount = (subtotal * quoteTaxRate) / 100;
    const finalTotal = subtotal + taxAmount;

    const newItem = {
      id: isEditMode ? currentItem.id : (activeTab === 'quotes' ? `PQ-${new Date().getFullYear()}-${String(quotes.length + 1).padStart(3, '0')}` : `PO-${new Date().getFullYear()}-${String(pos.length + 1).padStart(3, '0')}`),
      projectId: formData.get('projectId') as string,
      vendorName: formData.get('vendorName') as string,
      date: formData.get('date') as string,
      receivingCompany: formData.get('receivingCompany') as string,
      receivingCompanyDetails: formData.get('receivingCompanyDetails') as string,
      contactPerson: formData.get('contactPerson') as string,
      subtotal: subtotal,
      taxRate: quoteTaxRate,
      taxAmount: taxAmount,
      totalAmount: finalTotal,
      status: formData.get('status') as any,
      items: quoteItems,
      termsAndConditions: terms,
      clientRepresentativeName: formData.get('clientRepresentativeName') as string,
      authorizedSignatureName: formData.get('authorizedSignatureName') as string,
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
    setQuoteItems([]);
    setTerms([
      'Prices are valid for 30 days from the date of quotation.',
      'Delivery will be made within 7-10 working days after receiving the PO.',
      'Payment terms: 50% advance, 50% upon delivery.',
      'All prices are subject to 15% VAT calculation.',
      'Installation and commissioning are included unless stated otherwise.',
      'Warranty: 1 year manufacturer warranty on all items.'
    ]);
  };

  const openForm = (item: any = null) => {
    if (item) {
      setIsEditMode(true);
      setCurrentItem(item);
      setQuoteItems(item.items || []);
      if (item.termsAndConditions) setTerms(item.termsAndConditions);
      if (item.taxRate !== undefined) setQuoteTaxRate(item.taxRate);
    } else {
      setIsEditMode(false);
      setCurrentItem(null);
      setQuoteItems([]);
      setTerms([
        'Prices are valid for 30 days from the date of quotation.',
        'Delivery will be made within 7-10 working days after receiving the PO.',
        'Payment terms: 50% advance, 50% upon delivery.',
        'All prices are subject to 15% VAT calculation.',
        'Installation and commissioning are included unless stated otherwise.',
        'Warranty: 1 year manufacturer warranty on all items.'
      ]);
      setQuoteTaxRate(15);
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
          {hasPermission('external_admin', 'procurement', 'issue') && (
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
          )}
          {hasPermission('external_admin', 'procurement', 'create') && (
            <button 
              onClick={() => openForm()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md text-xs font-bold uppercase tracking-widest shadow-lg hover:bg-black transition-all active:scale-95"
            >
              <Plus className="w-3 h-3" />
              {activeTab === 'quotes' ? 'New Price Quote' : 'Generate Purchase Order'}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-slate-100 w-full overflow-x-auto whitespace-nowrap pb-px">
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
                    {activeTab === 'quotes' && hasPermission('external_admin', 'procurement', 'issue') && (
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
                    {activeTab === 'pos' && hasPermission('external_admin', 'procurement', 'issue') && (
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
                    {hasPermission('external_admin', 'procurement', 'print') && (
                      <button 
                        onClick={() => handlePrint(item)}
                        className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors"
                        title="Print Matrix"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    )}
                    {hasPermission('external_admin', 'procurement', 'edit') && (
                      <button 
                        onClick={() => openForm(item)}
                        className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                        title="Edit Parameters"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                    {hasPermission('external_admin', 'procurement', 'delete') && (
                      <button 
                        onClick={() => handleDelete(item.id, activeTab === 'quotes' ? 'quote' : 'po')}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Deactivate Node"
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl border border-slate-200 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 font-mono">
                {isEditMode ? 'Modify Entry' : 'New Strategic Entry'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 overflow-y-auto min-h-0 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Left Column: Basic Info */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em] mb-4">Identity & Parameters</h4>
                  
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Project Association</label>
                    <select 
                      name="projectId" 
                      defaultValue={currentItem?.projectId}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500 transition-all font-medium"
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.id} - {p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Vendor Identity</label>
                    <input 
                      name="vendorName"
                      defaultValue={currentItem?.vendorName}
                      placeholder="Enter vendor..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500 transition-all font-medium"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Date</label>
                      <input 
                        type="date"
                        name="date"
                        defaultValue={currentItem?.date || new Date().toISOString().split('T')[0]}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500 transition-all font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">VAT Rate (%)</label>
                      <input 
                        type="number"
                        value={quoteTaxRate}
                        onChange={(e) => setQuoteTaxRate(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500 transition-all font-medium font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Operational Status</label>
                    <select 
                      name="status"
                      defaultValue={currentItem?.status || 'Draft'}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500 transition-all font-medium"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Internal Review">Internal Review</option>
                      <option value="Awaiting Finance">Awaiting Finance</option>
                      <option value="Approved">Approved</option>
                    </select>
                  </div>
                </div>

                {/* Middle Column: Recipient & Terms */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em] mb-4">Recipient Structure</h4>
                  
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Receiving Company</label>
                    <input 
                      name="receivingCompany"
                      defaultValue={currentItem?.receivingCompany}
                      placeholder="Company Name"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500 transition-all font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Company Details</label>
                    <textarea 
                      name="receivingCompanyDetails"
                      defaultValue={currentItem?.receivingCompanyDetails}
                      placeholder="Address, VAT, etc."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500 transition-all font-medium h-16 resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Contact Person</label>
                    <input 
                      name="contactPerson"
                      defaultValue={currentItem?.contactPerson}
                      placeholder="Name / Title"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500 transition-all font-medium"
                    />
                  </div>

                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Terms & Conditions</label>
                      <button type="button" onClick={addTerm} className="text-red-600 hover:text-red-700">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                      {terms.map((term, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input 
                            value={term}
                            onChange={(e) => updateTerm(idx, e.target.value)}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] outline-none"
                          />
                          <button type="button" onClick={() => removeTerm(idx)} className="text-slate-300 hover:text-red-500">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Signatories */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em] mb-4">Authorization Loop</h4>
                  
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Authorized Representative (Issuer)</label>
                    <input 
                      name="authorizedSignatureName"
                      defaultValue={currentItem?.authorizedSignatureName || company?.name}
                      placeholder="Issuer Name"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500 transition-all font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Client Approval Signatory</label>
                    <input 
                      name="clientRepresentativeName"
                      defaultValue={currentItem?.clientRepresentativeName}
                      placeholder="Approver Name"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500 transition-all font-medium"
                    />
                  </div>

                  <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                    <p className="text-[10px] text-red-700 font-bold uppercase tracking-wider mb-2">Financial Matrix Summary</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Subtotal</span>
                        <span className="font-mono font-bold">{formatCurrency(quoteItems.reduce((acc, i) => acc + i.total, 0))}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>VAT ({quoteTaxRate}%)</span>
                        <span className="font-mono font-bold">{formatCurrency((quoteItems.reduce((acc, i) => acc + i.total, 0) * quoteTaxRate) / 100)}</span>
                      </div>
                      <div className="pt-2 mt-1 border-t border-red-200 flex justify-between text-base">
                        <span className="font-bold text-slate-900">Total</span>
                        <span className="font-mono font-black text-red-600">
                          {formatCurrency(quoteItems.reduce((acc, i) => acc + i.total, 0) * (1 + quoteTaxRate/100))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Bottom: Items Table */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Itemized Quantum Manifest</h4>
                  <button 
                    type="button"
                    onClick={addQuoteItem}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded text-[10px] font-bold uppercase tracking-widest hover:bg-red-700"
                  >
                    <Plus className="w-3 h-3" /> Add Row
                  </button>
                </div>
                
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase tracking-tighter">Description</th>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase tracking-tighter">Type</th>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase tracking-tighter">Unit</th>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase tracking-tighter w-20 text-center">Qty</th>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase tracking-tighter w-32 text-right">Price (SAR)</th>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase tracking-tighter w-32 text-right">Total</th>
                        <th className="px-4 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 italic">
                      {quoteItems.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-slate-400">No items added to manifest.</td>
                        </tr>
                      ) : (
                        quoteItems.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="p-1">
                              <input 
                                value={item.description}
                                onChange={(e) => updateQuoteItem(item.id, 'description', e.target.value)}
                                className="w-full bg-transparent p-2 outline-none focus:bg-white"
                                placeholder="..."
                              />
                            </td>
                            <td className="p-1">
                              <input 
                                value={item.type}
                                onChange={(e) => updateQuoteItem(item.id, 'type', e.target.value)}
                                className="w-full bg-transparent p-2 outline-none focus:bg-white"
                                placeholder="e.g. Material"
                              />
                            </td>
                            <td className="p-1">
                              <input 
                                value={item.unit}
                                onChange={(e) => updateQuoteItem(item.id, 'unit', e.target.value)}
                                className="w-full bg-transparent p-2 outline-none focus:bg-white"
                                placeholder="e.g. m2"
                              />
                            </td>
                            <td className="p-1">
                              <input 
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateQuoteItem(item.id, 'quantity', Number(e.target.value))}
                                className="w-full bg-transparent p-2 outline-none text-center focus:bg-white"
                              />
                            </td>
                            <td className="p-1 text-right">
                              <input 
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => updateQuoteItem(item.id, 'unitPrice', Number(e.target.value))}
                                className="w-full bg-transparent p-2 outline-none text-right focus:bg-white"
                              />
                            </td>
                            <td className="px-4 py-2 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(item.total)}
                            </td>
                            <td className="px-4 py-2 text-center">
                              <button type="button" onClick={() => removeQuoteItem(item.id)} className="text-slate-300 hover:text-red-600 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all font-mono"
                >
                  Abort
                </button>
                <div className="flex-1" />
                <button 
                  type="submit"
                  className="px-8 py-2.5 bg-red-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg hover:bg-red-700 transition-all active:scale-95 font-mono"
                >
                  Commit Strategy Manifest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
