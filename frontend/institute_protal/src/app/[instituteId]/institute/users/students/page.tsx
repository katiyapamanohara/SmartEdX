"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { instituteService } from "@/services/instituteService";
import { PlusIcon } from "@/icons";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrashBinIcon, EyeIcon } from "@/icons";
import { FiX } from "react-icons/fi";

// ─── Types ────────────────────────────────────────────────────────────────────

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePicture?: string;
  role?: any;
  isActive: boolean;
};

// ─── Students Table ───────────────────────────────────────────────────────────

function StudentsTable({
  students,
  loading,
  onDelete,
  onToggleStatus,
  onView,
}: {
  students: Student[];
  loading: boolean;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onView: (student: Student) => void;
}) {
  const [actionLoading, setActionLoading] = useState<{ [k: string]: string | null }>({});

  const handleAction = async (
    id: string,
    type: "delete" | "toggle",
    fn: () => Promise<void>
  ) => {
    setActionLoading((p) => ({ ...p, [id]: type }));
    try { await fn(); } catch (e) { console.error(e); }
    finally { setActionLoading((p) => ({ ...p, [id]: null })); }
  };

  const confirmDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this student?")) {
      handleAction(id, "delete", async () => onDelete(id));
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <div className="min-w-[700px]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Student</TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Email</TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-end text-theme-xs dark:text-gray-400">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="animate-pulse">
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                        <div className="flex flex-col gap-1">
                          <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
                          <div className="h-3 w-16 bg-gray-100 dark:bg-gray-800 rounded" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4"><div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded" /></TableCell>
                    <TableCell className="px-5 py-4"><div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" /></TableCell>
                    <TableCell className="px-5 py-4"><div className="flex justify-end gap-2"><div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full" /><div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full" /></div></TableCell>
                  </TableRow>
                ))
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell className="px-5 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={4}>
                    No students found. Add one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                students.map((s) => (
                  <TableRow key={s.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
                    {/* Name */}
                    <TableCell className="px-5 py-4 text-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden shrink-0">
                          {s.profilePicture ? (
                            <Image width={40} height={40} src={s.profilePicture} alt={`${s.firstName} ${s.lastName}`} className="object-cover w-full h-full" />
                          ) : (
                            <span className="text-gray-500 text-sm font-bold">{s.firstName?.charAt(0)}{s.lastName?.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">{s.firstName} {s.lastName}</span>
                          <span className="block text-gray-500 text-theme-xs dark:text-gray-400">Student</span>
                        </div>
                      </div>
                    </TableCell>
                    {/* Email */}
                    <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{s.email}</TableCell>
                    {/* Status toggle */}
                    <TableCell className="px-5 py-4 text-start">
                      <label className={`inline-flex items-center cursor-pointer ${actionLoading[s.id] === "toggle" ? "opacity-50 pointer-events-none" : ""}`}>
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={s.isActive}
                          disabled={!!actionLoading[s.id]}
                          onChange={() => handleAction(s.id, "toggle", async () => onToggleStatus(s.id))}
                        />
                        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-500" />
                        <span className={`ms-3 text-sm font-medium ${s.isActive ? "text-green-500" : "text-gray-900 dark:text-gray-300"}`}>
                          {actionLoading[s.id] === "toggle" ? "Updating..." : s.isActive ? "Active" : "Inactive"}
                        </span>
                      </label>
                    </TableCell>
                    {/* Actions */}
                    <TableCell className="px-5 py-4 text-end">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => onView(s)} className="p-2 text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-full transition-colors" title="View Details">
                          <EyeIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => confirmDelete(s.id)}
                          disabled={!!actionLoading[s.id]}
                          className={`p-2 text-gray-500 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-500/10 rounded-full transition-colors ${actionLoading[s.id] === "delete" ? "opacity-50 cursor-not-allowed" : ""}`}
                          title="Delete Student"
                        >
                          {actionLoading[s.id] === "delete" ? (
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            <TrashBinIcon className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// ─── Add Student Modal ────────────────────────────────────────────────────────

function AddStudentModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: Student | null;
}) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
  useEffect(() => {
    if (isOpen) setEmail(initialData?.email ?? "");
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try { await onSubmit({ email }); onClose(); }
    catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {initialData ? "Edit Student" : "Add Student"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-700 transition-colors">
            <FiX className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter student email"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </>
              ) : "Save Student"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ─── Student Details Modal ────────────────────────────────────────────────────

function StudentDetailsModal({
  isOpen,
  onClose,
  student,
}: {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Student Details</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {!student ? (
          <div className="animate-pulse space-y-3">
            <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto" />
            <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded mx-auto" />
            <div className="h-4 w-56 bg-gray-100 dark:bg-gray-800 rounded mx-auto" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
              {student.profilePicture ? (
                <Image width={80} height={80} src={student.profilePicture} alt="avatar" className="object-cover w-full h-full" />
              ) : (
                <span className="text-2xl font-bold text-gray-500">{student.firstName?.charAt(0)}{student.lastName?.charAt(0)}</span>
              )}
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{student.firstName} {student.lastName}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{student.email}</p>
            </div>
            <div className="w-full space-y-2 border-t border-gray-100 dark:border-gray-700 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Role</span>
                <span className="font-medium text-gray-800 dark:text-white/90 capitalize">
                  {typeof student.role === "object" ? student.role?.name : student.role ?? "Student"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Status</span>
                <span className={`font-medium ${student.isActive ? "text-green-500" : "text-red-500"}`}>
                  {student.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const StudentsPage = () => {
  const params = useParams();
  const instituteId = params?.instituteId as string;

  const [students, setStudents] = useState<Student[]>([]);
  const [filtered, setFiltered] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [viewStudent, setViewStudent] = useState<Student | null>(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await instituteService.getInstituteUsers(instituteId, "student");
      setStudents(data ?? []);
      setFiltered(data ?? []);
    } catch (e) {
      console.error("Failed to fetch students", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (instituteId) fetchStudents(); }, [instituteId]);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    setFiltered(
      students.filter(
        (s) =>
          s.firstName?.toLowerCase().includes(term) ||
          s.lastName?.toLowerCase().includes(term) ||
          s.email?.toLowerCase().includes(term)
      )
    );
  }, [searchTerm, students]);

  const handleAdd = () => { setSelectedStudent(null); setIsAddModalOpen(true); };

  const handleSave = async (data: any) => {
    if (selectedStudent) {
      await instituteService.updateInstituteUser(instituteId, selectedStudent.id, data);
    } else {
      await instituteService.createInstituteUser(instituteId, { ...data, role: "student" });
    }
    fetchStudents();
  };

  const handleDelete = async (id: string) => {
    await instituteService.deleteInstituteUser(instituteId, id);
    fetchStudents();
  };

  const handleToggleStatus = async (id: string) => {
    await instituteService.toggleInstituteUserStatus(instituteId, id);
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s)));
    fetchStudents();
  };

  const handleView = (student: Student) => {
    setViewStudent(student);
    setIsDetailsModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student Management</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage your institute&apos;s students</p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Add Student
        </button>
      </div>

      {/* Search bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700">
        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 shrink-0">
          {loading ? "Loading..." : `${filtered.length} student${filtered.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Table */}
      <StudentsTable
        students={filtered}
        loading={loading}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
        onView={handleView}
      />

      {/* Modals */}
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleSave}
        initialData={selectedStudent}
      />
      <StudentDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        student={viewStudent}
      />
    </div>
  );
};

export default StudentsPage;
