"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreate?: (course: { title: string; description?: string; students?: number }) => void;
}

const CreateCoursePopup: React.FC<Props> = ({ isOpen, onClose, onCreate }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [students, setStudents] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim()) {
      setError("Please provide a course title.");
      setTimeout(() => setError(null), 2500);
      return;
    }

    try {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 600));

      const course = {
        title: title.trim(),
        description: description.trim(),
        students: typeof students === "number" ? students : 0,
      };

      onCreate?.(course);
      setTitle("");
      setDescription("");
      setStudents("");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[540px] p-6 lg:p-8">
      <div>
        <h4 className="mb-2 text-2xl font-semibold text-gray-900 dark:text-white/90">Create Course</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">Add basic course information to get started.</p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={loading} className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-800" placeholder="e.g. Web Development" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={loading} className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm h-24 resize-none dark:bg-gray-900 dark:border-gray-800" placeholder="Short course description" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Initial Students (optional)</label>
            <input value={students === "" ? "" : String(students)} onChange={(e) => { const val = e.target.value.replace(/[^0-9]/g, ""); setStudents(val === "" ? "" : Number(val)); }} disabled={loading} className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-800" placeholder="0" />
          </div>
        </div>

        {error && <div className="mt-3 text-sm text-red-500">{error}</div>}

        <div className="flex items-center justify-end gap-3 mt-6">
          <Button size="sm" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={loading}>{loading ? "Creating..." : "Create"}</Button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateCoursePopup;
