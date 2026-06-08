import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Edit2, 
  Download, 
  Printer, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  User, 
  Calendar, 
  Layers, 
  Tag, 
  File, 
  UploadCloud, 
  History, 
  MessageSquare, 
  ShieldCheck, 
  RefreshCw,
  QrCode,
  ArrowUpDown,
  HardHat,
  ChevronRight,
  Sparkles,
  ExternalLink,
  MapPin,
  Save,
  Copy
} from 'lucide-react';
import QRCode from 'qrcode';
import { SirRequest, SirComment, SirHistoryLog, Project, CompanyData } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { fixHtml2CanvasOklch } from '../lib/pdfUtils';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

interface SirManagerProps {
  projects: Project[];
  company: CompanyData;
  language: 'en' | 'ar';
}

const INSPECTION_TYPES = [
  'Civil Works',
  'Painting Works',
  'Electrical Works',
  'Mechanical Works',
  'Plumbing Works',
  'Finishing Works',
  'Waterproofing',
  'Other'
] as const;

const DEFAULT_CHECKLISTS: Record<string, string[]> = {
  'Civil Works': [
    'Subgrade elevation and alignment verified against drawings.',
    'Compaction test results logged and approved (>95% MDD).',
    'Rebar spacing, lap joints, and chair heights inspecting.',
    'Formwork dimensions, sturdiness, and oil coating verified.'
  ],
  'Painting Works': [
    'Surface moisture content within acceptable levels.',
    'Primer coat applied evenly and fully cured.',
    'First coat thickness checked against specifications.',
    'No runs, sags, or uneven coloring visible.'
  ],
  'Electrical Works': [
    'Conduits laid according to schematic design.',
    'Pull boxes accessible and properly secured.',
    'Grounding connections tested and verified.',
    'Wire insulation integrity and labeling matched.'
  ],
  'Mechanical Works': [
    'Ductwork alignment and support spacing compliant.',
    'Dampers operational with clear indicators.',
    'Insulation thickness and seams securely taped.',
    'Pressure leak testing registered and signed.'
  ],
  'Plumbing Works': [
    'Pipe slopes verified for gravity flow requirements.',
    'Joint fittings welded/cemented and cured.',
    'Hydrostatic pressure testing successfully done for 2 hours.',
    'Valves labeled and secondary drains installed.'
  ],
  'Finishing Works': [
    'Plaster flatness verified with a 3m straightedge.',
    'Tile alignment, grout colors, and joints uniform.',
    'Suspended ceiling hanger levels verified.',
    'Door and window frames plummed and caulked.'
  ],
  'Waterproofing': [
    'Concrete surfaces clean, dry, and primed.',
    'Membrane overlap widths are minimum 10cm.',
    'Ponding leak test completed successfully for 24-48 hours.',
    'Protection boards installed securely before backfill.'
  ],
  'Other': [
    'Compliance with general structural safety regulations.',
    'Material matches approved submittal.',
    'Method statement followed during installation.',
    'Site housekeeping acceptable and free of hazards.'
  ]
};

const SIR_TRANSLATIONS = {
  en: {
    title: "Site Inspection Requests (SIR)",
    subtitle: "Professional site quality assurance & compliance manager",
    totalRequests: "Total Requests",
    approved: "Approved",
    approvedComments: "Approved with Comments",
    rejected: "Rejected",
    underReview: "Under Review",
    newRequest: "Create Request",
    searchPlaceholder: "Search by SIR, location, details...",
    filterType: "Inspection Type",
    filterStatus: "Status",
    filterProject: "Project Node",
    lblSirNumber: "SIR Number",
    lblProjectName: "Project Name",
    lblProjectNo: "Project Number",
    lblContractor: "Contractor Name",
    lblConsultant: "Consultant Name",
    lblClient: "Client Name",
    lblDate: "Filing Date",
    lblRequestedDate: "Requested Inspection Date",
    lblLocation: "Location / Zone",
    lblDrawingRef: "Drawing Reference No.",
    lblMethodStatement: "Method Statement Ref.",
    lblWorkDesc: "Description of Work",
    lblChecklist: "Inspection Checklist",
    lblRepresentative: "Contractor Representative",
    lblRemarks: "Consultant Remarks & Comments",
    lblStatus: "Inspection Status",
    lblAttachments: "Reference Documents & Photos",
    lblHistory: "Compliance History Logs",
    lblComments: "Inspector & Contractor Chat Logs",
    btnSave: "Save Request",
    btnUpdate: "Update Record",
    btnReset: "Reset Form",
    btnPrint: "Print Document",
    btnPdf: "Export PDF",
    btnCancel: "Cancel",
    alertRequired: "Please fill in all mandatory fields.",
    successCreate: "Site Inspection Request created successfully.",
    successUpdate: "Site Inspection Request updated successfully.",
    attachmentHelp: "Drag & drop files or click to upload site photos, laboratory reports, or design changes.",
    selectProject: "Select Project Node...",
    roleSelector: "Operational Profile Mode",
    contractorRole: "Contractor representative",
    inspectorRole: "Consultant Inspector",
    adminRole: "Project Administrator",
    noRecords: "No matching inspection records found in system storage."
  },
  ar: {
    title: "طلب فحص الموقع (SIR)",
    subtitle: "إدارة ومراقبة جودة أعمال التنفيذ والامتثال الهندسي للمشاريع",
    totalRequests: "إجمالي طلبات الفحص",
    approved: "معتمد",
    approvedComments: "معتمد مع ملاحظات",
    rejected: "مرفوض",
    underReview: "قيد المراجعة",
    newRequest: "طلب فحص جديد",
    searchPlaceholder: "البحث برقم الطلب، الموقع، التفاصيل...",
    filterType: "نوع الفحص",
    filterStatus: "حالة الاعتماد",
    filterProject: "المشروع المطلوب",
    lblSirNumber: "رقم طلب الفحص (SIR)",
    lblProjectName: "اسم المشروع",
    lblProjectNo: "رقم المشروع",
    lblContractor: "اسم المقاول",
    lblConsultant: "اسم الاستشاري",
    lblClient: "اسم المالك",
    lblDate: "تاريخ تقديم الطلب",
    lblRequestedDate: "تاريخ الفحص المطلوب",
    lblLocation: "الموقع / المنطقة بالجهاز",
    lblDrawingRef: "رقم المخطط المرجعي",
    lblMethodStatement: "منهجية العمل المعتمدة",
    lblWorkDesc: "الوصف الدقيق للأعمال وكمياتها",
    lblChecklist: "عناصر قائمة التحقق للفحص",
    lblRepresentative: "ممثل المقاول المنفذ",
    lblRemarks: "ملاحظات وتوجيهات الاستشاري المشرف",
    lblStatus: "حالة الاعتماد النهائي",
    lblAttachments: "الملحقات والمستندات المرفقة للموقع",
    lblHistory: "سجل حركات وتدقيق المعاملة",
    lblComments: "محادثات وتنسيق المفتشين والمهندسين",
    btnSave: "حفظ الطلب بنجاح",
    btnUpdate: "تحديث السجل الحالي",
    btnReset: "إعادة تهيئة النموذج",
    btnPrint: "طباعة المستند الرسمي",
    btnPdf: "تصدير بصيغة PDF",
    btnCancel: "إلغاء الأمر",
    alertRequired: "يرجى تعبئة كافة الحقول الإلزامية المطلوبة.",
    successCreate: "تم تسجيل طلب فحص الموقع (SIR) بنجاح في سجلات المشروع.",
    successUpdate: "تم تحديث معاملة طلب الفحص وخطوات الامتثال بنجاح.",
    attachmentHelp: "اسحب وأفلت المخططات أو تقارير المختبر أو انقر لاختيار ملفات",
    selectProject: "اختر كود المشروع المرتبط...",
    roleSelector: "تغيير الملف التعريفي والمهام",
    contractorRole: "جهة المقاول المنفذ",
    inspectorRole: "جهة الاستشاري المشرف",
    adminRole: "المشرف العام للنظام",
    noRecords: "لم يتم العثور على أي طلبات فحص مطابقة للمحددات المطلوبة."
  }
};

