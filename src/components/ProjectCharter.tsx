import React, { useState, useRef, useEffect } from "react";
import { useFirestoreCollection } from "../hooks/useFirestore";
import {
  Download,
  Plus,
  Save,
  Trash2,
  Edit2,
  Copy,
  FileText,
  Check,
  FileDown,
  Printer,
  FileOutput,
  GripVertical,
} from "lucide-react";
import { Project } from "../types";
import { Language } from "../lib/translations";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { fixHtml2CanvasOklch } from "../lib/pdfUtils";

interface ProjectCharterProps {
  language: Language;
  projects?: Project[];
  company?: any;
}

interface Milestone {
  id: string;
  name: string;
  start: string;
  finish: string;
}

interface CharterData {
  id: string;
  projectName: string;
  projectManager: string;
  projectSponsor: string;
  email: string;
  phone: string;
  organizationalUnit: string;
  estimatedCosts: number;
  expectedSaving: number;
  expectedStartDate: string;
  expectedCompletion: string;
  problemOrIssue: string;
  purposeOfProject: string;
  businessCase: string;
  goalsMetrics: string;
  expectedDeliverables: string;
  withinScope: string;
  outsideOfScope: string;
  milestones: Milestone[];
  status: "Draft" | "Submitted" | "Approved";
  createdAt: string;
}

const emptyCharter: CharterData = {
  id: "",
  projectName: "",
  projectManager: "",
  projectSponsor: "",
  email: "",
  phone: "",
  organizationalUnit: "",
  estimatedCosts: 0,
  expectedSaving: 0,
  expectedStartDate: "",
  expectedCompletion: "",
  problemOrIssue: "",
  purposeOfProject: "",
  businessCase: "",
  goalsMetrics: "",
  expectedDeliverables: "",
  withinScope: "",
  outsideOfScope: "",
  milestones: [
    { id: "1", name: "Project Kickoff", start: "", finish: "" },
    { id: "2", name: "System Development Start", start: "", finish: "" },
    { id: "3", name: "User Training", start: "", finish: "" },
    { id: "4", name: "System Testing", start: "", finish: "" },
    { id: "5", name: "Implementation", start: "", finish: "" },
    { id: "6", name: "Post-Implementation Review", start: "", finish: "" },
  ],
  status: "Draft",
  createdAt: new Date().toISOString(),
};

