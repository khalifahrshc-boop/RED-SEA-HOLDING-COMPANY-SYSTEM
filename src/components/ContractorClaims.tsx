import React, { useState, useEffect, useRef } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { translations, Language } from "../lib/translations";
import { Project } from "../types";
import {
  Printer,
  Download,
  Plus,
  Trash2,
  Edit2,
  Check,
  FileText,
  FileSearch,
  Save,
  Copy,
} from "lucide-react";
import { cn } from "../lib/utils";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { fixHtml2CanvasOklch } from "../lib/pdfUtils";

interface ContractorClaimsProps {
  language: Language;
  projects?: Project[];
  company?: any;
}

interface ClaimReport {
  id: string;
  claimNumber: string;
  status: "Draft" | "Submitted" | "Approved";
  dateCreated: string;
  dateModified: string;

  companyName: string;
  projectName: string;
  subcontractorName: string;
  clientName: string;
  reportDate: string;
  siteManagerName: string;
  positionTitle: string;

  numberOfWorkers: number;
  dailyCostPerWorker: number;

  totalDelayDays: number;
  workPermitDelayDays: number;
  safetyPermitDelayDays: number;
  productivityLossDays: number;
  additionalRecoveryDays: number;

  correctiveManagementCost: number;
  additionalSupervisionCost: number;
  productivityLossCost: number;

  notesAndComments: string;

  customSections: ReportSection[];
}

interface ReportSection {
  id: string;
  title: string;
  content: string;
}

