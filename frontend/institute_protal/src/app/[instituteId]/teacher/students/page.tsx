"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { instituteService } from "@/services/instituteService";
import Image from "next/image";

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePicture?: string;
  isActive: boolean;
};

export default function TeacherStudentsPage() {
  const params = useParams();
  const instituteId = params?.instituteId as string;

  const [students, setStudents] = useState<Student[]>([]);
  const [filtered, setFiltered] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!instituteId) return;
    (async () => {
      setLoading(true);
      try {
        const data = await instituteService.getInstituteUsers(instituteId, "student");
        setStudents(data ?? []);
        setFiltered(data ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [instituteId]);

  useEffect(() => {
    const t = search.toLowerCase();
    setFiltered(
      students.filter(
        (s) =>
          s.firstName?.toLowerCase().includes(t) ||
          s.lastName?.toLowerCase().includes(t) ||
          s.email?.toLowerCase().includes(t)
      )
    );
  }, [search, students]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Students</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">All enrolled students in this institute</p>
        </div>
        <input
          type="text"
          placeholder="Search students…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Student</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700" />
                        <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
                      </div>
                    </td>
                    <td className="px-5 py-4"><div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded" /></td>
                    <td className="px-5 py-4"><div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-10 text-center text-gray-400 dark:text-gray-500">
                    {search ? "No students match your search." : "No students found."}
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden shrink-0">
                          {s.profilePicture ? (
                            <Image width={36} height={36} src={s.profilePicture} alt="avatar" className="object-cover w-full h-full" />
                          ) : (
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                              {s.firstName?.charAt(0)}{s.lastName?.charAt(0)}
                            </span>
                          )}
                        </div>
                        <span className="font-medium text-gray-800 dark:text-white/90">{s.firstName} {s.lastName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-500 dark:text-gray-400">{s.email}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        s.isActive
                          ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                      }`}>
                        {s.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && (
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500">
            {filtered.length} student{filtered.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
