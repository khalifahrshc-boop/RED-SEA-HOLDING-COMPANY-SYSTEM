import React, { useState } from 'react';
import { Asset, Project, AppNotification } from '../types';
import { Settings, Plus, LayoutGrid, List, FileText, Download, ArrowDownToLine, Trash2, Printer, Edit2, CheckCircle } from 'lucide-react';
import { Language, translations } from '../lib/translations';
import { formatCurrency, cn, triggerSystemNotification, createAuditLog } from '../lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../contexts/AuthContext';

interface EquipmentProps {
  language: Language;
  projects: Project[];
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  company?: any;
}

interface DispatchReport {
  id: string;
  assetId?: string;
  equipmentName: string;
  quantity: number;
  unit: string;
  equipmentNumber: string;
  location: string;
  description: string;
  date: string;
  time?: string;
  senderName?: string;
  recipientName?: string;
  destinationProjectId?: string;
}

interface ReturnReport {
  id: string;
  assetId: string;
  equipmentName: string;
  quantity: number;
  unit: string;
  equipmentNumber: string;
  condition: string;
  reason: string;
  returnName: string;
  date: string;
  time: string;
}

interface DestructionReport {
  id: string;
  assetId: string;
  equipmentName: string;
  quantity: number;
  unit: string;
  equipmentNumber: string;
  destroyerName: string;
  destroyerId: string;
  employeeNumber: string;
  reason: string;
  date: string;
  time: string;
}

export interface TransferRequest {
  id: string;
  projectId: string;
  assetId: string;
  requestedQuantity: number;
  status: 'Pending' | 'Warehouse_Approved' | 'Accounting_Approved' | 'Rejected';
  requestDate: string;
  requesterName: string;
  notes: string;
  warehouseApprovedBy?: string;
  accountingApprovedBy?: string;
}

const initialAssets: Asset[] = [
  { id: 'A1', referenceNumber: 'EQ-HE-001', name: 'Bulldozer D9R', model: 'Cat D9R', category: 'Heavy Equipment', ownershipType: 'Owned', serialNumber: 'SN-001389', acquisitionDate: '2021-05-12', condition: 'Good', status: 'Active', location: 'East Camp A', value: 150000, projectId: 'P1', quantity: 1, unit: 'Item', accountingApproved: true },
  { id: 'A2', referenceNumber: 'EQ-VH-002', name: 'Transport Bus', model: 'Mercedes Sprinter', category: 'Vehicles', ownershipType: 'Rented', rentalSource: 'Auto Lease Inc.', dailyCost: 200, serialNumber: 'SN-V8829', acquisitionDate: '2023-11-20', condition: 'Mint', status: 'Active', location: 'HQ', value: 45000, quantity: 2, unit: 'Item', accountingApproved: true }
];

