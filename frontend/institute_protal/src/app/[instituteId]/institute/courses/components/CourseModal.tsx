import React, { useState, useEffect } from "react";
import { Course, instituteService } from "@/services/instituteService";
import { FiX, FiBookOpen, FiUser } from "react-icons/fi";
import AiDescriptionField from "@/components/common/AiDescriptionField";
import { useFeatures } from "@/context/InstituteFeatureContext";
import { createPortal } from "react-dom";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", INR: "₹", AUD: "A$", CAD: "C$",
  SGD: "S$", AED: "د.إ", LKR: "Rs", JPY: "¥", CNY: "¥", BRL: "R$",
  MYR: "RM", NGN: "₦", PKR: "₨", ZAR: "R",
};

interface CourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (courseData: any) => Promise<void>;
  initialData?: Course | null;
  instituteId: string;
}

const CourseModal: React.FC<CourseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  instituteId,
}) => {
  const { hasFeature } = useFeatures();
  const voiceAgentEnabled = hasFeature("voice_agent");

  const DEFAULT_STUDENT_INSTRUCTIONS =
    "You are an AI tutor for this course.\n" +
    "Your ONLY purpose is to help students understand and learn the content of this course.\n" +
    "Rules:\n" +
    "- Greetings and brief follow-ups: answer directly, no tool call.\n" +
    "- ANY question about course topics, concepts, or materials: search course material IMMEDIATELY.\n" +
    "- After search: answer in 1-2 sentences, cite the page if available.\n" +
    "- If nothing is found: say so in one sentence and suggest the student ask their teacher.\n" +
    "- OFF-TOPIC: redirect in one sentence back to the course.\n" +
    "- Always be brief — 1 to 2 sentences per turn.";

  const DEFAULT_TEACHER_INSTRUCTIONS =
    "You are an AI assistant for the teacher of this course.\n" +
    "Your purpose is to help the teacher with lesson planning, content queries, and course material.\n" +
    "Rules:\n" +
    "- ANY question about course content or materials: search course material IMMEDIATELY.\n" +
    "- Answer in 1-2 sentences, cite page numbers where available.\n" +
    "- Help with curriculum planning, quiz creation ideas, and teaching strategies.\n" +
    "- OFF-TOPIC: redirect in one sentence back to educational topics.";

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    batchNumber: "",
    description: "",
    assignedTeacherId: "",
    price: "",
    paymentType: "fixed" as "fixed" | "monthly",
    monthlyPrice: "",
    studentAgentInstructions: DEFAULT_STUDENT_INSTRUCTIONS,
    teacherAgentInstructions: DEFAULT_TEACHER_INSTRUCTIONS,
  });
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currencySym, setCurrencySym] = useState("$");
  const [agentTab, setAgentTab] = useState<"student" | "teacher">("student");

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    instituteService.getInstituteById(instituteId).then((inst) => {
      if (inst?.currency) setCurrencySym(CURRENCY_SYMBOLS[inst.currency] ?? inst.currency);
    });
  }, [instituteId]);

  useEffect(() => {
    if (isOpen) {
      fetchTeachers();
      if (initialData) {
        setFormData({
          name: initialData.name,
          code: initialData.code,
          batchNumber: initialData.batchNumber || "",
          description: initialData.description || "",
          assignedTeacherId: initialData.assignedTeacher?.id || "",
          price: (initialData as any).price != null ? String((initialData as any).price) : "",
          paymentType: (initialData as any).paymentType ?? "fixed",
          monthlyPrice: (initialData as any).monthlyPrice != null ? String((initialData as any).monthlyPrice) : "",
          studentAgentInstructions: initialData.studentAgentInstructions || DEFAULT_STUDENT_INSTRUCTIONS,
          teacherAgentInstructions: initialData.teacherAgentInstructions || DEFAULT_TEACHER_INSTRUCTIONS,
        });
        setCoverImage(initialData.coverImage || null);
      } else {
        setFormData({
          name: "",
          code: "",
          batchNumber: "",
          description: "",
          assignedTeacherId: "",
          price: "",
          paymentType: "fixed",
          monthlyPrice: "",
          studentAgentInstructions: DEFAULT_STUDENT_INSTRUCTIONS,
          teacherAgentInstructions: DEFAULT_TEACHER_INSTRUCTIONS,
        });
        setCoverImage(null);
      }
      setSelectedFile(null);
    }
  }, [isOpen, initialData, instituteId]);


  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const users = await instituteService.getInstituteUsers(instituteId);
      const teacherUsers = users.filter(
        (u: any) => u.role?.name?.toLowerCase() === "teacher"
      );
      setTeachers(teacherUsers);
    } catch (error) {
      console.error("Failed to fetch teachers", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // In a real app, you'd upload the file here and get a URL
      // For now, we'll just pass the base64 string or the file object if the API supports it
      const submissionData = {
        ...formData,
        coverImage,
        price: formData.paymentType === "fixed" && formData.price !== "" ? parseFloat(formData.price) : null,
        monthlyPrice: formData.paymentType === "monthly" && formData.monthlyPrice !== "" ? parseFloat(formData.monthlyPrice) : null,
      };
      await onSubmit(submissionData);
      onClose();
    } catch (error) {
      console.error("Failed to submit course", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-999999 flex items-center justify-center bg-black/50 p-4 sm:p-6 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-xl dark:bg-gray-800 flex flex-col max-h-[90vh]">

        {/* Sticky header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {initialData ? "Edit Course" : "Create New Course"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Course Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="e.g. Introduction to Computer Science"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Course Code
              </label>
              <input
                type="text"
                id="code"
                name="code"
                value={formData.code}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g. CS101"
              />
            </div>

            <div>
              <label
                htmlFor="batchNumber"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Batch Number
              </label>
              <input
                type="text"
                id="batchNumber"
                name="batchNumber"
                value={formData.batchNumber}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g. 2024-A"
              />
            </div>
          </div>

          {/* Payment type toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Payment Type <span className="text-gray-400 font-normal">— leave price blank for free</span>
            </label>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, paymentType: "fixed" }))}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold border transition-colors ${
                  formData.paymentType === "fixed"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                }`}
              >
                Fixed Price
              </button>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, paymentType: "monthly" }))}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold border transition-colors ${
                  formData.paymentType === "monthly"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                }`}
              >
                Monthly Payment
              </button>
            </div>

            {formData.paymentType === "fixed" ? (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{currencySym}</span>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full pl-7 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="0.00"
                />
              </div>
            ) : (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{currencySym}</span>
                <input
                  type="number"
                  id="monthlyPrice"
                  name="monthlyPrice"
                  value={formData.monthlyPrice}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full pl-7 pr-16 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="0.00"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">/month</span>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="coverImage"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Course Cover Image
            </label>
            <div className="flex items-center gap-4">
              {coverImage && (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <img
                    src={coverImage}
                    alt="Course Cover"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <input
                type="file"
                id="coverImage"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  dark:file:bg-gray-700 dark:file:text-gray-300
                "
              />
            </div>
          </div>

          <AiDescriptionField
            label="Description"
            value={formData.description}
            onChange={(val) => setFormData((prev) => ({ ...prev, description: val }))}
            placeholder="Brief description of the course..."
            rows={3}
            context={formData.name ? `Course: ${formData.name}` : undefined}
          />

          <div>
            <label
              htmlFor="assignedTeacherId"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Assign Lecturer
            </label>
            <select
              id="assignedTeacherId"
              name="assignedTeacherId"
              value={formData.assignedTeacherId}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select a lecturer</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.firstName} {teacher.lastName} ({teacher.email})
                </option>
              ))}
            </select>
            {loading && (
              <p className="text-xs text-gray-500 mt-1">
                Loading lecturers...
              </p>
            )}
          </div>

          {voiceAgentEnabled && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">AI Agent Instructions</span>
                  <span className="hidden sm:inline text-xs text-gray-400">— Voice &amp; Chat</span>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setAgentTab("student")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
                    agentTab === "student"
                      ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/60 dark:bg-blue-900/20"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  }`}
                >
                  <FiBookOpen className="w-4 h-4" />
                  <span>Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAgentTab("teacher")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
                    agentTab === "teacher"
                      ? "text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400 bg-purple-50/60 dark:bg-purple-900/20"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  }`}
                >
                  <FiUser className="w-4 h-4" />
                  <span>Teacher</span>
                </button>
              </div>

              {/* Tab content */}
              <div className="p-4">
                {agentTab === "student" ? (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      How the AI tutor behaves when <span className="font-medium text-blue-600 dark:text-blue-400">students</span> ask questions about this course.
                    </p>
                    <textarea
                      id="studentAgentInstructions"
                      name="studentAgentInstructions"
                      rows={5}
                      value={formData.studentAgentInstructions}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/60 dark:text-white text-sm font-mono resize-y leading-relaxed"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      How the AI assistant behaves when the <span className="font-medium text-purple-600 dark:text-purple-400">teacher</span> queries this course's content.
                    </p>
                    <textarea
                      id="teacherAgentInstructions"
                      name="teacherAgentInstructions"
                      rows={6}
                      value={formData.teacherAgentInstructions}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700/60 dark:text-white text-sm font-mono resize-y leading-relaxed"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

        </div>{/* end scrollable body */}

          {/* Sticky footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {submitting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Saving...
                </>
              ) : (
                "Save Course"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default CourseModal;