const dummySIRs: SirRequest[] = [
  {
    id: 'SIR-2026-001',
    sirNumber: 'SIR-2026-001',
    projectName: 'NEOM Site Preparation',
    projectNumber: 'P1',
    contractorName: 'RED SEA BUILDERS LTD',
    consultantName: 'KEO INTERNATIONAL CONSULTANTS',
    clientName: 'NEOM ROYAL AUTHORITY',
    date: '2026-05-15',
    requestedInspectionDate: '2026-05-16',
    locationZone: 'Zone A - Excavation Sector 04',
    drawingRef: 'NEOM-SP-Z-DWG-0453 Rev 2',
    methodStatementRef: 'MS-EXC-SP-04 Rev 1',
    workDescription: 'Verification of foundation subgrade soil compaction and leveling prior to steel reinforcement layout.',
    inspectionType: 'Civil Works',
    checklist: [
      { id: 'cl_1', label: 'Verify subgrade level against drawing reference level.', checked: true },
      { id: 'cl_2', label: 'Perform sand replacement compaction test (>95% MDD).', checked: true },
      { id: 'cl_3', label: 'Ensure side slope stability and safety barrier installation.', checked: true },
      { id: 'cl_4', label: 'Check for absence of standing water or organic materials.', checked: true },
    ],
    contractorRepresentative: 'Eng. Ahmed Al-Mansoori',
    consultantRemarks: 'Compaction tests passed. Field observation verifies subgrade matches design elevations.',
    status: 'Approved',
    attachments: [
      { name: 'compaction_test_report_ex04.pdf', type: 'application/pdf', dataUrl: '', size: '1.2 MB' }
    ],
    comments: [
      { id: 'c1', author: 'Eng. Basel Al-Harbi', role: 'Inspector', text: 'Compaction results are optimal. Subgrade inspection cleared.', date: '2026-05-16' }
    ],
    history: [
      { id: 'h1', action: 'Request created by Contractor', actor: 'Eng. Ahmed Al-Mansoori', role: 'Contractor', date: '2026-05-15' },
      { id: 'h2', action: 'Approved by Consultant Inspector', actor: 'Eng. Basel Al-Harbi', role: 'Inspector', date: '2026-05-16' }
    ],
    qrCodeValue: 'SIR-2026-001|NEOM-SP|Civil Works|Approved'
  },
  {
    id: 'SIR-2026-002',
    sirNumber: 'SIR-2026-002',
    projectName: 'Red Sea Luxury Resort',
    projectNumber: 'P2',
    contractorName: 'AL-BAYAN CONSTRUCTION CO',
    consultantName: 'WSP MIDDLE EAST',
    clientName: 'THE RED SEA DEVELOPMENT COMPANY',
    date: '2026-05-18',
    requestedInspectionDate: '2026-05-19',
    locationZone: 'Lobby Area - Drop-off Canopy',
    drawingRef: 'RSR-LOB-CAN-DWG-102 Rev 4',
    methodStatementRef: 'MS-WPF-CAN-09 Rev 0',
    workDescription: 'Waterproofing membrane application on main canopy concrete slab.',
    inspectionType: 'Waterproofing',
    checklist: [
      { id: 'wp_1', label: 'Concrete surface inspection, cleanliness and primary primer application.', checked: true },
      { id: 'wp_2', label: 'Ensure overlap widths at waterproofing membrane seams is minimum 10cm.', checked: true },
      { id: 'wp_3', label: 'Perform water ponding test for 24 hours to monitor leaks.', checked: false },
      { id: 'wp_4', label: 'Detailed flashings seal check around water conduits.', checked: true },
    ],
    contractorRepresentative: 'Eng. Mustafa Shawqi',
    consultantRemarks: 'Membrane layout completed successfully. Ponding water test is currently in progress. Final approval conditional on watertight certificate.',
    status: 'Approved with Comments',
    attachments: [
      { name: 'membrane_datasheet.pdf', type: 'application/pdf', dataUrl: '', size: '540 KB' }
    ],
    comments: [
      { id: 'c2', author: 'Eng. Faisal Otaibi', role: 'Inspector', text: 'Please ensure ponding level remains monitored for next 12 hours.', date: '2026-05-19' }
    ],
    history: [
      { id: 'h3', action: 'Request created by Contractor', actor: 'Eng. Mustafa Shawqi', role: 'Contractor', date: '2026-05-18' },
      { id: 'h4', action: 'Approved with comments by Consultant Inspector', actor: 'Eng. Faisal Otaibi', role: 'Inspector', date: '2026-05-19' }
    ],
    qrCodeValue: 'SIR-2026-002|RedSeaResort|Waterproofing|Approved with Comments'
  }
];

