import React, { useEffect } from "react";
import {
  Building2,
  Users,
  Shield,
  MapPin,
  Globe,
  Mail,
  Phone,
  Plus,
  Trash2,
  Edit3,
  Save,
  CheckCircle2,
  Lock,
  UserPlus,
  Search,
  Printer,
  FileText,
  FileSpreadsheet,
  Settings as SettingsIcon,
  AlertCircle,
  Activity,
  HardDrive,
  Database,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useTranslation, Language } from "../lib/translations";
import { CompanyData, AuditLog, UserData as UserDataInterface, UserPermissions, SectionPermission, DepartmentPermission } from "../types";
import { createAuditLog } from "../lib/utils";
import { db, handleFirestoreError, OperationType, storage } from "../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "../contexts/AuthContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useFirestoreCollection } from "../hooks/useFirestore";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";

interface UserResponsibility extends UserDataInterface {}

const PERMISSION_MATRIX = {
  "Accounting": {
    id: "accounting",
    sections: [
      { id: "finance", name: "Finance & Invoicing", actions: ["view", "edit", "approve"] },
      { id: "accounting-tree", name: "Accounting Tree", actions: ["view", "edit"] },
      { id: "expenditures", name: "Daily Expenditures", actions: ["view", "create", "edit", "approve"] },
      { id: "additional-costs", name: "Additional Costs", actions: ["view", "create", "edit", "approve"] },
      { id: "budget-variance", name: "Budget Variance", actions: ["view", "export"] }
    ]
  },
  "Human Resources": {
    id: "hr",
    sections: [
      { id: "workforce", name: "Workforce & Employees", actions: ["view", "create", "edit", "delete"] },
      { id: "attendance", name: "Attendance & Time Tracking", actions: ["view", "create", "edit", "delete", "record"] },
      { id: "payroll", name: "Payroll Processing", actions: ["view", "create", "edit", "approve"] }
    ]
  },
  "Projects": {
    id: "projects",
    sections: [
      { id: "projects", name: "Project controls & info", actions: ["view", "create", "edit", "manage"] },
      { id: "project-charter", name: "Project Charter", actions: ["view", "create", "edit"] },
      { id: "planning", name: "Planning & WBS", actions: ["view", "create", "edit"] },
      { id: "daily-planning", name: "Daily Progress (DPR)", actions: ["view", "create", "edit"] },
      { id: "contractor-claims", name: "Contractor Claims", actions: ["view", "create", "edit", "approve"] },
      { id: "productivity", name: "Productivity Matrix", actions: ["view", "edit"] }
    ]
  },
  "Internal Administration": {
    id: "internal_admin",
    sections: [
      { id: "equipment", name: "Equipment Logistics", actions: ["view", "manage", "dispatch"] },
      { id: "accommodation", name: "Accommodation", actions: ["view", "manage"] },
      { id: "risk", name: "Safety & risk / SIR", actions: ["view", "create", "edit", "resolve"] },
      { id: "user-guide", name: "User Guide", actions: ["view"] }
    ]
  },
  "External Administration": {
    id: "external_admin",
    sections: [
      { id: "procurement", name: "Procurement & PO", actions: ["view", "create", "edit", "issue"] },
      { id: "contracts", name: "External Contracts", actions: ["view", "create", "edit", "finalize"] },
      { id: "inventory", name: "Vendors & Inventory", actions: ["view", "create", "edit"] }
    ]
  },
  "System": {
    id: "system",
    sections: [
      { id: "dashboard", name: "Dashboard Overview", actions: ["view"] },
      { id: "settings", name: "System Settings", actions: ["view", "edit_users", "edit_company", "manage_storage"] }
    ]
  }
};

interface SettingsProps {
  language: Language;
  company: CompanyData;
  setCompany: (c: CompanyData) => void;
}