const initializeDefaultReport = (): ClaimReport => ({
  id: `CR-${Date.now()}`,
  claimNumber: `CLM-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
  status: "Draft",
  dateCreated: new Date().toISOString(),
  dateModified: new Date().toISOString(),
  companyName: "",
  projectName: "",
  subcontractorName: "",
  clientName: "",
  reportDate: new Date().toISOString().split("T")[0],
  siteManagerName: "",
  positionTitle: "",
  numberOfWorkers: 0,
  dailyCostPerWorker: 0,
  totalDelayDays: 0,
  workPermitDelayDays: 0,
  safetyPermitDelayDays: 0,
  productivityLossDays: 0,
  additionalRecoveryDays: 0,
  correctiveManagementCost: 0,
  additionalSupervisionCost: 0,
  productivityLossCost: 0,
  notesAndComments: "",
  customSections: [
    {
      id: "sec-1",
      title: "Introduction",
      content:
        "This report documents the non-performance, site mismanagement, and cost recovery issues experienced during the execution of the project.",
    },
    {
      id: "sec-2",
      title: "Failure to Obtain Work Permits",
      content:
        "Detailed timeline of failures to obtain necessary work permits in a timely manner.",
    },
    {
      id: "sec-3",
      title: "Delay in Safety Approvals",
      content:
        "Significant delays were recorded in safety inspections and approvals, halting continuous workflow.",
    },
    {
      id: "sec-4",
      title: "Lack of Site Management and Supervision",
      content:
        "Observed absence of adequate site leadership leading to unregulated site activities.",
    },
    {
      id: "sec-5",
      title: "Productivity Loss",
      content:
        "Detailed analysis of man-hour losses due to the aforementioned delays.",
    },
    {
      id: "sec-6",
      title: "Poor Work Execution",
      content:
        "Quality of work dropped necessitating re-work in several zones.",
    },
    {
      id: "sec-7",
      title: "Corrective Intervention",
      content:
        "Actions taken to mitigate losses and resume scheduled activities.",
    },
    {
      id: "sec-8",
      title: "Official Claim and Request",
      content:
        "Formal request for the summation of losses and cost recovery as outlined below.",
    },
  ],
});

export function ContractorClaims({
  language,
  projects,
  company,
}: ContractorClaimsProps) {
  const isRtl = language === "ar";

  const [reports, setReports] = useLocalStorage<ClaimReport[]>(
    "ares_contractor_claims",
    [],
  );
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [reportForm, setReportForm] = useState<ClaimReport>(
    initializeDefaultReport(),
  );
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const calculateLaborLossCost = (r: ClaimReport) => {
    const totalAffectedDays =
      r.workPermitDelayDays +
      r.safetyPermitDelayDays +
      r.productivityLossDays +
      r.additionalRecoveryDays +
      r.totalDelayDays;
    return r.numberOfWorkers * r.dailyCostPerWorker * totalAffectedDays;
  };

  const calculateTotalRecoveryCosts = (r: ClaimReport) => {
    return (
      r.correctiveManagementCost +
      r.additionalSupervisionCost +
      r.productivityLossCost
    );
  };

  const calculateFinalClaimAmount = (r: ClaimReport) => {
    return calculateLaborLossCost(r) + calculateTotalRecoveryCosts(r);
  };

  const handleCreateNew = () => {
    const newReport = initializeDefaultReport();
    setReports((prev) => [newReport, ...prev]);
    setReportForm(newReport);
    setCurrentReportId(newReport.id);
    setIsFormOpen(true);
  };

  const handleEdit = (r: ClaimReport) => {
    setReportForm(r);
    setCurrentReportId(r.id);
    setIsFormOpen(true);
  };

  const handleDuplicate = (r: ClaimReport) => {
    const newReport = {
      ...r,
      id: `CR-${Date.now()}`,
      claimNumber: `CLM-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
      status: "Draft" as const,
      dateCreated: new Date().toISOString(),
      dateModified: new Date().toISOString(),
    };
    setReports((prev) => [newReport, ...prev]);
    setReportForm(newReport);
    setCurrentReportId(newReport.id);
    setIsFormOpen(true);
  };

  const handleSave = (status: "Draft" | "Submitted" | "Approved" = "Draft") => {
    const updatedForm = {
      ...reportForm,
      status,
      dateModified: new Date().toISOString(),
    };
    if (currentReportId) {
      setReports((prev) =>
        prev.map((r) => (r.id === currentReportId ? updatedForm : r)),
      );
    } else {
      setReports((prev) => [updatedForm, ...prev]);
      setCurrentReportId(updatedForm.id);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this report?")) {
      setReports((prev) => prev.filter((r) => r.id !== id));
      if (currentReportId === id) {
        setIsFormOpen(false);
        setCurrentReportId(null);
      }
    }
  };

  // Auto-save form changes to reports list to persist in local storage
  React.useEffect(() => {
    if (isFormOpen && currentReportId) {
      setReports((prev) =>
        prev.map((r) =>
          r.id === currentReportId
            ? {
                ...reportForm,
                status: r.status,
                dateModified: new Date().toISOString(),
              }
            : r,
        ),
      );
    }
  }, [reportForm, currentReportId, isFormOpen, setReports]);

  const addCustomSection = () => {
    setReportForm((prev) => ({
      ...prev,
      customSections: [
        ...prev.customSections,
        {
          id: `sec-${Date.now()}`,
          title: "New Section",
          content: "Enter contents...",
        },
      ],
    }));
  };

  const updateSection = (
    id: string,
    field: "title" | "content",
    value: string,
  ) => {
    setReportForm((prev) => ({
      ...prev,
      customSections: prev.customSections.map((s) =>
        s.id === id ? { ...s, [field]: value } : s,
      ),
    }));
  };

  const deleteSection = (id: string) => {
    setReportForm((prev) => ({
      ...prev,
      customSections: prev.customSections.filter((s) => s.id !== id),
    }));
  };

  const handleExportDocx = () => {
    // Generate a simple html to download as Word
    const htmlString = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Export DOCX</title></head><body>
      <h1>Non-Performance, Site Mismanagement & Cost Recovery Report</h1>
      <h2>Claim Number: ${reportForm.claimNumber}</h2>
      <p><strong>Company:</strong> ${reportForm.companyName}</p>
      <p><strong>Project:</strong> ${reportForm.projectName}</p>
      <p><strong>Subcontractor:</strong> ${reportForm.subcontractorName}</p>
      <p><strong>Report Date:</strong> ${reportForm.reportDate}</p>
      <h3>Totals:</h3>
      <p>Final Claim Amount: SAR ${calculateFinalClaimAmount(reportForm).toLocaleString()}</p>
      </body></html>
    `;
    const blob = new Blob(["\ufeff", htmlString], {
      type: "application/msword",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportForm.claimNumber}_Report.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerPrint = () => {
    window.print();
  };

  const generatePDF = async () => {
    // printRef check removed because we are not actually linking it properly yet, but it's fine for now. Wait, let me just remove 213 as well since printRef.current isn't set.
    setIsGeneratingPDF(true);
    try {
      // Just temporarily reveal for capture if we hide it from screen flow usually
      const pContainer = document.getElementById("claim-report-printable");
      if (pContainer) {
        pContainer.classList.remove("hidden");
        pContainer.classList.remove("print:block");
        pContainer.style.position = "absolute";
        pContainer.style.left = "-9999px";
        pContainer.style.top = "-9999px";
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
      const element = document.getElementById("claim-pdf-canvas");
      if (!element) throw new Error("PDF element not found");

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        onclone: (clonedDoc) => {
          fixHtml2CanvasOklch(clonedDoc);
        },
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${reportForm.claimNumber}_Contractor_Claim.pdf`);
    } catch (err) {
      console.error(err);
      alert("Error generating PDF");
    } finally {
      setIsGeneratingPDF(false);
      const pContainer = document.getElementById("claim-report-printable");
      if (pContainer) {
        pContainer.classList.add("hidden");
        pContainer.classList.add("print:block");
        pContainer.style.position = "";
        pContainer.style.left = "";
        pContainer.style.top = "";
      }
    }
  };

  const laborCost = calculateLaborLossCost(reportForm);
  const recoveryCost = calculateTotalRecoveryCosts(reportForm);
  const totalClaim = calculateFinalClaimAmount(reportForm);

  return (
    <div className="flex-1 flex flex-col h-full print:h-auto bg-slate-50 print:bg-white print:overflow-visible">
      {/* Header */}
      <header className="bg-white px-6 py-4 border-b border-slate-200 shrink-0 print:hidden">
        <div className="flex justify-between items-center max-w-7xl mx-auto w-full">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Contractor Claims
            </h1>
            <p className="text-sm text-slate-500">
              Professional Reporting System for Official Claims
            </p>
          </div>
          {!isFormOpen && (
            <button
              onClick={handleCreateNew}
              className="bg-black hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Formal Claim
            </button>
          )}
          {isFormOpen && (
            <div className="flex gap-2">
              <button
                onClick={() => setIsFormOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors"
              >
                Close Editor
              </button>
              <button
                onClick={() => handleSave("Draft")}
                className="bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Draft
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content View Container */}
      <main className="flex-1 overflow-auto print:overflow-visible print:p-0">
        <div className="max-w-7xl mx-auto w-full p-6 print:hidden">
          {!isFormOpen ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reports.map((r) => (
                <div
                  key={r.id}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative group hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-xs font-mono font-bold text-slate-500 bg-slate-100 py-1 px-2 rounded">
                      {r.claimNumber}
                    </div>
                    <div
                      className={cn(
                        "text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded flex items-center gap-1",
                        r.status === "Draft"
                          ? "bg-amber-100 text-amber-700"
                          : r.status === "Submitted"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-emerald-100 text-emerald-700",
                      )}
                    >
                      {r.status === "Approved" && <Check className="w-3 h-3" />}
                      {r.status}
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-900 truncate mb-1">
                    {r.projectName || "Untitled Project"}
                  </h3>
                  <p className="text-sm text-slate-600 truncate">
                    {r.subcontractorName || "Unknown Subcontractor"}
                  </p>

                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-400">Total Claim</p>
                      <p className="text-sm font-bold text-slate-900">
                        SAR {calculateFinalClaimAmount(r).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Date</p>
                      <p className="text-sm font-bold text-slate-900">
                        {r.reportDate}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex gap-2">
                    <button
                      onClick={() => handleEdit(r)}
                      className="flex-1 py-2 bg-slate-900 text-white text-xs font-bold rounded hover:bg-black transition-colors flex justify-center items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => handleDuplicate(r)}
                      className="p-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="p-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {reports.length === 0 && (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                  <FileSearch className="w-12 h-12 mb-4 text-slate-300" />
                  <p>No claims reports found.</p>
                  <p className="text-xs mt-1">Create one to get started.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Form Input Side */}
              <div className="flex-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <h2 className="text-lg font-bold text-slate-900 mb-6 border-b border-slate-100 pb-2">
                  Claim Settings & Values
                </h2>

                <div className="overflow-auto pr-2 custom-scrollbar flex-1 space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Company Name
                      </label>
                      <select
                        className="w-full text-sm border-slate-200 rounded p-2 bg-slate-50 border focus:bg-white"
                        value={reportForm.companyName}
                        onChange={(e) =>
                          setReportForm({
                            ...reportForm,
                            companyName: e.target.value,
                          })
                        }
                      >
                        <option value="">Select Company</option>
                        {company?.name && (
                          <option value={company.name}>{company.name}</option>
                        )}
                        <option value="RED SEA HOLDING COMPANY SYSTEM">
                          RED SEA HOLDING COMPANY SYSTEM
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Project Name
                      </label>
                      <select
                        className="w-full text-sm border-slate-200 rounded p-2 bg-slate-50 border focus:bg-white"
                        value={reportForm.projectName}
                        onChange={(e) =>
                          setReportForm({
                            ...reportForm,
                            projectName: e.target.value,
                          })
                        }
                      >
                        <option value="">Select Project</option>
                        {projects?.map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Subcontractor
                      </label>
                      <select
                        className="w-full text-sm border-slate-200 rounded p-2 bg-slate-50 border focus:bg-white"
                        value={reportForm.subcontractorName}
                        onChange={(e) =>
                          setReportForm({
                            ...reportForm,
                            subcontractorName: e.target.value,
                          })
                        }
                      >
                        <option value="">Select Subcontractor</option>
                        <option value="ABC Construction Ltd">
                          ABC Construction Ltd
                        </option>
                        <option value="XYZ Builders Inc">
                          XYZ Builders Inc
                        </option>
                        <option value="Global Tech Systems">
                          Global Tech Systems
                        </option>
                        <option value="Advanced Foundations Co">
                          Advanced Foundations Co
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Client Name
                      </label>
                      <select
                        className="w-full text-sm border-slate-200 rounded p-2 bg-slate-50 border focus:bg-white"
                        value={reportForm.clientName}
                        onChange={(e) =>
                          setReportForm({
                            ...reportForm,
                            clientName: e.target.value,
                          })
                        }
                      >
                        <option value="">Select Client</option>
                        <option value="Ministry of Housing">
                          Ministry of Housing
                        </option>
                        <option value="Royal Commission">
                          Royal Commission
                        </option>
                        <option value="Private Developer LLC">
                          Private Developer LLC
                        </option>
                        <option value="Aramco Facilities">
                          Aramco Facilities
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Site Manager
                      </label>
                      <input
                        type="text"
                        className="w-full text-sm border-slate-200 rounded p-2 bg-slate-50 border focus:bg-white"
                        value={reportForm.siteManagerName}
                        onChange={(e) =>
                          setReportForm({
                            ...reportForm,
                            siteManagerName: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Report Date
                      </label>
                      <input
                        type="date"
                        className="w-full text-sm border-slate-200 rounded p-2 bg-slate-50 border focus:bg-white"
                        value={reportForm.reportDate}
                        onChange={(e) =>
                          setReportForm({
                            ...reportForm,
                            reportDate: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Operational Data */}
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">
                      Operational Parameters
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Number of Workers Affected
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="w-full text-sm border-slate-200 rounded p-2"
                          value={reportForm.numberOfWorkers || ""}
                          onChange={(e) =>
                            setReportForm({
                              ...reportForm,
                              numberOfWorkers: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Daily Cost Per Worker (SAR)
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="w-full text-sm border-slate-200 rounded p-2"
                          value={reportForm.dailyCostPerWorker || ""}
                          onChange={(e) =>
                            setReportForm({
                              ...reportForm,
                              dailyCostPerWorker: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Delay Inputs */}
                  <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                    <h3 className="text-sm font-bold text-red-900 mb-3 uppercase tracking-wider">
                      Delay Impact (Days)
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-red-800 mb-1">
                          Gen. Delay
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="w-full text-sm border-red-200 rounded p-1.5 bg-white"
                          value={reportForm.totalDelayDays || ""}
                          onChange={(e) =>
                            setReportForm({
                              ...reportForm,
                              totalDelayDays: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-red-800 mb-1">
                          Work Permits
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="w-full text-sm border-red-200 rounded p-1.5 bg-white"
                          value={reportForm.workPermitDelayDays || ""}
                          onChange={(e) =>
                            setReportForm({
                              ...reportForm,
                              workPermitDelayDays: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-red-800 mb-1">
                          Safety Appr.
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="w-full text-sm border-red-200 rounded p-1.5 bg-white"
                          value={reportForm.safetyPermitDelayDays || ""}
                          onChange={(e) =>
                            setReportForm({
                              ...reportForm,
                              safetyPermitDelayDays: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-red-800 mb-1">
                          Repairs
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="w-full text-sm border-red-200 rounded p-1.5 bg-white"
                          value={reportForm.productivityLossDays || ""}
                          onChange={(e) =>
                            setReportForm({
                              ...reportForm,
                              productivityLossDays: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-red-800 mb-1">
                          Recovery
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="w-full text-sm border-red-200 rounded p-1.5 bg-white"
                          value={reportForm.additionalRecoveryDays || ""}
                          onChange={(e) =>
                            setReportForm({
                              ...reportForm,
                              additionalRecoveryDays: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Financial Recovery */}
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">
                      Additional Direct Costs
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          Mgmt Cost (SAR)
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="w-full text-sm border-slate-200 rounded p-1.5 bg-white"
                          value={reportForm.correctiveManagementCost || ""}
                          onChange={(e) =>
                            setReportForm({
                              ...reportForm,
                              correctiveManagementCost: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          Supervision (SAR)
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="w-full text-sm border-slate-200 rounded p-1.5 bg-white"
                          value={reportForm.additionalSupervisionCost || ""}
                          onChange={(e) =>
                            setReportForm({
                              ...reportForm,
                              additionalSupervisionCost: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          Prod Loss Cost (SAR)
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="w-full text-sm border-slate-200 rounded p-1.5 bg-white"
                          value={reportForm.productivityLossCost || ""}
                          onChange={(e) =>
                            setReportForm({
                              ...reportForm,
                              productivityLossCost: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Report Sections Configurator */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-slate-900 text-white p-3 rounded-lg">
                      <h3 className="text-sm font-bold uppercase tracking-widest">
                        Report Sections
                      </h3>
                      <button
                        onClick={addCustomSection}
                        className="text-xs bg-white text-slate-900 px-2 py-1 rounded font-bold hover:bg-slate-200 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>
                    {reportForm.customSections.map((sec, idx) => (
                      <div
                        key={sec.id}
                        className="border border-slate-200 p-3 rounded-xl bg-white shadow-sm relative"
                      >
                        <div className="absolute top-3 right-3 text-xs font-mono text-slate-300">
                          #{idx + 1}
                        </div>
                        <input
                          type="text"
                          value={sec.title}
                          onChange={(e) =>
                            updateSection(sec.id, "title", e.target.value)
                          }
                          className="font-bold text-sm text-slate-900 mb-2 w-[90%] outline-none border-b border-transparent focus:border-slate-300 bg-transparent"
                          placeholder="Section Title"
                        />
                        <textarea
                          value={sec.content}
                          onChange={(e) =>
                            updateSection(sec.id, "content", e.target.value)
                          }
                          className="w-full text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 h-24 focus:bg-white resize-none"
                          placeholder="Section Content..."
                        />
                        <div className="mt-2 text-right">
                          <button
                            onClick={() => deleteSection(sec.id)}
                            className="text-xs text-rose-500 hover:text-rose-700 font-bold uppercase"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview and Controls Side */}
              <div className="flex-1 flex flex-col gap-4">
                {/* Print Controls */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm shrink-0 flex flex-wrap gap-2 items-center justify-between">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    Report Actions
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={triggerPrint}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded flex items-center justify-center transition-colors"
                      title="Print Layout"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={generatePDF}
                      disabled={isGeneratingPDF}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {isGeneratingPDF ? "Generating..." : "Save PDF"}
                    </button>
                    <button
                      onClick={handleExportDocx}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                    >
                      Export DOCX
                    </button>
                  </div>
                </div>

                {/* Dashboard Summary Block */}
                <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm">
                  <h3 className="text-xs font-mono font-bold text-slate-300 mb-4 uppercase tracking-widest border-b border-slate-700 pb-2">
                    Claim Cost Assessment
                  </h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">
                        Total Impacted Days
                      </span>
                      <span className="text-xl font-bold font-mono">
                        {(
                          reportForm.workPermitDelayDays +
                          reportForm.safetyPermitDelayDays +
                          reportForm.productivityLossDays +
                          reportForm.additionalRecoveryDays +
                          reportForm.totalDelayDays
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">
                        Direct Labor Losses (SAR)
                      </span>
                      <span className="text-xl font-bold font-mono">
                        {laborCost.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">
                        Recovery & Mgmt (SAR)
                      </span>
                      <span className="text-xl font-bold font-mono">
                        {recoveryCost.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="mt-5 bg-black/30 p-4 rounded-lg flex justify-between items-center border border-slate-700">
                    <span className="text-xs uppercase font-bold text-slate-300">
                      Total Claim Valuation
                    </span>
                    <span className="text-2xl font-black text-rose-400 font-mono">
                      SAR {totalClaim.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Visual Preview Snapshot placeholder */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 relative overflow-hidden flex flex-col justify-center items-center text-center">
                  <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center mb-4">
                    <FileText className="w-6 h-6 text-slate-400" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Document Layout Ready
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-2">
                    The official report format is auto-compiled from your
                    inputs. Use the Print or PDF actions above to generate the
                    final artifact.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Hidden Print / PDF area */}
      <div
        id="claim-report-printable"
        className="hidden print:block bg-white text-slate-900 font-sans p-2 text-sm leading-normal print:p-0 print:m-0 w-full"
      >
        <div
          id="claim-pdf-canvas"
          className="w-[210mm] print:w-full min-h-[297mm] print:min-h-full p-10 print:p-8 bg-white mx-auto box-border border-b border-transparent"
        >
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
            <div className="flex gap-4 items-start">
              {company?.logo ? (
                <img
                  src={company.logo}
                  className="w-20 h-20 object-contain mb-2"
                  alt="Company Logo"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-2xl font-black tracking-widest text-slate-900">
                  CONTRACTOR
                </div>
              )}
              <div className="flex flex-col">
                <h2 className="font-black text-slate-900 uppercase tracking-tight text-lg">
                  {company?.name || reportForm.companyName}
                </h2>
                <div className="text-[10px] text-slate-600 space-y-0.5 mt-1">
                  {company?.crNumber && (
                    <p>
                      <span className="font-bold text-slate-800">CR No:</span>{" "}
                      {company.crNumber}
                    </p>
                  )}
                  {company?.vatNumber && (
                    <p>
                      <span className="font-bold text-slate-800">VAT No:</span>{" "}
                      {company.vatNumber}
                    </p>
                  )}
                  {company?.headquarters && <p>{company.headquarters}</p>}
                </div>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="text-[10px] text-slate-600 text-right mb-3">
                {company?.email && <p>{company.email}</p>}
                {company?.phone && <p>{company.phone}</p>}
                {company?.website && <p>{company.website}</p>}
              </div>
              <div className="bg-slate-100 px-3 py-1 text-slate-900 font-mono text-xs font-bold mb-1 block rounded border border-slate-200">
                Ref: {reportForm.claimNumber}
              </div>
              <p className="text-xs font-bold text-slate-500">
                Date:{" "}
                <span className="text-slate-900">{reportForm.reportDate}</span>
              </p>
            </div>
          </div>

          {/* Title Area */}
          <div className="mb-6 text-center">
            <h1 className="text-slate-900 font-black uppercase text-xl md:text-2xl tracking-tight">
              Official Claim Document
            </h1>
            <h2 className="text-slate-600 font-bold text-sm tracking-wider uppercase mt-1">
              Non-Performance & Mismanagement Report
            </h2>
          </div>

          {/* Details block */}
          <div
            className="bg-slate-50 p-6 rounded border border-slate-200 mb-8 grid grid-cols-2 gap-y-4 gap-x-8 text-sm print:break-inside-avoid"
            style={{
              WebkitPrintColorAdjust: "exact",
              printColorAdjust: "exact",
            }}
          >
            <div>
              <span className="font-bold text-slate-600 text-xs block uppercase mb-1">
                To (Client/PM):
              </span>{" "}
              <span className="font-bold text-slate-900">
                {reportForm.clientName || "[Client Not Provided]"}
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-600 text-xs block uppercase mb-1">
                Company:
              </span>{" "}
              <span className="font-bold text-slate-900">
                {reportForm.companyName || "[Company Not Provided]"}
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-600 text-xs block uppercase mb-1">
                Project:
              </span>{" "}
              <span className="font-bold text-slate-900">
                {reportForm.projectName || "[Project Name]"}
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-600 text-xs block uppercase mb-1">
                Target Contractor:
              </span>{" "}
              <span className="font-bold text-slate-900">
                {reportForm.subcontractorName || "[Contractor Name]"}
              </span>
            </div>
          </div>

          {/* Dynamic Paragraph Sections */}
          <div className="space-y-6 mb-8 text-justify">
            {reportForm.customSections.map((sec, i) => (
              <div
                key={sec.id}
                className="print:break-inside-avoid"
                style={{ pageBreakInside: "avoid", breakInside: "avoid" }}
              >
                <h3 className="font-bold text-sm uppercase tracking-widest text-slate-900 mb-2 border-b-2 border-red-600 pb-1">
                  {i + 1}.0 {sec.title}
                </h3>
                <p
                  className="text-slate-700 text-sm leading-relaxed"
                  style={{ pageBreakInside: "avoid", breakInside: "avoid" }}
                >
                  {sec.content}
                </p>
              </div>
            ))}
          </div>

          {/* Financials & Table */}
          <div className="print:break-inside-avoid">
            <h3 className="font-bold text-sm uppercase tracking-widest text-slate-800 mb-4 border-b-2 border-red-600 pb-2">
              Financial Impact & Cost Recovery Assessment
            </h3>
            <table className="w-full text-left border-collapse border border-slate-300 text-sm mb-12">
              <thead>
                <tr
                  className="bg-slate-100 text-slate-900 !print:bg-gray-50 !print:text-black border-b-2 border-slate-300"
                  style={{
                    WebkitPrintColorAdjust: "exact",
                    printColorAdjust: "exact",
                  }}
                >
                  <th className="p-3 border-r border-slate-300 font-bold uppercase text-xs">
                    Cost Line Item
                  </th>
                  <th className="p-3 border-r border-slate-300 font-bold uppercase text-xs text-right w-32">
                    Calculation (Days)
                  </th>
                  <th className="p-3 font-bold uppercase text-xs text-right w-40">
                    Financial Value (SAR)
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="p-3 border-r border-slate-200">
                    General Time Delays
                  </td>
                  <td className="p-3 border-r border-slate-200 text-right font-medium">
                    {reportForm.totalDelayDays}
                  </td>
                  <td className="p-3 text-right font-medium">
                    SAR{" "}
                    {(
                      reportForm.totalDelayDays *
                      reportForm.numberOfWorkers *
                      reportForm.dailyCostPerWorker
                    ).toLocaleString()}
                  </td>
                </tr>
                <tr
                  className="border-b border-slate-200 bg-slate-50/50 !print:bg-white"
                  style={{
                    WebkitPrintColorAdjust: "exact",
                    printColorAdjust: "exact",
                  }}
                >
                  <td className="p-3 border-r border-slate-200">
                    Work Permit Delays
                  </td>
                  <td className="p-3 border-r border-slate-200 text-right font-medium">
                    {reportForm.workPermitDelayDays}
                  </td>
                  <td className="p-3 text-right font-medium">
                    SAR{" "}
                    {(
                      reportForm.workPermitDelayDays *
                      reportForm.numberOfWorkers *
                      reportForm.dailyCostPerWorker
                    ).toLocaleString()}
                  </td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-3 border-r border-slate-200">
                    Safety Permit Delays
                  </td>
                  <td className="p-3 border-r border-slate-200 text-right font-medium">
                    {reportForm.safetyPermitDelayDays}
                  </td>
                  <td className="p-3 text-right font-medium">
                    SAR{" "}
                    {(
                      reportForm.safetyPermitDelayDays *
                      reportForm.numberOfWorkers *
                      reportForm.dailyCostPerWorker
                    ).toLocaleString()}
                  </td>
                </tr>
                <tr
                  className="border-b border-slate-200 bg-slate-50/50 !print:bg-white"
                  style={{
                    WebkitPrintColorAdjust: "exact",
                    printColorAdjust: "exact",
                  }}
                >
                  <td className="p-3 border-r border-slate-200">
                    Repairs (Errors & Non Inspect)
                  </td>
                  <td className="p-3 border-r border-slate-200 text-right font-medium">
                    {reportForm.productivityLossDays}
                  </td>
                  <td className="p-3 text-right font-medium">
                    SAR{" "}
                    {(
                      reportForm.productivityLossDays *
                      reportForm.numberOfWorkers *
                      reportForm.dailyCostPerWorker
                    ).toLocaleString()}
                  </td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="p-3 border-r border-slate-300">
                    Additional Recovery Time
                  </td>
                  <td className="p-3 border-r border-slate-300 text-right font-medium">
                    {reportForm.additionalRecoveryDays}
                  </td>
                  <td className="p-3 text-right font-medium">
                    SAR{" "}
                    {(
                      reportForm.additionalRecoveryDays *
                      reportForm.numberOfWorkers *
                      reportForm.dailyCostPerWorker
                    ).toLocaleString()}
                  </td>
                </tr>
                <tr
                  className="bg-slate-100 font-bold border-b border-slate-300 !print:bg-gray-50 !print:text-black"
                  style={{
                    WebkitPrintColorAdjust: "exact",
                    printColorAdjust: "exact",
                  }}
                >
                  <td className="p-3 text-slate-800 text-right pr-6 border-r border-slate-300">
                    Subtotal Operational Direct Labor Losses{" "}
                    <span className="text-[10px] font-normal text-slate-500 ml-2">
                      [{reportForm.numberOfWorkers} workers @ SAR{" "}
                      {reportForm.dailyCostPerWorker}/day]
                    </span>
                  </td>
                  <td className="p-3 text-right text-slate-800 border-r border-slate-300">
                    {reportForm.workPermitDelayDays +
                      reportForm.safetyPermitDelayDays +
                      reportForm.totalDelayDays +
                      reportForm.productivityLossDays +
                      reportForm.additionalRecoveryDays}
                  </td>
                  <td className="p-3 text-right text-slate-900">
                    SAR {laborCost.toLocaleString()}
                  </td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td
                    colSpan={2}
                    className="p-3 text-right pr-6 text-slate-700 border-r border-slate-200"
                  >
                    Corrective Management Costs
                  </td>
                  <td className="p-3 text-right font-medium">
                    SAR {reportForm.correctiveManagementCost.toLocaleString()}
                  </td>
                </tr>
                <tr
                  className="border-b border-slate-200 bg-slate-50/50 !print:bg-white"
                  style={{
                    WebkitPrintColorAdjust: "exact",
                    printColorAdjust: "exact",
                  }}
                >
                  <td
                    colSpan={2}
                    className="p-3 text-right pr-6 text-slate-700 border-r border-slate-200"
                  >
                    Additional Field Supervision
                  </td>
                  <td className="p-3 text-right font-medium">
                    SAR {reportForm.additionalSupervisionCost.toLocaleString()}
                  </td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td
                    colSpan={2}
                    className="p-3 text-right pr-6 text-slate-700 border-r border-slate-300"
                  >
                    Calculated Standby & Yield Impact
                  </td>
                  <td className="p-3 text-right font-medium">
                    SAR {reportForm.productivityLossCost.toLocaleString()}
                  </td>
                </tr>
                <tr
                  className="bg-red-700 text-white font-bold !print:bg-red-700 !print:text-white"
                  style={{
                    WebkitPrintColorAdjust: "exact",
                    printColorAdjust: "exact",
                  }}
                >
                  <td
                    colSpan={2}
                    className="p-4 text-right uppercase tracking-wider text-sm border-r border-red-800 !print:border-red-800"
                  >
                    Total Claim Valuation for Recovery
                  </td>
                  <td className="p-4 text-right font-mono text-base">
                    SAR {totalClaim.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer Signature */}
          <div className="pt-20 grid grid-cols-2 gap-20 print:break-inside-avoid">
            <div>
              <div className="border-b-2 border-red-600 w-full mb-2"></div>
              <p className="font-bold text-xs uppercase text-slate-900 tracking-wider">
                Authorized Assessor
              </p>
              <p className="text-xs text-slate-600">
                {reportForm.siteManagerName || "_________________________"}
              </p>
              <p className="text-xs text-slate-500 italic mt-1">
                {reportForm.positionTitle || "System Operations"}
              </p>
            </div>
            <div>
              <div className="border-b-2 border-red-600 w-full mb-2"></div>
              <p className="font-bold text-xs uppercase text-slate-900 tracking-wider">
                Verification Stamp & Signature
              </p>
              <p className="text-[10px] text-slate-400 font-mono mt-1">
                Generated by ARES Operations Engine
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                Timestamp: {new Date().toISOString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
