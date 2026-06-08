import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Copy, 
  Printer, 
  FileDown, 
  Eye, 
  Archive, 
  Check, 
  User, 
  ArrowUp, 
  ArrowDown, 
  Search, 
  Filter, 
  Calendar, 
  MapPin, 
  Building, 
  Briefcase, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Download, 
  ShieldCheck, 
  Image as ImageIcon, 
  File, 
  EyeOff, 
  Sliders, 
  Upload, 
  Lock, 
  Unlock,
  Building2,
  Phone,
  Mail,
  Globe,
  Settings,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Project, CompanyData, ClientInfo } from '../types';
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
import html2pdf from 'html2pdf.js';
import { fixHtml2CanvasOklch } from '../lib/pdfUtils';

interface DailyReportsManagerProps {
  projects: Project[];
  company?: Partial<CompanyData>;
  language: 'en' | 'ar';
}

interface ReportSection {
  id: string;
  title: string;
  description: string;
  attachments: {
    name: string;
    type: string;
    dataUrl: string; // Base64 representation
    size: string;
  }[];
}

interface Approver {
  id: string;
  name: string;
  position: string;
  signature: string; // base64 draw or type
  digitalToken?: string;
  date: string;
  status: 'Unapproved' | 'Approved' | 'Rejected';
  isRequired: boolean;
}

interface DailyReport {
  id: string;
  reportNumber: string;
  reportTitle: string;
  reportDate: string;
  reportTime: string;
  reportStatus: 'Draft' | 'Pending Review' | 'Approved' | 'Archived';
  preparedBy: string;
  referenceNumber: string;
  
  // Header details (Optional/Configurable)
  companyInfo: {
    logo?: string;
    name?: string;
    crNumber?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    taxNumber?: string;
  };
  projectInfo: {
    projectId?: string;
    name?: string;
    number?: string;
    location?: string;
    contractNumber?: string;
    contractValue?: string;
    startDate?: string;
    completionDate?: string;
    projectManager?: string;
    siteEngineer?: string;
    constructionManager?: string;
    department?: string;
  };
  clientInfo: ClientInfo;

  // Sections
  sections: ReportSection[];
  
  // Approvals & configurations
  approvals: Approver[];
  config: {
    showCompanyLogo: boolean;
    showCompanyName: boolean;
    showCompanyDetails: boolean;
    showProjectInfo: boolean;
    showClientInfo: boolean;
    showReportMetadata: boolean;
    showSignatureInPrint: boolean;
    showNameOnly: boolean;
    showPosition: boolean;
    showApprovalDate: boolean;
    multiLevelWorkflow: boolean;
    mandatoryApproval: boolean;
  };
  isTemplate?: boolean;
  templateName?: string;
  createdAt?: any;
  updatedAt?: any;
}

// Preset standard layouts & starter section lists
const REPORT_TEMPLATES_PRESETS = [
  {
    name: 'Daily Progress Report',
    title: 'Daily Site Progress',
    sections: [
      { id: 'sec-1', title: 'Completed Works', description: '', attachments: [] },
      { id: 'sec-2', title: 'Ongoing Activities', description: '', attachments: [] },
      { id: 'sec-3', title: 'Planned Activities', description: '', attachments: [] },
      { id: 'sec-4', title: 'Workforce Details', description: '', attachments: [] },
      { id: 'sec-5', title: 'Equipment Utilization', description: '', attachments: [] },
      { id: 'sec-6', title: 'Material Deliveries', description: '', attachments: [] },
      { id: 'sec-7', title: 'General Notes', description: '', attachments: [] }
    ]
  },
  {
    name: 'Site Visit Report',
    title: 'Site Visit Inspection',
    sections: [
      { id: 'sec-1', title: 'Purpose of Visit', description: '', attachments: [] },
      { id: 'sec-2', title: 'Observations', description: '', attachments: [] },
      { id: 'sec-3', title: 'Completed Milestones', description: '', attachments: [] },
      { id: 'sec-4', title: 'Client Instructions', description: '', attachments: [] },
      { id: 'sec-5', title: 'General Notes', description: '', attachments: [] }
    ]
  },
  {
    name: 'Safety Report (HSE)',
    title: 'Daily Safety & HSE Report',
    sections: [
      { id: 'sec-1', title: 'HSE Inductions & Toolbox Talks', description: '', attachments: [] },
      { id: 'sec-2', title: 'Safety Observations', description: '', attachments: [] },
      { id: 'sec-3', title: 'Unsafe Acts & Conditions', description: '', attachments: [] },
      { id: 'sec-4', title: 'Delays and Constraints', description: '', attachments: [] },
      { id: 'sec-5', title: 'PPE Compliance Checklist', description: '', attachments: [] }
    ]
  },
  {
    name: 'Handover Report',
    title: 'Site & Area Handover',
    sections: [
      { id: 'sec-1', title: 'Areas Handed Over', description: '', attachments: [] },
      { id: 'sec-2', title: 'Handover Conditions', description: '', attachments: [] },
      { id: 'sec-3', title: 'Outstanding Snag List', description: '', attachments: [] },
      { id: 'sec-4', title: 'Client Sign-off details', description: '', attachments: [] }
    ]
  }
];

const STANDARD_SECTION_SUGGESTIONS = [
  'Completed Works',
  'Ongoing Activities',
  'Planned Activities',
  'Delays and Constraints',
  'Safety Observations',
  'Quality Observations',
  'Workforce Details',
  'Equipment Utilization',
  'Material Deliveries',
  'Meetings and Site Visits',
  'Client Instructions',
  'Risks and Issues',
  'General Notes'
];

const STANDARD_APPROVER_POSITIONS = [
  'Report Prepared By',
  'Site Supervisor',
  'Site Engineer',
  'Project Engineer',
  'Project Manager',
  'Operations Manager',
  'Area Manager',
  'Contracts Manager',
  'General Manager',
  'Executive Manager',
  'Client Representative'
];