export function Settings({ language, company, setCompany }: SettingsProps) {
  const { t, d } = useTranslation(language);
  const [activeTab, setActiveTab] = React.useState<
    "company" | "users" | "formats" | "audit" | "storage"
  >("company");

  const [users, setUsers] = React.useState<UserResponsibility[]>([]);
  const [auditLogs] = useFirestoreCollection<AuditLog>("audit_logs", []);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = React.useState(false);
  const [isEditingUserRoleOpen, setIsEditingUserRoleOpen] = React.useState<
    string | null
  >(null);
  const [isFormatModalOpen, setIsFormatModalOpen] = React.useState(false);
  const [selectedFormat, setSelectedFormat] = React.useState("");

  const [searchQuery, setSearchQuery] = React.useState("");
  const [auditSearchQuery, setAuditSearchQuery] = React.useState("");

  const [selectedDept, setSelectedDept] = React.useState<string>("");
  const [permissionState, setPermissionState] = React.useState<UserPermissions>(
    { departments: [] },
  );

  const [storageData, setStorageData] = React.useState<
    { key: string; size: number; parsedSize: string }[]
  >([]);
  const [totalStorage, setTotalStorage] = React.useState({
    bytes: 0,
    formatted: "0 B",
    percentage: 0,
  });

  useEffect(() => {
    if (activeTab === "storage") {
      let total = 0;
      const items = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key) || "";
          const bytes = (value.length + key.length) * 2;
          total += bytes;
          items.push({
            key,
            size: bytes,
            parsedSize: (bytes / 1024).toFixed(2) + " KB",
          });
        }
      }
      items.sort((a, b) => b.size - a.size);
      setStorageData(items);
      const limit = 5 * 1024 * 1024; // typical 5MB limit
      setTotalStorage({
        bytes: total,
        formatted: (total / (1024 * 1024)).toFixed(2) + " MB",
        percentage: Math.min(100, Math.round((total / limit) * 100)),
      });
    }
  }, [activeTab]);

  const { user, userData } = useAuth();
  useEffect(() => {
    // Only admins can see the access matrix (list users)
    if (
      !user ||
      (userData?.role !== "Admin" && user?.email !== "khalifah.rshc@gmail.com")
    ) {
      return;
    }

    // Listen to Firebase users collection
    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const fetchedUsers: UserResponsibility[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          fetchedUsers.push({
            id: doc.id,
            name: data.name || "Unknown",
            email: data.email || "No email",
            role: data.role || "User",
            department: data.department || "User",
            permissions: data.permissions || [],
            structuredPermissions: data.structuredPermissions || null,
            status: "Active",
            createdAt: data.createdAt,
          });
        });
        setUsers(fetchedUsers);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "users");
      },
    );

    return () => unsubscribe();
  }, [user, userData]);

  const filteredUsers = React.useMemo(() => {
    return users.filter(
      (user) =>
        (user.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
        (user.role || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
        (user.email || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
        (user.department || '').toLowerCase().includes((searchQuery || '').toLowerCase()),
    );
  }, [users, searchQuery]);

  const [isEditingCompany, setIsEditingCompany] = React.useState(false);
  const [logoPreview, setLogoPreview] = React.useState<string | undefined>(
    company.logo,
  );

  const handleUpdateCompany = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    let newLogo = logoPreview;
    const file = formData.get("logoFile") as File;
    if (file && file.size > 0) {
      try {
        // Convert to inline Base64 data URL to prevent CORS/publication issues
        const base64Promise = new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });
        newLogo = await base64Promise;
      } catch (e) {
        console.error("Base64 read error, falling back to storage helper", e);
        try {
          const storageRef = ref(storage, `company/logo_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`);
          const snapshot = await uploadBytes(storageRef, file);
          newLogo = await getDownloadURL(snapshot.ref);
        } catch (storageError) {
          console.error("Upload error", storageError);
          alert("Failed to process company logo.");
        }
      }
    }

    setCompany({
      name: formData.get("name") as string,
      vatNumber: formData.get("vatNumber") as string,
      crNumber: formData.get("crNumber") as string,
      headquarters: formData.get("headquarters") as string,
      website: formData.get("website") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      department: formData.get("department") as string,
      footerText: formData.get("footerText") as string,
      projectManager: {
        name: formData.get("pmName") as string,
        contact: formData.get("pmContact") as string,
      },
      operationsManager: {
        name: formData.get("opsName") as string,
      },
      hrManager: {
        name: formData.get("hrName") as string,
      },
      logo: newLogo,
    });
    setIsEditingCompany(false);
  };

  const handleEnrollUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const departmentName = formData.get("department") as string;

    const newDocId = `manual-user-${Math.random().toString(36).substr(2, 9)}`;
    const userRef = doc(db, "users", newDocId);

    try {
      await setDoc(userRef, {
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        role: departmentName === "Administrator" ? "Admin" : "User",
        department: departmentName,
        permissions: [], // Legacy empty
        structuredPermissions:
          departmentName === "Administrator" ? null : permissionState,
        status: "Active",
        createdAt: serverTimestamp(),
      });
      
      createAuditLog({
        id: Math.random().toString(36).substr(2, 9),
        userId: user?.uid || 'system',
        userName: userData?.name || 'System',
        action: 'CREATED',
        target: 'User',
        details: {
          en: `Enrolled new user ${formData.get("name")} in department ${departmentName}`,
          ar: `تم تسجيل المستخدم الجديد ${formData.get("name")} في قسم ${departmentName}`,
        },
        status: 'Draft' 
      });

      setIsEnrollModalOpen(false);
      setPermissionState({ departments: [] });
      setSelectedDept("");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${newDocId}`);
    }
  };

  const togglePermission = (
    deptId: string,
    deptName: string,
    sectionId: string,
    sectionName: string,
    action: string,
  ) => {
    setPermissionState((prev) => {
      const departments = [...(prev.departments || [])];
      let deptIndex = departments.findIndex((d) => d.departmentId === deptId);

      let dept: DepartmentPermission;
      if (deptIndex === -1) {
        dept = { departmentId: deptId, departmentName: deptName, sections: [] };
        departments.push(dept);
        deptIndex = departments.length - 1;
      } else {
        dept = {
          ...departments[deptIndex],
          sections: [...departments[deptIndex].sections],
        };
        departments[deptIndex] = dept;
      }

      let sectionIndex = dept.sections.findIndex(
        (s) => s.sectionId === sectionId,
      );
      let section: SectionPermission;

      const defaultActions = {
        view: false,
        create: false,
        edit: false,
        delete: false,
      };

      if (sectionIndex === -1) {
        section = {
          sectionId,
          sectionName,
          actions: { ...defaultActions },
        };
        dept.sections = [...dept.sections, section];
        sectionIndex = dept.sections.length - 1;
      } else {
        section = {
          ...dept.sections[sectionIndex],
          actions: {
            ...defaultActions,
            ...dept.sections[sectionIndex].actions,
          },
        };
        const newSections = [...dept.sections];
        newSections[sectionIndex] = section;
        dept.sections = newSections;
      }

      const currentVal = section.actions[action] || false;
      section.actions = {
        ...section.actions,
        [action]: !currentVal,
      };

      return { ...prev, departments };
    });
  };

  const handleToggleAllSection = (
    deptId: string,
    deptName: string,
    sectionId: string,
    sectionName: string,
    availableActions: string[],
  ) => {
    setPermissionState((prev) => {
      const departments = [...(prev.departments || [])];
      let deptIndex = departments.findIndex((d) => d.departmentId === deptId);

      let dept: DepartmentPermission;
      if (deptIndex === -1) {
        dept = { departmentId: deptId, departmentName: deptName, sections: [] };
        departments.push(dept);
        deptIndex = departments.length - 1;
      } else {
        dept = {
          ...departments[deptIndex],
          sections: [...departments[deptIndex].sections],
        };
        departments[deptIndex] = dept;
      }

      let sectionIndex = dept.sections.findIndex(
        (s) => s.sectionId === sectionId,
      );
      let section: SectionPermission;
      const defaultActions = {
        view: false,
        create: false,
        edit: false,
        delete: false,
      };

      if (sectionIndex === -1) {
        section = {
          sectionId,
          sectionName,
          actions: { ...defaultActions },
        };
        dept.sections = [...dept.sections, section];
        sectionIndex = dept.sections.length - 1;
      } else {
        section = {
          ...dept.sections[sectionIndex],
          actions: {
            ...defaultActions,
            ...dept.sections[sectionIndex].actions,
          },
        };
        const newSections = [...dept.sections];
        newSections[sectionIndex] = section;
        dept.sections = newSections;
      }

      // Check if all are currently selected
      const allSelected = availableActions.every((act) => section.actions[act]);

      const newActions = { ...section.actions };
      availableActions.forEach((act) => {
        newActions[act] = !allSelected;
      });

      section.actions = newActions;

      return { ...prev, departments };
    });
  };

  const handleUpdatePermissions = async (userId: string) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        structuredPermissions: permissionState,
      });

      createAuditLog({
        id: Math.random().toString(36).substr(2, 9),
        userId: user?.uid || 'system',
        userName: userData?.name || 'System',
        action: 'UPDATED',
        target: 'User Permissions',
        details: {
          en: `Updated permissions for user ID ${userId}`,
          ar: `تم تحديث الصلاحيات للمستخدم ID ${userId}`,
        },
        status: 'Draft' 
      });

      setIsEditingUserRoleOpen(null);
      setPermissionState({ departments: [] });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleDeleteUser = async (id: string, userName?: string) => {
    try {
      await deleteDoc(doc(db, "users", id));

      createAuditLog({
        id: Math.random().toString(36).substr(2, 9),
        userId: user?.uid || 'system',
        userName: userData?.name || 'System',
        action: 'DELETED',
        target: 'User',
        details: {
          en: `Deleted user ${userName || id}`,
          ar: `تم حذف المستخدم ${userName || id}`,
        },
        status: 'Draft' 
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
    }
  };

  const handleOpenFormatModal = (formatType: string) => {
    setSelectedFormat(formatType);
    setIsFormatModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">
            {t.admin}
          </h2>
          <p className="text-slate-500 text-sm italic font-medium">
            Calibrating enterprise identity and authority matrices.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-slate-100">
        <button
          onClick={() => setActiveTab("company")}
          className={cn(
            "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all relative flex items-center gap-2",
            activeTab === "company"
              ? "text-red-600"
              : "text-slate-400 hover:text-slate-600",
          )}
        >
          <Building2 className="w-4 h-4" />
          Company Identity
          {activeTab === "company" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={cn(
            "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all relative flex items-center gap-2",
            activeTab === "users"
              ? "text-red-600"
              : "text-slate-400 hover:text-slate-600",
          )}
        >
          <Users className="w-4 h-4" />
          Access Matrix
          {activeTab === "users" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("formats")}
          className={cn(
            "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all relative flex items-center gap-2",
            activeTab === "formats"
              ? "text-red-600"
              : "text-slate-400 hover:text-slate-600",
          )}
        >
          <Printer className="w-4 h-4" />
          Print Formats
          {activeTab === "formats" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={cn(
            "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all relative flex items-center gap-2",
            activeTab === "audit"
              ? "text-red-600"
              : "text-slate-400 hover:text-slate-600",
          )}
        >
          <Activity className="w-4 h-4" />
          Audit Logs
          {activeTab === "audit" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("storage")}
          className={cn(
            "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all relative flex items-center gap-2",
            activeTab === "storage"
              ? "text-red-600"
              : "text-slate-400 hover:text-slate-600",
          )}
        >
          <Database className="w-4 h-4" />
          Storage Capacity
          {activeTab === "storage" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />
          )}
        </button>
      </div>

      {activeTab === "company" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="glass-panel p-6 bg-white border border-slate-200 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-600 rounded-xl flex items-center justify-center text-white font-bold text-3xl mb-4 shadow-lg border-4 border-red-100">
                A
              </div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">
                {company.name}
              </h3>
              <p className="text-xs text-slate-400 font-bold uppercase mt-1 tracking-widest">
                Enterprise HQ
              </p>

              <div className="mt-8 w-full space-y-3 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-3 text-slate-500">
                  <Globe className="w-4 h-4 text-red-400" />
                  <span className="text-xs font-medium">{company.website}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500">
                  <Mail className="w-4 h-4 text-red-400" />
                  <span className="text-xs font-medium">{company.email}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500">
                  <Phone className="w-4 h-4 text-red-400" />
                  <span className="text-xs font-medium">{company.phone}</span>
                </div>
              </div>
            </div>

            <div className="glass-panel p-5 bg-red-50 border border-red-100 flex items-start gap-4">
              <Shield className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">
                  Taxation Compliance
                </p>
                <p className="text-xs text-red-600 leading-relaxed font-medium">
                  ZATCA integrated VAT registered entity. All generated invoices
                  include cryptographic signatures and secure QR nodes.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="glass-panel bg-white border border-slate-200 overflow-auto resize-y">
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-900 font-mono">
                  Entity Parameters
                </h4>
                {!isEditingCompany && (
                  <button
                    onClick={() => setIsEditingCompany(true)}
                    className="p-1 px-3 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-500 hover:text-red-600 transition-all flex items-center gap-2"
                  >
                    <Edit3 className="w-3 h-3" />
                    Modify
                  </button>
                )}
              </div>

              <form
                onSubmit={handleUpdateCompany}
                className="p-8 overflow-y-auto min-h-0 flex-1"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      Legal Entity Name
                    </label>
                    <input
                      name="name"
                      disabled={!isEditingCompany}
                      defaultValue={company.name}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2.5 text-sm font-medium focus:ring-1 focus:ring-red-500 outline-none disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      VAT Registration Number
                    </label>
                    <input
                      name="vatNumber"
                      disabled={!isEditingCompany}
                      defaultValue={company.vatNumber}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2.5 text-sm font-mono focus:ring-1 focus:ring-red-500 outline-none disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      Commercial Registration (CR)
                    </label>
                    <input
                      name="crNumber"
                      disabled={!isEditingCompany}
                      defaultValue={company.crNumber}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2.5 text-sm font-mono focus:ring-1 focus:ring-red-500 outline-none disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      Headquarters Address
                    </label>
                    <input
                      name="headquarters"
                      disabled={!isEditingCompany}
                      defaultValue={company.headquarters}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2.5 text-sm font-medium focus:ring-1 focus:ring-red-500 outline-none disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      Official Website
                    </label>
                    <input
                      name="website"
                      disabled={!isEditingCompany}
                      defaultValue={company.website}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2.5 text-sm font-medium focus:ring-1 focus:ring-red-500 outline-none disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      Operations Email
                    </label>
                    <input
                      name="email"
                      disabled={!isEditingCompany}
                      defaultValue={company.email}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2.5 text-sm font-medium focus:ring-1 focus:ring-red-500 outline-none disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      Phone Number
                    </label>
                    <input
                      name="phone"
                      disabled={!isEditingCompany}
                      defaultValue={company.phone}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2.5 text-sm font-medium focus:ring-1 focus:ring-red-500 outline-none disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      Department
                    </label>
                    <input
                      name="department"
                      disabled={!isEditingCompany}
                      defaultValue={company.department}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2.5 text-sm font-medium focus:ring-1 focus:ring-red-500 outline-none disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2 space-y-4 border-t border-slate-100 pt-8 mt-4">
                    <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest border-l-2 border-red-600 pl-3">
                      Organizational Leadership
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 pt-2">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                          Project Manager Name
                        </label>
                        <input
                          name="pmName"
                          disabled={!isEditingCompany}
                          defaultValue={company.projectManager?.name}
                          className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2 text-sm font-medium focus:ring-1 focus:ring-red-500 outline-none disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                          PM Contact Number
                        </label>
                        <input
                          name="pmContact"
                          disabled={!isEditingCompany}
                          defaultValue={company.projectManager?.contact}
                          className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2 text-sm font-medium focus:ring-1 focus:ring-red-500 outline-none disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                          Operations Manager
                        </label>
                        <input
                          name="opsName"
                          disabled={!isEditingCompany}
                          defaultValue={company.operationsManager?.name}
                          className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2 text-sm font-medium focus:ring-1 focus:ring-red-500 outline-none disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                          Human Resources Manager
                        </label>
                        <input
                          name="hrName"
                          disabled={!isEditingCompany}
                          defaultValue={company.hrManager?.name}
                          className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2 text-sm font-medium focus:ring-1 focus:ring-red-500 outline-none disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="col-span-1 md:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      Footer Text
                    </label>
                    <textarea
                      name="footerText"
                      disabled={!isEditingCompany}
                      defaultValue={company.footerText}
                      placeholder="e.g. This is a system generated official tax invoice."
                      className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2.5 text-sm font-medium focus:ring-1 focus:ring-red-500 outline-none disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      Company Logo / Digital Stamp
                    </label>
                    <div className="flex items-center gap-4">
                      {logoPreview && (
                        <div className="w-16 h-16 rounded overflow-hidden border border-slate-200 bg-white shadow-sm flex items-center justify-center shrink-0">
                          <img
                            src={logoPreview}
                            alt="Logo"
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                      )}
                      <input
                        name="logoFile"
                        type="file"
                        accept="image/*"
                        disabled={!isEditingCompany}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                             // Will be uploaded on save, just show local preview for now
                            const reader = new FileReader();
                            reader.onloadend = () =>
                              setLogoPreview(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2.5 text-sm font-medium focus:ring-1 focus:ring-red-500 outline-none disabled:opacity-70 disabled:cursor-not-allowed transition-all file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:uppercase file:tracking-widest file:bg-red-50 file:text-red-600 hover:file:bg-red-100"
                      />
                    </div>
                  </div>
                </div>

                {isEditingCompany && (
                  <div className="mt-12 flex justify-end gap-3 pt-6 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsEditingCompany(false)}
                      className="px-6 py-2 border border-slate-200 rounded text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-slate-900 text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-lg active:scale-95"
                    >
                      <Save className="w-3 h-3" />
                      Save Identity
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === "users" && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="glass-panel bg-white border border-slate-200 overflow-auto resize-y">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-900 font-mono">
                  Operations Personnel Access
                </h4>
                <p className="text-[10px] text-slate-400 font-medium uppercase mt-1">
                  Defining system scopes and authority
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative hidden md:block">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search personnel or roles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-slate-200 rounded-md text-xs w-64 font-medium focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
                <button
                  onClick={() => setIsEnrollModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md text-xs font-bold uppercase tracking-widest shadow-lg hover:bg-red-700 transition-all active:scale-95"
                >
                  <UserPlus className="w-3 h-3" />
                  Enroll Personnel
                </button>
              </div>
            </div>

            <div className="md:hidden px-8 pb-6 bg-slate-50/50 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search personnel or roles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-slate-200 rounded-md text-xs w-full font-medium focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all placeholder:text-slate-400 bg-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto w-full min-w-full">
              <div className="min-w-max">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Operator Identity
                      </th>
                      <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Authority Role
                      </th>
                      <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Assigned Scopes
                      </th>
                      <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                        Status
                      </th>
                      <th className="px-8 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-8 py-12 text-center text-slate-500 text-xs font-medium"
                        >
                          No personnel found matching "{searchQuery}"
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr
                          key={user.id}
                          className="hover:bg-slate-50/50 transition-colors group"
                        >
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 font-bold text-xs ring-1 ring-slate-200">
                                {user.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900">
                                  {user.name}
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                                  user.role === "Admin"
                                    ? "bg-slate-900 text-white border-slate-900"
                                    : user.department === "Finance"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                      : user.department === "HR"
                                        ? "bg-red-50 text-red-700 border-red-100"
                                        : "bg-slate-100 text-slate-600 border-slate-200",
                                )}
                              >
                                {user.department}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {user.structuredPermissions?.departments?.map(
                                (dept, i) => (
                                  <div key={i} className="flex flex-wrap gap-1">
                                    {dept.sections.map((sec) => (
                                      <div
                                        key={sec.sectionId}
                                        className="flex flex-wrap gap-1 items-center"
                                      >
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                                          {sec.sectionName}:
                                        </span>
                                        {Object.entries(sec.actions)
                                          .filter(([_, val]) => val)
                                          .map(([act]) => (
                                            <span
                                              key={act}
                                              className="text-[9px] font-medium px-1.5 py-0.5 bg-red-50 text-red-600 rounded flex items-center gap-1 border border-red-100"
                                            >
                                              {act}
                                            </span>
                                          ))}
                                      </div>
                                    ))}
                                  </div>
                                ),
                              )}
                              {(!user.structuredPermissions ||
                                user.structuredPermissions.departments
                                  .length === 0) && (
                                <span className="text-[10px] italic text-slate-400">
                                  {user.role === "Admin"
                                    ? "Unlimited Access"
                                    : "Default Access"}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-4 text-center">
                            <span className="text-[10px] font-bold text-emerald-600 flex items-center justify-center gap-1.5">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                              {user.status}
                            </span>
                          </td>
                          <td className="px-8 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setIsEditingUserRoleOpen(user.id);
                                  setSelectedDept(user.department);
                                  setPermissionState(
                                    user.structuredPermissions || {
                                      departments: [],
                                    },
                                  );
                                }}
                                className="p-1 px-3 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-500 hover:text-red-600 transition-all flex items-center gap-2 shadow-sm"
                              >
                                <Shield className="w-3 h-3" />
                                Permissions
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id, user.name)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors bg-white border border-slate-200 rounded shadow-sm"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel p-5 bg-white border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-slate-50 text-slate-600 rounded-lg">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Authority Audit
                </p>
                <h3 className="text-xl font-bold font-mono text-slate-900">
                  Enforced
                </h3>
              </div>
            </div>
            <div className="glass-panel p-5 bg-white border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-slate-50 text-slate-600 rounded-lg">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Cryptographic Nodes
                </p>
                <h3 className="text-xl font-bold font-mono text-slate-900">
                  12 / 12
                </h3>
              </div>
            </div>
            <div className="glass-panel p-5 bg-white border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-slate-50 text-slate-600 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Policy Compliance
                </p>
                <h3 className="text-xl font-bold font-mono text-slate-900">
                  99.9%
                </h3>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "formats" && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="glass-panel bg-white border border-slate-200 p-8 leading-relaxed text-slate-600">
            <h3 className="text-xl font-bold text-slate-900 mb-6 uppercase tracking-tight">
              Print Format Configurations
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="border border-slate-100 rounded-xl p-6 hover:border-red-200 transition-colors bg-slate-50 relative overflow-auto resize-y group">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-slate-900 group-hover:scale-110 group-hover:opacity-20 transition-all">
                  <FileText className="w-24 h-24" />
                </div>
                <div className="relative z-10">
                  <h4 className="font-bold text-slate-900 uppercase tracking-widest text-sm mb-2">
                    Invoices
                  </h4>
                  <p className="text-xs font-medium mb-6 max-w-sm">
                    Manage header, footer, logo positioning, and ZATCA QR
                    configurations for all exported invoices.
                  </p>
                  <button
                    onClick={() => handleOpenFormatModal("Invoices")}
                    className="flex items-center gap-2 px-5 py-2 bg-white text-slate-700 border border-slate-200 shadow-sm rounded text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors"
                  >
                    <SettingsIcon className="w-3 h-3" />
                    Configure Layout
                  </button>
                </div>
              </div>

              <div className="border border-slate-100 rounded-xl p-6 hover:border-red-200 transition-colors bg-slate-50 relative overflow-auto resize-y group">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-slate-900 group-hover:scale-110 group-hover:opacity-20 transition-all">
                  <FileText className="w-24 h-24" />
                </div>
                <div className="relative z-10">
                  <h4 className="font-bold text-slate-900 uppercase tracking-widest text-sm mb-2">
                    Quotations
                  </h4>
                  <p className="text-xs font-medium mb-6 max-w-sm">
                    Customize terms, conditions, validity periods, and visual
                    styling for official client estimates.
                  </p>
                  <button
                    onClick={() => handleOpenFormatModal("Quotations")}
                    className="flex items-center gap-2 px-5 py-2 bg-white text-slate-700 border border-slate-200 shadow-sm rounded text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors"
                  >
                    <SettingsIcon className="w-3 h-3" />
                    Configure Layout
                  </button>
                </div>
              </div>

              <div className="border border-slate-100 rounded-xl p-6 hover:border-red-200 transition-colors bg-slate-50 relative overflow-auto resize-y group">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-slate-900 group-hover:scale-110 group-hover:opacity-20 transition-all">
                  <Printer className="w-24 h-24" />
                </div>
                <div className="relative z-10">
                  <h4 className="font-bold text-slate-900 uppercase tracking-widest text-sm mb-2">
                    Purchase Orders
                  </h4>
                  <p className="text-xs font-medium mb-6 max-w-sm">
                    Modify vendor information placement, internal approval
                    stamps, and PO layout parameters.
                  </p>
                  <button
                    onClick={() => handleOpenFormatModal("Purchase Orders")}
                    className="flex items-center gap-2 px-5 py-2 bg-white text-slate-700 border border-slate-200 shadow-sm rounded text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors"
                  >
                    <SettingsIcon className="w-3 h-3" />
                    Configure Layout
                  </button>
                </div>
              </div>

              <div className="border border-slate-100 rounded-xl p-6 hover:border-red-200 transition-colors bg-slate-50 relative overflow-auto resize-y group">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-slate-900 group-hover:scale-110 group-hover:opacity-20 transition-all">
                  <FileSpreadsheet className="w-24 h-24" />
                </div>
                <div className="relative z-10">
                  <h4 className="font-bold text-slate-900 uppercase tracking-widest text-sm mb-2">
                    Project Reports
                  </h4>
                  <p className="text-xs font-medium mb-6 max-w-sm">
                    Setup global styling for variance, attendance, and cost
                    sheet analytical outputs.
                  </p>
                  <button
                    onClick={() => handleOpenFormatModal("Project Reports")}
                    className="flex items-center gap-2 px-5 py-2 bg-white text-slate-700 border border-slate-200 shadow-sm rounded text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors"
                  >
                    <SettingsIcon className="w-3 h-3" />
                    Configure Layout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "audit" && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="glass-panel bg-white border border-slate-200 overflow-hidden rounded-xl shadow-sm">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-900 font-mono">
                  System Activity Audit
                </h4>
                <p className="text-[10px] text-slate-400 font-medium uppercase mt-1">
                  Traceability matrix of all critical system interactions
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-red-500 w-64"
                  />
                </div>
                <button
                  onClick={async () => {
                    if (window.confirm("Are you sure you want to clear all audit logs?")) {
                      try {
                        const promises = auditLogs.map(log => deleteDoc(doc(db, "audit_logs", log.id)));
                        await Promise.all(promises);
                      } catch (e) {
                        console.error(e);
                      }
                    }
                  }}
                  className="text-[10px] font-bold text-rose-600 uppercase tracking-widest hover:text-rose-800 transition-colors"
                >
                  Clear Logs
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Timestamp
                    </th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      User
                    </th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Action
                    </th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Target
                    </th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-8 py-12 text-center text-slate-400 font-medium"
                      >
                        No activity logs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    [...auditLogs]
                      .filter(log => {
                        if (!auditSearchQuery) return true;
                        const query = auditSearchQuery.toLowerCase();
                        const detailsMatch = typeof log.details === 'string'
                          ? log.details.toLowerCase().includes(query)
                          : (log.details?.en?.toLowerCase().includes(query) || log.details?.ar?.toLowerCase().includes(query));
                        return (
                          log.action?.toLowerCase().includes(query) ||
                          log.target?.toLowerCase().includes(query) ||
                          log.userName?.toLowerCase().includes(query) ||
                          detailsMatch
                        );
                      })
                      .sort(
                        (a, b) =>
                          new Date(b.timestamp).getTime() -
                          new Date(a.timestamp).getTime(),
                      )
                      .map((log) => {
                        const displayText = typeof log.details === 'string'
                          ? log.details
                          : (log.details?.[language] || log.details?.en || "");
                        return (
                          <tr
                            key={log.id}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="px-8 py-3 text-slate-500 font-mono">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="px-8 py-3 font-bold text-slate-700">
                              {log.userName}
                            </td>
                            <td className="px-8 py-3">
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded text-[9px] font-bold uppercase",
                                  log.action.includes("Delete")
                                    ? "bg-red-50 text-red-700"
                                    : log.action.includes("Update")
                                      ? "bg-blue-50 text-blue-700"
                                      : log.action.includes("Create")
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-slate-100 text-slate-600",
                                )}
                              >
                                {log.action}
                              </span>
                            </td>
                            <td className="px-8 py-3 font-medium text-slate-600">
                              {log.target}
                            </td>
                            <td
                              className="px-8 py-3 text-slate-400 max-w-xs truncate"
                              title={displayText}
                            >
                              {displayText}
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-6 bg-slate-900 text-white rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">
                  System Health
                </h3>
                <p className="text-2xl font-bold tracking-tight">
                  Optimal Performance
                </p>
              </div>
              <div className="w-12 h-12 rounded-full border-4 border-red-500/20 flex items-center justify-center">
                <Activity className="w-6 h-6 text-red-500" />
              </div>
            </div>
            <div className="glass-panel p-6 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Database Stability
                </h3>
                <p className="text-2xl font-bold text-slate-800">
                  99.98% Up-time
                </p>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-8 bg-emerald-500 rounded-full"
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {isEditingUserRoleOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] ring-1 ring-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 uppercase tracking-widest text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-red-600" /> Modify Authority
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                  Personnel:{" "}
                  {users.find((u) => u.id === isEditingUserRoleOpen)?.name}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsEditingUserRoleOpen(null);
                  setPermissionState({ departments: [] });
                  setSelectedDept("");
                }}
                className="text-slate-400 hover:text-rose-600 transition-colors"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto min-h-0 flex-1">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    Primary Department
                  </label>
                  <select
                    required
                    value={selectedDept}
                    onChange={(e) => {
                      const newDept = e.target.value;
                      setSelectedDept(newDept);
                      // Update department immediately in Firestore if it changes role dramatically
                      const userRef = doc(db, "users", isEditingUserRoleOpen);
                      updateDoc(userRef, {
                        department: newDept,
                        role: newDept === "Administrator" ? "Admin" : "User",
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-medium"
                  >
                    <option value="Administrator">
                      Administrator (All Access)
                    </option>
                    {Object.keys(PERMISSION_MATRIX).map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                    <option value="User">Standard User (No Dept)</option>
                  </select>
                </div>

                {selectedDept &&
                  selectedDept !== "Administrator" &&
                  selectedDept !== "User" && (
                    <div className="space-y-4 border-t border-slate-100 pt-4">
                      <label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest block">
                        Update Granular Access
                      </label>
                      <div className="space-y-6">
                        {Object.entries(PERMISSION_MATRIX).map(
                          ([deptName, deptConfig]) => (
                            <div key={deptConfig.id} className="space-y-4 border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
                              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">{deptName}</h4>
                              <div className="grid grid-cols-1 gap-4">
                                {deptConfig.sections.map((section) => (
                                  <div
                                    key={section.id}
                                    className="glass-panel p-4 bg-slate-50 rounded-lg border border-slate-100"
                                  >
                                    <div className="flex items-center justify-between mb-3">
                                      <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">
                                        {section.name}
                                      </h5>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleToggleAllSection(
                                            deptConfig.id,
                                            deptName,
                                            section.id,
                                            section.name,
                                            section.actions,
                                          );
                                        }}
                                        className="text-[9px] font-bold text-red-600 uppercase hover:underline"
                                      >
                                        Toggle All
                                      </button>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                      {section.actions.map((action) => {
                                        const isChecked =
                                          permissionState.departments
                                            .find((d) => d.departmentId === deptConfig.id)
                                            ?.sections.find(
                                              (s) => s.sectionId === section.id,
                                            )?.actions[action] || false;

                                        return (
                                          <label
                                            key={action}
                                            className="flex items-center gap-2 cursor-pointer group"
                                          >
                                            <div className="relative flex items-center">
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() =>
                                                  togglePermission(
                                                    deptConfig.id,
                                                    deptName,
                                                    section.id,
                                                    section.name,
                                                    action,
                                                  )
                                                }
                                                className="sr-only"
                                              />
                                              <div
                                                className={cn(
                                                  "w-4 h-4 border rounded transition-all flex items-center justify-center",
                                                  isChecked
                                                    ? "bg-red-600 border-red-600"
                                                    : "bg-white border-slate-300 group-hover:border-red-400",
                                                )}
                                              >
                                                {isChecked && (
                                                  <Plus className="w-2.5 h-2.5 text-white rotate-45" />
                                                )}
                                              </div>
                                            </div>
                                            <span
                                              className={cn(
                                                "text-[10px] font-bold uppercase tracking-widest transition-colors",
                                                isChecked
                                                  ? "text-red-700"
                                                  : "text-slate-500 group-hover:text-slate-700",
                                              )}
                                            >
                                              {action}
                                            </span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => {
                  setIsEditingUserRoleOpen(null);
                  setPermissionState({ departments: [] });
                  setSelectedDept("");
                }}
                className="px-4 py-2 text-slate-500 text-xs font-bold uppercase tracking-widest hover:text-slate-700 transition-colors"
              >
                Discard
              </button>
              <button
                onClick={() => handleUpdatePermissions(isEditingUserRoleOpen)}
                className="px-6 py-2 bg-slate-900 text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95"
              >
                Update Authority
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "storage" && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="glass-panel bg-white border border-slate-200 overflow-hidden rounded-xl shadow-sm">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-900 font-mono">
                  System Memory & Storage
                </h4>
                <p className="text-[10px] text-slate-400 font-medium uppercase mt-1">
                  Local Storage Capacity constraints & utilization (Browser
                  Limit ~5MB)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest space-y-1 text-right">
                  <span>{totalStorage.formatted} / 5.00 MB</span>
                  <div className="w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full",
                        totalStorage.percentage > 80
                          ? "bg-red-500"
                          : "bg-emerald-500",
                      )}
                      style={{ width: `${totalStorage.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Storage Key
                    </th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">
                      Size
                    </th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {storageData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-8 py-12 text-center text-slate-500 text-xs font-medium"
                      >
                        No local storage consumed
                      </td>
                    </tr>
                  ) : (
                    storageData.map((item) => (
                      <tr
                        key={item.key}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-8 py-3 text-[11px] font-medium text-slate-900 font-mono">
                          {item.key}
                        </td>
                        <td className="px-8 py-3 text-[11px] font-medium text-slate-600 text-right">
                          {item.parsedSize}
                        </td>
                        <td className="px-8 py-3 text-center">
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Delete data for " + item.key + "?",
                                )
                              ) {
                                localStorage.removeItem(item.key);
                                window.location.reload();
                              }
                            }}
                            className="text-red-500 hover:text-red-700 p-1 rounded"
                            title="Clear Key Data"
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {isEnrollModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] ring-1 ring-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900 uppercase tracking-widest text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-red-600" /> Enroll Personnel
              </h3>
              <button
                onClick={() => {
                  setIsEnrollModalOpen(false);
                  setPermissionState({ departments: [] });
                  setSelectedDept("");
                }}
                className="text-slate-400 hover:text-rose-600 transition-colors"
              >
                &times;
              </button>
            </div>
            <form
              onSubmit={handleEnrollUser}
              className="p-6 space-y-6 overflow-y-auto min-h-0 flex-1"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    Full Name
                  </label>
                  <input
                    required
                    name="name"
                    className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    Email Address
                  </label>
                  <input
                    required
                    type="email"
                    name="email"
                    className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                    placeholder="john@redseaholding.net"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    Primary Department
                  </label>
                  <select
                    required
                    name="department"
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2 text-sm focus:ring-1 focus:ring-red-500 outline-none font-medium"
                  >
                    <option value="">Select Department...</option>
                    <option value="Administrator">
                      Administrator (All Access)
                    </option>
                    {Object.keys(PERMISSION_MATRIX).map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedDept && selectedDept !== "Administrator" && (
                  <div className="space-y-4 border-t border-slate-100 pt-4 animate-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest block">
                      Configure Granular Access
                    </label>
                    <div className="space-y-6">
                      {Object.entries(PERMISSION_MATRIX).map(
                        ([deptName, deptConfig]) => (
                          <div key={deptConfig.id} className="space-y-4 border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">{deptName}</h4>
                            <div className="grid grid-cols-1 gap-4">
                              {deptConfig.sections.map((section) => (
                                <div
                                  key={section.id}
                                  className="glass-panel p-4 bg-slate-50 rounded-lg border border-slate-100"
                                >
                                  <div className="flex items-center justify-between mb-3">
                                    <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">
                                      {section.name}
                                    </h5>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleToggleAllSection(
                                          deptConfig.id,
                                          deptName,
                                          section.id,
                                          section.name,
                                          section.actions,
                                        );
                                      }}
                                      className="text-[9px] font-bold text-red-600 uppercase hover:underline"
                                    >
                                      Toggle All
                                    </button>
                                  </div>
                                  <div className="flex flex-wrap gap-3">
                                    {section.actions.map((action) => {
                                      const isChecked =
                                        permissionState.departments
                                          .find((d) => d.departmentId === deptConfig.id)
                                          ?.sections.find(
                                            (s) => s.sectionId === section.id,
                                          )?.actions[action as any] || false;

                                      return (
                                        <label
                                          key={action}
                                          className="flex items-center gap-2 cursor-pointer group"
                                        >
                                          <div className="relative flex items-center">
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={() =>
                                                togglePermission(
                                                  deptConfig.id,
                                                  deptName,
                                                  section.id,
                                                  section.name,
                                                  action,
                                                )
                                              }
                                              className="sr-only"
                                            />
                                            <div
                                              className={cn(
                                                "w-4 h-4 border rounded transition-all flex items-center justify-center",
                                                isChecked
                                                  ? "bg-red-600 border-red-600"
                                                  : "bg-white border-slate-300 group-hover:border-red-400",
                                              )}
                                            >
                                              {isChecked && (
                                                <Plus className="w-2.5 h-2.5 text-white rotate-45" />
                                              )}
                                            </div>
                                          </div>
                                          <span
                                            className={cn(
                                              "text-[10px] font-bold uppercase tracking-widest transition-colors",
                                              isChecked
                                                ? "text-red-700"
                                                : "text-slate-500 group-hover:text-slate-700",
                                            )}
                                          >
                                            {action}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEnrollModalOpen(false);
                    setPermissionState({ departments: [] });
                    setSelectedDept("");
                  }}
                  className="px-4 py-2 text-slate-500 text-xs font-bold uppercase tracking-widest hover:text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-red-600 text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-colors shadow-lg active:scale-95"
                >
                  Complete Enrollment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isFormatModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] ring-1 ring-slate-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900 uppercase tracking-widest text-sm flex items-center gap-2">
                <SettingsIcon className="w-4 h-4 text-red-600" />
                {selectedFormat} Layout Config
              </h3>
              <button
                onClick={() => setIsFormatModalOpen(false)}
                className="text-slate-400 hover:text-rose-600 transition-colors"
              >
                &times;
              </button>
            </div>

            <div className="p-8 flex-1 overflow-y-auto space-y-8 bg-slate-50/50">
              <div className="glass-panel p-6 bg-white border border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                  Header Structure
                </h4>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                      Include Enterprise Logo
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                      Show Commercial Registration (CR)
                    </span>
                  </label>
                </div>
              </div>

              <div className="glass-panel p-6 bg-white border border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                  Compliance Nodes
                </h4>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      defaultChecked={selectedFormat === "Invoices"}
                      disabled={selectedFormat !== "Invoices"}
                      className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 disabled:opacity-50"
                    />
                    <div className="flex flex-col">
                      <span
                        className={cn(
                          "text-sm font-medium transition-colors",
                          selectedFormat === "Invoices"
                            ? "text-slate-700 group-hover:text-slate-900"
                            : "text-slate-400",
                        )}
                      >
                        ZATCA Compliant QR Code
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-widest mt-0.5",
                          selectedFormat === "Invoices"
                            ? "text-emerald-500"
                            : "text-slate-300",
                        )}
                      >
                        Mandatory for Invoices
                      </span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                      Digital Cryptographic Signature Stamp
                    </span>
                  </label>
                </div>
              </div>

              <div className="glass-panel p-6 bg-white border border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                  Footer Matrix
                </h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      Standard Declaration Text
                    </label>
                    <textarea
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-3 text-sm focus:ring-1 focus:ring-red-500 outline-none font-medium text-slate-600"
                      defaultValue="This document was generated by RED SEA HOLDING software. It does not require a physical signature as digital traceability guarantees authenticity."
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setIsFormatModalOpen(false)}
                className="px-5 py-2 text-slate-500 hover:text-slate-700 text-xs font-bold uppercase tracking-widest transition-colors font-mono"
              >
                Discard Changes
              </button>
              <button
                onClick={() => setIsFormatModalOpen(false)}
                className="px-6 py-2 bg-slate-900 text-white rounded text-xs font-bold uppercase tracking-widest shadow-lg hover:bg-black transition-all active:scale-95 flex items-center gap-2"
              >
                <Save className="w-3 h-3" /> Save Layout Context
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