export const ProjectCharter: React.FC<ProjectCharterProps> = ({
  language,
  projects,
  company,
}) => {
  const [charters, setCharters] = useFirestoreCollection<CharterData>('project_charters', []);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<CharterData>(emptyCharter);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const saveToLocal = (data: CharterData[]) => {
    setCharters(data);
  };

  const handleNew = () => {
    setFormData({ ...emptyCharter, id: `charter-${Date.now()}` });
    setIsFormOpen(true);
  };

  const handleSave = () => {
    if (!formData.projectName) {
      alert("Please enter a project name.");
      return;
    }
    const updated = charters.filter((c) => c.id !== formData.id);
    updated.push(formData);
    saveToLocal(updated);
    setIsFormOpen(false);
  };

  const handleEdit = (c: CharterData) => {
    setFormData(c);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Delete this charter?")) {
      saveToLocal(charters.filter((c) => c.id !== id));
    }
  };

  const handleDuplicate = (c: CharterData, e: React.MouseEvent) => {
    e.stopPropagation();
    const dupe = {
      ...c,
      id: `charter-${Date.now()}`,
      projectName: c.projectName + " (Copy)",
      status: "Draft" as const,
    };
    saveToLocal([...charters, dupe]);
  };

  const addMilestone = () => {
    setFormData((prev) => ({
      ...prev,
      milestones: [
        ...prev.milestones,
        {
          id: Date.now().toString(),
          name: "New Milestone",
          start: "",
          finish: "",
        },
      ],
    }));
  };

  const updateMilestone = (
    id: string,
    field: keyof Milestone,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      milestones: prev.milestones.map((m) =>
        m.id === id ? { ...m, [field]: value } : m,
      ),
    }));
  };

  const deleteMilestone = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      milestones: prev.milestones.filter((m) => m.id !== id),
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const pContainer = document.getElementById("project-charter-printable");
      if (pContainer) {
        pContainer.classList.remove("hidden");
        pContainer.classList.remove("print:block");
        pContainer.style.position = "absolute";
        pContainer.style.left = "-9999px";
        pContainer.style.top = "-9999px";
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
      const element = document.getElementById("charter-pdf-canvas");
      if (!element) throw new Error("PDF element not found");

      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true,
        onclone: (clonedDoc) => {
          fixHtml2CanvasOklch(clonedDoc);
        }
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);

      const pdf = new jsPDF("p", "pt", "a4");
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

      pdf.save(`${formData.projectName}_Project_Charter.pdf`);
    } catch (err) {
      console.error(err);
      alert("Error generating PDF");
    } finally {
      setIsGeneratingPDF(false);
      const pContainer = document.getElementById("project-charter-printable");
      if (pContainer) {
        pContainer.classList.add("hidden");
        pContainer.classList.add("print:block");
        pContainer.style.position = "";
        pContainer.style.left = "";
        pContainer.style.top = "";
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full print:h-auto bg-slate-50 print:bg-white print:overflow-visible">
      {/* Header */}
      <header className="bg-white px-6 py-4 border-b border-slate-200 shrink-0 print:hidden">
        <div className="flex justify-between items-center max-w-7xl mx-auto w-full">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-600" />
              Project Charters
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Manage and export project initiation documents.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isFormOpen && (
              <>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm flex items-center gap-2 shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button
                  onClick={generatePDF}
                  disabled={isGeneratingPDF}
                  className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors font-medium text-sm flex items-center gap-2 shadow-sm"
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
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm flex items-center gap-2 shadow-sm"
                >
                  <Save className="w-4 h-4" /> Save
                </button>
              </>
            )}
            {!isFormOpen && (
              <button
                onClick={handleNew}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" /> New Charter
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content View Container */}
      <main className="flex-1 overflow-auto print:overflow-visible print:p-0">
        <div className="max-w-7xl mx-auto w-full p-6 print:hidden">
          {!isFormOpen ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {charters.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-white border border-slate-200 rounded-xl border-dashed">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-slate-900 mb-1">
                    No Project Charters
                  </h3>
                  <p className="text-slate-500 text-sm mb-4">
                    Create your first charter to get started.
                  </p>
                  <button
                    onClick={handleNew}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm inline-flex items-center gap-2 shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> New Charter
                  </button>
                </div>
              ) : (
                charters.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col"
                  >
                    <div className="p-5 flex-1">
                      <div className="flex justify-between items-start mb-4">
                        <div className="text-xs font-mono font-bold text-slate-500 bg-slate-100 py-1 px-2 rounded">
                          Charter
                        </div>
                        <div className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded flex items-center gap-1 bg-slate-100 text-slate-700">
                          {c.status}
                        </div>
                      </div>
                      <h3 className="font-bold text-slate-900 truncate mb-1">
                        {c.projectName || "Untitled Project"}
                      </h3>
                      <p className="text-sm text-slate-600 truncate mb-4">
                        {c.projectManager || "Unknown PM"}
                      </p>

                      <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-slate-400">
                            Total Est. Cost
                          </p>
                          <p className="text-sm font-bold text-slate-900">
                            ${c.estimatedCosts.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Date created</p>
                          <p className="text-sm font-bold text-slate-900">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
                      <button
                        onClick={(e) => handleDuplicate(c, e)}
                        className="p-2 text-slate-500 hover:bg-white hover:text-indigo-600 rounded transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(c.id, e)}
                        className="p-2 text-slate-500 hover:bg-white hover:text-red-600 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(c)}
                        className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700 transition-colors flex justify-center items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" /> Edit / View
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start pb-20">
              {/* Form Sidebar */}
              <div className="xl:col-span-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" /> Edit
                    Details
                  </h3>
                </div>
                <div className="p-4 overflow-y-auto flex-1 space-y-6 text-sm flex flex-col">
                  {/* General Details */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b pb-1">
                      General Info
                    </h4>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Project Name
                      </label>
                      <select
                        className="w-full text-sm border-slate-200 rounded p-2 bg-slate-50 border focus:bg-white"
                        value={formData.projectName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
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
                        <option value="Enhancement of Customer Relationship Management (CRM) System">
                          Enhancement of CRM System
                        </option>
                        <option value="New Corporate HQ Construction">
                          New Corporate HQ Construction
                        </option>
                      </select>
                      {formData.projectName &&
                        !projects?.find(
                          (p) => p.name === formData.projectName,
                        ) && (
                          <input
                            type="text"
                            className="w-full text-sm border-slate-200 rounded p-2 bg-white mt-1 border"
                            placeholder="Or type project name..."
                            value={formData.projectName}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                projectName: e.target.value,
                              })
                            }
                          />
                        )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Project Manager
                      </label>
                      <input
                        type="text"
                        className="w-full text-sm border-slate-200 rounded p-2 bg-slate-50 border focus:bg-white"
                        value={formData.projectManager}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            projectManager: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Project Sponsor
                      </label>
                      <input
                        type="text"
                        className="w-full text-sm border-slate-200 rounded p-2 bg-slate-50 border focus:bg-white"
                        value={formData.projectSponsor}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            projectSponsor: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        className="w-full text-sm border-slate-200 rounded p-2 bg-slate-50 border focus:bg-white"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="text"
                        className="w-full text-sm border-slate-200 rounded p-2 bg-slate-50 border focus:bg-white"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Organizational Unit
                      </label>
                      <input
                        type="text"
                        className="w-full text-sm border-slate-200 rounded p-2 bg-slate-50 border focus:bg-white"
                        value={formData.organizationalUnit}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            organizationalUnit: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Financial & Time */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b pb-1">
                      Estimates
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Est. Costs ($)
                        </label>
                        <input
                          type="number"
                          className="w-full text-sm border-slate-200 rounded p-2 bg-slate-50 border focus:bg-white"
                          value={formData.estimatedCosts || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              estimatedCosts: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Exp. Saving ($)
                        </label>
                        <input
                          type="number"
                          className="w-full text-sm border-slate-200 rounded p-2 bg-slate-50 border focus:bg-white"
                          value={formData.expectedSaving || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              expectedSaving: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          className="w-full text-sm border-slate-200 rounded p-2 bg-slate-50 border focus:bg-white"
                          value={formData.expectedStartDate}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              expectedStartDate: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Completion
                        </label>
                        <input
                          type="date"
                          className="w-full text-sm border-slate-200 rounded p-2 bg-slate-50 border focus:bg-white"
                          value={formData.expectedCompletion}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              expectedCompletion: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Overview Data */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b pb-1">
                      Overview text
                    </h4>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Problem or Issue
                      </label>
                      <textarea
                        rows={3}
                        className="w-full text-sm border-slate-200 rounded p-2 bg-slate-50 border focus:bg-white"
                        value={formData.problemOrIssue}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            problemOrIssue: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Purpose of Project
                      </label>
                      <textarea
                        rows={3}
                        className="w-full text-sm border-slate-200 rounded p-2 bg-slate-50 border focus:bg-white"
                        value={formData.purposeOfProject}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            purposeOfProject: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Business Case
                      </label>
                      <textarea
                        rows={5}
                        className="w-full text-sm border-slate-200 rounded p-2 bg-slate-50 border focus:bg-white"
                        value={formData.businessCase}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            businessCase: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Goals / Metrics
                      </label>
                      <textarea
                        rows={4}
                        className="w-full text-sm border-slate-200 rounded p-2 bg-slate-50 border focus:bg-white"
                        value={formData.goalsMetrics}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            goalsMetrics: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Expected Deliverables
                      </label>
                      <textarea
                        rows={3}
                        className="w-full text-sm border-slate-200 rounded p-2 bg-slate-50 border focus:bg-white"
                        value={formData.expectedDeliverables}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            expectedDeliverables: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Scope */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b pb-1">
                      Project Scope
                    </h4>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Within Scope
                      </label>
                      <textarea
                        rows={3}
                        className="w-full text-sm border-slate-200 rounded p-2 bg-slate-50 border focus:bg-white"
                        value={formData.withinScope}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            withinScope: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Outside of Scope
                      </label>
                      <textarea
                        rows={3}
                        className="w-full text-sm border-slate-200 rounded p-2 bg-slate-50 border focus:bg-white"
                        value={formData.outsideOfScope}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            outsideOfScope: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Milestones */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-end border-b pb-1">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                        Tentative Schedule
                      </h4>
                      <button
                        onClick={addMilestone}
                        className="text-xs text-indigo-600 font-bold hover:underline"
                      >
                        Add Milestone
                      </button>
                    </div>
                    {formData.milestones.map((m, idx) => (
                      <div
                        key={m.id}
                        className="border border-slate-200 p-2 rounded bg-slate-50 space-y-2"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400">
                            #{idx + 1}
                          </span>
                          <button
                            onClick={() => deleteMilestone(m.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Milestone Name"
                          className="w-full text-xs border-slate-200 rounded p-1 mb-1"
                          value={m.name}
                          onChange={(e) =>
                            updateMilestone(m.id, "name", e.target.value)
                          }
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Start Date"
                            className="w-full text-xs border-slate-200 rounded p-1"
                            value={m.start}
                            onChange={(e) =>
                              updateMilestone(m.id, "start", e.target.value)
                            }
                          />
                          <input
                            type="text"
                            placeholder="Finish Date"
                            className="w-full text-xs border-slate-200 rounded p-1"
                            value={m.finish}
                            onChange={(e) =>
                              updateMilestone(m.id, "finish", e.target.value)
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview Document */}
              <div className="xl:col-span-3 bg-slate-200 p-4 rounded-xl max-h-[80vh] overflow-auto flex justify-center shadow-inner">
                <div className="bg-white min-h-[1056px] w-[816px] shadow-lg flex-shrink-0 relative overflow-hidden text-[#1e293b] font-sans">
                  {/* The visual charter starts here */}
                  <div className="p-10 pt-12 space-y-6">
                    <div className="mb-8">
                      <h1 className="text-[32px] font-black text-[#1e1b4b] uppercase tracking-wide leading-none">
                        Project Charter
                      </h1>
                    </div>

                    <div className="flex flex-col border-b border-[#c7d2fe]">
                      {/* Top Header Row */}
                      <div className="flex text-[10px] font-bold text-[#1e1b4b] uppercase tracking-wider mb-1">
                        <div className="flex-[2] ml-1">Project Name</div>
                        <div className="flex-1 ml-1">Project Manager</div>
                        <div className="flex-1 ml-1">Project Sponsor</div>
                      </div>
                      <div className="flex bg-[#eff6ff] border border-[#c7d2fe] h-10 divide-x divide-[#c7d2fe] text-sm">
                        <div className="flex-[2] px-3 flex items-center">
                          {formData.projectName}
                        </div>
                        <div className="flex-1 flex justify-center items-center">
                          {formData.projectManager}
                        </div>
                        <div className="flex-1 flex justify-center items-center">
                          {formData.projectSponsor}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col border-b border-[#c7d2fe]">
                      <div className="flex text-[10px] font-bold text-[#1e1b4b] uppercase tracking-wider mb-1 mt-4">
                        <div className="flex-1 ml-1">Email</div>
                        <div className="flex-1 ml-1">Phone</div>
                        <div className="flex-[2] ml-1">Organizational Unit</div>
                      </div>
                      <div className="flex bg-[#eff6ff] border border-[#c7d2fe] h-10 divide-x divide-[#c7d2fe] text-sm">
                        <div className="flex-1 px-3 flex items-center">
                          {formData.email}
                        </div>
                        <div className="flex-1 flex justify-center items-center">
                          {formData.phone}
                        </div>
                        <div className="flex-[2] flex justify-center items-center">
                          {formData.organizationalUnit}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col border-b border-[#c7d2fe]">
                      <div className="flex text-[10px] font-bold text-[#1e1b4b] uppercase tracking-wider mb-1 mt-4">
                        <div className="flex-1 ml-1">Estimated Costs</div>
                        <div className="flex-1 ml-1">Expected Saving</div>
                        <div className="flex-1 ml-1">Expected Start Date</div>
                        <div className="flex-1 ml-1">Expected Completion</div>
                      </div>
                      <div className="flex bg-[#eff6ff] border border-[#c7d2fe] h-10 divide-x divide-[#c7d2fe] text-sm">
                        <div className="flex-1 px-3 flex items-center">
                          <span className="text-slate-400 mr-auto">$</span>{" "}
                          {formData.estimatedCosts.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                        <div className="flex-1 px-3 flex items-center">
                          <span className="text-slate-400 mr-auto">$</span>{" "}
                          {formData.expectedSaving.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                        <div className="flex-1 flex justify-center items-center">
                          {formData.expectedStartDate}
                        </div>
                        <div className="flex-1 flex justify-center items-center">
                          {formData.expectedCompletion}
                        </div>
                      </div>
                    </div>

                    {/* Project Overview */}
                    <div className="pt-4">
                      <h2 className="text-lg font-bold text-[#1e1b4b] uppercase tracking-wider mb-3">
                        Project Overview
                      </h2>
                      <div className="border border-[#c7d2fe] divide-y divide-[#c7d2fe] text-[13px] leading-snug">
                        <div className="flex">
                          <div className="w-48 font-bold text-[#1e1b4b] uppercase text-[11px] p-3 flex items-center shrink-0 border-r border-[#c7d2fe]">
                            Problem or Issue
                          </div>
                          <div className="p-3 whitespace-pre-wrap">
                            {formData.problemOrIssue}
                          </div>
                        </div>
                        <div className="flex">
                          <div className="w-48 font-bold text-[#1e1b4b] uppercase text-[11px] p-3 flex items-center shrink-0 border-r border-[#c7d2fe]">
                            Purpose of Project
                          </div>
                          <div className="p-3 whitespace-pre-wrap">
                            {formData.purposeOfProject}
                          </div>
                        </div>
                        <div className="flex">
                          <div className="w-48 font-bold text-[#1e1b4b] uppercase text-[11px] p-3 shrink-0 border-r border-[#c7d2fe]">
                            Business Case
                          </div>
                          <div className="p-3 whitespace-pre-wrap">
                            {formData.businessCase}
                          </div>
                        </div>
                        <div className="flex">
                          <div className="w-48 font-bold text-[#1e1b4b] uppercase text-[11px] p-3 shrink-0 border-r border-[#c7d2fe]">
                            Goals / Metrics
                          </div>
                          <div className="p-3 whitespace-pre-wrap">
                            {formData.goalsMetrics}
                          </div>
                        </div>
                        <div className="flex">
                          <div className="w-48 font-bold text-[#1e1b4b] uppercase text-[11px] p-3 shrink-0 border-r border-[#c7d2fe]">
                            Expected Deliverables
                          </div>
                          <div className="p-3 whitespace-pre-wrap">
                            {formData.expectedDeliverables}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Project Scope */}
                    <div className="pt-2">
                      <h2 className="text-lg font-bold text-[#1e1b4b] uppercase tracking-wider mb-3">
                        Project Scope
                      </h2>
                      <div className="border border-[#c7d2fe] divide-y divide-[#c7d2fe] text-[13px] leading-snug">
                        <div className="flex">
                          <div className="w-48 font-bold text-[#1e1b4b] uppercase text-[11px] p-3 shrink-0 border-r border-[#c7d2fe]">
                            Within Scope
                          </div>
                          <div className="p-3 flex-1 flex items-center whitespace-pre-wrap">
                            {formData.withinScope}
                          </div>
                        </div>
                        <div className="flex">
                          <div className="w-48 font-bold text-[#1e1b4b] uppercase text-[11px] p-3 shrink-0 border-r border-[#c7d2fe]">
                            Outside of Scope
                          </div>
                          <div className="p-3 flex-1 flex items-center whitespace-pre-wrap">
                            {formData.outsideOfScope}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tentative Schedule */}
                    <div className="pt-2">
                      <h2 className="text-lg font-bold text-[#1e1b4b] uppercase tracking-wider mb-3">
                        Tentative Schedule
                      </h2>
                      <div className="border border-[#c7d2fe] overflow-hidden text-[13px]">
                        <table className="w-full text-center">
                          <thead>
                            <tr className="bg-[#eff6ff] border-b border-[#c7d2fe]">
                              <th className="py-2 px-3 text-left w-1/2 text-[11px] font-bold text-[#1e1b4b] uppercase">
                                Key Milestone
                              </th>
                              <th className="py-2 px-3 text-[11px] font-bold text-[#1e1b4b] uppercase border-l border-[#c7d2fe]">
                                Start
                              </th>
                              <th className="py-2 px-3 text-[11px] font-bold text-[#1e1b4b] uppercase border-l border-[#c7d2fe]">
                                Finish
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#c7d2fe]">
                            {formData.milestones.map((m, i) => (
                              <tr key={m.id}>
                                <td className="py-2 px-3 text-left">
                                  {m.name}
                                </td>
                                <td className="py-2 px-3 border-l border-[#c7d2fe] min-w-[120px]">
                                  {m.start || "-"}
                                </td>
                                <td className="py-2 px-3 border-l border-[#c7d2fe] min-w-[120px]">
                                  {m.finish || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Hidden PDF Printable Container */}
      <div
        id="project-charter-printable"
        className="hidden print:block bg-white print:p-0 print:m-0 w-full"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        <div
          id="charter-pdf-canvas"
          className="w-[850px] min-h-[1100px] print:w-full print:min-h-full p-10 bg-white mx-auto box-border text-[#1e293b] print:break-inside-avoid"
        >
          {/* Exact structure as the preview, optimized for printing */}
          <div className="bg-white space-y-6 print:break-inside-avoid">
            <div className="mb-8">
              <h1 className="text-[32px] font-black text-[#1e1b4b] uppercase tracking-wide leading-none">
                Project Charter
              </h1>
            </div>

            <div className="flex flex-col border-b border-[#c7d2fe]">
              <div className="flex text-[10px] font-bold text-[#1e1b4b] uppercase tracking-wider mb-1">
                <div className="flex-[2] ml-1">Project Name</div>
                <div className="flex-1 ml-1">Project Manager</div>
                <div className="flex-1 ml-1">Project Sponsor</div>
              </div>
              <div
                className="flex bg-[#eff6ff] !print:bg-[#eff6ff] border border-[#c7d2fe] min-h-[40px] divide-x divide-[#c7d2fe] text-sm"
                style={{
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              >
                <div className="flex-[2] px-3 py-2 flex items-center">
                  {formData.projectName}
                </div>
                <div className="flex-1 px-3 py-2 flex justify-center items-center">
                  {formData.projectManager}
                </div>
                <div className="flex-1 px-3 py-2 flex justify-center items-center">
                  {formData.projectSponsor}
                </div>
              </div>
            </div>

            <div className="flex flex-col border-b border-[#c7d2fe]">
              <div className="flex text-[10px] font-bold text-[#1e1b4b] uppercase tracking-wider mb-1 mt-4">
                <div className="flex-1 ml-1">Email</div>
                <div className="flex-1 ml-1">Phone</div>
                <div className="flex-[2] ml-1">Organizational Unit</div>
              </div>
              <div
                className="flex bg-[#eff6ff] !print:bg-[#eff6ff] border border-[#c7d2fe] min-h-[40px] divide-x divide-[#c7d2fe] text-sm"
                style={{
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              >
                <div className="flex-1 px-3 py-2 flex justify-center items-center">
                  {formData.email}
                </div>
                <div className="flex-1 px-3 py-2 flex justify-center items-center">
                  {formData.phone}
                </div>
                <div className="flex-[2] px-3 py-2 flex justify-center items-center">
                  {formData.organizationalUnit}
                </div>
              </div>
            </div>

            <div className="flex flex-col border-b border-[#c7d2fe]">
              <div className="flex text-[10px] font-bold text-[#1e1b4b] uppercase tracking-wider mb-1 mt-4">
                <div className="flex-1 ml-1">Estimated Costs</div>
                <div className="flex-1 ml-1">Expected Saving</div>
                <div className="flex-1 ml-1">Expected Start Date</div>
                <div className="flex-1 ml-1">Expected Completion</div>
              </div>
              <div
                className="flex bg-[#eff6ff] !print:bg-[#eff6ff] border border-[#c7d2fe] min-h-[40px] divide-x divide-[#c7d2fe] text-sm"
                style={{
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              >
                <div className="flex-1 px-3 py-2 flex items-center">
                  <span className="text-slate-400 mr-auto">$</span>{" "}
                  {formData.estimatedCosts.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <div className="flex-1 px-3 py-2 flex items-center">
                  <span className="text-slate-400 mr-auto">$</span>{" "}
                  {formData.expectedSaving.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <div className="flex-1 px-3 py-2 flex justify-center items-center">
                  {formData.expectedStartDate}
                </div>
                <div className="flex-1 px-3 py-2 flex justify-center items-center">
                  {formData.expectedCompletion}
                </div>
              </div>
            </div>

            <div className="pt-4">
              <h2 className="text-lg font-bold text-[#1e1b4b] uppercase tracking-wider mb-3">
                Project Overview
              </h2>
              <div className="border border-[#c7d2fe] divide-y divide-[#c7d2fe] text-[13px] leading-snug">
                <div className="flex print:break-inside-avoid">
                  <div className="w-48 font-bold text-[#1e1b4b] uppercase text-[11px] p-3 flex items-center shrink-0 border-r border-[#c7d2fe]">
                    Problem or Issue
                  </div>
                  <div className="p-3 whitespace-pre-wrap">
                    {formData.problemOrIssue}
                  </div>
                </div>
                <div className="flex print:break-inside-avoid">
                  <div className="w-48 font-bold text-[#1e1b4b] uppercase text-[11px] p-3 flex items-center shrink-0 border-r border-[#c7d2fe]">
                    Purpose of Project
                  </div>
                  <div className="p-3 whitespace-pre-wrap">
                    {formData.purposeOfProject}
                  </div>
                </div>
                <div className="flex print:break-inside-avoid">
                  <div className="w-48 font-bold text-[#1e1b4b] uppercase text-[11px] p-3 shrink-0 border-r border-[#c7d2fe]">
                    Business Case
                  </div>
                  <div className="p-3 whitespace-pre-wrap">
                    {formData.businessCase}
                  </div>
                </div>
                <div className="flex print:break-inside-avoid">
                  <div className="w-48 font-bold text-[#1e1b4b] uppercase text-[11px] p-3 shrink-0 border-r border-[#c7d2fe]">
                    Goals / Metrics
                  </div>
                  <div className="p-3 whitespace-pre-wrap">
                    {formData.goalsMetrics}
                  </div>
                </div>
                <div className="flex print:break-inside-avoid">
                  <div className="w-48 font-bold text-[#1e1b4b] uppercase text-[11px] p-3 shrink-0 border-r border-[#c7d2fe]">
                    Expected Deliverables
                  </div>
                  <div className="p-3 whitespace-pre-wrap">
                    {formData.expectedDeliverables}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <h2 className="text-lg font-bold text-[#1e1b4b] uppercase tracking-wider mb-3">
                Project Scope
              </h2>
              <div className="border border-[#c7d2fe] divide-y divide-[#c7d2fe] text-[13px] leading-snug">
                <div className="flex print:break-inside-avoid">
                  <div className="w-48 font-bold text-[#1e1b4b] uppercase text-[11px] p-3 shrink-0 border-r border-[#c7d2fe]">
                    Within Scope
                  </div>
                  <div className="p-3 flex-1 flex items-center whitespace-pre-wrap">
                    {formData.withinScope}
                  </div>
                </div>
                <div className="flex print:break-inside-avoid">
                  <div className="w-48 font-bold text-[#1e1b4b] uppercase text-[11px] p-3 shrink-0 border-r border-[#c7d2fe]">
                    Outside of Scope
                  </div>
                  <div className="p-3 flex-1 flex items-center whitespace-pre-wrap">
                    {formData.outsideOfScope}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 print:break-inside-avoid">
              <h2 className="text-lg font-bold text-[#1e1b4b] uppercase tracking-wider mb-3">
                Tentative Schedule
              </h2>
              <div className="border border-[#c7d2fe] overflow-hidden text-[13px]">
                <table className="w-full text-center">
                  <thead>
                    <tr
                      className="bg-[#eff6ff] !print:bg-[#eff6ff] border-b border-[#c7d2fe]"
                      style={{
                        WebkitPrintColorAdjust: "exact",
                        printColorAdjust: "exact",
                      }}
                    >
                      <th className="py-2 px-3 text-left w-1/2 text-[11px] font-bold text-[#1e1b4b] uppercase">
                        Key Milestone
                      </th>
                      <th className="py-2 px-3 text-[11px] font-bold text-[#1e1b4b] uppercase border-l border-[#c7d2fe]">
                        Start
                      </th>
                      <th className="py-2 px-3 text-[11px] font-bold text-[#1e1b4b] uppercase border-l border-[#c7d2fe]">
                        Finish
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#c7d2fe]">
                    {formData.milestones.map((m, i) => (
                      <tr key={m.id}>
                        <td className="py-2 px-3 text-left">{m.name}</td>
                        <td className="py-2 px-3 border-l border-[#c7d2fe] min-w-[120px]">
                          {m.start || "-"}
                        </td>
                        <td className="py-2 px-3 border-l border-[#c7d2fe] min-w-[120px]">
                          {m.finish || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