export function DailyReportsManager({ projects, company, language }: DailyReportsManagerProps) {
  const isRtl = language === 'ar';
  
  // Storage for all reports loaded from Firestore
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab ] = useState<'list' | 'editor' | 'preview'>('list');
  
  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [projectFilter, setProjectFilter] = useState<string>('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Selected or active report model in view/edit
  const [currentReport, setCurrentReport] = useState<DailyReport | null>(null);
  
  // Selected Template ID for new reports
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('Daily Progress Report');

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Interactive Digital Signature Drawing Panel
  const [drawingApproverId, setDrawingApproverId] = useState<string | null>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Firestore Sync Loop
  useEffect(() => {
    const q = query(collection(db, 'dailyReports'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: DailyReport[] = [];
      snapshot.forEach((docSnap) => {
        records.push({ ...docSnap.data(), id: docSnap.id } as DailyReport);
      });
      setReports(records);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'dailyReports');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Preset configuration setups
  const generateNewReport = (templateType: string): DailyReport => {
    const autoId = `REP-${Date.now().toString().slice(-6)}`;
    const matchedPreset = REPORT_TEMPLATES_PRESETS.find(p => p.name === templateType) || REPORT_TEMPLATES_PRESETS[0];
    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().split(' ')[0].slice(0, 5);

    // Bootstrap standard approvals (3 default rows, check-box enabled)
    const initialApprovers: Approver[] = [
      { id: 'appr-1', position: 'Report Prepared By', name: 'Administrator User', signature: '', date: todayStr, status: 'Approved', isRequired: true, digitalToken: `SEC-COMP-${Math.random().toString(36).substring(2, 9).toUpperCase()}` },
      { id: 'appr-2', position: 'Site Engineer', name: '', signature: '', date: '', status: 'Unapproved', isRequired: true },
      { id: 'appr-3', position: 'Project Manager', name: '', signature: '', date: '', status: 'Unapproved', isRequired: true },
      { id: 'appr-4', position: 'Client Representative', name: '', signature: '', date: '', status: 'Unapproved', isRequired: false }
    ];

    return {
      id: '',
      reportNumber: autoId,
      reportTitle: matchedPreset.title,
      reportDate: todayStr,
      reportTime: timeStr,
      reportStatus: 'Draft',
      preparedBy: 'Administrator User',
      referenceNumber: `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      
      companyInfo: {
        logo: company?.logo || '',
        name: company?.name || 'REDSEA RETAIL CONTRACTING',
        crNumber: company?.crNumber || '1010349234',
        address: company?.headquarters || 'Riyadh, Saudi Arabia',
        phone: company?.phone || '+966-11-234-5678',
        email: company?.email || 'admin@redsea-retail.sa',
        website: company?.website || 'www.redsea-retail.com',
        taxNumber: company?.vatNumber || '310294829300003'
      },
      
      projectInfo: {
        projectId: projects[0]?.id || '',
        name: projects[0]?.name || '',
        number: projects[0]?.id ? `PRJ-${projects[0].id.slice(-4).toUpperCase()}` : '',
        location: projects[0]?.name ? 'Riyadh Head Office' : '',
        contractNumber: projects[0]?.id ? `CONT-${projects[0].id.slice(-4).toUpperCase()}` : '',
        contractValue: projects[0]?.contractValue ? `$${Number(projects[0].contractValue).toLocaleString()}` : '',
        startDate: projects[0]?.startDate || '',
        completionDate: projects[0]?.endDate || '',
        projectManager: 'Eng. Khalid Al-Amri',
        siteEngineer: 'Eng. Tareq Al-Ghamdi',
        constructionManager: 'Ahmed Mansour',
        department: 'Operations'
      },
      
      clientInfo: {
        clientName: 'Main Client Inc.',
        clientOrganization: 'Saudi Investment Authority',
        clientRepresentative: 'Faisal Bin Abdulaziz',
        contactNumber: '+966-50-123-4567',
        emailAddress: 'client.rep@sia.gov.sa'
      },

      sections: matchedPreset.sections.map(s => ({ ...s, attachments: [] })),
      approvals: initialApprovers,
      
      config: {
        showCompanyLogo: true,
        showCompanyName: true,
        showCompanyDetails: true,
        showProjectInfo: true,
        showClientInfo: true,
        showReportMetadata: true,
        showSignatureInPrint: true,
        showNameOnly: false,
        showPosition: true,
        showApprovalDate: true,
        multiLevelWorkflow: true,
        mandatoryApproval: true
      }
    };
  };

  // Action: Create
  const handleCreateNew = () => {
    const fresh = generateNewReport(selectedTemplateName);
    setCurrentReport(fresh);
    setActiveTab('editor');
  };

  // Action: Delete
  const handleDeleteReport = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(isRtl ? 'هل أنت متأكد من حذف هذا التقرير؟' : 'Are you sure you want to delete this report?')) return;
    try {
      await deleteDoc(doc(db, 'dailyReports', reportId));
      if (currentReport?.id === reportId) {
        setCurrentReport(null);
        setActiveTab('list');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `dailyReports/${reportId}`);
    }
  };

  // Action: Duplicate
  const handleDuplicateReport = async (report: DailyReport, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const duplicated: Omit<DailyReport, 'id'> = {
        ...report,
        reportNumber: `REP-${Date.now().toString().slice(-6)}`,
        reportStatus: 'Draft',
        createdAt: serverTimestamp()
      };
      // Strip ID from duplicated item
      await addDoc(collection(db, 'dailyReports'), duplicated);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'dailyReports');
    }
  };

  // Action: Save to DB
  const handleSaveReport = async () => {
    if (!currentReport) return;
    
    try {
      const savingPayload = {
        ...currentReport,
        updatedAt: new Date().toISOString()
      };

      if (currentReport.id) {
        // Update existing document
        const ref = doc(db, 'dailyReports', currentReport.id);
        const { id, ...dataToSave } = savingPayload; // remove ID before database save
        await updateDoc(ref, dataToSave);
      } else {
        // Add new document
        const saveReady = {
          ...savingPayload,
          createdAt: new Date().toISOString()
        };
        const { id, ...dataToSave } = saveReady;
        const freshDoc = await addDoc(collection(db, 'dailyReports'), dataToSave);
        setCurrentReport({ ...saveReady, id: freshDoc.id });
      }
      
      alert(isRtl ? 'تم حفظ التقرير بنجاح' : 'Report saved successfully!');
      setActiveTab('list');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'dailyReports');
    }
  };

  // Trigger browser print
  const handlePrint = () => {
    window.focus();
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleDownloadPDF = async () => {
    if (!currentReport) return;
    setIsGeneratingPDF(true);
    try {
      const element = document.getElementById('printable-report-canvas');
      if (!element) throw new Error('Printable canvas not found');

      const opt = {
        margin: [10, 5, 10, 5],
        filename: `${currentReport.reportNumber}_${currentReport.reportDate}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          letterRendering: true,
          windowWidth: 1200, // Force desktop layout for high-fidelity capture
          onclone: (clonedDoc: Document) => {
            fixHtml2CanvasOklch(clonedDoc);
            
            // Explicitly set width of printable canvas in the clone
            const canvas = clonedDoc.getElementById('printable-report-canvas');
            if (canvas) {
              canvas.style.width = '210mm';
              canvas.style.maxWidth = '210mm';
              canvas.style.padding = '10mm';
              canvas.style.boxShadow = 'none';
              canvas.style.border = 'none';
            }
          }
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['.section-box', 'tr', 'table', '.signature-block'] }
      };

      // @ts-ignore
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('PDF Generation Error:', err);
      alert('Could not generate PDF. Using standard print instead.');
      handlePrint();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Auto populate project selection settings
  const handleProjectSelect = (projId: string) => {
    if (!currentReport) return;
    const foundProj = projects.find(p => p.id === projId);
    if (!foundProj) return;

    setCurrentReport({
      ...currentReport,
      projectInfo: {
        ...currentReport.projectInfo,
        projectId: foundProj.id,
        name: foundProj.name,
        number: `PRJ-${foundProj.id.slice(-4).toUpperCase()}`,
        startDate: foundProj.startDate || '',
        completionDate: foundProj.endDate || '',
        contractValue: foundProj.contractValue ? foundProj.contractValue.toString() : '',
        location: 'Site Location A'
      },
      clientInfo: foundProj.clientInfo || currentReport.clientInfo
    });
  };

  // Section logic helpers
  const handleAddSection = () => {
    if (!currentReport) return;
    const newSec: ReportSection = {
      id: `sec-custom-${Date.now()}`,
      title: 'New Section',
      description: '',
      attachments: []
    };
    setCurrentReport({
      ...currentReport,
      sections: [...currentReport.sections, newSec]
    });
  };

  const handleDeleteSection = (secId: string) => {
    if (!currentReport) return;
    setCurrentReport({
      ...currentReport,
      sections: currentReport.sections.filter(s => s.id !== secId)
    });
  };

  const handleDuplicateSection = (section: ReportSection) => {
    if (!currentReport) return;
    const duplicated: ReportSection = {
      ...section,
      id: `sec-dup-${Date.now()}`,
      title: `${section.title} (Copy)`
    };
    setCurrentReport({
      ...currentReport,
      sections: [...currentReport.sections, duplicated]
    });
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    if (!currentReport) return;
    const list = [...currentReport.sections];
    if (direction === 'up' && index > 0) {
      [list[index - 1], list[index]] = [list[index], list[index - 1]];
    } else if (direction === 'down' && index < list.length - 1) {
      [list[index + 1], list[index]] = [list[index], list[index + 1]];
    }
    setCurrentReport({
      ...currentReport,
      sections: list
    });
  };

  // File to base64 converter helper
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, secId: string) => {
    const files = e.target.files;
    if (!files || !currentReport) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultString = reader.result as string;
        
        setCurrentReport(prev => {
          if (!prev) return null;
          return {
            ...prev,
            sections: prev.sections.map(sec => {
              if (sec.id !== secId) return sec;
              return {
                ...sec,
                attachments: [
                  ...sec.attachments,
                  {
                    name: file.name,
                    type: file.type,
                    dataUrl: resultString,
                    size: `${(file.size / 1024).toFixed(0)} KB`
                  }
                ]
              };
            })
          };
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveAttachment = (secId: string, idx: number) => {
    if (!currentReport) return;
    setCurrentReport({
      ...currentReport,
      sections: currentReport.sections.map(sec => {
        if (sec.id !== secId) return sec;
        return {
          ...sec,
          attachments: sec.attachments.filter((_, i) => i !== idx)
        };
      })
    });
  };

  // Signature Draw Logic
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    setIsDrawing(true);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#000000';
    ctx.lineCap = 'round';
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawingSignature = () => {
    setIsDrawing(false);
  };

  const clearSignatureCanvas = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = (approverId: string) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas || !currentReport) return;
    
    const base64Url = canvas.toDataURL();
    const isBlank = isCanvasBlank(canvas);
    
    setCurrentReport({
      ...currentReport,
      approvals: currentReport.approvals.map(appr => {
        if (appr.id !== approverId) return appr;
        return {
          ...appr,
          signature: isBlank ? '' : base64Url,
          status: isBlank ? 'Unapproved' : 'Approved',
          date: new Date().toISOString().split('T')[0],
          digitalToken: isBlank ? undefined : `DIGITAL-[${Math.random().toString(36).substring(2, 9).toUpperCase()}]`
        };
      })
    });
    setDrawingApproverId(null);
  };

  const isCanvasBlank = (canvas: HTMLCanvasElement) => {
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    return canvas.toDataURL() === blank.toDataURL();
  };

  // Dashboard calculations
  const totalReportsCount = reports.length;
  const draftCount = reports.filter(r => r.reportStatus === 'Draft').length;
  const pendingReviewCount = reports.filter(r => r.reportStatus === 'Pending Review').length;
  const approvedCount = reports.filter(r => r.reportStatus === 'Approved').length;
  const archivedCount = reports.filter(r => r.reportStatus === 'Archived').length;

  // Recent 5 Reports
  const recentReports = reports.slice(0, 5);

  // Filters process
  const filteredReports = reports.filter(item => {
    const titleMatch = item.reportTitle.toLowerCase().includes(searchQuery.toLowerCase()) || 
                       item.reportNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
                       (item.projectInfo?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const statusMatch = statusFilter === 'All' || item.reportStatus === statusFilter;
    const projectMatch = projectFilter === 'All' || item.projectInfo?.projectId === projectFilter;
    
    // Date filter matching
    let dateMatch = true;
    if (dateFrom && item.reportDate < dateFrom) dateMatch = false;
    if (dateTo && item.reportDate > dateTo) dateMatch = false;

    return titleMatch && statusMatch && projectMatch && dateMatch;
  });

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 text-slate-800" id="daily-reports-manager">
      
      {/* Title Header Section */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <span className="text-red-600 font-bold tracking-widest uppercase text-xs">
            {isRtl ? 'الإدارة الخارجية' : 'EXTERNAL ADMINISTRATION'}
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            {isRtl ? 'إدارة التقارير اليومية الكاملة' : 'Daily Reports Management'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isRtl ? 'إنشاء وتعديل وتوقيع وتصدير تقارير الموقع اليومية بمرونة كاملة' : 'Create, edit, approve, print and manage dynamic daily site reports with full flexibility.'}
          </p>
        </div>

        {activeTab === 'list' && (
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:flex-initial">
              <select 
                value={selectedTemplateName} 
                onChange={(e) => setSelectedTemplateName(e.target.value)}
                className="w-full bg-white border border-slate-200 p-3.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-slate-700 shadow-sm"
              >
                {REPORT_TEMPLATES_PRESETS.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            
            <button 
              onClick={handleCreateNew}
              className="px-5 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{isRtl ? 'إنشاء تقرير' : 'Create Report'}</span>
            </button>
          </div>
        )}

        {(activeTab === 'editor' || activeTab === 'preview') && (
          <button 
            onClick={() => setActiveTab('list')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
          >
            {isRtl ? '← العودة للقائمة' : '← Back to List'}
          </button>
        )}
      </div>

      {/* ----------------- TAB: LIST VIEW (DASHBOARD) ----------------- */}
      {activeTab === 'list' && (
        <div className="space-y-6">
          
          {/* STATS COUNT DASHBOARD GRID */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Reports</span>
                <span className="text-2xl font-extrabold text-slate-900 block">{totalReportsCount}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                <Sliders className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-sans">Draft / Under review</span>
                <span className="text-2xl font-extrabold text-slate-900 block">{draftCount + pendingReviewCount}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Approved</span>
                <span className="text-2xl font-extrabold text-slate-900 block">{approvedCount}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-slate-50 text-slate-400 rounded-lg">
                <Archive className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Archived</span>
                <span className="text-2xl font-extrabold text-slate-900 block">{archivedCount}</span>
              </div>
            </div>
          </div>

          {/* ADVANCED SECH & FILTER CRAD */}
          <div className="bg-white p-4 rounded-xl border border-slate-150/70 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-slate-500 font-semibold text-xs uppercase tracking-wider border-b border-slate-50 pb-2">
              <Filter className="w-4 h-4" />
              <span>{isRtl ? 'خيارات الفرز والبحث المتقدمة' : 'Advanced Search & Filters'}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input 
                  type="text" 
                  placeholder={isRtl ? 'بحث برقم التقرير، العنوان أو المشروع' : 'Search number, title or project...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-2.5 rounded-lg text-xs"
                />
              </div>

              <div>
                <select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs"
                >
                  <option value="All">{isRtl ? 'تصفية حسب الحالة: الكل' : 'Status Filter: All'}</option>
                  <option value="Draft">Draft</option>
                  <option value="Pending Review">Pending Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              <div>
                <select 
                  value={projectFilter} 
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs"
                >
                  <option value="All">{isRtl ? 'جميع المشاريع' : 'All Projects'}</option>
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>{proj.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <input 
                  type="date" 
                  value={dateFrom} 
                  onChange={(e) => setDateFrom(e.target.value)} 
                  className="flex-1 bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs"
                  placeholder="From"
                />
                <input 
                  type="date" 
                  value={dateTo} 
                  onChange={(e) => setDateTo(e.target.value)} 
                  className="flex-1 bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs"
                  placeholder="To"
                />
              </div>
            </div>
          </div>

          {/* MAIN LIST OF REPORTS */}
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-800 tracking-tight uppercase">
                {isRtl ? 'تقارير الموقع المسجلة' : 'Registered Daily Reports'} ({filteredReports.length})
              </h2>
            </div>

            {loading ? (
              <div className="py-20 text-center text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-red-500" />
                <span>Loading report documents...</span>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="py-20 text-center text-slate-400 text-xs">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-50 block" />
                <span>No matching daily reports found. Create one to get started!</span>
              </div>
            ) : (
              <div className="overflow-x-auto w-full min-w-full">
                <div className="min-w-max">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 border-b border-slate-150 uppercase font-semibold text-[10px] tracking-wider">
                        <th className="py-3.5 px-4">REP NO.</th>
                        <th className="py-3.5 px-4">Title</th>
                        <th className="py-3.5 px-4">Project</th>
                        <th className="py-3.5 px-4">Date / Time</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredReports.map((rep) => (
                        <tr key={rep.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-4 font-bold font-mono text-slate-900">{rep.reportNumber}</td>
                          <td className="py-4 px-4">
                            <div>
                              <span className="font-bold text-slate-700 block">{rep.reportTitle}</span>
                              <span className="text-[10px] text-slate-400 block font-mono">Ref: {rep.referenceNumber}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-medium text-slate-600 block max-w-xs truncate">{rep.projectInfo?.name || 'All Projects'}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-medium block">{rep.reportDate}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">{rep.reportTime}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={cn(
                              "px-2 px-1 py-1 rounded text-[10px] font-bold uppercase",
                              rep.reportStatus === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              rep.reportStatus === 'Pending Review' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                              rep.reportStatus === 'Archived' ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                              'bg-indigo-50 text-indigo-700 border border-indigo-100'
                            )}>
                              {rep.reportStatus}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex justify-center items-center gap-1.5">
                              <button 
                                onClick={() => { setCurrentReport(rep); setActiveTab('preview'); }}
                                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded border border-slate-100 transition-all"
                                title="View details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setCurrentReport(rep); 
                                  setActiveTab('preview'); 
                                  setTimeout(() => {
                                    handleDownloadPDF();
                                  }, 800); 
                                }}
                                className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded border border-emerald-100 transition-all"
                                title="Download PDF Report"
                              >
                                <FileDown className="w-3.5 h-3.5" />
                              </button>
                               
                               <button 
                                 onClick={() => { setCurrentReport(rep); setActiveTab('editor'); }}
                                className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-100 transition-all"
                                title="Edit Report"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              <button 
                                onClick={(e) => handleDuplicateReport(rep, e)}
                                className="p-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded border border-yellow-150 transition-all"
                                title="Duplicate"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              
                              <button 
                                onClick={(e) => handleDeleteReport(rep.id, e)}
                                className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded border border-red-100 transition-all"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- TAB: EDITOR VIEW (FLEXIBLE CONFIGURABLE TEMPLATE) ----------------- */}
      {activeTab === 'editor' && currentReport && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT FORM COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* GENERAL METADATA AREA */}
            <div className="bg-white p-5 rounded-xl border border-slate-150 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-50">
                {isRtl ? 'المعلومات الأساسية للتقرير' : 'General Report Settings'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Report Number</label>
                  <input 
                    type="text" 
                    value={currentReport.reportNumber}
                    onChange={(e) => setCurrentReport({ ...currentReport, reportNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Report Title</label>
                  <input 
                    type="text" 
                    value={currentReport.reportTitle}
                    onChange={(e) => setCurrentReport({ ...currentReport, reportTitle: e.target.value })}
                    className="w-full bg-white border border-slate-200 p-2 rounded text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Reference Number</label>
                  <input 
                    type="text" 
                    value={currentReport.referenceNumber}
                    onChange={(e) => setCurrentReport({ ...currentReport, referenceNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Report Date</label>
                  <input 
                    type="date" 
                    value={currentReport.reportDate}
                    onChange={(e) => setCurrentReport({ ...currentReport, reportDate: e.target.value })}
                    className="w-full bg-white border border-slate-200 p-2 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Report Time</label>
                  <input 
                    type="time" 
                    value={currentReport.reportTime}
                    onChange={(e) => setCurrentReport({ ...currentReport, reportTime: e.target.value })}
                    className="w-full bg-white border border-slate-200 p-2 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Prepared By</label>
                  <input 
                    type="text" 
                    value={currentReport.preparedBy}
                    onChange={(e) => setCurrentReport({ ...currentReport, preparedBy: e.target.value })}
                    className="w-full bg-white border border-slate-200 p-2 rounded text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                  <select 
                    value={currentReport.reportStatus}
                    onChange={(e) => setCurrentReport({ ...currentReport, reportStatus: e.target.value as any })}
                    className="w-full bg-white border border-slate-200 p-2 rounded text-xs font-semibold"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Pending Review">Pending Review</option>
                    <option value="Approved">Approved</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>
            </div>

            {/* COMPANY INFORMATION SECTION */}
            <AnimatePresence>
              {currentReport.config.showCompanyLogo && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white p-5 rounded-xl border border-slate-150 shadow-xs space-y-4"
                >
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-50 flex justify-between items-center">
                    <span>Company Information</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Company Name</label>
                      <input 
                        type="text" 
                        value={currentReport.companyInfo.name || ''}
                        onChange={(e) => setCurrentReport({ 
                          ...currentReport, 
                          companyInfo: { ...currentReport.companyInfo, name: e.target.value } 
                        })}
                        className="w-full bg-white border border-slate-200 p-2 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Commercial Registration (CR)</label>
                      <input 
                        type="text" 
                        value={currentReport.companyInfo.crNumber || ''}
                        onChange={(e) => setCurrentReport({ 
                          ...currentReport, 
                          companyInfo: { ...currentReport.companyInfo, crNumber: e.target.value } 
                        })}
                        className="w-full bg-white border border-slate-200 p-2 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">VAT/Tax Number</label>
                      <input 
                        type="text" 
                        value={currentReport.companyInfo.taxNumber || ''}
                        onChange={(e) => setCurrentReport({ 
                          ...currentReport, 
                          companyInfo: { ...currentReport.companyInfo, taxNumber: e.target.value } 
                        })}
                        className="w-full bg-white border border-slate-200 p-2 rounded text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Address</label>
                      <input 
                        type="text" 
                        value={currentReport.companyInfo.address || ''}
                        onChange={(e) => setCurrentReport({ 
                          ...currentReport, 
                          companyInfo: { ...currentReport.companyInfo, address: e.target.value } 
                        })}
                        className="w-full bg-white border border-slate-200 p-2 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phone</label>
                      <input 
                        type="text" 
                        value={currentReport.companyInfo.phone || ''}
                        onChange={(e) => setCurrentReport({ 
                          ...currentReport, 
                          companyInfo: { ...currentReport.companyInfo, phone: e.target.value } 
                        })}
                        className="w-full bg-white border border-slate-200 p-2 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email</label>
                      <input 
                        type="text" 
                        value={currentReport.companyInfo.email || ''}
                        onChange={(e) => setCurrentReport({ 
                          ...currentReport, 
                          companyInfo: { ...currentReport.companyInfo, email: e.target.value } 
                        })}
                        className="w-full bg-white border border-slate-200 p-2 rounded text-xs"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* PROJECT SELECTION & DETAILS AREA */}
            <AnimatePresence>
              {currentReport.config.showProjectInfo && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white p-5 rounded-xl border border-slate-150 shadow-xs space-y-4"
                >
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-50">
                    Project Details
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Link Existing Project</label>
                      <select 
                        value={currentReport.projectInfo.projectId}
                        onChange={(e) => handleProjectSelect(e.target.value)}
                        className="w-full bg-white border border-slate-200 p-2.5 rounded text-xs font-bold text-red-600"
                      >
                        <option value="">-- Manual Configuration --</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Project Name</label>
                      <input 
                        type="text" 
                        value={currentReport.projectInfo.name || ''}
                        onChange={(e) => setCurrentReport({ 
                          ...currentReport, 
                          projectInfo: { ...currentReport.projectInfo, name: e.target.value } 
                        })}
                        className="w-full bg-white border border-slate-200 p-2 rounded text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Project Code</label>
                      <input 
                        type="text" 
                        value={currentReport.projectInfo.number || ''}
                        onChange={(e) => setCurrentReport({ 
                          ...currentReport, 
                          projectInfo: { ...currentReport.projectInfo, number: e.target.value } 
                        })}
                        className="w-full bg-white border border-slate-200 p-2 rounded text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contract Number</label>
                      <input 
                        type="text" 
                        value={currentReport.projectInfo.contractNumber || ''}
                        onChange={(e) => setCurrentReport({ 
                          ...currentReport, 
                          projectInfo: { ...currentReport.projectInfo, contractNumber: e.target.value } 
                        })}
                        className="w-full bg-white border border-slate-200 p-2 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Value</label>
                      <input 
                        type="text" 
                        value={currentReport.projectInfo.contractValue || ''}
                        onChange={(e) => setCurrentReport({ 
                          ...currentReport, 
                          projectInfo: { ...currentReport.projectInfo, contractValue: e.target.value } 
                        })}
                        className="w-full bg-white border border-slate-200 p-2 rounded text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date limit (Start)</label>
                      <input 
                        type="date" 
                        value={currentReport.projectInfo.startDate || ''}
                        onChange={(e) => setCurrentReport({ 
                          ...currentReport, 
                          projectInfo: { ...currentReport.projectInfo, startDate: e.target.value } 
                        })}
                        className="w-full bg-white border border-slate-200 p-2 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Completion Date</label>
                      <input 
                        type="date" 
                        value={currentReport.projectInfo.completionDate || ''}
                        onChange={(e) => setCurrentReport({ 
                          ...currentReport, 
                          projectInfo: { ...currentReport.projectInfo, completionDate: e.target.value } 
                        })}
                        className="w-full bg-white border border-slate-200 p-2 rounded text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Project Manager</label>
                      <input 
                        type="text" 
                        value={currentReport.projectInfo.projectManager || ''}
                        onChange={(e) => setCurrentReport({ 
                          ...currentReport, 
                          projectInfo: { ...currentReport.projectInfo, projectManager: e.target.value } 
                        })}
                        className="w-full bg-white border border-slate-200 p-2 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Site Engineer</label>
                      <input 
                        type="text" 
                        value={currentReport.projectInfo.siteEngineer || ''}
                        onChange={(e) => setCurrentReport({ 
                          ...currentReport, 
                          projectInfo: { ...currentReport.projectInfo, siteEngineer: e.target.value } 
                        })}
                        className="w-full bg-white border border-slate-200 p-2 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Construction Manager</label>
                      <input 
                        type="text" 
                        value={currentReport.projectInfo.constructionManager || ''}
                        onChange={(e) => setCurrentReport({ 
                          ...currentReport, 
                          projectInfo: { ...currentReport.projectInfo, constructionManager: e.target.value } 
                        })}
                        className="w-full bg-white border border-slate-200 p-2 rounded text-xs"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CLIENT INFORMATION SECTION */}
            <AnimatePresence>
              {currentReport.config.showClientInfo && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white p-5 rounded-xl border border-slate-150 shadow-xs space-y-4"
                >
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-50">
                    Client Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Client Organization / Name</label>
                      <input 
                        type="text" 
                        value={currentReport.clientInfo.clientOrganization || ''}
                        onChange={(e) => setCurrentReport({ 
                          ...currentReport, 
                          clientInfo: { ...currentReport.clientInfo, clientOrganization: e.target.value } 
                        })}
                        className="w-full bg-white border border-slate-200 p-2 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Client Representative</label>
                      <input 
                        type="text" 
                        value={currentReport.clientInfo.clientRepresentative || ''}
                        onChange={(e) => setCurrentReport({ 
                          ...currentReport, 
                          clientInfo: { ...currentReport.clientInfo, clientRepresentative: e.target.value } 
                        })}
                        className="w-full bg-white border border-slate-200 p-2 rounded text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contact Number</label>
                      <input 
                        type="text" 
                        value={currentReport.clientInfo.contactNumber || ''}
                        onChange={(e) => setCurrentReport({ 
                          ...currentReport, 
                          clientInfo: { ...currentReport.clientInfo, contactNumber: e.target.value } 
                        })}
                        className="w-full bg-white border border-slate-200 p-2 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                      <input 
                        type="text" 
                        value={currentReport.clientInfo.emailAddress || ''}
                        onChange={(e) => setCurrentReport({ 
                          ...currentReport, 
                          clientInfo: { ...currentReport.clientInfo, emailAddress: e.target.value } 
                        })}
                        className="w-full bg-white border border-slate-200 p-2 rounded text-xs"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* DYNAMIC SECTIONS LAYOUT (UNLIMITED CUSTOM SECTIONS & ATTACHMENTS) */}
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-lg border border-slate-150">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {isRtl ? 'أقسام التقرير الديناميكية' : 'Dynamic Site Sections'} ({currentReport.sections.length})
                </h3>
                <button 
                  onClick={handleAddSection} 
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'إضافة قسم جديد' : 'Add New Section'}</span>
                </button>
              </div>

              {currentReport.sections.map((section, idx) => (
                <div key={section.id} className="bg-white p-5 rounded-xl border border-slate-150 shadow-xs space-y-4 relative group">
                  
                  {/* Action Reorder Row */}
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2 bg-slate-50/50 -m-5 px-5 py-2.5 rounded-t-xl">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 bg-slate-200 text-slate-700 rounded-full flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <input 
                        type="text" 
                        value={section.title}
                        onChange={(e) => {
                          const updated = currentReport.sections.map(s => s.id === section.id ? { ...s, title: e.target.value } : s);
                          setCurrentReport({ ...currentReport, sections: updated });
                        }}
                        className="bg-transparent hover:bg-white text-xs font-extrabold focus:bg-white border-0 hover:border focus:border border-slate-200 p-1 rounded w-60"
                      />
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleMoveSection(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 bg-white hover:bg-slate-100 text-slate-600 rounded border border-slate-200 disabled:opacity-40"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      
                      <button 
                        onClick={() => handleMoveSection(idx, 'down')}
                        disabled={idx === currentReport.sections.length - 1}
                        className="p-1 bg-white hover:bg-slate-100 text-slate-600 rounded border border-slate-200 disabled:opacity-40"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>

                      <button 
                        onClick={() => handleDuplicateSection(section)}
                        className="p-1 bg-white hover:bg-amber-100 text-amber-700 rounded border border-slate-200"
                        title="Duplicate section"
                      >
                        <Copy className="w-3 h-3" />
                      </button>

                      <button 
                        onClick={() => handleDeleteSection(section.id)}
                        className="p-1 bg-white hover:bg-red-100 text-red-600 rounded border border-slate-200"
                        title="Delete section"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Section Rich Description Area */}
                  <div className="pt-2">
                    <textarea 
                      placeholder="Enter detailed description here or add observations..."
                      value={section.description}
                      onChange={(e) => {
                        const updated = currentReport.sections.map(s => s.id === section.id ? { ...s, description: e.target.value } : s);
                        setCurrentReport({ ...currentReport, sections: updated });
                      }}
                      className="w-full bg-white border border-slate-200 p-3 rounded-lg text-xs font-sans min-h-[90px] focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>

                  {/* Media Upload & Preview Block */}
                  <div className="space-y-2 pt-2 border-t border-slate-50">
                    <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-400">
                      <span>Attachments & Media Gallery</span>
                      <label className="cursor-pointer text-red-600 hover:text-red-700 flex items-center gap-1">
                        <Upload className="w-3 h-3" />
                        <span>Upload Files</span>
                        <input 
                          type="file" 
                          multiple 
                          accept="image/*,application/pdf"
                          onChange={(e) => handleFileUpload(e, section.id)}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {section.attachments.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {section.attachments.map((file, fIdx) => (
                          <div key={fIdx} className="border border-slate-150 rounded-lg p-2 bg-slate-50/50 relative group/file mt-1">
                            <button 
                              onClick={() => handleRemoveAttachment(section.id, fIdx)}
                              className="absolute -top-1.5 right-1 bg-white text-red-600 hover:bg-red-50 p-1 shadow-sm rounded-full border border-red-150 transition-all z-10"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                            
                            {file.type.startsWith('image/') ? (
                              <div className="w-full h-16 rounded overflow-hidden bg-white mb-1">
                                <img src={file.dataUrl} alt={file.name} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-full h-16 rounded bg-red-50 flex items-center justify-center mb-1">
                                <File className="w-6 h-6 text-red-600" />
                              </div>
                            )}

                            <span className="text-[9px] font-medium text-slate-600 block truncate leading-none mt-1">{file.name}</span>
                            <span className="text-[8px] text-slate-400 font-mono block mt-0.5">{file.size}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-slate-50/40 py-4 text-center text-[10px] text-slate-400 rounded-lg border border-dashed border-slate-150">
                        No attachments. Drag and drop or upload report evidence photos directly.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* APPROVALS AND INTEGRATIVE SIGNATURES */}
            <div className="bg-white p-5 rounded-xl border border-slate-150 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Approvals & Stakeholder Sign-Offs</span>
                </h3>
              </div>

              <div className="space-y-3">
                {currentReport.approvals.map((appr) => (
                  <div key={appr.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                      <select 
                        value={appr.position}
                        onChange={(e) => {
                          const updated = currentReport.approvals.map(a => a.id === appr.id ? { ...a, position: e.target.value } : a);
                          setCurrentReport({ ...currentReport, approvals: updated });
                        }}
                        className="bg-transparent font-bold text-xs uppercase text-slate-700 border-0 p-0 focus:ring-0 mr-2"
                      >
                        {STANDARD_APPROVER_POSITIONS.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                      
                      <input 
                        type="text" 
                        placeholder="Print Name of Representative..."
                        value={appr.name}
                        onChange={(e) => {
                          const updated = currentReport.approvals.map(a => a.id === appr.id ? { ...a, name: e.target.value } : a);
                          setCurrentReport({ ...currentReport, approvals: updated });
                        }}
                        className="bg-white border border-slate-200 px-2 py-1 rounded text-xs w-60 block font-semibold"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {appr.signature ? (
                        <div className="bg-white rounded p-1.5 border border-slate-150 flex items-center gap-2">
                          <img src={appr.signature} alt="Sign" className="h-8 max-w-[120px] object-contain" />
                          <div className="text-[8px] font-mono leading-tight border-l border-slate-150 pl-2">
                            <span className="text-slate-400 block">SYSTEM VERIFIED</span>
                            <span className="text-emerald-600 font-bold block">{appr.digitalToken || 'VERIFIED'}</span>
                          </div>
                          <button 
                            onClick={() => {
                              const updated = currentReport.approvals.map(a => a.id === appr.id ? { ...a, signature: '', status: 'Unapproved', digitalToken: undefined } : a);
                              setCurrentReport({ ...currentReport, approvals: updated });
                            }}
                            className="p-1 hover:bg-slate-100 text-red-600 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setDrawingApproverId(appr.id)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold uppercase tracking-widest transition-all"
                        >
                          Sign Document
                        </button>
                      )}

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400">MANDATORY:</span>
                        <input 
                          type="checkbox" 
                          checked={appr.isRequired}
                          onChange={(e) => {
                            const updated = currentReport.approvals.map(a => a.id === appr.id ? { ...a, isRequired: e.target.checked } : a);
                            setCurrentReport({ ...currentReport, approvals: updated });
                          }}
                          className="w-3.5 h-3.5 text-red-600 rounded border-slate-300 focus:ring-red-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button 
                  onClick={() => {
                    const freshAppr: Approver = {
                      id: `appr-${Date.now()}`,
                      position: 'Site Engineer',
                      name: '',
                      signature: '',
                      date: '',
                      status: 'Unapproved',
                      isRequired: false
                    };
                    setCurrentReport({
                      ...currentReport,
                      approvals: [...currentReport.approvals, freshAppr]
                    });
                  }}
                  className="w-full text-center py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 uppercase transition-all"
                >
                  + Add Approver Sign-Row
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR PRESET CONFIGS (FLEXIBILITY TOGGLES) */}
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl border border-slate-150 shadow-xs space-y-5">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest pb-2 border-b border-slate-100 flex items-center gap-2">
                <Settings className="w-4 h-4 text-red-600" />
                <span>Visibility Control Settings</span>
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Show Company Logo</span>
                    <span className="text-[10px] text-slate-400 block">Displays corporate branding header</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={currentReport.config.showCompanyLogo}
                    onChange={(e) => setCurrentReport({
                      ...currentReport,
                      config: { ...currentReport.config, showCompanyLogo: e.target.checked }
                    })}
                    className="w-4.5 h-4.5 text-red-600 rounded border-slate-300 focus:ring-red-500"
                  />
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Show Company Name</span>
                    <span className="text-[10px] text-slate-400 block">Headers display registered name</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={currentReport.config.showCompanyName}
                    onChange={(e) => setCurrentReport({
                      ...currentReport,
                      config: { ...currentReport.config, showCompanyName: e.target.checked }
                    })}
                    className="w-4.5 h-4.5 text-red-600 rounded border-slate-300"
                  />
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Show Project Information</span>
                    <span className="text-[10px] text-slate-400 block">Hides/shows detailed project grid</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={currentReport.config.showProjectInfo}
                    onChange={(e) => setCurrentReport({
                      ...currentReport,
                      config: { ...currentReport.config, showProjectInfo: e.target.checked }
                    })}
                    className="w-4.5 h-4.5 text-red-600 rounded border-slate-300"
                  />
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Show Client Info</span>
                    <span className="text-[10px] text-slate-400 block">Configures visibility of client representative</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={currentReport.config.showClientInfo}
                    onChange={(e) => setCurrentReport({
                      ...currentReport,
                      config: { ...currentReport.config, showClientInfo: e.target.checked }
                    })}
                    className="w-4.5 h-4.5 text-red-600 rounded border-slate-300 animate-pulse-slow"
                  />
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Show Signatures in Print</span>
                    <span className="text-[10px] text-slate-400 block">Print outputs will retain drawings</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={currentReport.config.showSignatureInPrint}
                    onChange={(e) => setCurrentReport({
                      ...currentReport,
                      config: { ...currentReport.config, showSignatureInPrint: e.target.checked }
                    })}
                    className="w-4.5 h-4.5 text-red-600 rounded border-slate-300"
                  />
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Show Name Only</span>
                    <span className="text-[10px] text-slate-400 block">Hides active drawing but keeps printed text</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={currentReport.config.showNameOnly}
                    onChange={(e) => setCurrentReport({
                      ...currentReport,
                      config: { ...currentReport.config, showNameOnly: e.target.checked }
                    })}
                    className="w-4.5 h-4.5 text-red-600 rounded border-slate-300"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Mandatory Approvals</span>
                    <span className="text-[10px] text-slate-400 block">Locks report until all signatures exist</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={currentReport.config.mandatoryApproval}
                    onChange={(e) => setCurrentReport({
                      ...currentReport,
                      config: { ...currentReport.config, mandatoryApproval: e.target.checked }
                    })}
                    className="w-4.5 h-4.5 text-red-600 rounded border-slate-300"
                  />
                </div>
              </div>
            </div>

            <div className="bg-red-600 text-white p-5 rounded-xl space-y-4 shadow-sm">
              <span className="text-[9px] uppercase tracking-widest font-extrabold opacity-80 block">Save and Output</span>
              <h4 className="text-base font-extrabold pb-2 border-b border-red-500">Report Operations</h4>
              <p className="text-xs opacity-90 leading-tight">Sync this configuration back to the secure enterprise Cloud storage database or view clean full-width document preview ready to export.</p>
              
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button 
                  onClick={handleSaveReport}
                  className="w-full py-3.5 bg-white hover:bg-slate-50 text-slate-900 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all"
                >
                  Save Report
                </button>
                <button 
                  onClick={() => setActiveTab('preview')}
                  className="w-full py-3.5 bg-red-700 hover:bg-red-800 text-white border border-red-500 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all"
                >
                  Preview Layout
                </button>
              </div>

              <div className="pt-2 border-t border-red-500">
                <button 
                  onClick={(e) => handleDeleteReport(currentReport.id!, e)}
                  className="w-full py-2.5 bg-red-800 hover:bg-red-900 text-white/80 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-red-400/30"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete This Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB: PREVIEW & PRINT LAYOUT VIEW ----------------- */}
      {activeTab === 'preview' && currentReport && (
        <div className="space-y-6">
          <div className="p-4 bg-white rounded-xl border border-slate-100 flex justify-between items-center no-print print:hidden">
            <div className="flex items-center gap-2">
              <span className="py-1 px-2.5 bg-red-50 text-red-700 text-[10px] font-extrabold uppercase rounded font-mono">
                {currentReport.reportNumber}
              </span>
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Document Preview Mode</span>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setActiveTab('editor')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold uppercase tracking-widest transition-all"
              >
                Edit
              </button>
              <button 
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className={cn(
                  "px-4 py-2 bg-slate-900 hover:bg-black text-white rounded text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-sm transition-all",
                  isGeneratingPDF ? "opacity-50 cursor-not-allowed" : "animate-pulse-slow"
                )}
              >
                {isGeneratingPDF ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4" />
                )}
                <span>{isGeneratingPDF ? 'Generating...' : 'Download PDF'}</span>
              </button>
              
              <button 
                onClick={(e) => handleDeleteReport(currentReport.id!, e)}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs font-bold uppercase tracking-widest flex items-center gap-2 border border-red-200 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <button 
                onClick={handlePrint}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* PRINTABLE PREVIEW CANVAS (Pristine grid styling) */}
          <div className="bg-white p-8 md:p-12 rounded-xl border border-slate-150 shadow-md max-w-4xl mx-auto print-area print:p-0 print:border-none print:shadow-none" id="printable-report-canvas">
            
            {/* Report Header Logo Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b-4 border-red-600 mb-6">
              <div className="flex items-center gap-3">
                {currentReport.config.showCompanyLogo && currentReport.companyInfo.logo && (
                  <img src={currentReport.companyInfo.logo} alt="Logo" className="h-10 w-auto object-contain" />
                )}
                <div>
                  <h2 className="text-xl font-black text-slate-900 leading-none">
                    {currentReport.config.showCompanyName ? currentReport.companyInfo.name : 'REDSEA'}
                  </h2>
                  <span className="text-[10px] text-slate-400 tracking-wider">COMMERCIAL RECONSTRUCTION & RETAIL</span>
                </div>
              </div>
              
              <div className="text-right md:text-right text-xs text-slate-500">
                <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">REPORT DOCUMENT</span>
                <span className="text-lg font-black text-red-600 block">{currentReport.reportNumber}</span>
                <span className="text-[10px] font-mono block">Ref: {currentReport.referenceNumber}</span>
              </div>
            </div>

            {/* Corporate Registration & Tax Information Row */}
            {currentReport.config.showCompanyDetails && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs mb-6 font-sans">
                <div>
                  <span className="text-slate-400 text-[9px] uppercase font-bold tracking-wider block">Commercial Registry</span>
                  <span className="font-bold text-slate-700 block mt-0.5">{currentReport.companyInfo.crNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[9px] uppercase font-bold tracking-wider block">VAT No / Tax ID</span>
                  <span className="font-bold font-mono text-slate-700 block mt-0.5">{currentReport.companyInfo.taxNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[9px] uppercase font-bold tracking-wider block">Official Location</span>
                  <span className="font-bold text-slate-700 block mt-0.5 mt-1 sm:mt-0.5">{currentReport.companyInfo.address || 'Saudi Arabia'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[9px] uppercase font-bold tracking-wider block">Corporate Contact</span>
                  <span className="font-bold text-slate-700 block mt-0.5 leading-none">{currentReport.companyInfo.phone || 'N/A'}</span>
                </div>
              </div>
            )}

            {/* Project & Client Grid Panel Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 print:grid-cols-2">
              
              {/* Project Panel Card */}
              {currentReport.config.showProjectInfo && (
                <div className="border border-slate-150 rounded-xl p-4 space-y-3 section-box print:bg-white">
                  <h4 className="text-[11px] font-extrabold text-red-600 uppercase tracking-widest border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4" />
                    <span>Project Specification Info</span>
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs leading-tight">
                    <div className="col-span-2">
                      <span className="text-slate-400 text-[9.5px] uppercase font-bold block">Project Name</span>
                      <span className="font-bold text-slate-800 block mt-0.5">{currentReport.projectInfo.name || 'All active Projects'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[9.5px] uppercase font-bold block">Project Number</span>
                      <span className="font-mono text-slate-700 font-bold block mt-0.5">{currentReport.projectInfo.number || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[9.5px] uppercase font-bold block">Contract Number</span>
                      <span className="font-mono text-slate-700 block mt-0.5">{currentReport.projectInfo.contractNumber || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[9.5px] uppercase font-bold block">Direct PM</span>
                      <span className="font-semibold block mt-0.5">{currentReport.projectInfo.projectManager || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[9.5px] uppercase font-bold block">Completion date</span>
                      <span className="font-bold text-red-600 block mt-0.5">{currentReport.projectInfo.completionDate || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Client Specification Card layout */}
              {currentReport.config.showClientInfo && (
                <div className="border border-slate-150 rounded-xl p-4 space-y-3 section-box print:bg-white">
                  <h4 className="text-[11px] font-extrabold text-red-600 uppercase tracking-widest border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    <span>Client Specification Info</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-xs leading-tight">
                    <div className="col-span-2">
                      <span className="text-slate-400 text-[9.5px] uppercase font-bold block">Client Organization</span>
                      <span className="font-bold text-slate-800 block mt-0.5 whitespace-normal">{currentReport.clientInfo.clientOrganization || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[9.5px] uppercase font-bold block">Representative</span>
                      <span className="font-semibold block mt-0.5">{currentReport.clientInfo.clientRepresentative || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[9.5px] uppercase font-bold block">Contact Number</span>
                      <span className="font-semibold block mt-0.5">{currentReport.clientInfo.contactNumber || 'N/A'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 text-[9.5px] uppercase font-bold block">Email Address</span>
                      <span className="font-mono block mt-0.5 break-all print:truncate-none overflow-visible">{currentReport.clientInfo.emailAddress || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* General Report Details Row */}
            {currentReport.config.showReportMetadata && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-y border-slate-150 py-3.5 mb-6 text-xs">
                <div>
                  <span className="text-slate-400 text-[9px] uppercase font-bold block">Report Title / Subject</span>
                  <span className="font-bold text-slate-800 block mt-0.5">{currentReport.reportTitle}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[9px] uppercase font-bold block">Report Date</span>
                  <span className="font-bold text-slate-800 block mt-0.5">{currentReport.reportDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[9px] uppercase font-bold block">Time</span>
                  <span className="font-bold text-slate-800 block mt-0.5">{currentReport.reportTime}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[9px] uppercase font-bold block">Prepared By</span>
                  <span className="font-bold text-red-600 block mt-0.5">{currentReport.preparedBy}</span>
                </div>
              </div>
            )}

            {/* SECTIONS LISTING PRINT ELEMENT */}
            <div className="space-y-6">
              {currentReport.sections.map((sec, sIdx) => (
                <div key={sec.id} className="space-y-2 pb-5 border-b border-slate-100 last:border-b-0 section-box">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider bg-slate-50 p-2 border-l-2 border-red-600 rounded">
                    {sIdx + 1}. {sec.title}
                  </h3>
                  
                  {sec.description ? (
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap px-1">
                      {sec.description}
                    </p>
                  ) : (
                    <span className="text-slate-400 text-[10px] px-1 block italic">No logs recorded for this section.</span>
                  )}

                  {/* Section Attachments in Print */}
                  {sec.attachments.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      {sec.attachments.map((file, fIdx) => (
                        <div key={fIdx} className="border border-slate-150 rounded overflow-hidden p-1 bg-slate-50 flex flex-col justify-between max-w-[200px]">
                          {file.type.startsWith('image/') ? (
                            <img src={file.dataUrl} alt={file.name} className="h-20 w-auto object-cover rounded mb-1" />
                          ) : (
                            <div className="h-20 bg-slate-200 rounded flex items-center justify-center mb-1">
                              <File className="w-6 h-6 text-slate-400" />
                            </div>
                          )}
                          <span className="text-[8px] font-medium block truncate leading-none">{file.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* APPROVER SIGNATURES LIST GRID (Printed View) */}
            <div className="pt-10 border-t-2 border-slate-150 mt-10 section-box signature-block">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
                Official Validation & Signatures Check-list
              </h4>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs print:grid-cols-4">
                {currentReport.approvals.map((appr) => (
                  <div key={appr.id} className="border-t border-slate-150 pt-2 space-y-1 text-center md:text-left">
                    <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">{appr.position}</span>
                    <span className="font-extrabold text-slate-700 block">{appr.name || 'Pending Representative'}</span>
                    
                    {currentReport.config.showSignatureInPrint && appr.signature && !currentReport.config.showNameOnly ? (
                      <div className="h-12 flex flex-col items-center justify-center pt-1">
                        <img src={appr.signature} alt="Sign" className="h-8 max-h-8 object-contain" />
                        <span className="text-[6px] text-slate-400 font-mono tracking-wider">{appr.digitalToken || 'APPROVED'}</span>
                      </div>
                    ) : (
                      <div className="h-12 flex items-center justify-center border border-dashed border-slate-200 bg-slate-50 rounded text-[9px] text-slate-400 italic font-medium">
                        {appr.signature ? 'Signed (Text/Verified)' : 'Awaiting signature'}
                      </div>
                    )}
                    
                    <span className="text-[9px] font-mono block text-slate-400 pt-1">Date: {appr.date || '___/___/______'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Print Disclaimer details */}
            <div className="mt-12 pt-4 border-t border-slate-100 text-[9px] text-slate-400 flex flex-col md:flex-row justify-between items-center text-center leading-none">
              <span>This document represents site records compiled dynamically on standard workspace templates.</span>
              <span className="font-mono mt-1 sm:mt-0">System ID: {currentReport.reportNumber} / {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- DIALOUGE MODAL: SIGNATURE CANVAS ----------------- */}
      <AnimatePresence>
        {drawingApproverId && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-6 rounded-2xl border border-slate-150 shadow-2xl w-full max-w-lg space-y-5"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h4 className="text-sm font-bold text-slate-900 uppercase">Draw Representative Signature</h4>
                <button 
                  onClick={() => setDrawingApproverId(null)}
                  className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawing Panel Pad Canvas */}
              <div className="border border-slate-200 rounded-xl bg-slate-50 overflow-hidden relative">
                <canvas 
                  ref={signatureCanvasRef}
                  width={400}
                  height={150}
                  className="w-full h-[150px] bg-slate-50 cursor-crosshair block"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawingSignature}
                  onMouseLeave={stopDrawingSignature}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawingSignature}
                />
                
                <span className="absolute bottom-2 left-2 text-[9px] text-slate-400 pointer-events-none">
                  Draw inside the gray box using stylus, touch boundary, or cursor
                </span>
              </div>

              <div className="flex justify-between items-center">
                <button 
                  onClick={clearSignatureCanvas}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold uppercase"
                >
                  Clear Pad
                </button>
                <button 
                  onClick={() => saveSignature(drawingApproverId)}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold uppercase tracking-widest transition-all"
                >
                  Confirm & Apply
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Styled A4 Document Page Breaks CSS for printing purposes */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 15mm !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            box-shadow: none !important;
            text-rendering: optimizeLegibility;
          }
          html, body, #root, #rootMain, #daily-reports-manager {
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          main, .overflow-auto {
            overflow: visible !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          body * {
            visibility: hidden !important;
          }
          
          /* Only display the primary visual A4 element and its child nodes */
          #printable-report-canvas,
          #printable-report-canvas * {
            visibility: visible !important;
            overflow: visible !important;
          }
          
          /* Position correctly on page top */
          #printable-report-canvas {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            max-width: 210mm !important;
            margin: 0 auto !important;
            padding: 10mm !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            font-size: 11pt !important;
          }

          .section-box, .signature-block {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            display: block !important;
          }

          .grid {
            display: grid !important;
          }
          
          .no-print, .print:hidden, button, header, aside, .sidebar {
            display: none !important;
          }

          /* Force grid columns in print */
          .print:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .print:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
          .print:truncate-none { text-overflow: clip !important; white-space: normal !important; overflow: visible !important; }
        }
      `}</style>
    </div>
  );
}
