import React, { useState, useEffect } from "react";
import {
  Plus,
  Save,
  Trash2,
  Copy,
  FileText,
  Printer,
  FileDown,
  ClipboardList,
  Package,
  ShieldAlert,
  Users,
  CalendarCheck,
  Settings,
  X,
} from "lucide-react";
import { Project, CompanyData } from "../types";
import { Language } from "../lib/translations";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import html2pdf from "html2pdf.js";
import { cn, getCleanLogoBase64 } from "../lib/utils";
import { fixHtml2CanvasOklch } from "../lib/pdfUtils";

interface DPRData {
  id: string;
  dprNumber: string;
  reportDate: string;
  reportTime: string;
  projectName: string;
  projectNumber: string;
  contractNumber: string;
  clientName: string;
  mainContractor: string;
  subcontractor: string;
  preparedBy: string;
  reviewedBy: string;
  approvedBy: string;
  status: "Draft" | "Submitted" | "Approved" | "Rejected" | "Archived";

  generalLocation: string;
  specificLocation: string;

  workforceMode: "summary" | "detailed";
  workforceSummary: { id: string; trade: string; count: number }[];
  workforceDetailed: {
    id: string;
    empNumber: string;
    name: string;
    trade: string;
    nationality: string;
    company: string;
    supervisor: string;
    location: string;
    attendance: string;
  }[];

  supervisors: {
    id: string;
    name: string;
    empId: string;
    position: string;
    company: string;
    mobile: string;
    email: string;
    signature: string;
  }[];

  activities: {
    id: string;
    number: string;
    description: string;
    location: string;
    workforce: string;
    plannedStart: string;
    plannedFinish: string;
    priority: string;
    status: string;
    remarks: string;
    plannedQty: number;
    actualQty: number;
    unit: string;
    plannedPct: number;
    actualPct: number;
    delayReason: string;
  }[];

  totalWorkers: number;
  totalSupervisors: number;
  totalForemen: number;
  totalWorkingHours: number;
  overtimeHours: number;
  productivityNotes: string;

  materials: {
    id: string;
    name: string;
    reqQty: number;
    delQty: number;
    availQty: number;
    status: string;
    remarks: string;
  }[];
  equipment: {
    id: string;
    name: string;
    quantity: number;
    operator: string;
    status: string;
    remarks: string;
  }[];
  qcInspections: {
    id: string;
    reqNumber: string;
    status: string;
    date: string;
    inspector: string;
    findings: string;
    correctiveActions: string;
  }[];

  toolboxTalk: boolean;
  workersAttended: number;
  safetyObservations: string;
  nearMisses: number;
  incidents: number;
  safetyCorrectiveActions: string;
  safetyRemarks: string;

  issues: {
    id: string;
    description: string;
    impact: string;
    responsible: string;
    reqAction: string;
    targetDate: string;
    status: string;
  }[];

  photos: { id: string; url: string; description: string }[];

  nextDayPlan: string;

  customSections: { id: string; title: string; content: string }[];

  companyRepresentatives: {
    id: string;
    name: string;
    position: string;
    company: string;
    mobile: string;
    email: string;
    keyInfo: string;
  }[];

  clientAcks: {
    id: string;
    name: string;
    position: string;
    company: string;
    department: string;
    mobile: string;
    email: string;
    signature: string;
    date: string;
    time: string;
    comments: string;
    status: string;
  }[];

  distributionLog: {
    id: string;
    name: string;
    position: string;
    company: string;
    mobile: string;
    email: string;
    dateSent: string;
    timeSent: string;
    method: string;
    status: string;
  }[];

  approvals: {
    id: string;
    role: string;
    name: string;
    position: string;
    signature: string;
    date: string;
    time: string;
  }[];

  createdAt: string;
  updatedAt: string;
}