export function Equipment({ language, projects, company, assets, setAssets }: EquipmentProps) {
  const { userData, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'inventory' | 'dispatch' | 'return' | 'destruction' | 'requests'>('inventory');
  const [dispatchReports, setDispatchReports] = useLocalStorage<DispatchReport[]>('ares_dispatch_reports', []);
  const [returnReports, setReturnReports] = useLocalStorage<ReturnReport[]>('ares_return_reports', []);
  const [destructionReports, setDestructionReports] = useLocalStorage<DestructionReport[]>('ares_destruction_reports', []);
  const [transferRequests, setTransferRequests] = useLocalStorage<TransferRequest[]>('ares_transfer_requests', []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isDestructionModalOpen, setIsDestructionModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editingReport, setEditingReport] = useState<DispatchReport | null>(null);
  const [editingReturnReport, setEditingReturnReport] = useState<ReturnReport | null>(null);

  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [selectedReturnReports, setSelectedReturnReports] = useState<Set<string>>(new Set());
  const [selectedDestructionReports, setSelectedDestructionReports] = useState<Set<string>>(new Set());
  const t = translations[language];

  const handlePrintSelected = () => {
    import('../lib/pdfUtils').then(({ generateStandardPDF, applyAutoTable }) => {
        const { doc, startY } = generateStandardPDF('SELECTED ASSETS LIST', company || {});
        let y = startY;

        const tableData = assets
          .filter(a => selectedAssets.has(a.id))
          .map(asset => {
             return [
                 asset.referenceNumber,
                 asset.name,
                 asset.category,
                 asset.condition,
                 asset.status,
                 asset.location,
                 `${asset.quantity !== undefined ? asset.quantity : 1} ${asset.unit || 'Item'}`,
                 asset.ownershipType === 'Rented' 
                   ? `${asset.dailyCost ? formatCurrency(asset.dailyCost) : '0.00'}/Day` 
                   : (asset.value ? formatCurrency(asset.value) : '0.00')
             ];
        });

        applyAutoTable(doc, {
            startY: y,
            head: [['Ref No.', 'Name', 'Category', 'Condition', 'Status', 'Location', 'Qty', 'Value/Cost']],
            body: tableData,
            styles: { fontSize: 7, cellPadding: 2 },
            headStyles: { fillColor: [220, 38, 38] } // Red header to match theme
        });

        const finalY = (doc as any).lastAutoTable.finalY + 20;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Authorized Signature: _______________________', 14, finalY);

        doc.save('Selected_Assets_List.pdf');
    });
  };

  const handlePrintRequest = (req: TransferRequest) => {
    const asset = assets.find(a => a.id === req.assetId);
    import('../lib/pdfUtils').then(({ generateStandardPDF }) => {
        const { doc, startY } = generateStandardPDF('MATERIAL TRANSFER REQUEST', company || {});
        let y = startY;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`REQUEST ID: ${req.id}`, 14, y); y += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Date: ${new Date(req.requestDate).toLocaleDateString()}`, 14, y);
        doc.text(`Status: ${req.status}`, 120, y); y += 10;
        
        doc.line(14, y, 196, y); y += 10;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Item Description:', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${asset?.name || 'Unknown'} (${asset?.referenceNumber || '-'})`, 50, y); y += 10;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Quantity Requested:', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${req.requestedQuantity} ${asset?.unit || 'Units'}`, 50, y); y += 10;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Origin Project:', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text('Main Warehouse', 50, y); y += 10;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Destination Project:', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${req.projectId}`, 50, y); y += 10;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Notes:', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${req.notes || '-'}`, 50, y); y += 15;
        
        doc.line(14, y, 196, y); y += 15;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Approvals:', 14, y); y += 10;
        doc.setFont('helvetica', 'normal');
        doc.text(`Warehouse Approved by: ${req.warehouseApprovedBy || 'Pending'}`, 14, y); y += 10;
        doc.text(`Accounting Approved by: ${req.accountingApprovedBy || 'Pending'}`, 14, y); y += 20;

        doc.text('Authorized Signature: _______________________', 14, y);
        doc.save(`Transfer_Request_${req.id}.pdf`);
    });
  };

  const handlePrintDispatchReport = (report: DispatchReport) => {
    import('../lib/pdfUtils').then(({ generateStandardPDF }) => {
        const { doc, startY } = generateStandardPDF('EQUIPMENT DISPATCH REPORT', company || {});
        let y = startY;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`DISPATCH ID: ${report.id}`, 14, y); y += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Date: ${report.date}`, 14, y);
        doc.text(`Time: ${report.time || '-'}`, 120, y); y += 10;
        
        doc.line(14, y, 196, y); y += 10;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Equipment Name:', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${report.equipmentName}`, 50, y); y += 8;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Equipment No:', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${report.equipmentNumber}`, 50, y); y += 8;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Quantity:', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${report.quantity} ${report.unit}`, 50, y); y += 8;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Destination:', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${report.location}`, 50, y); y += 8;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Recipient:', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${report.recipientName || '-'}`, 50, y); y += 12;
        
        doc.line(14, y, 196, y); y += 15;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Verification & Signatures:', 14, y); y += 15;
        
        doc.setFont('helvetica', 'normal');
        doc.text(`Sender: ${report.senderName || 'Authorized User'}`, 14, y);
        doc.text('Signature: ________________', 100, y); y += 15;
        
        doc.text(`Recipient: ${report.recipientName || '-'}`, 14, y);
        doc.text('Signature: ________________', 100, y);
        
        doc.save(`Dispatch_Report_${report.id}.pdf`);
    });
  };

  const handlePrintReturnReport = (report: ReturnReport) => {
    import('../lib/pdfUtils').then(({ generateStandardPDF }) => {
        const { doc, startY } = generateStandardPDF('EQUIPMENT RETURN REPORT', company || {});
        let y = startY;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`RETURN ID: ${report.id}`, 14, y); y += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Date: ${report.date}`, 14, y);
        doc.text(`Time: ${report.time || '-'}`, 120, y); y += 10;
        
        doc.line(14, y, 196, y); y += 10;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Equipment Name:', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${report.equipmentName}`, 50, y); y += 8;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Equipment No:', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${report.equipmentNumber}`, 50, y); y += 8;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Quantity:', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${report.quantity} ${report.unit}`, 50, y); y += 8;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Condition:', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${report.condition}`, 50, y); y += 8;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Return Name:', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${report.returnName}`, 50, y); y += 8;

        doc.setFont('helvetica', 'bold');
        doc.text('Reason:', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${report.reason}`, 50, y); y += 12;
        
        doc.line(14, y, 196, y); y += 15;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Verification & Signatures:', 14, y); y += 15;
        
        doc.setFont('helvetica', 'normal');
        doc.text(`Returner: ${report.returnName}`, 14, y);
        doc.text('Signature: ________________', 100, y); y += 15;
        
        doc.text('Receiver (WH): ________________', 14, y);
        doc.text('Signature: ________________', 100, y);
        
        doc.save(`Return_Report_${report.id}.pdf`);
    });
  };

  const handlePrintDestructionReport = (report: DestructionReport) => {
    import('../lib/pdfUtils').then(({ generateStandardPDF }) => {
        const { doc, startY } = generateStandardPDF('EQUIPMENT DESTRUCTION REPORT', company || {});
        let y = startY;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`DESTRUCTION ID: ${report.id}`, 14, y); y += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Date: ${report.date}`, 14, y);
        doc.text(`Time: ${report.time || '-'}`, 120, y); y += 10;
        
        doc.line(14, y, 196, y); y += 10;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Equipment Info:', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${report.equipmentName} (${report.equipmentNumber})`, 50, y); y += 8;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Quantity:', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${report.quantity} ${report.unit}`, 50, y); y += 8;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Reason:', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${report.reason}`, 50, y); y += 8;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Destroyed By:', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${report.destroyerName} (ID: ${report.destroyerId})`, 50, y); y += 12;
        
        doc.line(14, y, 196, y); y += 15;
        
        doc.setFontSize(9);
        doc.text('This is an official record of material destruction from inventory.', 14, y); y += 15;
        
        doc.setFontSize(10);
        doc.text('Authorized Signature: _______________________', 14, y);
        
        doc.save(`Destruction_Report_${report.id}.pdf`);
    });
  };

  const [activeWarehouse, setActiveWarehouse] = useState<string>('MAIN');

  const visibleAssets = assets.filter(a => activeWarehouse === 'MAIN' ? !a.projectId || a.projectId === 'MAIN' : a.projectId === activeWarehouse);
  const visibleRequests = transferRequests.filter(r => activeWarehouse === 'MAIN' ? true : r.projectId === activeWarehouse);

  const handleExportPDF = () => {
    import('../lib/pdfUtils').then(({ generateStandardPDF, applyAutoTable }) => {
        const { doc, startY } = generateStandardPDF('EQUIPMENT & ASSETS COMPREHENSIVE REPORT', company || {});
        let y = startY;

        const tableData = visibleAssets.map(asset => {
            const project = projects.find(p => p.id === asset.projectId);
            const duration = project ? `${project.startDate} to ${project.endDate}` : 'N/A';
            const supervisor = project ? project.managerId : 'N/A';
            const personnel = 'Fleet Management / Site Eng';

            return [
                asset.referenceNumber,
                `${asset.name}\n(${asset.model})`,
                asset.category,
                asset.condition,
                `${project?.name || (activeWarehouse === 'MAIN' ? 'Company Main Warehouse' : 'Unassigned')}\n${duration}`,
                `${supervisor}\n(${personnel})`
            ];
        });

        applyAutoTable(doc, {
            startY: y,
            head: [['Ref', 'Asset Info', 'Category', 'Condition', 'Project Assignment & Duration', 'Supervisor & Personnel']],
            body: tableData,
            styles: { fontSize: 8 },
        });

        doc.save('Equipment_Comprehensive_Report.pdf');
    });
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(visibleAssets.map(a => ({
      'Reference Number': a.referenceNumber,
      'Asset Name': a.name,
      'Model': a.model,
      'Category': a.category,
      'Ownership': a.ownershipType,
      'Condition': a.condition,
      'Location': a.location,
      'Quantity': a.quantity,
      'Unit': a.unit,
      'Value': a.value,
      'Status': a.status
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Equipment");
    XLSX.writeFile(wb, "Equipment_Ledger.xlsx");
  };

  const handleDelete = (id: string) => {
    setAssets(assets.filter(a => a.id !== id));
  };

  const handleApproveAsset = (id: string) => {
    setAssets(assets.map(a => 
      a.id === id 
        ? { ...a, accountingApproved: true, accountingApprovedBy: userData?.name, accountingApprovedAt: new Date().toISOString() } 
        : a
    ));
  };

  const handleAddAsset = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newAsset: Asset = {
      id: editingAsset ? editingAsset.id : `A${Date.now()}`,
      referenceNumber: formData.get('refNumber') as string,
      name: formData.get('name') as string,
      model: formData.get('model') as string,
      category: formData.get('category') as Asset['category'],
      ownershipType: formData.get('ownership') as 'Owned' | 'Rented',
      condition: formData.get('condition') as Asset['condition'],
      status: 'Active',
      location: formData.get('location') as string,
      value: Number(formData.get('value')) || 0,
      quantity: Number(formData.get('quantity')) || 1,
      unit: formData.get('unit') as string || 'Item',
      serialNumber: editingAsset ? editingAsset.serialNumber : `SN-${Date.now().toString().slice(-6)}`,
      acquisitionDate: editingAsset ? (editingAsset.acquisitionDate || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
      projectId: activeWarehouse === 'MAIN' ? undefined : activeWarehouse,
      accountingApproved: editingAsset ? editingAsset.accountingApproved : false,
      accountingApprovedBy: editingAsset ? editingAsset.accountingApprovedBy : undefined,
      accountingApprovedAt: editingAsset ? editingAsset.accountingApprovedAt : undefined,
    };
    if (editingAsset) {
      setAssets(assets.map(a => a.id === editingAsset.id ? newAsset : a));
    } else {
      setAssets([...assets, newAsset]);
    }
    setIsModalOpen(false);
    setEditingAsset(null);
  };

  const handleSaveDispatch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const assetId = formData.get('assetId') as string;
    const selectedAsset = assets.find(a => a.id === assetId);

    if (!selectedAsset && formData.get('equipmentName')) {
        // Fallback for older records without assetId
        const reportData: DispatchReport = {
            id: editingReport ? editingReport.id : `D${Date.now()}`,
            assetId: '',
            equipmentName: formData.get('equipmentName') as string,
            quantity: Number(formData.get('quantity')),
            unit: formData.get('unit') as string,
            equipmentNumber: formData.get('equipmentNumber') as string,
            location: formData.get('location') as string,
            description: formData.get('description') as string,
            date: formData.get('date') as string,
        };
        if (editingReport) {
            setDispatchReports(dispatchReports.map(r => r.id === editingReport.id ? reportData : r));
        } else {
            setDispatchReports([...dispatchReports, reportData]);
        }
        setIsDispatchModalOpen(false);
        setEditingReport(null);
        return;
    }

    if (!selectedAsset) {
        alert("Please select a valid equipment/material.");
        return;
    }

    const quantity = Number(formData.get('quantity'));

    let previousQuantity = 0;
    if (editingReport && editingReport.assetId === assetId) {
        previousQuantity = editingReport.quantity;
    }

    const currentInventory = selectedAsset.quantity || 0;
    if (quantity > currentInventory + previousQuantity) {
        alert(`Cannot dispatch ${quantity}. Only ${currentInventory + previousQuantity} available in inventory.`);
        return;
    }

    const destinationProjectId = formData.get('destinationProjectId') as string;
    const isProjectTransfer = destinationProjectId && destinationProjectId !== 'external';

    const reportData: DispatchReport = {
      id: editingReport ? editingReport.id : `D${Date.now()}`,
      assetId,
      equipmentName: selectedAsset.name,
      quantity,
      unit: selectedAsset.unit || 'Piece',
      equipmentNumber: selectedAsset.referenceNumber || selectedAsset.serialNumber || '',
      location: formData.get('location') as string,
      description: formData.get('description') as string,
      date: formData.get('date') as string,
      time: editingReport?.time || (() => { const d = new Date(); return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}` })(),
      senderName: editingReport?.senderName || userData?.name || 'Authorized Sender',
      recipientName: formData.get('recipientName') as string,
      destinationProjectId: isProjectTransfer ? destinationProjectId : undefined,
    };

    const newAssets = [...assets];
    
    // Reverse previous transfer if editing
    if (editingReport && editingReport.destinationProjectId) {
      const existingProjectAssetIndex = newAssets.findIndex(a => 
         a.projectId === editingReport.destinationProjectId && 
         (a.referenceNumber === selectedAsset.referenceNumber || a.serialNumber === selectedAsset.serialNumber)
      );
      if (existingProjectAssetIndex >= 0) {
         newAssets[existingProjectAssetIndex] = {
             ...newAssets[existingProjectAssetIndex],
             quantity: Math.max(0, (newAssets[existingProjectAssetIndex].quantity || 0) - previousQuantity)
         };
      }
    }

    if (editingReport) {
       if (editingReport.assetId !== assetId && editingReport.assetId) {
          const oldAssetIndex = newAssets.findIndex(a => a.id === editingReport.assetId);
          if (oldAssetIndex >= 0) {
              newAssets[oldAssetIndex] = {
                  ...newAssets[oldAssetIndex],
                  quantity: (newAssets[oldAssetIndex].quantity || 0) + editingReport.quantity
              };
          }
          const newAssetIndex = newAssets.findIndex(a => a.id === assetId);
          if (newAssetIndex >= 0) {
              newAssets[newAssetIndex] = {
                  ...newAssets[newAssetIndex],
                  quantity: (newAssets[newAssetIndex].quantity || 0) - quantity
              };
          }
       } else {
          const assetIndex = newAssets.findIndex(a => a.id === assetId);
          if (assetIndex >= 0) {
              newAssets[assetIndex] = {
                  ...newAssets[assetIndex],
                  quantity: (newAssets[assetIndex].quantity || 0) + previousQuantity - quantity
              };
          }
       }
       setDispatchReports(dispatchReports.map(r => r.id === editingReport.id ? reportData : r));
    } else {
       const assetIndex = newAssets.findIndex(a => a.id === assetId);
       if (assetIndex >= 0) {
           newAssets[assetIndex] = {
               ...newAssets[assetIndex],
               quantity: (newAssets[assetIndex].quantity || 0) - quantity
           };
       }
       setDispatchReports([...dispatchReports, reportData]);
    }
    
    // Apply new transfer
    if (isProjectTransfer) {
      const targetProjectAssetIndex = newAssets.findIndex(a => 
          a.projectId === destinationProjectId && 
          (a.referenceNumber === selectedAsset.referenceNumber || a.serialNumber === selectedAsset.serialNumber)
      );
      if (targetProjectAssetIndex >= 0) {
          newAssets[targetProjectAssetIndex] = {
              ...newAssets[targetProjectAssetIndex],
              quantity: (newAssets[targetProjectAssetIndex].quantity || 0) + quantity
          };
      } else {
          // Create new asset for the project
          newAssets.push({
              ...selectedAsset,
              id: `A${Date.now()}_TRANSFERRED`,
              projectId: destinationProjectId,
              quantity: quantity,
              location: formData.get('location') as string,
              accountingApproved: true, // Auto-approve since it's a transfer from Main
              accountingApprovedBy: userData?.name || 'System Transfer',
              accountingApprovedAt: new Date().toISOString()
          });
      }
    }
    
    setAssets(newAssets);
    setIsDispatchModalOpen(false);
    setEditingReport(null);
  };

  const handleDeleteDispatch = (id: string) => {
    const report = dispatchReports.find(r => r.id === id);
    if (report && report.assetId) {
       const newAssets = [...assets];
       const assetIndex = newAssets.findIndex(a => a.id === report.assetId);
       if (assetIndex >= 0) {
           newAssets[assetIndex] = {
               ...newAssets[assetIndex],
               quantity: (newAssets[assetIndex].quantity || 0) + report.quantity
           };
       }
       
       if (report.destinationProjectId) {
           const targetProjectAssetIndex = newAssets.findIndex(a => 
               a.projectId === report.destinationProjectId && 
               (a.referenceNumber === report.equipmentNumber || a.serialNumber === report.equipmentNumber)
           );
           if (targetProjectAssetIndex >= 0) {
              newAssets[targetProjectAssetIndex] = {
                 ...newAssets[targetProjectAssetIndex],
                 quantity: Math.max(0, (newAssets[targetProjectAssetIndex].quantity || 0) - report.quantity)
              };
           }
       }
       setAssets(newAssets);
    }
    setDispatchReports(dispatchReports.filter(r => r.id !== id));
    if (selectedReports.has(id)) {
      const newSelected = new Set(selectedReports);
      newSelected.delete(id);
      setSelectedReports(newSelected);
    }
  };

  const handleSaveReturn = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const assetId = formData.get('assetId') as string;
    const selectedAsset = assets.find(a => a.id === assetId);

    if (!selectedAsset) {
        alert("Please select a valid equipment/material.");
        return;
    }

    const quantity = Number(formData.get('quantity'));

    const returnData: ReturnReport = {
      id: `R${Date.now()}`,
      assetId,
      equipmentName: selectedAsset.name,
      quantity,
      unit: selectedAsset.unit || 'Piece',
      equipmentNumber: selectedAsset.referenceNumber || selectedAsset.serialNumber || '',
      condition: formData.get('condition') as string,
      reason: formData.get('reason') as string,
      returnName: formData.get('returnName') as string,
      date: formData.get('date') as string,
      time: (() => { const d = new Date(); return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}` })(),
    };

    const newAssets = [...assets];
    const assetIndex = newAssets.findIndex(a => a.id === assetId);
    if (assetIndex >= 0) {
        newAssets[assetIndex] = {
            ...newAssets[assetIndex],
            quantity: (newAssets[assetIndex].quantity || 0) + quantity
        };
    }
    
    setAssets(newAssets);
    setReturnReports([...returnReports, returnData]);
    setIsReturnModalOpen(false);
  };

  const handleDeleteReturn = (id: string) => {
    const report = returnReports.find(r => r.id === id);
    if (report && report.assetId) {
       const newAssets = [...assets];
       const assetIndex = newAssets.findIndex(a => a.id === report.assetId);
       if (assetIndex >= 0) {
           newAssets[assetIndex] = {
               ...newAssets[assetIndex],
               quantity: (newAssets[assetIndex].quantity || 0) - report.quantity
           };
           setAssets(newAssets);
       }
    }
    setReturnReports(returnReports.filter(r => r.id !== id));
  };

  const handleSaveDestruction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const assetId = formData.get('assetId') as string;
    const selectedAsset = assets.find(a => a.id === assetId);

    if (!selectedAsset) {
        alert("Please select a valid equipment/material.");
        return;
    }

    const quantity = Number(formData.get('quantity'));
    const currentInventory = selectedAsset.quantity || 0;
    if (quantity > currentInventory) {
        alert(`Cannot destroy ${quantity}. Only ${currentInventory} available in inventory.`);
        return;
    }

    const destData: DestructionReport = {
      id: `X${Date.now()}`,
      assetId,
      equipmentName: selectedAsset.name,
      quantity,
      unit: selectedAsset.unit || 'Piece',
      equipmentNumber: selectedAsset.referenceNumber || selectedAsset.serialNumber || '',
      destroyerName: formData.get('destroyerName') as string,
      destroyerId: formData.get('destroyerId') as string,
      employeeNumber: formData.get('employeeNumber') as string,
      reason: formData.get('reason') as string,
      date: formData.get('date') as string,
      time: (() => { const d = new Date(); return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}` })(),
    };

    const newAssets = [...assets];
    const assetIndex = newAssets.findIndex(a => a.id === assetId);
    if (assetIndex >= 0) {
        newAssets[assetIndex] = {
            ...newAssets[assetIndex],
            quantity: (newAssets[assetIndex].quantity || 0) - quantity
        };
    }
    
    setAssets(newAssets);
    setDestructionReports([...destructionReports, destData]);
    setIsDestructionModalOpen(false);
  };

  const handleDeleteDestruction = (id: string) => {
    const report = destructionReports.find(r => r.id === id);
    if (report && report.assetId) {
       const newAssets = [...assets];
       const assetIndex = newAssets.findIndex(a => a.id === report.assetId);
       if (assetIndex >= 0) {
           newAssets[assetIndex] = {
               ...newAssets[assetIndex],
               quantity: (newAssets[assetIndex].quantity || 0) + report.quantity
           };
           setAssets(newAssets);
       }
    }
    setDestructionReports(destructionReports.filter(r => r.id !== id));
  };

  const handleSaveRequest = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const assetId = formData.get('assetId') as string;
    const requestedQuantity = Number(formData.get('quantity'));
    const notes = formData.get('notes') as string;

    const requestData: TransferRequest = {
        id: `REQ-${Date.now()}`,
        projectId: activeWarehouse,
        assetId,
        requestedQuantity,
        status: 'Pending',
        requestDate: new Date().toISOString(),
        requesterName: userData?.name || 'Authorized Project Manager',
        notes
    };

    setTransferRequests([...transferRequests, requestData]);
    
    // Add notification for Main Warehouse / Administrator
    triggerSystemNotification({
      id: `NOT-${Date.now()}`,
      type: 'Request',
      title: 'New Material Request',
      message: `${requestData.requesterName} from Project ${requestData.projectId} is requesting ${requestData.requestedQuantity} units of ${assets.find(a => a.id === assetId)?.name || 'Material'}.`,
      department: 'Procurement',
      relatedId: requestData.id,
      relatedType: 'equipment',
      read: false,
      createdAt: new Date().toISOString()
    });

    createAuditLog({
      id: `LOG-${Date.now()}`,
      userId: userData?.id || 'system',
      userName: userData?.name || 'Authorized User',
      action: 'Create Request',
      target: `Transfer Request ${requestData.id}`,
      details: `Requested ${requestData.requestedQuantity} of ${assets.find(a => a.id === assetId)?.name}`,
      timestamp: new Date().toISOString()
    });

    setIsRequestModalOpen(false);
  };

  const handleDeleteRequest = (id: string) => {
    setTransferRequests(transferRequests.filter(r => r.id !== id));
  };

  const handleWarehouseApproveRequest = (id: string) => {
    setTransferRequests(transferRequests.map(r => 
        r.id === id 
            ? { ...r, status: 'Warehouse_Approved', warehouseApprovedBy: userData?.name } 
            : r
    ));
  };

  const handleAccountingApproveRequest = (id: string) => {
    const req = transferRequests.find(r => r.id === id);
    if (!req) return;

    const selectedAsset = assets.find(a => a.id === req.assetId);
    if (!selectedAsset) return;

    const newAssets = [...assets];
    const mainAssetIndex = newAssets.findIndex(a => a.id === req.assetId);
    if (mainAssetIndex >= 0) {
        newAssets[mainAssetIndex] = {
            ...newAssets[mainAssetIndex],
            quantity: Math.max(0, (newAssets[mainAssetIndex].quantity || 0) - req.requestedQuantity)
        };
    }

    const targetProjectAssetIndex = newAssets.findIndex(a => 
        a.projectId === req.projectId && 
        (a.referenceNumber === selectedAsset.referenceNumber || a.serialNumber === selectedAsset.serialNumber)
    );
    
    if (targetProjectAssetIndex >= 0) {
        newAssets[targetProjectAssetIndex] = {
            ...newAssets[targetProjectAssetIndex],
            quantity: (newAssets[targetProjectAssetIndex].quantity || 0) + req.requestedQuantity
        };
    } else {
        newAssets.push({
            ...selectedAsset,
            id: `A${Date.now()}_REQ_TRANSFERRED`,
            projectId: req.projectId,
            quantity: req.requestedQuantity,
            accountingApproved: true,
            accountingApprovedBy: userData?.name || 'Transfer Approval',
            accountingApprovedAt: new Date().toISOString()
        });
    }

    setAssets(newAssets);
    
    setTransferRequests(transferRequests.map(r => 
        r.id === id 
            ? { ...r, status: 'Accounting_Approved', accountingApprovedBy: userData?.name } 
            : r
    ));

    createAuditLog({
      id: `LOG-${Date.now()}`,
      userId: userData?.id || 'system',
      userName: userData?.name || 'Authorized User',
      action: 'Approve Request',
      target: `Transfer Request ${id}`,
      details: `Approved transfer of ${req.requestedQuantity} units to ${req.projectId}`,
      timestamp: new Date().toISOString()
    });

    triggerSystemNotification({
      id: `NOT-${Date.now()}`,
      type: 'Success',
      title: 'Material Request Approved',
      message: `Your request for ${selectedAsset.name} has been approved and moved to your warehouse.`,
      department: 'Procurement',
      relatedId: id,
      relatedType: 'equipment',
      read: false,
      createdAt: new Date().toISOString()
    });
  };

  const handlePrintSelectedDispatch = () => {
    import('../lib/pdfUtils').then(({ generateStandardPDF, applyAutoTable }) => {
        const { doc, startY } = generateStandardPDF('SELECTED DISPATCH REPORTS', company || {});
        let y = startY;

        const tableData = dispatchReports
          .filter(r => selectedReports.has(r.id))
          .map(r => [
            `${r.date} ${r.time || ''}`,
            r.equipmentName,
            r.equipmentNumber,
            `${r.quantity} ${r.unit}`,
            r.location,
            r.senderName || 'Authorized Sender',
            r.recipientName || 'N/A'
          ]);

        applyAutoTable(doc, {
            startY: y,
            head: [['Date/Time', 'Equipment', 'Eq. No.', 'Qty', 'Destination', 'Sender', 'Recipient']],
            body: tableData,
            styles: { fontSize: 8 },
        });

        const finalY = (doc as any).lastAutoTable.finalY + 20;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Sender Signature: _______________________`, 14, finalY);
        doc.text(`Recipient Signature: _______________________`, 100, finalY);

        doc.save('Selected_Dispatch_Reports.pdf');
    });
  };

  const handlePrintSelectedReturn = () => {
    import('../lib/pdfUtils').then(({ generateStandardPDF, applyAutoTable }) => {
        const { doc, startY } = generateStandardPDF('SELECTED RETURN REPORTS', company || {});
        let y = startY;

        const tableData = returnReports
          .filter(r => selectedReturnReports.has(r.id))
          .map(r => [
            `${r.date} ${r.time || ''}`,
            r.equipmentName,
            r.equipmentNumber,
            `${r.quantity} ${r.unit}`,
            r.condition,
            r.returnName,
            r.reason
          ]);

        applyAutoTable(doc, {
            startY: y,
            head: [['Date/Time', 'Equipment', 'Eq. No.', 'Qty', 'Condition', 'Returned By', 'Reason']],
            body: tableData,
            styles: { fontSize: 8 },
        });

        const finalY = (doc as any).lastAutoTable.finalY + 20;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Receiver Signature: _______________________`, 14, finalY);
        doc.text(`Returner Signature: _______________________`, 100, finalY);

        doc.save('Selected_Return_Reports.pdf');
    });
  };

  const handlePrintSelectedDestruction = () => {
    import('../lib/pdfUtils').then(({ generateStandardPDF, applyAutoTable }) => {
        const { doc, startY } = generateStandardPDF('SELECTED DESTRUCTION REPORTS', company || {});
        let y = startY;

        const tableData = destructionReports
          .filter(r => selectedDestructionReports.has(r.id))
          .map(r => [
            `${r.date} ${r.time || ''}`,
            r.equipmentName,
            `${r.quantity} ${r.unit}`,
            r.destroyerName,
            r.destroyerId,
            r.employeeNumber,
            r.reason
          ]);

        applyAutoTable(doc, {
            startY: y,
            head: [['Date/Time', 'Equipment', 'Qty', 'Destroyer Name', 'ID', 'EMP No.', 'Reason']],
            body: tableData,
            styles: { fontSize: 8 },
        });

        const finalY = (doc as any).lastAutoTable.finalY + 20;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Authorized Signature: _______________________`, 14, finalY);

        doc.save('Selected_Destruction_Reports.pdf');
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 font-mono tracking-tight uppercase">Equipment & Assets</h2>
          <p className="text-sm text-slate-500 mt-1">Manage physical resources and company assets</p>
        </div>
        
        <div className="flex items-center gap-4">
          <select 
            value={activeWarehouse} 
            onChange={(e) => setActiveWarehouse(e.target.value)}
            className="w-full sm:w-auto bg-slate-50 border border-slate-200 text-slate-700 rounded-md px-3 py-2 text-sm font-bold uppercase tracking-wide outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="MAIN">🏢 Main Company Warehouse</option>
            {projects.map(p => <option key={p.id} value={p.id}>🏗️ {p.name} Warehouse</option>)}
          </select>
          
          {activeTab === 'inventory' ? (
            <div className="flex items-center gap-2">
            {selectedAssets.size > 0 && hasPermission('internal_admin', 'equipment', 'print') && (
              <button onClick={handlePrintSelected} className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs font-bold uppercase tracking-widest hover:bg-red-100 transition-colors">
                <Printer className="w-4 h-4" /> Print Selected
              </button>
            )}
            {hasPermission('internal_admin', 'equipment', 'export') && (
              <>
                <button onClick={handleExportPDF} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-md text-xs font-bold uppercase tracking-widest hover:bg-slate-50">
                  <FileText className="w-4 h-4" /> PDF
                </button>
                <button onClick={handleExportExcel} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-md text-xs font-bold uppercase tracking-widest hover:bg-slate-50">
                  <Download className="w-4 h-4" /> Excel
                </button>
              </>
            )}
            {hasPermission('internal_admin', 'equipment', 'create') && (
              <button onClick={() => { setEditingAsset(null); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md text-xs font-bold uppercase tracking-widest shadow-lg hover:bg-red-700 transition">
                <Plus className="w-4 h-4" /> New Asset
              </button>
            )}
          </div>
        ) : activeTab === 'dispatch' ? (
          <div className="flex items-center gap-2">
             {selectedReports.size > 0 && hasPermission('internal_admin', 'equipment', 'print') && (
              <button onClick={handlePrintSelectedDispatch} className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs font-bold uppercase tracking-widest hover:bg-red-100 transition-colors">
                <Printer className="w-4 h-4" /> Print Selected ({selectedReports.size})
              </button>
            )}
            {hasPermission('internal_admin', 'equipment', 'dispatch') && (
              <button onClick={() => { setEditingReport(null); setIsDispatchModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md text-xs font-bold uppercase tracking-widest shadow-lg hover:bg-red-700 transition">
                <Plus className="w-4 h-4" /> New Dispatch Report
              </button>
            )}
          </div>
        ) : activeTab === 'return' ? (
          <div className="flex items-center gap-2">
            {selectedReturnReports.size > 0 && hasPermission('internal_admin', 'equipment', 'print') && (
              <button onClick={handlePrintSelectedReturn} className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md text-xs font-bold uppercase tracking-widest hover:bg-emerald-100 transition-colors">
                <Printer className="w-4 h-4" /> Print Selected ({selectedReturnReports.size})
              </button>
            )}
            {hasPermission('internal_admin', 'equipment', 'return') && (
              <button onClick={() => { setEditingReturnReport(null); setIsReturnModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md text-xs font-bold uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition">
                <Plus className="w-4 h-4" /> Receive Return
              </button>
            )}
          </div>
        ) : activeTab === 'destruction' ? (
          <div className="flex items-center gap-2">
            {selectedDestructionReports.size > 0 && hasPermission('internal_admin', 'equipment', 'print') && (
              <button onClick={handlePrintSelectedDestruction} className="flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-xs font-bold uppercase tracking-widest hover:bg-rose-100 transition-colors">
                <Printer className="w-4 h-4" /> Print Selected ({selectedDestructionReports.size})
              </button>
            )}
            {hasPermission('internal_admin', 'equipment', 'destruction') && (
              <button onClick={() => setIsDestructionModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-md text-xs font-bold uppercase tracking-widest shadow-lg hover:bg-rose-700 transition">
                <Plus className="w-4 h-4" /> Declare Destruction
              </button>
            )}
          </div>
        ) : (
           <div className="flex items-center gap-2">
             {activeWarehouse !== 'MAIN' && hasPermission('internal_admin', 'equipment', 'manage') && (
                <button onClick={() => setIsRequestModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-xs font-bold uppercase tracking-widest shadow-lg hover:bg-blue-700 transition">
                  <Plus className="w-4 h-4" /> Request Material
                </button>
             )}
           </div>
        )}
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 mb-6 w-full overflow-x-auto">
        <button
          onClick={() => setActiveTab('inventory')}
          className={cn(
            "px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 whitespace-nowrap",
            activeTab === 'inventory' ? "border-red-600 text-red-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Assets Inventory
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={cn(
            "px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 whitespace-nowrap",
            activeTab === 'requests' ? "border-red-600 text-red-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Material Requests
        </button>
        <button
          onClick={() => setActiveTab('dispatch')}
          className={cn(
            "px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 whitespace-nowrap",
            activeTab === 'dispatch' ? "border-red-600 text-red-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Dispatch Reports
        </button>
        <button
          onClick={() => setActiveTab('return')}
          className={cn(
            "px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 whitespace-nowrap",
            activeTab === 'return' ? "border-red-600 text-red-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Return Reports
        </button>
        <button
          onClick={() => setActiveTab('destruction')}
          className={cn(
            "px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 whitespace-nowrap",
            activeTab === 'destruction' ? "border-red-600 text-red-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Destruction Reports
        </button>
      </div>

      {activeTab === 'inventory' ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <div className="glass-panel p-4 bg-white border border-slate-200 rounded-lg">
           <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Equipment</h3>
           <p className="text-2xl font-mono font-bold text-slate-800">{assets.length}</p>
        </div>
        {['Heavy Equipment', 'Vehicles', 'Tools', 'IT Assets', 'Other'].map(cat => {
            const count = assets.filter(a => a.category === cat).length;
            return (
               <div key={cat} className="glass-panel p-4 bg-white border border-slate-200 rounded-lg">
                 <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{cat}</h3>
                 <p className="text-2xl font-mono font-bold text-slate-800">{count}</p>
               </div>
            );
        })}
      </div>

      <div className="bg-white border rounded-lg overflow-auto resize-y shadow-sm">
        <div className="overflow-x-auto w-full min-w-full"><div className="min-w-max">
          <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 w-12">
                <input 
                  type="checkbox" 
                  className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedAssets(new Set(visibleAssets.map(a => a.id)));
                    } else {
                      setSelectedAssets(new Set());
                    }
                  }}
                  checked={selectedAssets.size === visibleAssets.length && visibleAssets.length > 0}
                />
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Asset Info</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category & Ownership</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Inventory</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Condition</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleAssets.map((asset) => (
              <tr key={asset.id} className={`hover:bg-slate-50/50 ${selectedAssets.has(asset.id) ? 'bg-red-50/30' : ''}`}>
                <td className="px-6 py-4">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                    checked={selectedAssets.has(asset.id)}
                    onChange={() => {
                        const newSet = new Set(selectedAssets);
                        if (newSet.has(asset.id)) newSet.delete(asset.id);
                        else newSet.add(asset.id);
                        setSelectedAssets(newSet);
                    }}
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-900">{asset.name}</span>
                    <span className="text-xs text-slate-500 font-mono mt-0.5">{asset.referenceNumber} | {asset.model}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 w-max">{asset.category}</span>
                    <span className="text-xs text-slate-600">{asset.ownershipType}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="font-mono font-medium text-slate-900">{asset.quantity !== undefined ? asset.quantity : 1}</span>
                  <span className="text-xs text-slate-500 ml-1">{asset.unit || 'Item'}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${asset.condition === 'Mint' ? 'bg-emerald-500' : asset.condition === 'Good' ? 'bg-red-500' : asset.condition === 'Fair' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                      <span className="text-sm font-medium text-slate-700">{asset.condition}</span>
                    </div>
                    <span className="text-xs text-slate-500">{asset.location}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {asset.accountingApproved !== false ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 w-max border border-emerald-100">Approved</span>
                  ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 w-max border border-amber-100">Pending</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1">
                    {hasPermission('internal_admin', 'equipment', 'print') && (
                      <button onClick={() => {
                          import('qrcode').then(module => {
                              const QRCodeObj = module.default || module;
                              const toDataURL = QRCodeObj.toDataURL || (QRCodeObj as any).default?.toDataURL;
                              if (typeof toDataURL === 'function') {
                                  toDataURL(`REF:${asset.referenceNumber}|NAME:${asset.name}|SN:${asset.serialNumber}`).then(url => {
                                      import('../lib/pdfUtils').then(({ generateStandardPDF }) => {
                                          const { doc, startY } = generateStandardPDF(`ASSET BARCODE: ${asset.referenceNumber}`, company || {});
                                          let y = startY;
                                          doc.text(`Asset Name: ${asset.name}`, 14, y); y += 8;
                                          doc.text(`Model: ${asset.model}`, 14, y); y += 8;
                                          doc.text(`Serial Number: ${asset.serialNumber}`, 14, y); y += 8;
                                          doc.text(`Location: ${asset.location}`, 14, y); y += 12;
                                          doc.addImage(url, 'PNG', 14, y, 50, 50);
                                          doc.save(`Asset_Barcode_${asset.referenceNumber}.pdf`);
                                      });
                                  }).catch(err => {
                                      console.error("toDataURL failed:", err);
                                  });
                              } else {
                                  console.error("toDataURL is not a function in imported qrcode module");
                              }
                          }).catch(err => {
                              console.error("Dynamic import of qrcode failed:", err);
                          });
                      }} className="p-2 text-slate-400 hover:text-red-600 transition" title="Print Barcode PDF">
                          <Printer className="w-4 h-4" />
                      </button>
                    )}
                    {asset.accountingApproved === false && hasPermission('accounting', 'finance', 'approve') && (
                       <button onClick={() => handleApproveAsset(asset.id)} className="p-2 text-slate-400 hover:text-emerald-600 transition" title="Approve">
                           <CheckCircle className="w-4 h-4" />
                       </button>
                    )}
                    {hasPermission('internal_admin', 'equipment', 'edit') && (
                        <button onClick={() => { setEditingAsset(asset); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-red-600 transition" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                    )}
                    {hasPermission('internal_admin', 'equipment', 'delete') && (
                        <button onClick={() => handleDelete(asset.id)} className="p-2 text-slate-400 hover:text-red-600 transition" title="Delete">
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
      </>
      ) : activeTab === 'requests' ? (
      <>
        <div className="bg-white border border-slate-200 rounded-lg overflow-auto shadow-sm">
           <table className="w-full text-left border-collapse">
             <thead>
               <tr className="bg-slate-50 border-b border-slate-200">
                 <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                 <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Project ID</th>
                 <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Asset Info</th>
                 <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Qty Req.</th>
                 <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Requester</th>
                 <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                 <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {visibleRequests.map(req => {
                  const asset = assets.find(a => a.id === req.assetId);
                  return (
                  <tr key={req.id} className="hover:bg-slate-50/50">
                     <td className="px-6 py-4 text-sm text-slate-600">{new Date(req.requestDate).toLocaleDateString()}</td>
                     <td className="px-6 py-4 text-sm text-slate-800 font-mono font-medium">{req.projectId}</td>
                     <td className="px-6 py-4">
                        <div className="text-sm font-bold text-slate-800">{asset?.name || 'Unknown Asset'}</div>
                        <div className="text-xs text-slate-500 text-ellipsis overflow-hidden whitespace-nowrap max-w-[200px]" title={req.notes}>{req.notes || '-'}</div>
                     </td>
                     <td className="px-6 py-4 text-sm text-slate-600">{req.requestedQuantity}</td>
                     <td className="px-6 py-4 text-sm text-slate-600">{req.requesterName}</td>
                     <td className="px-6 py-4">
                        <span className={cn(
                           "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border w-max",
                           req.status === 'Pending' ? "bg-amber-50 text-amber-700 border-amber-200" :
                           req.status === 'Warehouse_Approved' ? "bg-blue-50 text-blue-700 border-blue-200" :
                           req.status === 'Accounting_Approved' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                           "bg-slate-50 text-slate-700 border-slate-200"
                        )}>
                           {(req.status || '').replace('_', ' ')}
                        </span>
                     </td>
                      <td className="px-6 py-4 text-right">
                         <div className="flex justify-end gap-1">
                            {hasPermission('internal_admin', 'equipment', 'print') && (
                               <button onClick={() => handlePrintRequest(req)} className="p-2 text-slate-400 hover:text-red-400 transition" title="Print Request Certificate">
                                  <Printer className="w-4 h-4" />
                               </button>
                            )}
                        {activeWarehouse === 'MAIN' && (userData?.role === 'Warehouse' || userData?.role === 'Administrator') && req.status === 'Pending' && (
                           <button onClick={() => handleWarehouseApproveRequest(req.id)} className="text-xs font-bold text-blue-600 uppercase tracking-widest hover:text-blue-800 mr-4">
                               Approve (WH)
                           </button>
                        )}
                        {activeWarehouse === 'MAIN' && (userData?.role === 'Accounting' || userData?.role === 'Administrator') && req.status === 'Warehouse_Approved' && (
                           <button onClick={() => handleAccountingApproveRequest(req.id)} className="text-xs font-bold text-emerald-600 uppercase tracking-widest hover:text-emerald-800 mr-4">
                               Approve (Acc)
                           </button>
                        )}
                         <button onClick={() => handleDeleteRequest(req.id)} className="p-2 text-slate-400 hover:text-red-600 transition" title="Delete">
                            <Trash2 className="w-4 h-4" />
                         </button>
                      </div>
                   </td>
                  </tr>
                  )
               })}
               {visibleRequests.length === 0 && (
                 <tr>
                   <td colSpan={7} className="px-6 py-8 text-center text-slate-500 text-sm">
                     No requests found.
                   </td>
                 </tr>
               )}
             </tbody>
           </table>
        </div>
      </>
      ) : activeTab === 'dispatch' ? (
      <>
        <div className="bg-white border rounded-lg overflow-auto resize-y shadow-sm">
          <div className="overflow-x-auto w-full min-w-full"><div className="min-w-max">
            <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 w-12">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedReports(new Set(dispatchReports.map(r => r.id)));
                      } else {
                        setSelectedReports(new Set());
                      }
                    }}
                    checked={selectedReports.size === dispatchReports.length && dispatchReports.length > 0}
                  />
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Equipment Info</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Qty & Unit</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Destination</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dispatchReports.map((report) => (
                <tr key={report.id} className={`hover:bg-slate-50/50 ${selectedReports.has(report.id) ? 'bg-red-50/30' : ''}`}>
                  <td className="px-6 py-4">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                      checked={selectedReports.has(report.id)}
                      onChange={() => {
                          const newSet = new Set(selectedReports);
                          if (newSet.has(report.id)) newSet.delete(report.id);
                          else newSet.add(report.id);
                          setSelectedReports(newSet);
                      }}
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {report.date}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900">{report.equipmentName}</span>
                      <span className="text-xs text-slate-500 font-mono mt-0.5">{report.equipmentNumber}</span>
                      <span className="text-xs text-slate-400 mt-1 line-clamp-1" title={report.description}>{report.description}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                    {report.quantity} <span className="text-xs text-slate-400 font-sans ml-1">{report.unit}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {report.location}
                  </td>
                   <td className="px-6 py-4 text-right">
                     <div className="flex justify-end gap-1">
                        {hasPermission('internal_admin', 'equipment', 'print') && (
                           <button onClick={() => handlePrintDispatchReport(report)} className="p-2 text-slate-400 hover:text-red-600 transition" title="Print Dispatch Certificate">
                              <Printer className="w-4 h-4" />
                           </button>
                        )}
                        <button onClick={() => { setEditingReport(report); setIsDispatchModalOpen(true); }} className="p-2 text-slate-400 hover:text-red-600 transition" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteDispatch(report.id)} className="p-2 text-slate-400 hover:text-red-600 transition" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                   </td>
                </tr>
              ))}
              {dispatchReports.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 text-sm">
                    No dispatch reports found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div></div>
        </div>
      </>
      ) : activeTab === 'return' ? (
      <>
        <div className="bg-white border rounded-lg overflow-auto resize-y shadow-sm">
          <div className="overflow-x-auto w-full min-w-full"><div className="min-w-max">
            <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="w-12 px-6 py-4">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedReturnReports(new Set(returnReports.map(r => r.id)));
                      } else {
                        setSelectedReturnReports(new Set());
                      }
                    }}
                    checked={selectedReturnReports.size === returnReports.length && returnReports.length > 0}
                  />
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Equipment Info</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Qty & Unit</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Returned By</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Condition</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {returnReports.map((report) => (
                <tr key={report.id} className={`hover:bg-slate-50/50 ${selectedReturnReports.has(report.id) ? 'bg-emerald-50/30' : ''}`}>
                  <td className="px-6 py-4">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      checked={selectedReturnReports.has(report.id)}
                      onChange={() => {
                          const newSet = new Set(selectedReturnReports);
                          if (newSet.has(report.id)) newSet.delete(report.id);
                          else newSet.add(report.id);
                          setSelectedReturnReports(newSet);
                      }}
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {report.date} {report.time}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900">{report.equipmentName}</span>
                      <span className="text-xs text-slate-500 font-mono mt-0.5">{report.equipmentNumber}</span>
                      <span className="text-xs text-amber-600 mt-1 line-clamp-1">Reason: {report.reason}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                    {report.quantity} <span className="text-xs text-slate-400 font-sans ml-1">{report.unit}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {report.returnName}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 w-max">{report.condition}</span>
                  </td>
                   <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      {hasPermission('internal_admin', 'equipment', 'print') && (
                        <button onClick={() => handlePrintReturnReport(report)} className="p-2 text-slate-400 hover:text-emerald-600 transition" title="Print Return Certificate">
                          <Printer className="w-4 h-4" />
                        </button>
                      )}
                      {hasPermission('internal_admin', 'equipment', 'delete') && (
                        <button onClick={() => handleDeleteReturn(report.id)} className="p-2 text-slate-400 hover:text-red-600 transition" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {returnReports.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500 text-sm">
                    No return reports found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div></div>
        </div>
      </>
      ) : activeTab === 'destruction' ? (
      <>
        <div className="bg-white border rounded-lg overflow-auto resize-y shadow-sm">
          <div className="overflow-x-auto w-full min-w-full"><div className="min-w-max">
            <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="w-12 px-6 py-4">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDestructionReports(new Set(destructionReports.map(r => r.id)));
                      } else {
                        setSelectedDestructionReports(new Set());
                      }
                    }}
                    checked={selectedDestructionReports.size === destructionReports.length && destructionReports.length > 0}
                  />
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Equipment Info</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Qty & Unit</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Destroyer Info</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {destructionReports.map((report) => (
                <tr key={report.id} className={`hover:bg-slate-50/50 block-row ${selectedDestructionReports.has(report.id) ? 'bg-rose-50/30' : ''}`}>
                  <td className="px-6 py-4">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                      checked={selectedDestructionReports.has(report.id)}
                      onChange={() => {
                          const newSet = new Set(selectedDestructionReports);
                          if (newSet.has(report.id)) newSet.delete(report.id);
                          else newSet.add(report.id);
                          setSelectedDestructionReports(newSet);
                      }}
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {report.date} {report.time}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900">{report.equipmentName}</span>
                      <span className="text-xs text-slate-500 font-mono mt-0.5">{report.equipmentNumber}</span>
                      <span className="text-xs text-rose-600 mt-1 line-clamp-1">Reason: {report.reason}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                    {report.quantity} <span className="text-xs text-slate-400 font-sans ml-1">{report.unit}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900">{report.destroyerName}</span>
                      <span className="text-xs text-slate-500 mt-0.5">ID: {report.destroyerId} | EMP: {report.employeeNumber}</span>
                    </div>
                  </td>
                   <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      {hasPermission('internal_admin', 'equipment', 'print') && (
                        <button onClick={() => handlePrintDestructionReport(report)} className="p-2 text-slate-400 hover:text-rose-600 transition" title="Print Destruction Certificate">
                          <Printer className="w-4 h-4" />
                        </button>
                      )}
                      {hasPermission('internal_admin', 'equipment', 'delete') && (
                        <button onClick={() => handleDeleteDestruction(report.id)} className="p-2 text-slate-400 hover:text-red-600 transition" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {destructionReports.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 text-sm">
                    No destruction reports found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div></div>
        </div>
      </>
      ) : null}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] ring-1 ring-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900 uppercase tracking-widest text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-red-600" /> Register New Asset
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-rose-600 transition-colors"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAddAsset} className="p-6 space-y-4 text-left overflow-y-auto min-h-0 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Reference #</label>
                  <input required name="refNumber" defaultValue={editingAsset?.referenceNumber} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" placeholder="e.g. EQ-123"/>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Asset Name</label>
                  <input required name="name" defaultValue={editingAsset?.name} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" placeholder="e.g. Bulldozer"/>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Model</label>
                  <input required name="model" defaultValue={editingAsset?.model} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Category</label>
                  <select required name="category" defaultValue={editingAsset?.category || "Heavy Equipment"} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none">
                    <option>Heavy Equipment</option>
                    <option>Vehicles</option>
                    <option>Tools</option>
                    <option>IT Assets</option>
                    <option>Other</option>
                  </select>
                </div>
                 <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Ownership</label>
                  <select required name="ownership" defaultValue={editingAsset?.ownershipType || "Owned"} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none">
                    <option>Owned</option>
                    <option>Rented</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Condition</label>
                  <select required name="condition" defaultValue={editingAsset?.condition || "Good"} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none">
                    <option>Mint</option>
                    <option>Good</option>
                    <option>Fair</option>
                    <option>Maintenance Required</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Location</label>
                  <input required name="location" defaultValue={editingAsset?.location} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Unit</label>
                  <select required name="unit" defaultValue={editingAsset?.unit || "Piece"} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none">
                    <option value="Piece">Piece (pcs)</option>
                    <option value="Box">Box (box)</option>
                    <option value="Meter">Meter (m)</option>
                    <option value="Kilo">Kilo (kg)</option>
                    <option value="Item">Item</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Quantity</label>
                  <input required type="number" min="0" step="any" name="quantity" defaultValue={editingAsset?.quantity !== undefined ? editingAsset.quantity : 1} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" />
                </div>
                 <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Value ($)</label>
                  <input required type="number" name="value" defaultValue={editingAsset?.value} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 text-xs font-bold uppercase tracking-widest hover:text-slate-700 transition">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-red-600 text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition shadow-md">{editingAsset ? 'Save Asset' : 'Add Asset'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isRequestModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] ring-1 ring-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-blue-50">
              <h3 className="font-bold text-slate-900 uppercase tracking-widest text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" /> Request Material
              </h3>
              <button 
                onClick={() => setIsRequestModalOpen(false)}
                className="text-slate-400 hover:text-rose-600 transition-colors"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSaveRequest} className="p-6 space-y-4 text-left overflow-y-auto min-h-0 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Select Item from Main Warehouse</label>
                  <select required name="assetId" defaultValue="" className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none">
                    <option value="" disabled>Select Equipment / Material</option>
                    {assets.filter(a => !a.projectId || a.projectId === 'MAIN').map(a => (
                        <option key={a.id} value={a.id}>
                            {a.name} ({a.referenceNumber || a.serialNumber}) - MAIN {a.accountingApproved === false ? '[PENDING]' : ''}
                        </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Requested Quantity</label>
                  <input required type="number" min="0.01" step="any" name="quantity" defaultValue={1} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Notes / Reason</label>
                  <input required name="notes" className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" placeholder="e.g. Needed for concrete work"/>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                <button type="button" onClick={() => setIsRequestModalOpen(false)} className="px-4 py-2 text-slate-500 text-xs font-bold uppercase tracking-widest hover:text-slate-700 transition">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition shadow-md">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDispatchModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] ring-1 ring-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900 uppercase tracking-widest text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-red-600" /> {editingReport ? 'Edit Dispatch Report' : 'New Dispatch Report'}
              </h3>
              <button 
                onClick={() => { setIsDispatchModalOpen(false); setEditingReport(null); }}
                className="text-slate-400 hover:text-rose-600 transition-colors"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSaveDispatch} className="p-6 space-y-4 text-left overflow-y-auto min-h-0 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Select Item from Warehouse</label>
                  <select required name="assetId" defaultValue={editingReport?.assetId || ''} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none">
                    <option value="" disabled>Select Equipment / Material</option>
                    {visibleAssets.map(a => (
                        <option key={a.id} value={a.id}>
                            {a.name} ({a.referenceNumber || a.serialNumber}) - Available: {a.quantity || 0} {a.unit || 'Item'} {a.accountingApproved === false ? '[PENDING]' : ''}
                        </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Quantity to Dispatch</label>
                  <input required type="number" min="0.01" step="any" name="quantity" defaultValue={editingReport?.quantity || 1} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" />
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Destination Type (Project or External)</label>
                  <select name="destinationProjectId" defaultValue={editingReport?.destinationProjectId || "external"} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none">
                    <option value="external">External / General Location</option>
                    {projects.map(p => (
                       <option key={p.id} value={p.id}>Project: {p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Specific Location details</label>
                  <input required name="location" defaultValue={editingReport?.location} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" placeholder="e.g. East Camp A"/>
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Date</label>
                  <input required type="date" name="date" defaultValue={editingReport?.date || new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" />
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Recipient Name (Receiver)</label>
                  <input required type="text" name="recipientName" defaultValue={editingReport?.recipientName} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none" placeholder="Enter the name of the person receiving the equipment"/>
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Description / Notes</label>
                  <textarea name="description" defaultValue={editingReport?.description} rows={3} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none resize-none" placeholder="Add any relevant details..."/>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => { setIsDispatchModalOpen(false); setEditingReport(null); }} className="px-4 py-2 text-slate-500 text-xs font-bold uppercase tracking-widest hover:text-slate-700 transition">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-red-600 text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition shadow-md">
                  {editingReport ? 'Update Report' : 'Save Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isReturnModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] ring-1 ring-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900 uppercase tracking-widest text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" /> Return Equipment
              </h3>
              <button onClick={() => { setIsReturnModalOpen(false); setEditingReturnReport(null); }} className="text-slate-400 hover:text-rose-600 transition-colors">&times;</button>
            </div>
            <form onSubmit={handleSaveReturn} className="p-6 space-y-4 text-left overflow-y-auto min-h-0 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Select Equipment / Material</label>
                  <select required name="assetId" defaultValue="" className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none">
                    <option value="" disabled>Select Equipment / Material</option>
                    {visibleAssets.map(a => (
                        <option key={a.id} value={a.id}>
                            {a.name} ({a.referenceNumber || a.serialNumber}) {a.accountingApproved === false ? '[PENDING]' : ''}
                        </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Quantity Returned</label>
                  <input required type="number" min="0.01" step="any" name="quantity" defaultValue={1} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Condition</label>
                  <select required name="condition" defaultValue="Good" className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none">
                    <option>Mint</option>
                    <option>Good</option>
                    <option>Fair</option>
                    <option>Damaged</option>
                    <option>Maintenance Required</option>
                  </select>
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Return Name (Bringer)</label>
                  <input required type="text" name="returnName" className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Enter name"/>
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Date</label>
                  <input required type="date" name="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none" />
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Reason for Return</label>
                  <input required type="text" name="reason" className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="e.g. Finished task, Broken, etc."/>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => { setIsReturnModalOpen(false); setEditingReturnReport(null); }} className="px-4 py-2 text-slate-500 text-xs font-bold uppercase tracking-widest hover:text-slate-700 transition">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-emerald-700 transition shadow-md">
                  Save Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDestructionModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] ring-1 ring-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900 uppercase tracking-widest text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-rose-600" /> Declare Destruction
              </h3>
              <button onClick={() => setIsDestructionModalOpen(false)} className="text-slate-400 hover:text-rose-600 transition-colors">&times;</button>
            </div>
            <form onSubmit={handleSaveDestruction} className="p-6 space-y-4 text-left overflow-y-auto min-h-0 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Select Item from Warehouse</label>
                  <select required name="assetId" defaultValue="" className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-rose-500 outline-none">
                    <option value="" disabled>Select Equipment / Material</option>
                    {visibleAssets.map(a => (
                        <option key={a.id} value={a.id}>
                            {a.name} ({a.referenceNumber || a.serialNumber}) - Available: {a.quantity || 0} {a.unit || 'Item'} {a.accountingApproved === false ? '[PENDING]' : ''}
                        </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Quantity to Destroy</label>
                  <input required type="number" min="0.01" step="any" name="quantity" defaultValue={1} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-rose-500 outline-none" />
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Date</label>
                  <input required type="date" name="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-rose-500 outline-none" />
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Reason for Destruction</label>
                  <input required type="text" name="reason" className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-rose-500 outline-none" placeholder="e.g. Beyond repair, Safety hazard"/>
                </div>
                
                <div className="space-y-2 mt-2 col-span-1 md:col-span-2 border-t pt-4 border-slate-100">
                  <h4 className="text-xs font-bold text-rose-600 uppercase tracking-widest">Destroyer Details (Mandatory)</h4>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Destroyer Name</label>
                  <input required type="text" name="destroyerName" className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-rose-500 outline-none" placeholder="Enter full name"/>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Employee Number</label>
                  <input required type="text" name="employeeNumber" className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-rose-500 outline-none" placeholder="e.g. EMP-1234"/>
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">National ID Number</label>
                  <input required type="text" name="destroyerId" className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-rose-500 outline-none" placeholder="Enter ID number"/>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsDestructionModalOpen(false)} className="px-4 py-2 text-slate-500 text-xs font-bold uppercase tracking-widest hover:text-slate-700 transition">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-rose-600 text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-rose-700 transition shadow-md">
                  Confirm Destruction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