export function SirManager({ projects, company, language }: SirManagerProps) {
  const [sirs, setSirs] = useLocalStorage<SirRequest[]>('ares_sir_records', dummySIRs);
  const [activeRole, setActiveRole] = useLocalStorage<'Contractor' | 'Inspector' | 'Admin'>('ares_sir_active_role', 'Admin');

  // Search, Filters & Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [sortKey, setSortKey] = useState<'date' | 'requestedInspectionDate' | 'sirNumber'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Selected State for viewing/modifying
  const [selectedSir, setSelectedSir] = useState<SirRequest | null>(sirs[0] || null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form states
  const [formProject, setFormProject] = useState<string>(projects[0]?.id || 'P1');
  const [formType, setFormType] = useState<SirRequest['inspectionType']>('Civil Works');
  const [formChecklist, setFormChecklist] = useState<{ id: string; label: string; checked: boolean }[]>([]);
  const [formAttachments, setFormAttachments] = useState<{ name: string; type: string; dataUrl: string; size: string }[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [customAttachmentsFiles, setCustomAttachmentsFiles] = useState<File[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [addingCustomItem, setAddingCustomItem] = useState(false);
  const [customItemLabel, setCustomItemLabel] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Controlled Form State Variables for SIR Form Fields
  const [formSirNumber, setFormSirNumber] = useState('');
  const [formContractorName, setFormContractorName] = useState('');
  const [formConsultantName, setFormConsultantName] = useState('');
  const [formClientName, setFormClientName] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formReqInspectionDate, setFormReqInspectionDate] = useState('');
  const [formLocationZone, setFormLocationZone] = useState('');
  const [formDrawingRef, setFormDrawingRef] = useState('');
  const [formMethodStatementRef, setFormMethodStatementRef] = useState('');
  const [formWorkDescription, setFormWorkDescription] = useState('');
  const [formContractorRepresentative, setFormContractorRepresentative] = useState('');
  const [formConsultantRemarks, setFormConsultantRemarks] = useState('');
  const [statusSelect, setStatusSelect] = useState<SirRequest['status']>('Approved');

  // Load translations
  const t = SIR_TRANSLATIONS[language];
  const isRtl = language === 'ar';

  // Statistics counters
  const stats = useMemo(() => {
    return {
      total: sirs.length,
      approved: sirs.filter(s => s.status === 'Approved').length,
      approvedComments: sirs.filter(s => s.status === 'Approved with Comments').length,
      rejected: sirs.filter(s => s.status === 'Rejected').length,
    };
  }, [sirs]);

  // Handle building checklist dynamically based on Inspection Type selection
  useEffect(() => {
    if (isCreating || isEditing) {
      if (isCreating) {
        // Populate standard default checklist
        const items = DEFAULT_CHECKLISTS[formType] || [];
        setFormChecklist(items.map((item, idx) => ({
          id: `f_cl_${idx}`,
          label: item,
          checked: false
        })));
      }
    }
  }, [formType, isCreating]);

  // Sycnchronize the edit form if user switches records on the sidebar
  useEffect(() => {
    if (isEditing && selectedSir) {
      setFormSirNumber(selectedSir.sirNumber || '');
      setFormContractorName(selectedSir.contractorName || '');
      setFormConsultantName(selectedSir.consultantName || '');
      setFormClientName(selectedSir.clientName || '');
      setFormDate(selectedSir.date || '');
      setFormReqInspectionDate(selectedSir.requestedInspectionDate || '');
      setFormLocationZone(selectedSir.locationZone || '');
      setFormDrawingRef(selectedSir.drawingRef || '');
      setFormMethodStatementRef(selectedSir.methodStatementRef || '');
      setFormWorkDescription(selectedSir.workDescription || '');
      setFormContractorRepresentative(selectedSir.contractorRepresentative || '');
      setFormConsultantRemarks(selectedSir.consultantRemarks || '');
      setFormType(selectedSir.inspectionType);
      setFormProject(selectedSir.projectNumber);
      setFormChecklist(selectedSir.checklist || []);
      setFormAttachments(selectedSir.attachments || []);
      setCustomAttachmentsFiles([]);
      setStatusSelect(selectedSir.status);
    }
  }, [selectedSir]);

  // Clear or auto-fill form handler
  const handleInitCreateForm = () => {
    setIsEditing(false);
    setIsCreating(true);
    setFormType('Civil Works');
    setFormProject(projects[0]?.id || 'P1');
    setFormAttachments([]);
    setCustomAttachmentsFiles([]);
    setStatusSelect('Approved');

    // Auto-generate SIR numbering format matching standard KSA construction records
    const randomSeq = String(sirs.length + 1).padStart(3, '0');
    const formatNo = `SIR-${new Date().getFullYear()}-${randomSeq}`;
    
    setFormSirNumber(formatNo);
    setFormContractorName(company.name || 'RED SEA HOLDING CO');
    setFormConsultantName('SAUDI ARABIAN ENGINEERING GROUP');
    setFormClientName('MUNICIPALITY OF RED SEA PROJECT');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormReqInspectionDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
    setFormLocationZone('Sector A - Building Zone 03');
    setFormDrawingRef('RSH-Z3-CIV-DWG-0021 Rev 1');
    setFormMethodStatementRef('MS-CIV-CONC-02 Rev 0');
    setFormWorkDescription('Testing foundation anchor bolt alignments and levels prior to casting C40 cement concrete.');
    setFormContractorRepresentative('Eng. Hani bin Jamil');
    setFormConsultantRemarks('');
  };

  const handleInitEditForm = (sir: SirRequest) => {
    setIsCreating(false);
    setIsEditing(true);
    setFormType(sir.inspectionType);
    setFormProject(sir.projectNumber);
    setFormChecklist(sir.checklist);
    setFormAttachments(sir.attachments || []);
    setCustomAttachmentsFiles([]);
    setStatusSelect(sir.status);

    setFormSirNumber(sir.sirNumber || '');
    setFormContractorName(sir.contractorName || '');
    setFormConsultantName(sir.consultantName || '');
    setFormClientName(sir.clientName || '');
    setFormDate(sir.date || '');
    setFormReqInspectionDate(sir.requestedInspectionDate || '');
    setFormLocationZone(sir.locationZone || '');
    setFormDrawingRef(sir.drawingRef || '');
    setFormMethodStatementRef(sir.methodStatementRef || '');
    setFormWorkDescription(sir.workDescription || '');
    setFormContractorRepresentative(sir.contractorRepresentative || '');
    setFormConsultantRemarks(sir.consultantRemarks || '');
  };

  // Submit handler (Creates or updates record)
  const handleSubmitSir = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedProjNode = projects.find(p => p.id === formProject);

    const sirData: Partial<SirRequest> = {
      sirNumber: formSirNumber,
      projectName: selectedProjNode?.name || 'Secondary Construction Area',
      projectNumber: formProject,
      contractorName: formContractorName,
      consultantName: formConsultantName,
      clientName: formClientName,
      date: formDate,
      requestedInspectionDate: formReqInspectionDate,
      locationZone: formLocationZone,
      drawingRef: formDrawingRef,
      methodStatementRef: formMethodStatementRef,
      workDescription: formWorkDescription,
      inspectionType: formType,
      checklist: formChecklist,
      contractorRepresentative: formContractorRepresentative,
      consultantRemarks: formConsultantRemarks,
      status: activeRole === 'Inspector' ? statusSelect : (isEditing ? selectedSir?.status || 'Approved' : 'Approved'),
      attachments: formAttachments,
    };

    if (!sirData.sirNumber || !sirData.contractorName || !sirData.date) {
      alert(t.alertRequired);
      return;
    }

    if (isCreating) {
      const generatedId = `SIR-${Date.now().toString().slice(-4)}`;
      const qrValue = `${sirData.sirNumber}|${sirData.projectName}|${sirData.inspectionType}|${sirData.status}`;

      const finalSir: SirRequest = {
        id: generatedId,
        sirNumber: sirData.sirNumber,
        projectName: sirData.projectName!,
        projectNumber: sirData.projectNumber!,
        contractorName: sirData.contractorName,
        consultantName: sirData.consultantName!,
        clientName: sirData.clientName!,
        date: sirData.date,
        requestedInspectionDate: sirData.requestedInspectionDate!,
        locationZone: sirData.locationZone!,
        drawingRef: sirData.drawingRef!,
        methodStatementRef: sirData.methodStatementRef!,
        workDescription: sirData.workDescription!,
        inspectionType: sirData.inspectionType!,
        checklist: sirData.checklist!,
        contractorRepresentative: sirData.contractorRepresentative!,
        consultantRemarks: sirData.consultantRemarks || '',
        status: sirData.status || 'Approved',
        attachments: sirData.attachments || [],
        comments: [],
        history: [
          {
            id: `h_${Date.now()}`,
            action: `Site inspection request created by Contractor (${activeRole})`,
            actor: sirData.contractorRepresentative!,
            role: 'Contractor',
            date: new Date().toISOString().split('T')[0]
          }
        ],
        qrCodeValue: qrValue
      };

      const updated = [finalSir, ...sirs];
      setSirs(updated);
      setSelectedSir(finalSir);
      setIsCreating(false);
      alert(t.successCreate);
    } else if (isEditing && selectedSir) {
      const qrValue = `${sirData.sirNumber}|${sirData.projectName}|${sirData.inspectionType}|${sirData.status}`;
      
      // Merge logs
      const logs = [...(selectedSir.history || [])];
      if (selectedSir.status !== sirData.status) {
        logs.push({
          id: `h_${Date.now()}`,
          action: `Inspection status changed from ${selectedSir.status} to ${sirData.status}`,
          actor: activeRole === 'Inspector' ? 'Consultant Senior Inspector' : 'System Admin',
          role: activeRole,
          date: new Date().toISOString().split('T')[0],
          remarks: sirData.consultantRemarks
        });
      } else {
        logs.push({
          id: `h_${Date.now()}`,
          action: `Inspection records updated by ${activeRole}`,
          actor: activeRole === 'Contractor' ? sirData.contractorRepresentative! : 'Authorized Representative',
          role: activeRole,
          date: new Date().toISOString().split('T')[0]
        });
      }

      const finalSir: SirRequest = {
        ...selectedSir,
        sirNumber: sirData.sirNumber,
        projectName: sirData.projectName!,
        projectNumber: sirData.projectNumber!,
        contractorName: sirData.contractorName,
        consultantName: sirData.consultantName!,
        clientName: sirData.clientName!,
        date: sirData.date,
        requestedInspectionDate: sirData.requestedInspectionDate!,
        locationZone: sirData.locationZone!,
        drawingRef: sirData.drawingRef!,
        methodStatementRef: sirData.methodStatementRef!,
        workDescription: sirData.workDescription!,
        inspectionType: sirData.inspectionType!,
        checklist: sirData.checklist!,
        contractorRepresentative: sirData.contractorRepresentative!,
        consultantRemarks: sirData.consultantRemarks || '',
        status: sirData.status || 'Approved',
        attachments: sirData.attachments || [],
        history: logs,
        qrCodeValue: qrValue
      };

      const updated = sirs.map(s => s.id === selectedSir.id ? finalSir : s);
      setSirs(updated);
      setSelectedSir(finalSir);
      setIsEditing(false);
      alert(t.successUpdate);
    }
  };

  const handleDuplicateSir = (sourceSir: SirRequest) => {
    const randomSeq = String(sirs.length + 1).padStart(3, '0');
    const formatNo = `SIR-${new Date().getFullYear()}-${randomSeq}-${Math.floor(100 + Math.random() * 900)}`;
    
    // Copy but omit comments, history and reset dates and status
    const newSir: SirRequest = {
      ...sourceSir,
      id: `sir_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      sirNumber: formatNo,
      status: sourceSir.status, // Keep original status
      date: new Date().toISOString().split('T')[0],
      requestedInspectionDate: new Date().toISOString().split('T')[0],
      comments: [],
      history: [{
        id: `h_${Date.now()}`,
        date: new Date().toISOString(), // usually timestamps are full ISO strings
        actor: 'Current User', 
        role: activeRole,
        action: 'Created',
        remarks: `Duplicated from ${sourceSir.sirNumber}`
      }],
      attachments: [],
    };
    
    setSirs(prev => [newSir, ...prev]);
    setSelectedSir(newSir);
    alert(isRtl ? 'تم نسخ الطلب بنجاح' : 'Record duplicated successfully');
  };

  // Delete Handler
  const handleDeleteSir = (id: string) => {
    const filtered = sirs.filter(s => s.id !== id);
    setSirs(filtered);
    setSelectedSir(filtered[0] || null);
    setIsEditing(false);
    setIsCreating(false);
  };

  // Comments handler
  const handleAddComment = () => {
    if (!newCommentText.trim() || !selectedSir) return;

    const newComment: SirComment = {
      id: `c_${Date.now()}`,
      author: activeRole === 'Contractor' ? (selectedSir.contractorRepresentative || 'Contractor') : (activeRole === 'Inspector' ? 'Consultant Inspector' : 'Administrator'),
      role: activeRole,
      text: newCommentText.trim(),
      date: new Date().toISOString().split('T')[0]
    };

    const updatedComments = [...(selectedSir.comments || []), newComment];
    const updatedHistory = [...(selectedSir.history || []), {
      id: `h_${Date.now()}`,
      action: `Comment appended by ${activeRole}`,
      actor: newComment.author,
      role: activeRole,
      date: newComment.date,
      remarks: newComment.text
    } as SirHistoryLog];

    const updatedSir = {
      ...selectedSir,
      comments: updatedComments,
      history: updatedHistory
    };

    const updatedSirs = sirs.map(s => s.id === selectedSir.id ? updatedSir : s);
    setSirs(updatedSirs);
    setSelectedSir(updatedSir);
    setNewCommentText('');
  };

  // File attachments mockup builder (Convert to local file structures)
  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFilesArray = Array.from(files) as File[];
    setIsUploadingFiles(true);
    
    for (const file of newFilesArray) {
      try {
        const fileRef = ref(storage, `sir_attachments/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`);
        const snapshot = await uploadBytes(fileRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        
        const item = {
          name: file.name,
          type: file.type,
          dataUrl: downloadUrl,
          size: `${(file.size / 1024).toFixed(0)} KB`
        };
        setFormAttachments(prev => [...prev, item]);
      } catch (err) {
        console.error("Firebase Storage upload failed for file", file.name, err);
        alert(`Failed to upload ${file.name}`);
      }
    }
    
    setIsUploadingFiles(false);
  };

  const removeItemAttachment = (idx: number) => {
    setFormAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  // Print trigger optimized for screen elements
  const handleTriggerPrint = () => {
    window.focus();
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Export to PDF using high-fidelity html2canvas + jsPDF capture
  const handleExportPDFDirect = async () => {
    if (!selectedSir) return;
    
    // Find the element to print
    const element = document.getElementById('sir-printable-document');
    if (!element) {
      alert("Printable document element not found!");
      return;
    }

    try {
      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF } = await import('jspdf');
      
      const canvas = await html2canvas(element, {
        scale: 2.0, // High sharpness
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // Add custom print/A4 styles to clone so it renders elegantly without truncation
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            #sir-printable-document {
              width: 210mm !important;
              height: auto !important;
              overflow: visible !important;
              margin: 0 !important;
              padding: 10mm !important;
              background: #ffffff !important;
              box-shadow: none !important;
            }
            #sir-printable-document * {
              overflow: visible !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            .bg-white { background-color: #ffffff !important; }
            .text-slate-900 { color: #1e293b !important; }
            .text-slate-800 { color: #334155 !important; }
            .text-slate-700 { color: #475569 !important; }
            #sir-printable-document .grid { display: grid !important; }
          `;
          clonedDoc.head.appendChild(style);
          
          // Sanitize oklch/oklab/color-mix functions which crash html2canvas with Tailwind 4 elements
          fixHtml2CanvasOklch(clonedDoc);
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 size width in mm
      const pageHeight = 297; // A4 size height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      pdf.save(`Inspection_Request_${(selectedSir.sirNumber || '').replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF via html2canvas:", err);
      if (typeof alert === 'function') {
        alert(isRtl ? "فشل إنشاء ملف PDF. يرجى المحاولة مرة أخرى." : "Failed to generate PDF. Please try again.");
      }
    }
  };

  // Search & Filters computation
  const filteredSirs = useMemo(() => {
    return sirs.filter(sir => {
      const query = (searchTerm || '').toLowerCase();
      const matchesSearch = 
        (sir.sirNumber?.toLowerCase() || '').includes(query) ||
        (sir.locationZone?.toLowerCase() || '').includes(query) ||
        (sir.workDescription?.toLowerCase() || '').includes(query) ||
        (sir.projectName?.toLowerCase() || '').includes(query) ||
        (sir.drawingRef?.toLowerCase() || '').includes(query);

      const matchesType = filterType === 'all' || sir.inspectionType === filterType;
      const matchesStatus = filterStatus === 'all' || sir.status === filterStatus;
      const matchesProject = filterProject === 'all' || sir.projectNumber === filterProject;

      return matchesSearch && matchesType && matchesStatus && matchesProject;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'date') comparison = a.date.localeCompare(b.date);
      else if (sortKey === 'requestedInspectionDate') comparison = a.requestedInspectionDate.localeCompare(b.requestedInspectionDate);
      else if (sortKey === 'sirNumber') comparison = a.sirNumber.localeCompare(b.sirNumber);

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [sirs, searchTerm, filterType, filterStatus, filterProject, sortKey, sortOrder]);

  // QR Code generator on selection change
  const [currentSirQrUrl, setCurrentSirQrUrl] = useState('');
  useEffect(() => {
    if (selectedSir) {
      QRCode.toDataURL(selectedSir.qrCodeValue || selectedSir.sirNumber, { margin: 1 })
        .then(url => {
          setCurrentSirQrUrl(url);
        })
        .catch(err => console.error('QR code generation failed:', err));
    } else {
      setCurrentSirQrUrl('');
    }
  }, [selectedSir]);

  return (
    <div className="space-y-6 print:space-y-0 print:p-0">
      
      {/* Visual Header / Control Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5 shrink-0 print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500 rounded-lg text-white shadow-md shadow-blue-500/20">
              <HardHat className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-950 block tracking-tight">{t.title}</h2>
              <p className="text-xs text-slate-500 font-medium block">{t.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Operational Profile Pill Bar */}
        <div className="bg-slate-100 p-1 rounded-lg flex items-center md:self-end">
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold px-3 hidden lg:inline-block">{t.roleSelector}:</span>
          <button 
            type="button"
            onClick={() => setActiveRole('Contractor')}
            className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${activeRole === 'Contractor' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            {isRtl ? "المقاول" : "Contractor"}
          </button>
          <button 
            type="button"
            onClick={() => setActiveRole('Inspector')}
            className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${activeRole === 'Inspector' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            {isRtl ? "الاستشاري" : "Inspector"}
          </button>
          <button 
            type="button"
            onClick={() => setActiveRole('Admin')}
            className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${activeRole === 'Admin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            {isRtl ? "المدير" : "Admin Profile"}
          </button>
        </div>
      </div>

      {/* Overview Bento Stats Board */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex items-center justify-between relative overflow-hidden group hover:border-slate-300 transition-colors">
          <div>
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t.totalRequests}</span>
            <span className="text-2xl font-bold font-mono text-slate-900 block mt-1">{stats.total}</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-lg text-slate-400">
            <Layers className="w-5 h-5" />
          </div>
          <div className="absolute left-0 bottom-0 h-1 bg-slate-200 w-full" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex items-center justify-between relative overflow-hidden group hover:border-slate-300 transition-colors">
          <div>
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t.approved}</span>
            <span className="text-2xl font-bold font-mono text-emerald-600 block mt-1">{stats.approved}</span>
          </div>
          <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-500">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className="absolute left-0 bottom-0 h-1 bg-emerald-500 w-full" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex items-center justify-between relative overflow-hidden group hover:border-slate-300 transition-colors">
          <div>
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t.approvedComments}</span>
            <span className="text-2xl font-bold font-mono text-amber-500 block mt-1">{stats.approvedComments}</span>
          </div>
          <div className="p-2.5 bg-amber-50 rounded-lg text-amber-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="absolute left-0 bottom-0 h-1 bg-amber-400 w-full" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex items-center justify-between relative overflow-hidden group hover:border-slate-300 transition-colors">
          <div>
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t.rejected}</span>
            <span className="text-2xl font-bold font-mono text-rose-600 block mt-1">{stats.rejected}</span>
          </div>
          <div className="p-2.5 bg-rose-50 rounded-lg text-rose-500">
            <XCircle className="w-5 h-5" />
          </div>
          <div className="absolute left-0 bottom-0 h-1 bg-rose-500 w-full" />
        </div>
      </div>

      {/* Main Workspace Layout (Form or Splitted Column List View) */}
      {(isCreating || isEditing) ? (
        <form onSubmit={handleSubmitSir} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300 print:hidden">
          <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <HardHat className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-bold uppercase tracking-widest">
                {isCreating ? t.newRequest : `${t.btnUpdate}: ${selectedSir?.sirNumber}`}
              </span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Box 1: Core details */}
              <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
                  <FileText className="w-4 h-4 text-slate-400" /> Basic Information
                </h4>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block">{t.lblSirNumber} *</label>
                  <input 
                    type="text" 
                    value={formSirNumber} 
                    onChange={(e) => setFormSirNumber(e.target.value)}
                    required 
                    placeholder="SIR-YYYY-001"
                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block">{t.filterProject} *</label>
                  <select
                    value={formProject}
                    onChange={(e) => setFormProject(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.id} - {p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block">{t.lblContractor} *</label>
                  <input 
                    type="text" 
                    value={formContractorName} 
                    onChange={(e) => setFormContractorName(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block">{t.lblConsultant}</label>
                  <input 
                    type="text" 
                    value={formConsultantName}
                    onChange={(e) => setFormConsultantName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block">{t.lblClient}</label>
                  <input 
                    type="text" 
                    value={formClientName}
                    onChange={(e) => setFormClientName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Box 2: Chronology & Location */}
              <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
                  <MapPin className="w-4 h-4 text-slate-400" /> Location & Chronology
                </h4>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block">{t.lblDate} *</label>
                  <input 
                    type="date" 
                    value={formDate} 
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block">{t.lblRequestedDate} *</label>
                  <input 
                    type="date" 
                    value={formReqInspectionDate} 
                    onChange={(e) => setFormReqInspectionDate(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block">{t.lblLocation} *</label>
                  <input 
                    type="text" 
                    value={formLocationZone} 
                    onChange={(e) => setFormLocationZone(e.target.value)}
                    required
                    placeholder="e.g. Zone B, Slab Area"
                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block">{t.lblDrawingRef}</label>
                  <input 
                    type="text" 
                    value={formDrawingRef}
                    onChange={(e) => setFormDrawingRef(e.target.value)}
                    placeholder="e.g. DWG-CIV-0453"
                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block">{t.lblMethodStatement}</label>
                  <input 
                    type="text" 
                    value={formMethodStatementRef}
                    onChange={(e) => setFormMethodStatementRef(e.target.value)}
                    placeholder="e.g. MS-CONC-02"
                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Box 3: Scope of Inspection & Checklist */}
              <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
                  <Layers className="w-4 h-4 text-slate-400" /> Work Description & Scope
                </h4>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block">{t.filterType}</label>
                  <select 
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none"
                  >
                    {INSPECTION_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 flex-1 flex flex-col min-h-[140px]">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block">{t.lblWorkDesc}</label>
                  <textarea 
                    value={formWorkDescription}
                    onChange={(e) => setFormWorkDescription(e.target.value)}
                    required
                    placeholder="Testing foundation anchor bolt alignments and levels prior..."
                    className="w-full bg-white border border-slate-200 rounded px-3.5 py-2.5 text-xs font-sans focus:outline-none flex-1 min-h-[100px] outline-none font-medium text-slate-800"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block">{t.lblRepresentative}</label>
                  <input 
                    type="text" 
                    value={formContractorRepresentative}
                    onChange={(e) => setFormContractorRepresentative(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Verification Checklist Panel */}
            <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-xs font-bold text-slate-950 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-500" /> {t.lblChecklist} ({formType})
                </span>
                
                <button 
                  type="button" 
                  onClick={() => setAddingCustomItem(true)}
                  className="px-2.5 py-1 bg-slate-900 text-white rounded text-[9px] font-bold uppercase tracking-widest hover:bg-slate-800 flex items-center gap-1 transition-all shrink-0"
                >
                  <Plus className="w-3 h-3 shrink-0" /> Add Customs Item
                </button>
              </div>

              {addingCustomItem && (
                <div className="flex items-center gap-2 mb-2 p-3 bg-white rounded-md border border-slate-300">
                  <input
                    type="text"
                    value={customItemLabel}
                    onChange={(e) => setCustomItemLabel(e.target.value)}
                    placeholder={isRtl ? 'أدخل بند التحقق الإضافي...' : 'Enter additional compliance test item...'}
                    className="flex-1 text-sm bg-transparent border-none focus:outline-none focus:ring-0"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customItemLabel.trim()) {
                        setFormChecklist(prev => [...prev, {
                          id: `add_${Date.now()}`,
                          label: customItemLabel.trim(),
                          checked: false
                        }]);
                        setCustomItemLabel('');
                        setAddingCustomItem(false);
                      }
                    }}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-widest hover:bg-blue-700"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomItemLabel('');
                      setAddingCustomItem(false);
                    }}
                    className="bg-slate-200 text-slate-700 px-3 py-1 rounded text-xs font-bold uppercase tracking-widest hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formChecklist.map((item, index) => (
                  <div key={item.id} className="flex items-start gap-3 bg-white p-3 rounded-md border border-slate-200 shadow-sm transition-colors hover:border-slate-300">
                    <input 
                      type="checkbox"
                      id={`chk_${item.id}`}
                      checked={item.checked}
                      onChange={(e) => {
                        const updated = formChecklist.map(c => c.id === item.id ? { ...c, checked: e.target.checked } : c);
                        setFormChecklist(updated);
                      }}
                      className="w-4.5 h-4.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 mt-0.5"
                    />
                    <label htmlFor={`chk_${item.id}`} className="text-xs text-slate-700 cursor-pointer select-none leading-relaxed flex-1">
                      {isRtl ? `(عنصر فحص ${index+1}) ${item.label}` : item.label}
                    </label>
                    <button 
                      type="button" 
                      onClick={() => setFormChecklist(prev => prev.filter(p => p.id !== item.id))}
                      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    </button>
                    </div>
                ))}
              </div>
            </div>

            {/* Consultant / Inspector Action Panel */}
            {activeRole === 'Inspector' && (
              <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-lg space-y-4 animate-in fade-in duration-300">
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Quality Audit Decisions (Consultant Section)
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block">{t.lblStatus}</label>
                    <div className="grid grid-cols-4 gap-2">
                      <button 
                        type="button"
                        onClick={() => setStatusSelect('Approved')}
                        className={`py-2 px-3 rounded font-bold text-xs uppercase tracking-wider text-center border transition-all ${statusSelect === 'Approved' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                      >
                        {t.approved}
                      </button>
                      <button 
                        type="button"
                        onClick={() => setStatusSelect('Approved with Comments')}
                        className={`py-2 px-3 rounded font-bold text-xs uppercase tracking-wider text-center border transition-all ${statusSelect === 'Approved with Comments' ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                      >
                        {t.approvedComments}
                      </button>
                      <button 
                        type="button"
                        onClick={() => setStatusSelect('Under Review')}
                        className={`py-2 px-3 rounded font-bold text-xs uppercase tracking-wider text-center border transition-all ${statusSelect === 'Under Review' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                      >
                        {t.underReview}
                      </button>
                      <button 
                        type="button"
                        onClick={() => setStatusSelect('Rejected')}
                        className={`py-2 px-3 rounded font-bold text-xs uppercase tracking-wider text-center border transition-all ${statusSelect === 'Rejected' ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                      >
                        {t.rejected}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block">{t.lblRemarks}</label>
                    <textarea 
                      value={formConsultantRemarks}
                      onChange={(e) => setFormConsultantRemarks(e.target.value)}
                      placeholder="Specify corrective actions, notes, slab casting permission, or laboratory certification conditions..."
                      className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 font-medium text-slate-800 min-h-[75px]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* File Attachments Uploader */}
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-lg space-y-4">
              <span className="text-xs font-bold text-slate-950 uppercase tracking-wider block">{t.lblAttachments}</span>
              
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 bg-white hover:bg-slate-50/50 transition-colors flex flex-col items-center justify-center text-center relative">
                <UploadCloud className={`w-10 h-10 ${isUploadingFiles ? 'text-indigo-400 animate-pulse' : 'text-slate-400'} mb-2`} />
                <p className="text-xs font-bold text-slate-700">
                  {isUploadingFiles ? (isRtl ? 'جاري الرفع...' : 'Uploading files...') : (isRtl ? "تحميل ملفات ومخططات الفحص" : "Upload Inspection Files & Drawing Details")}
                </p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-sm">{t.attachmentHelp}</p>
                <input 
                  type="file" 
                  multiple
                  disabled={isUploadingFiles}
                  onChange={handleAttachmentUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
              </div>

              {formAttachments.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                  {formAttachments.map((f, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200 shadow-sm justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <File className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                        <div className="overflow-hidden">
                          <p className="text-[10px] text-slate-800 font-bold truncate">{f.name}</p>
                          <p className="text-[8px] text-slate-400 font-medium">{f.size}</p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeItemAttachment(idx)}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors shrink-0"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
            <button 
              type="button"
              onClick={() => {
                setIsCreating(false);
                setIsEditing(false);
              }}
              className="px-5 py-2.5 border border-slate-200 rounded text-xs font-extrabold uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-6 py-2.5 bg-blue-600 text-white rounded text-xs font-extrabold uppercase tracking-widest hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md shadow-blue-500/10 shrink-0"
            >
              <Save className="w-4 h-4 shrink-0" /> {isCreating ? t.btnSave : t.btnUpdate}
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:grid-cols-1">
          
          {/* Dashboard Left: List of site inspection requests */}
          <div className="lg:col-span-4 space-y-4 print:hidden">
            <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-sm space-y-4">
              
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-slate-400" /> Compliance Records
                </span>

                <button 
                  type="button"
                  onClick={handleInitCreateForm}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded text-[10px] font-extrabold uppercase tracking-widest hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-md shadow-blue-500/10 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" /> {t.newRequest}
                </button>
              </div>

              {/* Dynamic Search Box */}
              <div className="relative">
                <Search className={`w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-3' : 'left-3'}`} />
                <input 
                  type="text" 
                  placeholder={t.searchPlaceholder} 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-lg py-2 text-xs focus:outline-none focus:border-blue-500 focus:bg-white ${isRtl ? 'pr-9 pl-4' : 'pl-9 pr-4'}`}
                />
              </div>

              {/* Filters list accordion */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-3 gap-2">
                  <select 
                    value={filterType} 
                    onChange={e => setFilterType(e.target.value)}
                    className="bg-slate-50 border border-slate-200/80 rounded px-2 py-1.5 text-[10px] font-bold text-slate-600 focus:outline-none"
                  >
                    <option value="all">Type: All</option>
                    {INSPECTION_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>

                  <select 
                    value={filterStatus} 
                    onChange={e => setFilterStatus(e.target.value)}
                    className="bg-slate-50 border border-slate-200/80 rounded px-2 py-1.5 text-[10px] font-bold text-slate-600 focus:outline-none"
                  >
                    <option value="all">Status: All</option>
                    <option value="Approved">Approved</option>
                    <option value="Approved with Comments">With Comments</option>
                    <option value="Rejected">Rejected</option>
                  </select>

                  <select 
                    value={filterProject} 
                    onChange={e => setFilterProject(e.target.value)}
                    className="bg-slate-50 border border-slate-200/80 rounded px-2 py-1.5 text-[10px] font-bold text-slate-600 focus:outline-none"
                  >
                    <option value="all">Project: All</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.id}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sorting Bar */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-2">
                <span>Sorted by: {sortKey}</span>
                <button 
                  type="button" 
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="flex items-center gap-1 hover:text-slate-700 transition-colors"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" /> {sortOrder.toUpperCase()}
                </button>
              </div>

            </div>

            {/* List entries */}
            <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
              {filteredSirs.map(s => {
                const isSelected = selectedSir?.id === s.id;
                const statusColor = 
                  s.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25' :
                  s.status === 'Approved with Comments' ? 'bg-amber-500/10 text-amber-600 border-amber-500/25' :
                  'bg-rose-500/10 text-rose-600 border-rose-500/25';

                return (
                  <div 
                    key={s.id}
                    onClick={() => setSelectedSir(s)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative shadow-sm group ${isSelected ? 'bg-blue-50/50 border-blue-200 ring-1 ring-blue-500/20' : 'bg-white border-slate-200/80 hover:bg-slate-50'}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="font-mono text-xs font-bold text-slate-900 block truncate">{s.sirNumber}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase mt-1 block truncate">{s.projectName}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider border ${statusColor} shrink-0`}>
                          {s.status}
                        </span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(s.id);
                          }}
                          className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-all opacity-0 group-hover:opacity-100 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 font-medium line-clamp-2 mt-2 leading-relaxed">
                      {s.workDescription}
                    </p>

                    <div className="flex items-center justify-between text-[9px] text-slate-400 font-semibold pt-3 border-t border-slate-100 mt-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Req: {s.requestedInspectionDate}
                      </span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold uppercase">
                        {s.inspectionType}
                      </span>
                    </div>
                  </div>
                );
              })}

              {filteredSirs.length === 0 && (
                <div className="p-8 text-center bg-white border border-slate-100 rounded-xl">
                  <p className="text-xs text-slate-400 italic">{t.noRecords}</p>
                </div>
              )}
            </div>

          </div>

          {/* Detailed Document / Inspect Preview Section */}
          <div className="lg:col-span-8 space-y-6 print:col-span-1 border border-slate-100 shadow-sm rounded-xl bg-white p-5 print:p-0">
            {selectedSir ? (
              <div className="space-y-6">
                
                {/* Print and administrative buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-100 p-3 rounded-lg print:hidden">
                  <div className="flex flex-wrap items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => handleInitEditForm(selectedSir)}
                      className="px-4.5 py-2 bg-slate-900 text-white rounded text-[10px] font-extrabold uppercase tracking-widest hover:bg-black transition-colors flex items-center gap-1.5 shrink-0"
                    >
                      <Edit2 className="w-3.5 h-3.5 shrink-0" /> Edit Record
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleDuplicateSir(selectedSir)}
                      className="px-4.5 py-2 bg-slate-100 text-slate-700 rounded text-[10px] font-extrabold uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center gap-1.5 shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5 shrink-0" /> Copy
                    </button>
                    <button 
                      type="button"
                      onClick={() => setShowDeleteConfirm(selectedSir.id)}
                      className="px-4.5 py-2 border border-rose-200 hover:border-rose-300 text-rose-600 hover:bg-rose-50 rounded text-[10px] font-extrabold uppercase tracking-widest transition-colors flex items-center gap-1.5 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" /> Delete
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button 
                      type="button"
                      onClick={handleTriggerPrint}
                      className="px-4.5 py-2 border border-slate-300 hover:border-slate-400 rounded text-slate-700 text-[10px] font-extrabold uppercase tracking-widest hover:bg-slate-100 transition-colors flex items-center gap-1.5 shrink-0"
                    >
                      <Printer className="w-3.5 h-3.5 shrink-0" /> {t.btnPrint}
                    </button>
                    <button 
                      type="button"
                      onClick={handleExportPDFDirect}
                      className="px-4.5 py-2 bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/10 rounded text-[10px] font-extrabold uppercase tracking-widest transition-colors flex items-center gap-1.5 shrink-0"
                    >
                      <Download className="w-3.5 h-3.5 shrink-0" /> {t.btnPdf}
                    </button>
                  </div>
                </div>

                {/* Custom Modal Confirmation overlay */}
                {showDeleteConfirm && (
                  <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 print:hidden animate-out fade-out">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-slate-200/80 animate-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-3 text-rose-600 mb-3">
                        <Trash2 className="w-6 h-6 shrink-0" />
                        <h3 className="text-sm font-extrabold uppercase tracking-wider">
                          {isRtl ? 'تأكيد الحذف' : 'Confirm Delete'}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                        {isRtl 
                          ? 'هل أنت متأكد من رغبتك في حذف طلب الفحص المحدد نهائياً؟ لا يمكن التراجع عن هذا الإجراء.' 
                          : 'Are you sure you want to permanently delete this site inspection request? This action cannot be undone.'}
                      </p>
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(null)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold uppercase tracking-widest transition-colors"
                        >
                          {isRtl ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleDeleteSir(showDeleteConfirm);
                            setShowDeleteConfirm(null);
                          }}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold uppercase tracking-widest transition-colors shadow-sm shadow-rose-500/10"
                        >
                          {isRtl ? 'حذف' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Main A4 Document Sheet Wrapper for print preview & output */}
                <div id="sir-printable-document" className="bg-white p-4 border border-slate-100/80 rounded-lg shadow-sm print:shadow-none print:border-none relative max-w-[210mm] mx-auto print:p-0 print:m-0">
                  
                  {/* Watermark of inspection state (Only print visible, or styled background subtle) */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] print:opacity-[0.04] z-0 overflow-hidden grayscale">
                    {company.logo ? (
                      <img src={company.logo} alt="Watermark" className="w-[450px] h-[450px] object-contain rotate-[-15deg]" referrerPolicy="no-referrer" />
                    ) : (
                      <HardHat className="w-80 h-80 text-slate-900 rotate-[-15deg]" />
                    )}
                  </div>

                  {/* Document Header Panel */}
                  <div className="border border-slate-300 grid grid-cols-12 overflow-hidden bg-white text-slate-800">
                    
                    {/* Brand column left */}
                    <div className="col-span-4 p-2 border-r border-slate-300 flex flex-col justify-between">
                      {company.logo ? (
                        <div className="w-10 h-10 bg-white rounded overflow-hidden p-1 border border-slate-200">
                          <img src={company.logo} alt="Company logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        </div>
                      ) : (
                        <div className="font-bold text-xs text-slate-600 font-sans tracking-tight leading-none uppercase">RED SEA SYSTEM</div>
                      )}
                      
                      <div className="mt-1">
                        <p className="text-[9px] font-bold uppercase tracking-tight leading-tight text-slate-800">{company.name}</p>
                        <p className="text-[7px] text-slate-500">VAT: {company.vatNumber}</p>
                        <p className="text-[7px] text-slate-500">CR: {company.crNumber}</p>
                      </div>
                    </div>

                    {/* Central Title */}
                    <div className="col-span-5 p-2 border-r border-slate-300 flex flex-col items-center justify-center text-center bg-white">
                      <h3 className="text-[9px] font-bold tracking-widest uppercase text-slate-600 leading-tight">QUALITY INSPECTION SCHEME</h3>
                      <h2 className="text-xs font-bold text-slate-900 mt-0.5 pb-0.5 border-b border-dashed border-slate-300 block">SITE INSPECTION REQUEST</h2>
                      <span className="text-[7px] font-bold text-slate-500 block mt-0.5 tracking-widest">OFFICIAL SIR REPORT</span>
                    </div>

                    {/* Meta Section right */}
                    <div className="col-span-3 p-2 flex flex-col justify-between text-[10px] font-semibold space-y-0.5">
                      <div>
                        <span className="text-[7px] font-sans text-slate-400 font-bold block uppercase">SIR NUMBER</span>
                        <span className="text-[11px] font-bold text-slate-900 block">{selectedSir.sirNumber}</span>
                      </div>
                      <div>
                        <span className="text-[7px] font-sans text-slate-400 font-bold block uppercase">RECORD DATE</span>
                        <span className="text-[9px] font-medium text-slate-700 block">{selectedSir.date}</span>
                      </div>
                      <div>
                        <span className="text-[7px] font-sans text-slate-400 font-bold block uppercase">INSPECTION DATE</span>
                        <span className="text-[9px] font-medium text-slate-700 block">{selectedSir.requestedInspectionDate}</span>
                      </div>
                    </div>

                  </div>

                  {/* Structural General Project Data Grid */}
                  <div className="border-x border-b border-slate-300 grid grid-cols-12 text-[9px] text-slate-800">
                    <div className="col-span-6 p-1.5 border-r border-slate-300">
                      <span className="text-[7px] text-slate-500 font-bold block uppercase tracking-wide">PROJECT DEVELOPMENT NAME</span>
                      <span className="text-[10px] font-bold text-slate-900 leading-tight block truncate">{selectedSir.projectName} ({selectedSir.projectNumber})</span>
                    </div>
                    <div className="col-span-6 p-1.5">
                      <span className="text-[7px] text-slate-500 font-bold block uppercase tracking-wide">LOCATION CODE / ZONE AREA</span>
                      <span className="text-[10px] font-bold text-slate-900 leading-tight block truncate">{selectedSir.locationZone}</span>
                    </div>
                  </div>

                  <div className="border-x border-b border-slate-300 grid grid-cols-12 text-[9px] text-slate-800">
                    <div className="col-span-4 p-1.5 border-r border-slate-300">
                      <span className="text-[7px] text-slate-500 font-bold block uppercase tracking-wide">CONTRACTOR / PARTNER</span>
                      <span className="text-[10px] font-bold text-slate-900 truncate block">{selectedSir.contractorName}</span>
                    </div>
                    <div className="col-span-4 p-1.5 border-r border-slate-300">
                      <span className="text-[7px] text-slate-500 font-bold block uppercase tracking-wide">CONSULTING ENGINEER</span>
                      <span className="text-[10px] font-bold text-slate-900 truncate block">{selectedSir.consultantName}</span>
                    </div>
                    <div className="col-span-4 p-1.5">
                      <span className="text-[7px] text-slate-500 font-bold block uppercase tracking-wide">DEVELOPER / CLIENT</span>
                      <span className="text-[10px] font-bold text-slate-900 truncate block">{selectedSir.clientName}</span>
                    </div>
                  </div>

                  <div className="border-x border-b border-slate-300 grid grid-cols-12 text-[9px] text-slate-800">
                    <div className="col-span-4 p-1.5 border-r border-slate-300">
                      <span className="text-[7px] text-slate-500 font-bold block uppercase tracking-wide">INSPECTION CLASSIFICATION</span>
                      <span className="bg-slate-50 text-slate-800 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase mt-0.5 block w-fit border border-slate-200">{selectedSir.inspectionType}</span>
                    </div>
                    <div className="col-span-4 p-1.5 border-r border-slate-300">
                      <span className="text-[7px] text-slate-500 font-bold block uppercase tracking-wide">REFERENCE DRAWING NO.</span>
                      <span className="text-[8px] font-medium text-slate-800 mt-0.5 block truncate">{selectedSir.drawingRef || 'N/A'}</span>
                    </div>
                    <div className="col-span-4 p-1.5">
                      <span className="text-[7px] text-slate-500 font-bold block uppercase tracking-wide">METHOD STATEMENT CODE</span>
                      <span className="text-[8px] font-medium text-slate-800 mt-0.5 block truncate">{selectedSir.methodStatementRef || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Work Description Sheet */}
                  <div className="border-x border-b border-slate-300 p-1.5 min-h-[40px] text-slate-800">
                    <div>
                      <span className="text-[7px] text-slate-500 font-bold block uppercase tracking-widest mb-0.5">WORK SPECIFICATIONS</span>
                      <p className="text-[9px] font-medium text-slate-800 leading-normal font-sans line-clamp-3">{selectedSir.workDescription}</p>
                    </div>
                  </div>

                  {/* Checklist Section in printed document */}
                  <div className="border-x border-b border-slate-300 p-1.5 bg-white">
                    <span className="text-[7px] text-slate-500 font-bold block uppercase tracking-widest mb-1 text-center border-b border-slate-100 pb-0.5">INSPECTION CHECKLIST & CRITERIA</span>
                    
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1">
                      {selectedSir.checklist.map((c, idx) => (
                        <div key={c.id} className="flex items-start gap-1 text-[8px] text-slate-800">
                          <span className={`w-2.5 h-2.5 rounded-sm border flex items-center justify-center shrink-0 font-bold text-[6px] mt-0.5 ${c.checked ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-300 border-slate-300'}`}>
                            {c.checked ? '✓' : ''}
                          </span>
                          <span className="font-medium leading-tight text-[8px] break-words">{idx + 1}. {c.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Decision Stamping Banner */}
                  <div className="border-x border-b border-slate-300 grid grid-cols-12 overflow-hidden bg-white text-slate-800">
                    
                    {/* Status selection and stamps left */}
                    <div className="col-span-8 p-2 border-r border-slate-300 flex flex-col justify-between">
                      <div>
                        <span className="text-[7px] text-slate-500 font-bold block uppercase tracking-widest mb-1">CONSULTING AUTHORITY DECISION</span>
                        
                        <div className="flex items-center gap-2.5">
                          <div className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border bg-white border-slate-400 text-slate-900 italic">
                            {selectedSir.status}
                          </div>
                          
                          <div className="text-[8px] text-slate-600 leading-tight max-w-sm">
                            {selectedSir.status === 'Approved' && "Work is compliant. Subcontractor is cleared for next task."}
                            {selectedSir.status === 'Approved with Comments' && "Corrective elements should be resolved. No hold on work."}
                            {selectedSir.status === 'Under Review' && "Document is under technical review. Results pending."}
                            {selectedSir.status === 'Rejected' && "RE-INSPECTION REQUIRED. Clear remarks first."}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-4">
                        <div className="border border-slate-200 h-10 p-1 relative">
                          <span className="absolute -top-1.5 left-1 bg-white px-1 text-[6px] text-slate-400 font-bold">CONSULTANT STAMP</span>
                          {selectedSir.status !== 'Draft' && (
                            <div className="w-full h-full border border-dashed border-slate-500 rounded flex items-center justify-center opacity-40 grayscale translate-x-1 rotate-[-5deg]">
                              <span className="text-[6px] font-black text-slate-600 rotate-[-10deg] border border-slate-600 p-0.5">{selectedSir.consultantName.substring(0, 15)}</span>
                            </div>
                          )}
                        </div>
                        <div className="border border-slate-200 h-10 p-1 relative">
                          <span className="absolute -top-1.5 left-1 bg-white px-1 text-[6px] text-slate-400 font-bold">CONTRACTOR STAMP</span>
                           <div className="w-full h-full border border-dashed border-slate-500 rounded flex items-center justify-center opacity-40 grayscale translate-x-[-2px] rotate-[3deg]">
                            <span className="text-[6px] font-black text-slate-600 rotate-10 border border-slate-600 p-0.5">{selectedSir.contractorName.substring(0, 15)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* QR and Verification right */}
                    <div className="col-span-4 p-2 flex flex-col items-center justify-center bg-slate-50/50">
                      <div className="w-16 h-16 bg-white p-1 border border-slate-200 flex items-center justify-center mb-1">
                        {currentSirQrUrl ? (
                          <img src={currentSirQrUrl} alt="Inspection QR" className="w-full h-full object-contain" />
                        ) : (
                          <QrCode className="w-8 h-8 text-slate-200" />
                        )}
                      </div>
                      <span className="text-[6px] font-bold text-slate-400 uppercase tracking-tighter text-center">SCAN TO VERIFY AUDIT INTEGRITY</span>
                      <p className="text-[5px] text-slate-300 mt-1 font-mono uppercase">Node ID: {selectedSir.id}</p>
                    </div>

                  </div>

                  {/* Remarks Panel */}
                  <div className="border-x border-b border-slate-900 p-2 min-h-[50px] bg-white">
                    <span className="text-[7px] text-slate-400 font-extrabold block uppercase tracking-widest mb-1 text-center border-b border-slate-100 pb-0.5">FINAL INSPECTOR REMARKS</span>
                    <p className="text-[9px] font-bold text-slate-800 leading-tight italic line-clamp-2">
                      {selectedSir.consultantRemarks || 'No inspector remarks filed.'}
                    </p>
                  </div>

                  {/* Signature Blocks */}
                  <div className="border-x border-b border-slate-900 grid grid-cols-3 divide-x divide-slate-900 text-[10px] text-slate-900">
                    <div className="p-1.5 flex flex-col justify-between h-[60px]">
                      <div>
                        <span className="text-[7px] text-slate-400 font-extrabold block uppercase tracking-wide">CONTRACTOR REP</span>
                        <span className="font-bold text-slate-700 text-[8.5px] mt-0.5 block leading-tight truncate">Name: {selectedSir.contractorRepresentative}</span>
                      </div>
                      <div className="border-t border-dashed border-slate-200 pt-0.5 flex justify-between text-[6px] text-slate-400 font-bold uppercase">
                        <span>Signature</span>
                        <span>[CONTRACTOR]</span>
                      </div>
                    </div>

                    <div className="p-1.5 flex flex-col justify-between h-[60px]">
                      <div>
                        <span className="text-[7px] text-slate-400 font-extrabold block uppercase tracking-wide">CONSULTANT ENGINEER</span>
                        <span className="font-bold text-slate-700 text-[8.5px] mt-0.5 block leading-tight truncate">Name: Eng. Basel Al-Harbi</span>
                      </div>
                      <div className="border-t border-dashed border-slate-200 pt-0.5 flex justify-between text-[6px] text-slate-400 font-bold uppercase">
                        <span>Inspector Sign</span>
                        <span>[CONSULTANT]</span>
                      </div>
                    </div>

                    <div className="p-1.5 flex flex-col justify-between h-[60px]">
                      <div>
                        <span className="text-[7px] text-slate-400 font-extrabold block uppercase tracking-wide">OPERATIONS MANAGER</span>
                        <span className="font-bold text-slate-700 text-[8.5px] mt-0.5 block leading-tight truncate">Name: Authorized Supervisor</span>
                      </div>
                      <div className="border-t border-dashed border-slate-200 pt-0.5 flex justify-between text-[6px] text-slate-400 font-bold uppercase">
                        <span>Seal / Date</span>
                        <span>[DEVELOPER]</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer small print */}
                  <div className="mt-1 flex justify-between items-center text-[6px] text-slate-400 font-bold px-1 py-0.5 border-t border-slate-50 uppercase tracking-widest">
                    <span>ARES SYSTEM GENERATED QA_DOC_453</span>
                    <span>Confidential Quality Assurance Record</span>
                    <span>Rev 4.0 2026</span>
                  </div>

                </div>

                {/* Sub: Chat logs & History Details (Accordion and comments tabs) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t border-slate-100 print:hidden animate-in fade-in duration-300">
                  
                  {/* Left Column: Comments Chat Logs */}
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/60 flex flex-col space-y-3">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-slate-400" /> {t.lblComments}
                    </span>

                    {/* List comments */}
                    <div className="space-y-2 max-h-[160px] overflow-y-auto flex-1 pr-1">
                      {(selectedSir.comments && selectedSir.comments.length > 0) ? (
                        selectedSir.comments.map(c => (
                          <div key={c.id} className="bg-white p-2.5 rounded border border-slate-200 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-black text-slate-900">{c.author} <span className="bg-slate-100 font-bold text-slate-500 px-1 py-0.2 rounded font-mono uppercase text-[7px] ml-1">{c.role}</span></span>
                              <span className="text-[8px] text-slate-400 font-medium">{c.date}</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-normal">{c.text}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-slate-400 italic py-4 text-center">No supervisor comments added yet.</p>
                      )}
                    </div>

                    {/* Write comment input block */}
                    <div className="flex gap-2 pt-2 border-t border-slate-200/60">
                      <input 
                        type="text" 
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        placeholder="Append site comment, observation, or test log..."
                        className="flex-1 bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 font-medium text-slate-800"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddComment();
                        }}
                      />
                      <button 
                        type="button" 
                        onClick={handleAddComment}
                        className="px-3 bg-slate-900 text-white hover:bg-black rounded text-[10px] font-bold uppercase tracking-widest transition-colors shrink-0"
                      >
                        Send
                      </button>
                    </div>
                  </div>

                  {/* Right Column: History logs */}
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/60 space-y-3">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                      <History className="w-4 h-4 text-slate-400" /> {t.lblHistory}
                    </span>

                    <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                      {selectedSir.history ? (
                        selectedSir.history.map((log, idx) => (
                          <div key={log.id || idx} className="flex gap-2 items-start text-xs border-l-2 border-slate-200 pl-3 pb-1">
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-1.5 shrink-0" />
                            <div className="space-y-0.5">
                              <p className="font-extrabold text-slate-800 text-[11px] leading-tight">{log.action}</p>
                              <p className="text-[9px] text-slate-400 font-medium">Actor: {log.actor} ({log.role}) | {log.date}</p>
                              {log.remarks && <p className="text-[10px] text-slate-500 italic font-mono mt-1">"{log.remarks}"</p>}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-slate-400 italic">No activity logs recorded.</p>
                      )}
                    </div>
                  </div>

                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-20 text-center space-y-4 print:hidden">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                  <HardHat className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">No Request Selected</h3>
                  <p className="text-xs text-slate-400 mt-1">Select an active inspection request from the left column to view its details or create a new request.</p>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Styled A4 Document Page Breaks CSS for printing purposes */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 4mm 6mm !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            box-shadow: none !important;
          }
          html, body, #rootMain, #root {
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
          #sir-printable-document,
          #sir-printable-document * {
            visibility: visible !important;
          }
          
          /* Position correctly on page top */
          #sir-printable-document {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>

    </div>
  );
}