const emptyDPR = (): DPRData => ({
  id: "",
  dprNumber: `DPR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
  reportDate: new Date().toISOString().split("T")[0],
  reportTime: new Date().toTimeString().split(" ")[0].slice(0, 5),
  projectName: "",
  projectNumber: "",
  contractNumber: "",
  clientName: "",
  mainContractor: "",
  subcontractor: "",
  preparedBy: "",
  reviewedBy: "",
  approvedBy: "",
  status: "Draft",
  generalLocation: "",
  specificLocation: "",
  workforceMode: "summary",
  workforceSummary: [],
  workforceDetailed: [],
  supervisors: [],
  activities: [],
  totalWorkers: 0,
  totalSupervisors: 0,
  totalForemen: 0,
  totalWorkingHours: 0,
  overtimeHours: 0,
  productivityNotes: "",
  materials: [],
  equipment: [],
  qcInspections: [],
  toolboxTalk: false,
  workersAttended: 0,
  safetyObservations: "",
  nearMisses: 0,
  incidents: 0,
  safetyCorrectiveActions: "",
  safetyRemarks: "",
  issues: [],
  photos: [],
  nextDayPlan: "",
  customSections: [],
  companyRepresentatives: [],
  clientAcks: [],
  distributionLog: [],
  approvals: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

interface Props {
  projects?: Project[];
  company?: CompanyData;
  language: Language;
}

import { db } from "../lib/firebase";
import { collection, onSnapshot, query, setDoc, deleteDoc, doc, serverTimestamp, getDoc } from "firebase/firestore";

export const DailyPlanningReport: React.FC<Props> = ({
  projects,
  company,
  language,
}) => {
  const [dprs, setDprs] = useState<DPRData[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<DPRData>(emptyDPR());
  const [activeTab, setActiveTab] = useState("header");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("rshc_dprs");
    if (saved) {
      try {
        const localDprs = JSON.parse(saved);
        if (localDprs && Array.isArray(localDprs) && localDprs.length > 0) {
           localDprs.forEach(d => {
             setDoc(doc(db, "dailyPlanningReports", d.id), d).catch(console.error);
           });
           localStorage.removeItem("rshc_dprs");
        }
      } catch (e) {
        console.error("Migration error:", e)
      }
    }

    const q = query(collection(db, "dailyPlanningReports"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: DPRData[] = [];
      snapshot.forEach((doc) => {
        data.push({ ...doc.data(), id: doc.id } as DPRData);
      });
      // Sort by createdAt desc
      data.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return timeB - timeA;
      });
      setDprs(data);
    });
    return () => unsubscribe();
  }, []);

  const handleNew = () => {
    setFormData({ ...emptyDPR(), id: `dpr-${Date.now()}` });
    setIsFormOpen(true);
    setActiveTab("header");
  };

  const handleSave = async () => {
    if (!formData.dprNumber) return alert("DPR Number is required");
    try {
      const finalData = { ...formData, updatedAt: new Date().toISOString() };
      await setDoc(doc(db, "dailyPlanningReports", formData.id), finalData);
      setIsFormOpen(false);
    } catch (e) {
      console.error(e);
      alert("Error saving DPR to Firebase");
    }
  };

  const handleEdit = (d: DPRData) => {
    setFormData(d);
    setIsFormOpen(true);
    setActiveTab("header");
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "dailyPlanningReports", id));
      setDeleteConfirmId(null);
    } catch (e) {
      console.error(e);
      alert("Error deleting DPR from Firebase");
    }
  };

  const handleDuplicate = async (d: DPRData, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const dupe = {
        ...d,
        id: `dpr-${Date.now()}`,
        dprNumber: `DPR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "dailyPlanningReports", dupe.id), dupe);
    } catch (err) {
      console.error(err);
      alert("Error duplicating DPR");
    }
  };

  const addItem = (field: keyof DPRData, newItem: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [
        ...(prev[field] as any[]),
        { id: `item-${Date.now()}`, ...newItem },
      ],
    }));
  };

  const updateItem = (
    field: keyof DPRData,
    id: string,
    itemField: string,
    value: any,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: (prev[field] as any[]).map((item) =>
        item.id === id ? { ...item, [itemField]: value } : item,
      ),
    }));
  };

  const removeItem = (field: keyof DPRData, id: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: (prev[field] as any[]).filter((item) => item.id !== id),
    }));
  };

  const tabs = [
    { id: "header", label: "General Info", icon: FileText },
    { id: "workforce", label: "Workforce", icon: Users },
    { id: "plan", label: "Work Plan", icon: CalendarCheck },
    { id: "resources", label: "Resources", icon: Package },
    { id: "qhse", label: "QHSE", icon: ShieldAlert },
    { id: "other", label: "Extra & Signatures", icon: Settings },
  ];

  const handlePrint = () => {
    window.focus();
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const pContainer = document.getElementById("dpr-printable-area");
      if (pContainer) {
        pContainer.classList.remove("hidden");
        pContainer.style.position = "absolute";
        pContainer.style.left = "-9999px";
        pContainer.style.top = "-9999px";
        pContainer.classList.remove("print:hidden");
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
      const element = document.getElementById("dpr-pdf-canvas");
      if (!element) throw new Error("PDF element not found");

      const opt = {
        margin: [20, 0, 20, 0] as [number, number, number, number],
        filename: `${formData.dprNumber}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          windowWidth: 800,
          width: 800,
          onclone: (clonedDoc: Document) => {
            fixHtml2CanvasOklch(clonedDoc);
            const style = clonedDoc.createElement('style');
            style.innerHTML = `
              * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; }
            `;
            clonedDoc.head.appendChild(style);
          }
        },
        jsPDF: { unit: "pt" as const, format: "a4" as const, orientation: "portrait" as const },
        pagebreak: { mode: ["css", "legacy"], avoid: [".print-break-avoid", "tr", "table"] } as any,
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error(err);
      alert("Error generating PDF");
    } finally {
      setIsGeneratingPDF(false);
      const pContainer = document.getElementById("dpr-printable-area");
      if (pContainer) {
        pContainer.classList.add("hidden");
        pContainer.style.position = "";
        pContainer.style.left = "";
        pContainer.style.top = "";
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 print:bg-white print:overflow-visible">
      {/* Header */}
      <header className="bg-white px-6 py-4 border-b border-slate-200 shrink-0 print:hidden">
        <div className="flex justify-between items-center max-w-7xl mx-auto w-full">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-indigo-600" />
              Daily Progress Reports (DPR)
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Manage daily work plans, workforce, and site progress.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isFormOpen ? (
              <>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm flex items-center gap-2 shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button
                  onClick={generatePDF}
                  disabled={isGeneratingPDF}
                  className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium text-sm flex items-center gap-2 shadow-sm"
                >
                  <FileDown className="w-4 h-4" />{" "}
                  {isGeneratingPDF ? "Generating..." : "Export PDF"}
                </button>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm flex items-center gap-2 shadow-sm"
                >
                  <Save className="w-4 h-4" /> Save
                </button>
              </>
            ) : (
              <button
                onClick={handleNew}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Create DPR
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 overflow-auto print:overflow-visible print:p-0">
        <div className="max-w-7xl mx-auto w-full p-6 print:hidden">
          {!isFormOpen ? (
            <div className="space-y-6">
              {/* Stats Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
                    Total Reports
                  </p>
                  <p className="text-2xl font-black text-slate-900">
                    {dprs.length}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
                    Submitted Today
                  </p>
                  <p className="text-2xl font-black text-indigo-600">
                    {
                      dprs.filter(
                        (d) =>
                          new Date(d.createdAt).toDateString() ===
                          new Date().toDateString(),
                      ).length
                    }
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
                    Drafts
                  </p>
                  <p className="text-2xl font-black text-amber-500">
                    {dprs.filter((d) => d.status === "Draft").length}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
                    Approved Reports
                  </p>
                  <p className="text-2xl font-black text-emerald-500">
                    {dprs.filter((d) => d.status === "Approved").length}
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                    <tr>
                      <th className="py-3 px-4">DPR Number</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Project</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dprs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-8 text-center text-slate-500"
                        >
                          No reports found.
                        </td>
                      </tr>
                    ) : (
                      dprs.map((d) => (
                        <tr
                          key={d.id}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-slate-700">
                            {d.dprNumber}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {d.reportDate}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900">
                            {d.projectName || "N/A"}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={cn(
                                "text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded",
                                d.status === "Draft"
                                  ? "bg-amber-100 text-amber-700"
                                  : d.status === "Submitted"
                                    ? "bg-blue-100 text-blue-700"
                                    : d.status === "Approved"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-slate-100 text-slate-700",
                              )}
                            >
                              {d.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 flex justify-end gap-2 text-right">
                            {deleteConfirmId === d.id ? (
                              <div className="flex gap-2">
                                <span className="text-xs text-red-600 font-bold self-center">
                                  Confirm?
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(d.id);
                                  }}
                                  className="px-2 py-1 bg-red-600 text-white rounded text-xs font-bold"
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirmId(null);
                                  }}
                                  className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-xs font-medium"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={(e) => handleDuplicate(d, e)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                  title="Duplicate"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirmId(d.id);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleEdit(d)}
                                  className="px-3 py-1.5 bg-indigo-50 text-indigo-700 font-medium rounded hover:bg-indigo-100"
                                >
                                  Review
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex border-b border-slate-200 bg-slate-50 px-2 pt-2 gap-1 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "px-4 py-2.5 text-sm font-bold flex items-center gap-2 rounded-t-lg transition-colors border-b-2 whitespace-nowrap",
                      activeTab === tab.id
                        ? "bg-white text-indigo-700 border-indigo-600"
                        : "text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    <tab.icon className="w-4 h-4" /> {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6 flex-1 overflow-y-auto bg-white">
                {/* TAB 1: HEADER & LOCATION */}
                {activeTab === "header" && (
                  <div className="max-w-4xl space-y-8">
                    <section>
                      <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">
                        Report Details
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            DPR Number
                          </label>
                          <input
                            type="text"
                            className="w-full text-sm border-slate-300 rounded p-2"
                            value={formData.dprNumber}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                dprNumber: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Status
                          </label>
                          <select
                            className="w-full text-sm border-slate-300 rounded p-2"
                            value={formData.status}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                status: e.target.value as any,
                              })
                            }
                          >
                            <option value="Draft">Draft</option>
                            <option value="Submitted">Submitted</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Archived">Archived</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Report Date
                          </label>
                          <input
                            type="date"
                            className="w-full text-sm border-slate-300 rounded p-2"
                            value={formData.reportDate}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                reportDate: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Report Time
                          </label>
                          <input
                            type="time"
                            className="w-full text-sm border-slate-300 rounded p-2"
                            value={formData.reportTime}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                reportTime: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </section>

                    <section>
                      <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">
                        Project Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Project Name{" "}
                            <span className="text-slate-400 font-normal ml-2">
                              (or select)
                            </span>
                          </label>
                          <div className="flex gap-2">
                            <select
                              className="w-1/3 text-sm border-slate-300 rounded p-2"
                              onChange={(e) => {
                                const p = projects?.find(
                                  (p) => p.id === e.target.value,
                                );
                                if (p)
                                  setFormData({
                                    ...formData,
                                    projectName: p.name,
                                    projectNumber: p.projectCode,
                                  });
                              }}
                            >
                              <option value="">Select...</option>
                              {projects?.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              className="w-2/3 text-sm border-slate-300 rounded p-2"
                              value={formData.projectName}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  projectName: e.target.value,
                                })
                              }
                              placeholder="Project Name"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Project Number
                          </label>
                          <input
                            type="text"
                            className="w-full text-sm border-slate-300 rounded p-2"
                            value={formData.projectNumber}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                projectNumber: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Contract Number
                          </label>
                          <input
                            type="text"
                            className="w-full text-sm border-slate-300 rounded p-2"
                            value={formData.contractNumber}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                contractNumber: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Client Name
                          </label>
                          <input
                            type="text"
                            className="w-full text-sm border-slate-300 rounded p-2"
                            value={formData.clientName}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                clientName: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Main Contractor
                          </label>
                          <input
                            type="text"
                            className="w-full text-sm border-slate-300 rounded p-2"
                            value={formData.mainContractor}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                mainContractor: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Subcontractor
                          </label>
                          <input
                            type="text"
                            className="w-full text-sm border-slate-300 rounded p-2"
                            value={formData.subcontractor}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                subcontractor: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </section>

                    <section>
                      <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">
                        Work Location
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            General Work Location
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Zone A, Riyadh Tower"
                            className="w-full text-sm border-slate-300 rounded p-2"
                            value={formData.generalLocation}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                generalLocation: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Specific Location
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Floor 3, Room 101"
                            className="w-full text-sm border-slate-300 rounded p-2"
                            value={formData.specificLocation}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                specificLocation: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </section>
                  </div>
                )}

                {/* TAB 2: WORKFORCE */}
                {activeTab === "workforce" && (
                  <div className="max-w-5xl space-y-8">
                    <section>
                      <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="text-lg font-bold text-slate-800">
                          Workforce Management
                        </h3>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                          <button
                            onClick={() =>
                              setFormData({
                                ...formData,
                                workforceMode: "summary",
                              })
                            }
                            className={cn(
                              "px-3 py-1 text-xs font-bold rounded",
                              formData.workforceMode === "summary"
                                ? "bg-white shadow text-indigo-700"
                                : "text-slate-500",
                            )}
                          >
                            Summary Mode
                          </button>
                          <button
                            onClick={() =>
                              setFormData({
                                ...formData,
                                workforceMode: "detailed",
                              })
                            }
                            className={cn(
                              "px-3 py-1 text-xs font-bold rounded",
                              formData.workforceMode === "detailed"
                                ? "bg-white shadow text-indigo-700"
                                : "text-slate-500",
                            )}
                          >
                            Detailed Mode
                          </button>
                        </div>
                      </div>

                      {formData.workforceMode === "summary" ? (
                        <div>
                          <table className="w-full text-left text-sm border border-slate-200">
                            <thead className="bg-slate-50 border-b border-slate-200">
                              <tr>
                                <th className="p-2 border-r">
                                  Trade / Designation
                                </th>
                                <th className="p-2 border-r">
                                  Number of Workers
                                </th>
                                <th className="p-2 w-16 text-center">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {formData.workforceSummary.map((w) => (
                                <tr
                                  key={w.id}
                                  className="border-b border-slate-100"
                                >
                                  <td className="p-2 border-r">
                                    <input
                                      className="w-full bg-transparent outline-none"
                                      value={w.trade}
                                      onChange={(e) =>
                                        updateItem(
                                          "workforceSummary",
                                          w.id,
                                          "trade",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="e.g. Mason"
                                    />
                                  </td>
                                  <td className="p-2 border-r">
                                    <input
                                      type="number"
                                      className="w-full bg-transparent outline-none"
                                      value={w.count || ""}
                                      onChange={(e) =>
                                        updateItem(
                                          "workforceSummary",
                                          w.id,
                                          "count",
                                          Number(e.target.value),
                                        )
                                      }
                                      placeholder="0"
                                    />
                                  </td>
                                  <td className="p-2 text-center">
                                    <button
                                      onClick={() =>
                                        removeItem("workforceSummary", w.id)
                                      }
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <Trash2 className="w-4 h-4 mx-auto" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <button
                            onClick={() =>
                              addItem("workforceSummary", {
                                trade: "",
                                count: 0,
                              })
                            }
                            className="mt-2 text-xs font-bold text-indigo-600 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add Trade Summary
                          </button>
                        </div>
                      ) : (
                        <div>
                          <table className="w-full text-left text-sm border border-slate-200">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs">
                              <tr>
                                <th className="p-2 border-r">ID / Emp #</th>
                                <th className="p-2 border-r">Name</th>
                                <th className="p-2 border-r">Trade</th>
                                <th className="p-2 border-r">Company</th>
                                <th className="p-2 border-r">Attendance</th>
                                <th className="p-2 w-12 text-center"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {formData.workforceDetailed.map((w) => (
                                <tr
                                  key={w.id}
                                  className="border-b border-slate-100"
                                >
                                  <td className="p-2 border-r">
                                    <input
                                      className="w-full bg-transparent outline-none text-xs"
                                      value={w.empNumber}
                                      onChange={(e) =>
                                        updateItem(
                                          "workforceDetailed",
                                          w.id,
                                          "empNumber",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="001"
                                    />
                                  </td>
                                  <td className="p-2 border-r">
                                    <input
                                      className="w-full bg-transparent outline-none text-xs"
                                      value={w.name}
                                      onChange={(e) =>
                                        updateItem(
                                          "workforceDetailed",
                                          w.id,
                                          "name",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Employee Name"
                                    />
                                  </td>
                                  <td className="p-2 border-r">
                                    <input
                                      className="w-full bg-transparent outline-none text-xs"
                                      value={w.trade}
                                      onChange={(e) =>
                                        updateItem(
                                          "workforceDetailed",
                                          w.id,
                                          "trade",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Trade"
                                    />
                                  </td>
                                  <td className="p-2 border-r">
                                    <input
                                      className="w-full bg-transparent outline-none text-xs"
                                      value={w.company}
                                      onChange={(e) =>
                                        updateItem(
                                          "workforceDetailed",
                                          w.id,
                                          "company",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Company"
                                    />
                                  </td>
                                  <td className="p-2 border-r">
                                    <select
                                      className="w-full bg-transparent outline-none text-xs"
                                      value={w.attendance}
                                      onChange={(e) =>
                                        updateItem(
                                          "workforceDetailed",
                                          w.id,
                                          "attendance",
                                          e.target.value,
                                        )
                                      }
                                    >
                                      <option value="Present">Present</option>
                                      <option value="Absent">Absent</option>
                                      <option value="Leave">Leave</option>
                                    </select>
                                  </td>
                                  <td className="p-2 text-center">
                                    <button
                                      onClick={() =>
                                        removeItem("workforceDetailed", w.id)
                                      }
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <Trash2 className="w-4 h-4 mx-auto" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <button
                            onClick={() =>
                              addItem("workforceDetailed", {
                                empNumber: "",
                                name: "",
                                trade: "",
                                nationality: "",
                                company: "",
                                supervisor: "",
                                location: "",
                                attendance: "Present",
                              })
                            }
                            className="mt-2 text-xs font-bold text-indigo-600 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add Employee Item
                          </button>
                        </div>
                      )}
                    </section>

                    <section>
                      <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2 mt-8">
                        Site Supervision Team
                      </h3>
                      <table className="w-full text-left text-sm border border-slate-200 mb-2">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs">
                          <tr>
                            <th className="p-2 border-r">Name & Position</th>
                            <th className="p-2 border-r">Company</th>
                            <th className="p-2 border-r">Contact</th>
                            <th className="p-2 w-12 text-center"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.supervisors.map((s) => (
                            <tr
                              key={s.id}
                              className="border-b border-slate-100"
                            >
                              <td className="p-2 border-r space-y-1">
                                <input
                                  className="w-full bg-slate-50 p-1 border border-slate-200 outline-none text-xs rounded"
                                  placeholder="Full Name"
                                  value={s.name}
                                  onChange={(e) =>
                                    updateItem(
                                      "supervisors",
                                      s.id,
                                      "name",
                                      e.target.value,
                                    )
                                  }
                                />
                                <input
                                  className="w-full bg-transparent outline-none text-xs"
                                  placeholder="Position / Role"
                                  value={s.position}
                                  onChange={(e) =>
                                    updateItem(
                                      "supervisors",
                                      s.id,
                                      "position",
                                      e.target.value,
                                    )
                                  }
                                />
                              </td>
                              <td className="p-2 border-r">
                                <input
                                  className="w-full bg-transparent outline-none text-xs"
                                  placeholder="Company"
                                  value={s.company}
                                  onChange={(e) =>
                                    updateItem(
                                      "supervisors",
                                      s.id,
                                      "company",
                                      e.target.value,
                                    )
                                  }
                                />
                              </td>
                              <td className="p-2 border-r space-y-1">
                                <input
                                  className="w-full bg-transparent outline-none text-xs"
                                  placeholder="Mobile"
                                  value={s.mobile}
                                  onChange={(e) =>
                                    updateItem(
                                      "supervisors",
                                      s.id,
                                      "mobile",
                                      e.target.value,
                                    )
                                  }
                                />
                                <input
                                  className="w-full bg-transparent outline-none text-xs"
                                  placeholder="Email"
                                  value={s.email}
                                  onChange={(e) =>
                                    updateItem(
                                      "supervisors",
                                      s.id,
                                      "email",
                                      e.target.value,
                                    )
                                  }
                                />
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  onClick={() =>
                                    removeItem("supervisors", s.id)
                                  }
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4 mx-auto" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <button
                        onClick={() =>
                          addItem("supervisors", {
                            name: "",
                            empId: "",
                            position: "",
                            company: "",
                            mobile: "",
                            email: "",
                            signature: "",
                          })
                        }
                        className="text-xs font-bold text-indigo-600 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Supervisor
                      </button>
                    </section>

                    <section className="bg-slate-50 p-4 border rounded shadow-sm">
                      <h4 className="font-bold text-sm mb-3">
                        Manpower Productivity Totals
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                            Workers
                          </label>
                          <input
                            type="number"
                            className="w-full border rounded p-1 text-sm bg-white"
                            value={formData.totalWorkers || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                totalWorkers: Number(e.target.value),
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                            Supervisors
                          </label>
                          <input
                            type="number"
                            className="w-full border rounded p-1 text-sm bg-white"
                            value={formData.totalSupervisors || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                totalSupervisors: Number(e.target.value),
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                            Foremen
                          </label>
                          <input
                            type="number"
                            className="w-full border rounded p-1 text-sm bg-white"
                            value={formData.totalForemen || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                totalForemen: Number(e.target.value),
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                            Work Hours
                          </label>
                          <input
                            type="number"
                            className="w-full border rounded p-1 text-sm bg-white"
                            value={formData.totalWorkingHours || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                totalWorkingHours: Number(e.target.value),
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                            Overtime
                          </label>
                          <input
                            type="number"
                            className="w-full border rounded p-1 text-sm bg-white"
                            value={formData.overtimeHours || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                overtimeHours: Number(e.target.value),
                              })
                            }
                          />
                        </div>
                      </div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                        Productivity & Delay Notes
                      </label>
                      <textarea
                        className="w-full border rounded p-2 text-sm bg-white"
                        rows={2}
                        value={formData.productivityNotes}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            productivityNotes: e.target.value,
                          })
                        }
                      ></textarea>
                    </section>
                  </div>
                )}

                {/* TAB 3: WORK PLAN */}
                {activeTab === "plan" && (
                  <div className="max-w-6xl space-y-8">
                    <section>
                      <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mb-4">
                        Daily Work Plan & Progress
                      </h3>
                      {formData.activities.map((act, index) => (
                        <div
                          key={act.id}
                          className="border border-slate-200 rounded-lg bg-white mb-4 shadow-sm overflow-hidden"
                        >
                          <div className="bg-slate-100 p-2 flex justify-between items-center border-b border-slate-200">
                            <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                              <span className="bg-indigo-600 text-white w-5 h-5 flex items-center justify-center rounded text-xs">
                                {index + 1}
                              </span>
                              Activity / Task Definition
                            </span>
                            <button
                              onClick={() => removeItem("activities", act.id)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                                Activity Description
                              </label>
                              <textarea
                                rows={2}
                                className="w-full text-sm border-slate-300 rounded p-2 bg-slate-50"
                                value={act.description}
                                onChange={(e) =>
                                  updateItem(
                                    "activities",
                                    act.id,
                                    "description",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                                Work Location
                              </label>
                              <input
                                type="text"
                                className="w-full text-sm border-slate-300 rounded p-2 bg-slate-50"
                                value={act.location}
                                onChange={(e) =>
                                  updateItem(
                                    "activities",
                                    act.id,
                                    "location",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                                Status
                              </label>
                              <select
                                className="w-full text-sm border-slate-300 rounded p-2"
                                value={act.status}
                                onChange={(e) =>
                                  updateItem(
                                    "activities",
                                    act.id,
                                    "status",
                                    e.target.value,
                                  )
                                }
                              >
                                <option value="Planned">Planned</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                                <option value="Delayed">Delayed</option>
                                <option value="Blocked">Blocked</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                                Planned Qty / Unit
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  className="w-1/2 text-sm border-slate-300 rounded p-2"
                                  placeholder="Qty"
                                  value={act.plannedQty || ""}
                                  onChange={(e) =>
                                    updateItem(
                                      "activities",
                                      act.id,
                                      "plannedQty",
                                      Number(e.target.value),
                                    )
                                  }
                                />
                                <input
                                  type="text"
                                  className="w-1/2 text-sm border-slate-300 rounded p-2"
                                  placeholder="Unit"
                                  value={act.unit}
                                  onChange={(e) =>
                                    updateItem(
                                      "activities",
                                      act.id,
                                      "unit",
                                      e.target.value,
                                    )
                                  }
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                                Actual Qty
                              </label>
                              <input
                                type="number"
                                className="w-full text-sm border-slate-300 rounded p-2"
                                value={act.actualQty || ""}
                                onChange={(e) =>
                                  updateItem(
                                    "activities",
                                    act.id,
                                    "actualQty",
                                    Number(e.target.value),
                                  )
                                }
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                                Remarks / Delay Reason
                              </label>
                              <input
                                type="text"
                                className="w-full text-sm border-slate-300 rounded p-2"
                                value={act.delayReason}
                                onChange={(e) =>
                                  updateItem(
                                    "activities",
                                    act.id,
                                    "delayReason",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() =>
                          addItem("activities", {
                            description: "",
                            location: "",
                            status: "Planned",
                            plannedQty: 0,
                            actualQty: 0,
                            unit: "",
                            delayReason: "",
                          })
                        }
                        className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded text-sm font-bold flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Add Activity / Progress
                        Item
                      </button>
                    </section>

                    <section>
                      <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">
                        Company Representatives
                      </h3>
                      <table className="w-full text-left text-sm border border-slate-200">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs">
                          <tr>
                            <th className="p-2 border-r">Name</th>
                            <th className="p-2 border-r">Job Title</th>
                            <th className="p-2 border-r">Company</th>
                            <th className="p-2 border-r">Contact Details</th>
                            <th className="p-2 border-r">Key Information</th>
                            <th className="p-2 w-12 text-center"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.companyRepresentatives.map((rep) => (
                            <tr
                              key={rep.id}
                              className="border-b border-slate-100"
                            >
                              <td className="p-2 border-r">
                                <input
                                  className="w-full bg-transparent outline-none text-xs"
                                  value={rep.name}
                                  onChange={(e) =>
                                    updateItem(
                                      "companyRepresentatives",
                                      rep.id,
                                      "name",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Rep Name"
                                />
                              </td>
                              <td className="p-2 border-r">
                                <input
                                  className="w-full bg-transparent outline-none text-xs"
                                  value={rep.position}
                                  onChange={(e) =>
                                    updateItem(
                                      "companyRepresentatives",
                                      rep.id,
                                      "position",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Job Title"
                                />
                              </td>
                              <td className="p-2 border-r">
                                <input
                                  className="w-full bg-transparent outline-none text-xs"
                                  value={rep.company}
                                  onChange={(e) =>
                                    updateItem(
                                      "companyRepresentatives",
                                      rep.id,
                                      "company",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Company"
                                />
                              </td>
                              <td className="p-2 border-r space-y-1">
                                <input
                                  className="w-full bg-transparent outline-none text-xs"
                                  value={rep.mobile}
                                  onChange={(e) =>
                                    updateItem(
                                      "companyRepresentatives",
                                      rep.id,
                                      "mobile",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Mobile"
                                />
                                <input
                                  className="w-full bg-transparent outline-none text-xs"
                                  value={rep.email}
                                  onChange={(e) =>
                                    updateItem(
                                      "companyRepresentatives",
                                      rep.id,
                                      "email",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Email"
                                />
                              </td>
                              <td className="p-2 border-r">
                                <input
                                  className="w-full bg-transparent outline-none text-xs"
                                  value={rep.keyInfo}
                                  onChange={(e) =>
                                    updateItem(
                                      "companyRepresentatives",
                                      rep.id,
                                      "keyInfo",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Key Information"
                                />
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  onClick={() =>
                                    removeItem("companyRepresentatives", rep.id)
                                  }
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4 mx-auto" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <button
                        onClick={() =>
                          addItem("companyRepresentatives", {
                            name: "",
                            position: "",
                            company: "",
                            mobile: "",
                            email: "",
                            keyInfo: "",
                          })
                        }
                        className="mt-2 text-xs font-bold text-indigo-600 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Representative
                      </button>
                    </section>

                    <section>
                      <h3 className="text-lg font-bold text-slate-800 mb-2 border-b pb-2">
                        Next Day Plan
                      </h3>
                      <textarea
                        rows={6}
                        className="w-full border-slate-300 rounded-lg p-3 bg-slate-50 focus:bg-white transition-colors"
                        placeholder="List planned activities, workforce requirements, inspections, etc..."
                        value={formData.nextDayPlan}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            nextDayPlan: e.target.value,
                          })
                        }
                      ></textarea>
                    </section>
                  </div>
                )}

                {/* TAB 4: RESOURCES */}
                {activeTab === "resources" && (
                  <div className="max-w-5xl space-y-8">
                    <section>
                      <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">
                        Materials Report
                      </h3>
                      <table className="w-full text-left text-sm border border-slate-200">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs">
                          <tr>
                            <th className="p-2 border-r">Material / Item</th>
                            <th className="p-2 border-r">Req Qty</th>
                            <th className="p-2 border-r">Delivered</th>
                            <th className="p-2 border-r">Remarks / Status</th>
                            <th className="p-2 w-12 text-center"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.materials.map((m) => (
                            <tr
                              key={m.id}
                              className="border-b border-slate-100"
                            >
                              <td className="p-2 border-r">
                                <input
                                  className="w-full bg-transparent outline-none text-xs"
                                  value={m.name}
                                  onChange={(e) =>
                                    updateItem(
                                      "materials",
                                      m.id,
                                      "name",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Material Name"
                                />
                              </td>
                              <td className="p-2 border-r">
                                <input
                                  type="number"
                                  className="w-full bg-transparent outline-none text-xs"
                                  value={m.reqQty || ""}
                                  onChange={(e) =>
                                    updateItem(
                                      "materials",
                                      m.id,
                                      "reqQty",
                                      Number(e.target.value),
                                    )
                                  }
                                  placeholder="0"
                                />
                              </td>
                              <td className="p-2 border-r">
                                <input
                                  type="number"
                                  className="w-full bg-transparent outline-none text-xs"
                                  value={m.delQty || ""}
                                  onChange={(e) =>
                                    updateItem(
                                      "materials",
                                      m.id,
                                      "delQty",
                                      Number(e.target.value),
                                    )
                                  }
                                  placeholder="0"
                                />
                              </td>
                              <td className="p-2 border-r">
                                <input
                                  className="w-full bg-transparent outline-none text-xs"
                                  value={m.status}
                                  onChange={(e) =>
                                    updateItem(
                                      "materials",
                                      m.id,
                                      "status",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Status"
                                />
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  onClick={() => removeItem("materials", m.id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4 mx-auto" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <button
                        onClick={() =>
                          addItem("materials", {
                            name: "",
                            reqQty: 0,
                            delQty: 0,
                            availQty: 0,
                            status: "",
                          })
                        }
                        className="mt-2 text-xs font-bold text-indigo-600 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Material
                      </button>
                    </section>

                    <section>
                      <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">
                        Tools & Equipment
                      </h3>
                      <table className="w-full text-left text-sm border border-slate-200">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs">
                          <tr>
                            <th className="p-2 border-r">Equipment Name</th>
                            <th className="p-2 border-r">Quantity</th>
                            <th className="p-2 border-r">Operator</th>
                            <th className="p-2 border-r">Status / Usage</th>
                            <th className="p-2 w-12 text-center"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.equipment.map((eq) => (
                            <tr
                              key={eq.id}
                              className="border-b border-slate-100"
                            >
                              <td className="p-2 border-r">
                                <input
                                  className="w-full bg-transparent outline-none text-xs"
                                  value={eq.name}
                                  onChange={(e) =>
                                    updateItem(
                                      "equipment",
                                      eq.id,
                                      "name",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Equipment"
                                />
                              </td>
                              <td className="p-2 border-r">
                                <input
                                  type="number"
                                  className="w-full bg-transparent outline-none text-xs"
                                  value={eq.quantity || ""}
                                  onChange={(e) =>
                                    updateItem(
                                      "equipment",
                                      eq.id,
                                      "quantity",
                                      Number(e.target.value),
                                    )
                                  }
                                  placeholder="0"
                                />
                              </td>
                              <td className="p-2 border-r">
                                <input
                                  className="w-full bg-transparent outline-none text-xs"
                                  value={eq.operator}
                                  onChange={(e) =>
                                    updateItem(
                                      "equipment",
                                      eq.id,
                                      "operator",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Operator Name"
                                />
                              </td>
                              <td className="p-2 border-r">
                                <input
                                  className="w-full bg-transparent outline-none text-xs"
                                  value={eq.status}
                                  onChange={(e) =>
                                    updateItem(
                                      "equipment",
                                      eq.id,
                                      "status",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Running/Standby/Breakdown"
                                />
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  onClick={() => removeItem("equipment", eq.id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4 mx-auto" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <button
                        onClick={() =>
                          addItem("equipment", {
                            name: "",
                            quantity: 0,
                            operator: "",
                            status: "",
                          })
                        }
                        className="mt-2 text-xs font-bold text-indigo-600 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Equipment
                      </button>
                    </section>
                  </div>
                )}

                {/* TAB 5: QHSE */}
                {activeTab === "qhse" && (
                  <div className="max-w-5xl space-y-8">
                    <section>
                      <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2 text-emerald-700">
                        Health & Safety (HSE)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex items-center gap-4 bg-slate-50 p-3 rounded border">
                            <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700">
                              <input
                                type="checkbox"
                                className="w-4 h-4 text-emerald-600 rounded"
                                checked={formData.toolboxTalk}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    toolboxTalk: e.target.checked,
                                  })
                                }
                              />
                              Toolbox Talk Conducted?
                            </label>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">
                                Attendees:
                              </span>
                              <input
                                type="number"
                                className="border rounded w-16 p-1 text-sm bg-white"
                                value={formData.workersAttended || ""}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    workersAttended: Number(e.target.value),
                                  })
                                }
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Near Misses (Count)
                              </label>
                              <input
                                type="number"
                                className="w-full text-sm border-slate-300 rounded p-2"
                                value={formData.nearMisses || ""}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    nearMisses: Number(e.target.value),
                                  })
                                }
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Incidents (Count)
                              </label>
                              <input
                                type="number"
                                className="w-full text-sm border-slate-300 rounded p-2 font-bold text-red-600"
                                value={formData.incidents || ""}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    incidents: Number(e.target.value),
                                  })
                                }
                              />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Safety Observations & Remarks
                            </label>
                            <textarea
                              rows={4}
                              className="w-full text-sm border-slate-300 rounded p-2"
                              value={formData.safetyObservations}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  safetyObservations: e.target.value,
                                })
                              }
                            ></textarea>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2 text-blue-700">
                        Quality Control (QA/QC) & Inspections
                      </h3>
                      <table className="w-full text-left text-sm border border-slate-200">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                          <tr>
                            <th className="p-2 border-r">IR / WIR Number</th>
                            <th className="p-2 border-r">Status</th>
                            <th className="p-2 border-r">Inspector</th>
                            <th className="p-2 border-r w-1/3">
                              Findings / Remarks
                            </th>
                            <th className="p-2 w-12 text-center"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.qcInspections.map((qc) => (
                            <tr
                              key={qc.id}
                              className="border-b border-slate-100"
                            >
                              <td className="p-2 border-r">
                                <input
                                  className="w-full bg-transparent outline-none text-xs font-mono"
                                  value={qc.reqNumber}
                                  onChange={(e) =>
                                    updateItem(
                                      "qcInspections",
                                      qc.id,
                                      "reqNumber",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="REQ-001"
                                />
                              </td>
                              <td className="p-2 border-r">
                                <select
                                  className="w-full bg-transparent outline-none text-xs"
                                  value={qc.status}
                                  onChange={(e) =>
                                    updateItem(
                                      "qcInspections",
                                      qc.id,
                                      "status",
                                      e.target.value,
                                    )
                                  }
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="Approved">Approved</option>
                                  <option value="Rejected">Rejected</option>
                                  <option value="Re-Inspection">
                                    Re-Inspection
                                  </option>
                                </select>
                              </td>
                              <td className="p-2 border-r">
                                <input
                                  className="w-full bg-transparent outline-none text-xs"
                                  value={qc.inspector}
                                  onChange={(e) =>
                                    updateItem(
                                      "qcInspections",
                                      qc.id,
                                      "inspector",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Inspector Name"
                                />
                              </td>
                              <td className="p-2 border-r">
                                <input
                                  className="w-full bg-transparent outline-none text-xs"
                                  value={qc.findings}
                                  onChange={(e) =>
                                    updateItem(
                                      "qcInspections",
                                      qc.id,
                                      "findings",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Remarks..."
                                />
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  onClick={() =>
                                    removeItem("qcInspections", qc.id)
                                  }
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4 mx-auto" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <button
                        onClick={() =>
                          addItem("qcInspections", {
                            reqNumber: "",
                            status: "Pending",
                            inspector: "",
                            findings: "",
                          })
                        }
                        className="mt-2 text-xs font-bold text-blue-600 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Inspection Request
                      </button>
                    </section>

                    <section>
                      <h3 className="text-lg font-bold text-amber-700 mb-4 border-b border-amber-200 pb-2">
                        Issues & Constraints
                      </h3>
                      <div className="space-y-3">
                        {formData.issues.map((iss, index) => (
                          <div
                            key={iss.id}
                            className="border border-amber-200 bg-amber-50 rounded p-3 flex items-start gap-4"
                          >
                            <span className="bg-amber-500 text-white w-5 h-5 flex-shrink-0 flex items-center justify-center rounded text-xs font-bold mt-1">
                              {index + 1}
                            </span>
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="md:col-span-2">
                                <input
                                  className="w-full bg-white border border-amber-200 rounded p-1.5 text-sm outline-none"
                                  value={iss.description}
                                  onChange={(e) =>
                                    updateItem(
                                      "issues",
                                      iss.id,
                                      "description",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Describe the issue or constraint..."
                                />
                              </div>
                              <div className="flex gap-2">
                                <input
                                  className="w-1/2 bg-white border border-amber-200 rounded p-1.5 text-sm outline-none"
                                  value={iss.impact}
                                  onChange={(e) =>
                                    updateItem(
                                      "issues",
                                      iss.id,
                                      "impact",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Impact"
                                />
                                <input
                                  className="w-1/2 bg-white border border-amber-200 rounded p-1.5 text-sm outline-none"
                                  value={iss.status}
                                  onChange={(e) =>
                                    updateItem(
                                      "issues",
                                      iss.id,
                                      "status",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Status (Open/Closed)"
                                />
                              </div>
                              <div className="flex gap-2">
                                <input
                                  className="w-1/2 bg-white border border-amber-200 rounded p-1.5 text-sm outline-none"
                                  value={iss.responsible}
                                  onChange={(e) =>
                                    updateItem(
                                      "issues",
                                      iss.id,
                                      "responsible",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Responsible Party"
                                />
                                <input
                                  className="w-1/2 bg-white border border-amber-200 rounded p-1.5 text-sm outline-none"
                                  value={iss.targetDate}
                                  onChange={(e) =>
                                    updateItem(
                                      "issues",
                                      iss.id,
                                      "targetDate",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Target Date"
                                />
                              </div>
                            </div>
                            <button
                              onClick={() => removeItem("issues", iss.id)}
                              className="text-amber-600 hover:text-red-600 mt-2"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() =>
                            addItem("issues", {
                              description: "",
                              impact: "",
                              responsible: "",
                              status: "Open",
                              targetDate: "",
                            })
                          }
                          className="text-xs font-bold text-amber-700 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Issue / Constraint
                        </button>
                      </div>
                    </section>
                  </div>
                )}

                {/* TAB 6: CUSTOM & SIGS */}
                {activeTab === "other" && (
                  <div className="max-w-5xl space-y-8 pb-12">
                    <section>
                      <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">
                        Custom Fields & Sections
                      </h3>
                      <div className="space-y-4 mb-2">
                        {formData.customSections.map((sec, idx) => (
                          <div
                            key={sec.id}
                            className="border border-slate-200 bg-slate-50 p-4 rounded-xl relative"
                          >
                            <button
                              onClick={() =>
                                removeItem("customSections", sec.id)
                              }
                              className="absolute top-3 right-3 text-red-400 hover:text-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <input
                              className="text-sm font-bold bg-transparent border-b border-slate-300 w-2/3 pb-1 mb-3 outline-none"
                              placeholder="Section Title"
                              value={sec.title}
                              onChange={(e) =>
                                updateItem(
                                  "customSections",
                                  sec.id,
                                  "title",
                                  e.target.value,
                                )
                              }
                            />
                            <textarea
                              className="w-full min-h-[80px] text-sm p-2 bg-white border border-slate-200 rounded"
                              placeholder="Content..."
                              value={sec.content}
                              onChange={(e) =>
                                updateItem(
                                  "customSections",
                                  sec.id,
                                  "content",
                                  e.target.value,
                                )
                              }
                            ></textarea>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() =>
                          addItem("customSections", {
                            title: "New Custom Section",
                            content: "",
                          })
                        }
                        className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded flex items-center gap-2 hover:bg-indigo-100 transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Add Custom Section
                      </button>
                    </section>

                    <section>
                      <div className="flex justify-between items-end border-b pb-2 mb-4 mt-8">
                        <h3 className="text-lg font-bold text-slate-800">
                          Approvals & Signatures
                        </h3>
                        <button
                          onClick={() =>
                            addItem("approvals", {
                              role: "Reviewer",
                              name: "",
                              position: "",
                              date: "",
                            })
                          }
                          className="text-xs font-bold text-indigo-600"
                        >
                          Add Signatory
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {formData.approvals.map((app) => (
                          <div
                            key={app.id}
                            className="border border-slate-200 rounded p-4 relative group"
                          >
                            <button
                              onClick={() => removeItem("approvals", app.id)}
                              className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <input
                              className="text-xs font-bold text-slate-800 uppercase tracking-wider bg-transparent outline-none w-full text-center mb-4"
                              value={app.role}
                              onChange={(e) =>
                                updateItem(
                                  "approvals",
                                  app.id,
                                  "role",
                                  e.target.value,
                                )
                              }
                              placeholder="Role (e.g. Project Manager)"
                            />
                            <div className="border-b-2 border-slate-300 h-16 bg-slate-50 mb-3 flex items-center justify-center italic text-slate-300 text-xs">
                              Signature Space
                            </div>
                            <input
                              className="w-full text-sm text-center font-bold outline-none border-b border-transparent hover:border-slate-200 focus:border-indigo-400 focus:bg-indigo-50 transition-colors mb-1"
                              value={app.name}
                              onChange={(e) =>
                                updateItem(
                                  "approvals",
                                  app.id,
                                  "name",
                                  e.target.value,
                                )
                              }
                              placeholder="Full Name"
                            />
                            <input
                              className="w-full text-xs text-center text-slate-500 outline-none"
                              value={app.date}
                              onChange={(e) =>
                                updateItem(
                                  "approvals",
                                  app.id,
                                  "date",
                                  e.target.value,
                                )
                              }
                              placeholder="Date"
                            />
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* PDF PRINTABLE AREA */}
      <div
        id="dpr-printable-area"
        className="hidden bg-white text-[#1e293b] font-sans p-0 m-0 w-full"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        <div
          id="dpr-pdf-canvas"
          className="w-[800px] bg-white p-10 box-border text-[12px] leading-relaxed relative"
        >
          {/* Header Block */}
          <div className="flex border border-[#94a3b8] mb-6 print:break-inside-avoid">
            <div className="w-1/4 p-4 border-r border-[#94a3b8] flex flex-col justify-center items-center">
              {getCleanLogoBase64(company?.logo) ? (
                <img
                  src={getCleanLogoBase64(company?.logo)}
                  alt="Logo"
                  className="max-h-16 object-contain"
                />
              ) : (
                <div className="w-16 h-16 bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs uppercase text-center border-2 border-slate-300">
                  Logo
                </div>
              )}
            </div>
            <div
              className="w-2/4 p-4 bg-[#f8fafc] !print:bg-[#f8fafc] border-r border-[#94a3b8] flex flex-col justify-center items-center text-center"
              style={{
                WebkitPrintColorAdjust: "exact",
                printColorAdjust: "exact",
              }}
            >
              <h1 className="text-[20px] font-black uppercase tracking-widest text-[#0f172a] mb-1">
                Daily Progress Report
              </h1>
              <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
                Project Controls
              </div>
            </div>
            <div className="w-1/4 flex flex-col">
              <div className="border-b border-[#94a3b8] p-2 flex flex-1 items-center">
                <span className="font-bold uppercase text-[10px] w-16 text-slate-500">
                  DPR No:
                </span>
                <span className="font-bold text-[12px] text-[#0f172a] pl-1 break-words">
                  {formData.dprNumber}
                </span>
              </div>
              <div className="border-b border-[#94a3b8] p-2 flex flex-1 items-center">
                <span className="font-bold uppercase text-[10px] w-16 text-slate-500">
                  Date:
                </span>
                <span className="font-bold text-[12px] text-[#0f172a] pl-1 break-words">
                  {formData.reportDate}
                </span>
              </div>
              <div className="p-2 flex flex-1 items-center">
                <span className="font-bold uppercase text-[10px] w-16 text-slate-500">
                  Status:
                </span>
                <span className="font-bold text-[12px] text-[#0f172a] pl-1 break-words">
                  {formData.status}
                </span>
              </div>
            </div>
          </div>

          {/* Project Details */}
          <div className="border border-[#94a3b8] mb-6 flex flex-wrap print:break-inside-avoid text-[11px]">
            <div className="w-1/2 flex border-b border-[#94a3b8]">
              <div
                className="w-32 bg-[#f1f5f9] !print:bg-[#f1f5f9] p-2 font-bold uppercase text-[9px] text-slate-600 border-r border-[#94a3b8]"
                style={{
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              >
                Project Name
              </div>
              <div className="flex-1 p-2 font-bold text-[#0f172a]">
                {formData.projectName || "-"}
              </div>
            </div>
            <div className="w-1/2 flex border-b border-[#94a3b8]">
              <div
                className="w-32 bg-[#f1f5f9] !print:bg-[#f1f5f9] p-2 font-bold uppercase text-[9px] text-slate-600 border-x border-[#94a3b8]"
                style={{
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              >
                Project No
              </div>
              <div className="flex-1 p-2 text-[#0f172a]">
                {formData.projectNumber || "-"}
              </div>
            </div>
            <div className="w-1/2 flex border-b border-[#94a3b8]">
              <div
                className="w-32 bg-[#f1f5f9] !print:bg-[#f1f5f9] p-2 font-bold uppercase text-[9px] text-slate-600 border-r border-[#94a3b8]"
                style={{
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              >
                Client
              </div>
              <div className="flex-1 p-2 text-[#0f172a]">
                {formData.clientName || "-"}
              </div>
            </div>
            <div className="w-1/2 flex border-b border-[#94a3b8]">
              <div
                className="w-32 bg-[#f1f5f9] !print:bg-[#f1f5f9] p-2 font-bold uppercase text-[9px] text-slate-600 border-x border-[#94a3b8]"
                style={{
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              >
                Contract No
              </div>
              <div className="flex-1 p-2 text-[#0f172a]">
                {formData.contractNumber || "-"}
              </div>
            </div>
            <div className="w-1/2 flex">
              <div
                className="w-32 bg-[#f1f5f9] !print:bg-[#f1f5f9] p-2 font-bold uppercase text-[9px] text-slate-600 border-r border-[#94a3b8]"
                style={{
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              >
                Main Contractor
              </div>
              <div className="flex-1 p-2 text-[#0f172a]">
                {formData.mainContractor || "-"}
              </div>
            </div>
            <div className="w-1/2 flex">
              <div
                className="w-32 bg-[#f1f5f9] !print:bg-[#f1f5f9] p-2 font-bold uppercase text-[9px] text-slate-600 border-x border-[#94a3b8]"
                style={{
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              >
                Subcontractor
              </div>
              <div className="flex-1 p-2 text-[#0f172a]">
                {formData.subcontractor || "-"}
              </div>
            </div>
          </div>

          {/* Work Plan & Progress */}
          {formData.activities.length > 0 && (
            <div
              className="mb-6 print:break-inside-avoid block print-break-avoid"
              style={{ pageBreakInside: "avoid", breakInside: "avoid" }}
            >
              <h3
                className="bg-[#1e293b] !print:bg-[#1e293b] text-white p-2 font-bold text-[10px] uppercase tracking-wider mb-2"
                style={{
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              >
                1.0 Daily Work Plan & Execution Progress
              </h3>
              <table className="w-full text-left border-collapse border border-[#94a3b8] text-[10px]">
                <thead>
                  <tr
                    className="bg-[#f1f5f9] !print:bg-[#f1f5f9] text-[#0f172a]"
                    style={{
                      WebkitPrintColorAdjust: "exact",
                      printColorAdjust: "exact",
                    }}
                  >
                    <th className="p-2 border border-[#94a3b8] w-8 text-center uppercase">
                      #
                    </th>
                    <th className="p-2 border border-[#94a3b8] uppercase">
                      Activity Description & Location
                    </th>
                    <th className="p-2 border border-[#94a3b8] w-24 uppercase">
                      Status
                    </th>
                    <th className="p-2 border border-[#94a3b8] w-16 text-center uppercase">
                      Plan Qty
                    </th>
                    <th className="p-2 border border-[#94a3b8] w-16 text-center uppercase">
                      Act Qty
                    </th>
                    <th className="p-2 border border-[#94a3b8] w-48 uppercase">
                      Delay / Remarks
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {formData.activities.map((a, i) => (
                    <tr key={i}>
                      <td className="p-2 border border-[#94a3b8] text-center font-bold text-slate-500">
                        {i + 1}
                      </td>
                      <td className="p-2 border border-[#94a3b8]">
                        <div className="font-bold text-[#0f172a]">
                          {a.description}
                        </div>
                        <div className="text-[#64748b] text-[9px] mt-0.5">
                          <span className="font-bold text-slate-400">Loc:</span>{" "}
                          {a.location || "-"}
                        </div>
                      </td>
                      <td className="p-2 border border-[#94a3b8] font-medium">
                        {a.status}
                      </td>
                      <td className="p-2 border border-[#94a3b8] text-center">
                        {a.plannedQty} {a.unit}
                      </td>
                      <td className="p-2 border border-[#94a3b8] text-center font-bold">
                        {a.actualQty} {a.unit}
                      </td>
                      <td className="p-2 border border-[#94a3b8] text-[#64748b]">
                        {a.delayReason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Resources: Workforce & Equipment */}
          <div
            className="mb-6 print:break-inside-avoid block print-break-avoid"
            style={{ pageBreakInside: "avoid", breakInside: "avoid" }}
          >
            <div className={`flex gap-6 flex-col ${formData.workforceMode === "summary" ? "md:flex-row" : "md:flex-col"}`}>
              
              <div className={formData.workforceMode === "summary" ? "flex-1 max-w-[50%]" : "w-full mb-4"}>
                <h3
                  className="bg-[#1e293b] !print:bg-[#1e293b] text-white p-2 font-bold text-[10px] uppercase tracking-wider mb-2"
                  style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
                >
                  2.0 Workforce {formData.workforceMode === "summary" ? "Summary" : "Detailed Log"}
                </h3>
                
                {formData.workforceMode === "summary" ? (
                  formData.workforceSummary.length > 0 ? (
                    <table className="w-full text-left border-collapse border border-[#94a3b8] text-[10px] mb-3">
                      <thead>
                        <tr className="bg-[#f1f5f9] !print:bg-[#f1f5f9] text-[#0f172a]" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                          <th className="p-2 border border-[#94a3b8] uppercase">Trade</th>
                          <th className="p-2 border border-[#94a3b8] w-20 text-center uppercase">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.workforceSummary.map((w, i) => (
                          <tr key={i}>
                            <td className="p-2 border border-[#94a3b8] font-bold">{w.trade}</td>
                            <td className="p-2 border border-[#94a3b8] text-center">{w.count}</td>
                          </tr>
                        ))}
                        <tr className="bg-[#f8fafc] !print:bg-[#f8fafc]" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                          <td className="p-2 border border-[#94a3b8] font-bold text-right uppercase text-[9px]">Total</td>
                          <td className="p-2 border border-[#94a3b8] text-center font-black">
                            {formData.workforceSummary.reduce((acc, w) => acc + (w.count || 0), 0)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-[10px] text-slate-500 border border-[#94a3b8] p-3 text-center mb-3">
                      No workforce summary data provided.
                    </div>
                  )
                ) : (
                  formData.workforceDetailed.length > 0 ? (
                    <table className="w-full text-left border-collapse border border-[#94a3b8] text-[9px] mb-3">
                      <thead>
                        <tr className="bg-[#f1f5f9] !print:bg-[#f1f5f9] text-[#0f172a]" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                          <th className="p-1.5 border border-[#94a3b8]">EMP NO</th>
                          <th className="p-1.5 border border-[#94a3b8]">NAME</th>
                          <th className="p-1.5 border border-[#94a3b8]">TRADE</th>
                          <th className="p-1.5 border border-[#94a3b8]">COMPANY</th>
                          <th className="p-1.5 border border-[#94a3b8]">LOCATION</th>
                          <th className="p-1.5 border border-[#94a3b8]">ATTEND.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.workforceDetailed.map((w, i) => (
                          <tr key={i}>
                            <td className="p-1.5 border border-[#94a3b8]">{w.empNumber}</td>
                            <td className="p-1.5 border border-[#94a3b8] font-bold">{w.name}</td>
                            <td className="p-1.5 border border-[#94a3b8]">{w.trade}</td>
                            <td className="p-1.5 border border-[#94a3b8]">{w.company}</td>
                            <td className="p-1.5 border border-[#94a3b8]">{w.location}</td>
                            <td className="p-1.5 border border-[#94a3b8]">{w.attendance}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-[10px] text-slate-500 border border-[#94a3b8] p-3 text-center mb-3">
                      No detailed workforce records provided.
                    </div>
                  )
                )}

                {/* Manpower Totals & Productivity Notes */}
                {(formData.totalWorkers > 0 || formData.totalWorkingHours > 0 || formData.productivityNotes) && (
                  <div className="border border-[#94a3b8] bg-[#f8fafc] !print:bg-[#f8fafc] p-2 text-[9px] mb-3" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                    <div className="grid grid-cols-5 gap-2 mb-2 font-bold text-center border-b border-[#cbd5e1] pb-1">
                      <div>Workers: {formData.totalWorkers}</div>
                      <div>Supervisors: {formData.totalSupervisors}</div>
                      <div>Foremen: {formData.totalForemen}</div>
                      <div>Hours: {formData.totalWorkingHours}</div>
                      <div>Overtime: {formData.overtimeHours}</div>
                    </div>
                    {formData.productivityNotes && (
                       <div><span className="font-bold text-slate-500">Notes: </span>{formData.productivityNotes}</div>
                    )}
                  </div>
                )}

                {/* Supervisors Table */}
                {formData.supervisors.length > 0 && (
                  <div className="mb-3">
                    <div className="font-bold text-[9px] uppercase text-slate-600 mb-1">Supervisors / Foremen Present</div>
                    <table className="w-full text-left border-collapse border border-[#94a3b8] text-[9px]">
                      <thead>
                        <tr className="bg-[#f1f5f9] !print:bg-[#f1f5f9]" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                          <th className="p-1 border border-[#94a3b8]">Name</th>
                          <th className="p-1 border border-[#94a3b8]">Position</th>
                          <th className="p-1 border border-[#94a3b8]">Company</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.supervisors.map((s, i) => (
                          <tr key={i}>
                            <td className="p-1 border border-[#94a3b8] font-bold">{s.name}</td>
                            <td className="p-1 border border-[#94a3b8]">{s.position}</td>
                            <td className="p-1 border border-[#94a3b8]">{s.company}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className={formData.workforceMode === "summary" ? "flex-1 max-w-[50%]" : "w-full"}>
                <h3
                  className="bg-[#1e293b] !print:bg-[#1e293b] text-white p-2 font-bold text-[10px] uppercase tracking-wider mb-2"
                  style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
                >
                  3.0 Equipment Summary
                </h3>
                {formData.equipment.length > 0 ? (
                  <table className="w-full text-left border-collapse border border-[#94a3b8] text-[10px]">
                    <thead>
                      <tr
                        className="bg-[#f1f5f9] !print:bg-[#f1f5f9] text-[#0f172a]"
                        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
                      >
                        <th className="p-2 border border-[#94a3b8] uppercase">Equipment</th>
                        <th className="p-2 border border-[#94a3b8] w-12 text-center uppercase">Qty</th>
                        <th className="p-2 border border-[#94a3b8] w-24 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.equipment.map((e, i) => (
                        <tr key={i}>
                          <td className="p-2 border border-[#94a3b8] font-bold">{e.name}</td>
                          <td className="p-2 border border-[#94a3b8] text-center">{e.quantity}</td>
                          <td className="p-2 border border-[#94a3b8]">{e.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-[10px] text-slate-500 border border-[#94a3b8] p-3 text-center">
                    No equipment records provided.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* QHSE */}
          <div
            className="mb-6 print:break-inside-avoid block print-break-avoid"
            style={{ pageBreakInside: "avoid", breakInside: "avoid" }}
          >
            <h3
              className="bg-[#1e293b] !print:bg-[#1e293b] text-white p-2 font-bold text-[10px] uppercase tracking-wider mb-2"
              style={{
                WebkitPrintColorAdjust: "exact",
                printColorAdjust: "exact",
              }}
            >
              4.0 QHSE (Quality, Health, Safety & Environment)
            </h3>
            <div className="border border-[#94a3b8] flex divide-x divide-[#94a3b8]">
              <div className="w-1/2 p-3">
                <div className="font-bold text-[10px] uppercase mb-2 border-b border-[#cbd5e1] pb-1 text-[#0f172a]">
                  Safety Report
                </div>
                <ul className="text-[10px] space-y-1">
                  <li className="flex justify-between">
                    <span>Toolbox Talk Conducted:</span>{" "}
                    <span className="font-bold">
                      {formData.toolboxTalk ? "Yes" : "No"}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span>Workers Attended:</span>{" "}
                    <span className="font-bold">
                      {formData.workersAttended}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span>Near Misses:</span>{" "}
                    <span className="font-bold text-amber-600">
                      {formData.nearMisses}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span>Incidents / Accidents:</span>{" "}
                    <span className="font-bold text-red-600">
                      {formData.incidents}
                    </span>
                  </li>
                </ul>
                {formData.safetyObservations && (
                  <div className="mt-2 text-[9px] text-slate-600 border-t border-slate-100 pt-1">
                    <strong>Observations:</strong> {formData.safetyObservations}
                  </div>
                )}
              </div>
              <div className="w-1/2 p-3">
                <div className="font-bold text-[10px] uppercase mb-2 border-b border-[#cbd5e1] pb-1 text-[#0f172a]">
                  Quality Inspections
                </div>
                {formData.qcInspections.length > 0 ? (
                  <ul className="text-[9px] space-y-1 mt-2 list-disc pl-3 text-[#0f172a]">
                    {formData.qcInspections.map((qc, i) => (
                      <li key={i}>
                        <strong>{qc.reqNumber}</strong>: {qc.status} -{" "}
                        <em>{qc.findings}</em>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-slate-400 text-[10px]">
                    No inspections recorded.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Company Representatives */}
          {formData.companyRepresentatives.length > 0 && (
            <div
              className="mb-6 print:break-inside-avoid block print-break-avoid"
              style={{ pageBreakInside: "avoid", breakInside: "avoid" }}
            >
              <h3
                className="bg-[#1e293b] !print:bg-[#1e293b] text-white p-2 font-bold text-[10px] uppercase tracking-wider mb-2"
                style={{
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              >
                5.0 Company Representatives
              </h3>
              <table className="w-full text-left text-[10px] border border-[#94a3b8]">
                <thead className="bg-slate-100 border-b border-[#94a3b8] font-bold text-[#1e293b]">
                  <tr>
                    <th className="p-2 border-r border-[#94a3b8]">Name</th>
                    <th className="p-2 border-r border-[#94a3b8]">Job Title</th>
                    <th className="p-2 border-r border-[#94a3b8]">Company</th>
                    <th className="p-2 border-r border-[#94a3b8]">
                      Contact Details
                    </th>
                    <th className="p-2">Key Information</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#94a3b8]">
                  {formData.companyRepresentatives.map((rep) => (
                    <tr key={rep.id}>
                      <td className="p-2 border-r border-[#94a3b8] font-bold">
                        {rep.name}
                      </td>
                      <td className="p-2 border-r border-[#94a3b8]">
                        {rep.position}
                      </td>
                      <td className="p-2 border-r border-[#94a3b8]">
                        {rep.company}
                      </td>
                      <td className="p-2 border-r border-[#94a3b8] space-y-1">
                        {rep.mobile && <div>{rep.mobile}</div>}
                        {rep.email && <div>{rep.email}</div>}
                      </td>
                      <td className="p-2">{rep.keyInfo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Next Day Plan */}
          {formData.nextDayPlan && (
            <div
              className="mb-6 print:break-inside-avoid block print-break-avoid"
              style={{ pageBreakInside: "avoid", breakInside: "avoid" }}
            >
              <h3
                className="bg-[#1e293b] !print:bg-[#1e293b] text-white p-2 font-bold text-[10px] uppercase tracking-wider mb-2"
                style={{
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              >
                6.0 Next Day Plan
              </h3>
              <div className="border border-[#94a3b8] p-3 text-[11px] whitespace-pre-wrap text-[#0f172a]">
                {formData.nextDayPlan}
              </div>
            </div>
          )}

          {/* Custom Sections */}
          {formData.customSections.length > 0 &&
            formData.customSections.map((sec, i) => (
              <div
                key={sec.id}
                className="mb-6 print:break-inside-avoid block print-break-avoid"
                style={{ pageBreakInside: "avoid", breakInside: "avoid" }}
              >
                <h3
                  className="bg-slate-100 !print:bg-slate-100 text-slate-800 border border-slate-300 p-2 font-bold text-[10px] uppercase tracking-wider mb-2"
                  style={{
                    WebkitPrintColorAdjust: "exact",
                    printColorAdjust: "exact",
                  }}
                >
                  {sec.title}
                </h3>
                <div className="border border-[#94a3b8] p-3 text-[11px] whitespace-pre-wrap text-[#0f172a]">
                  {sec.content}
                </div>
              </div>
            ))}

          {/* Signatures */}
          {formData.approvals.length > 0 && (
            <div
              className="mt-12 print-break-avoid print:break-inside-avoid block"
              style={{ pageBreakInside: "avoid", breakInside: "avoid" }}
            >
              <div className="flex flex-wrap justify-between gap-y-10">
                {formData.approvals.map((app, i) => (
                  <div key={i} className="w-1/3 text-center px-4 mb-4">
                    <div className="border-b-2 border-slate-800 mb-2 h-10 w-full mx-auto relative">
                      {/* Signature placeholder */}
                    </div>
                    <p className="font-bold text-[11px] uppercase tracking-wider text-[#0f172a]">
                      {app.name || "____________"}
                    </p>
                    <p className="text-[9px] text-[#64748b] font-bold uppercase mt-1">
                      {app.role}
                    </p>
                    {app.date && (
                      <p className="text-[9px] text-[#64748b] mt-1">
                        {app.date}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10 border-t border-[#94a3b8] pt-2 flex justify-between text-[8px] text-slate-400 font-mono print:break-inside-avoid">
            <span>Generated by Enterprise DWP System</span>
            <span>Report ID: {formData.id || "N/A"}</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      </div>
    </div>
  );
};
