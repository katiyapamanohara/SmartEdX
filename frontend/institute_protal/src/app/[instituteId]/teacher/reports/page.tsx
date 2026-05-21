"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { authService } from "@/services/authService";
import { examService, Exam } from "@/services/examService";
import { instituteService, Institute } from "@/services/instituteService";

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuizResult {
  contentId: string;
  contentTitle: string;
  score: number | null;
  totalMarks: number;
  attemptedAt: string | null;
}

interface CourseEntry {
  courseId: string;
  courseName: string;
  quizzes: QuizResult[];
}

interface StudentRow {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  courses: CourseEntry[];
}

interface ExamRow {
  examId: string;
  examTitle: string;
  courseId: string;
  score: number;
  totalMarks: number;
  passed: boolean;
  submittedAt: string;
}

interface StudentReport {
  userId: string;
  name: string;
  email: string;
  quizzes: (QuizResult & { courseName: string })[];
  exams: ExamRow[];
  quizAvg: number | null;
  examAvg: number | null;
  overallAvg: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(score: number, total: number) {
  return total > 0 ? Math.round((score / total) * 100) : 0;
}

function avg(nums: number[]): number | null {
  const valid = nums.filter((n) => !isNaN(n));
  return valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
}

function grade(p: number | null): string {
  if (p === null) return "—";
  if (p >= 90) return "A+";
  if (p >= 80) return "A";
  if (p >= 70) return "B";
  if (p >= 60) return "C";
  if (p >= 50) return "D";
  return "F";
}

function gradeColor(p: number | null): string {
  if (p === null) return "text-gray-400 dark:text-gray-500";
  if (p >= 70) return "text-green-600 dark:text-green-400";
  if (p >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString(); } catch { return s; }
}

// ── CSV download ──────────────────────────────────────────────────────────────

function downloadCSV(rows: string[][], filename: string) {
  const content = rows.map((r) => r.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── PDF (print) download ──────────────────────────────────────────────────────

interface PDFContext {
  institute: Institute | null;
  teacherName: string;
  studentCourses: CourseEntry[];
}

function printStudentReport(report: StudentReport, context: PDFContext) {
  const win = window.open("", "_blank");
  if (!win) return;

  const quizRows = report.quizzes.map((q) => `
    <tr>
      <td class="col-course">${q.courseName}</td>
      <td class="col-content">${q.contentTitle}</td>
      <td class="col-score">${q.score !== null ? `${q.score}/${q.totalMarks}` : "—"}</td>
      <td class="col-pct">${q.score !== null ? pct(q.score, q.totalMarks) + "%" : "—"}</td>
      <td class="col-date">${fmtDate(q.attemptedAt)}</td>
    </tr>`).join("");

  const examRows = report.exams.map((e) => `
    <tr>
      <td class="col-exam">${e.examTitle}</td>
      <td class="col-score">${e.score}/${e.totalMarks}</td>
      <td class="col-pct">${pct(e.score, e.totalMarks)}%</td>
      <td class="col-status ${e.passed ? 'pass' : 'fail'}">${e.passed ? "Pass" : "Fail"}</td>
      <td class="col-date">${fmtDate(e.submittedAt)}</td>
    </tr>`).join("");

  const coursesList = context.studentCourses.map(c => c.courseName).join(", ") || "—";
  const statusBg = (report.overallAvg ?? 0) >= 70 ? "#10b981" : (report.overallAvg ?? 0) >= 50 ? "#f59e0b" : "#ef4444";
  const statusColor = (report.overallAvg ?? 0) >= 70 ? "#065f46" : (report.overallAvg ?? 0) >= 50 ? "#92400e" : "#7f1d1d";

  win.document.write(`<!DOCTYPE html><html><head><title>Student Report - ${report.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: #fff; color: #1f2937; line-height: 1.5;
  }
  .container { max-width: 900px; margin: 0 auto; padding: 40px 30px; }

  /* Header */
  .header {
    border-bottom: 3px solid #3b82f6; padding-bottom: 24px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-start;
  }
  .header-left { flex: 1; }
  .institute-name { font-size: 24px; font-weight: 700; color: #3b82f6; margin-bottom: 4px; }
  .report-title { font-size: 14px; color: #6b7280; font-weight: 500; }
  .header-right { text-align: right; }
  .generated-date { font-size: 12px; color: #9ca3af; }

  /* Student Info Section */
  .info-section {
    display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px;
    background: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;
  }
  .info-group { }
  .info-label { font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-value { font-size: 15px; font-weight: 600; color: #111; margin-top: 4px; }

  /* Status Bar */
  .status-bar {
    display: flex; gap: 16px; margin-bottom: 28px;
  }
  .status-card {
    flex: 1; background: linear-gradient(135deg, ${statusBg} 0%, ${statusBg}dd 100%);
    color: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  .status-value { font-size: 32px; font-weight: 700; line-height: 1; }
  .status-label { font-size: 12px; font-weight: 500; margin-top: 6px; opacity: 0.9; }

  /* Summary Cards */
  .summary-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px;
  }
  .summary-card {
    background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center;
  }
  .summary-value { font-size: 26px; font-weight: 700; color: #3b82f6; }
  .summary-label { font-size: 13px; color: #6b7280; margin-top: 6px; font-weight: 500; }

  /* Section Headers */
  .section-header {
    font-size: 16px; font-weight: 700; color: #111; margin: 28px 0 16px;
    padding-bottom: 12px; border-bottom: 2px solid #e5e7eb;
  }

  /* Tables */
  .table-wrapper { margin-bottom: 24px; }
  table {
    width: 100%; border-collapse: collapse; font-size: 13px;
  }
  th {
    background: #f3f4f6; padding: 12px; text-align: left; border-bottom: 2px solid #d1d5db;
    font-weight: 600; color: #374151;
  }
  td {
    padding: 11px 12px; border-bottom: 1px solid #e5e7eb;
  }
  tr:last-child td { border-bottom: none; }

  .col-course, .col-exam, .col-content { font-weight: 500; }
  .col-pct { font-weight: 600; color: #3b82f6; }
  .col-status.pass { color: #059669; font-weight: 600; }
  .col-status.fail { color: #dc2626; font-weight: 600; }
  .col-date { color: #6b7280; font-size: 12px; }

  .empty-state {
    text-align: center; padding: 32px 16px; color: #9ca3af; font-style: italic;
  }

  /* Footer */
  .footer {
    margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;
    text-align: center; font-size: 12px; color: #9ca3af;
  }

  @media print {
    body { margin: 0; padding: 0; }
    .container { padding: 20px; }
    .page-break { page-break-after: always; }
  }
</style></head><body>
<div class="container">
  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <div class="institute-name">${context.institute?.name || "Institute"}</div>
      <div class="report-title">Student Performance Report</div>
    </div>
    <div class="header-right">
      <div class="generated-date">${new Date().toLocaleString()}</div>
    </div>
  </div>

  <!-- Student Info -->
  <div class="info-section">
    <div class="info-group">
      <div class="info-label">Student Name</div>
      <div class="info-value">${report.name}</div>
    </div>
    <div class="info-group">
      <div class="info-label">Student ID</div>
      <div class="info-value">${report.userId}</div>
    </div>
    <div class="info-group">
      <div class="info-label">Email</div>
      <div class="info-value">${report.email}</div>
    </div>
    <div class="info-group">
      <div class="info-label">Instructor</div>
      <div class="info-value">${context.teacherName || "—"}</div>
    </div>
  </div>

  <!-- Status Badge -->
  <div class="status-bar">
    <div class="status-card">
      <div class="status-value">${report.overallAvg !== null ? report.overallAvg + "%" : "—"}</div>
      <div class="status-label">Overall Performance</div>
    </div>
  </div>

  <!-- Summary Grid -->
  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-value">${grade(report.overallAvg)}</div>
      <div class="summary-label">Grade</div>
    </div>
    <div class="summary-card">
      <div class="summary-value">${report.quizAvg !== null ? report.quizAvg + "%" : "—"}</div>
      <div class="summary-label">Quiz Average</div>
    </div>
    <div class="summary-card">
      <div class="summary-value">${report.examAvg !== null ? report.examAvg + "%" : "—"}</div>
      <div class="summary-label">Exam Average</div>
    </div>
  </div>

  <!-- Course Info -->
  <div class="info-section">
    <div class="info-group">
      <div class="info-label">Enrolled Courses</div>
      <div class="info-value">${coursesList}</div>
    </div>
    <div class="info-group">
      <div class="info-label">Status</div>
      <div class="info-value">${(report.overallAvg ?? 0) >= 50 ? "Passing" : report.overallAvg === null ? "No Data" : "At Risk"}</div>
    </div>
  </div>

  <!-- Quiz Results -->
  <div class="section-header">Quiz Results</div>
  <div class="table-wrapper">
    ${report.quizzes.length === 0
      ? '<div class="empty-state">No quiz attempts yet</div>'
      : `<table><thead><tr><th>Course</th><th>Quiz Title</th><th>Score</th><th>Percentage</th><th>Attempt Date</th></tr></thead><tbody>${quizRows}</tbody></table>`}
  </div>

  <!-- Exam Results -->
  <div class="section-header">Exam Results</div>
  <div class="table-wrapper">
    ${report.exams.length === 0
      ? '<div class="empty-state">No exam attempts yet</div>'
      : `<table><thead><tr><th>Exam Title</th><th>Score</th><th>Percentage</th><th>Status</th><th>Attempt Date</th></tr></thead><tbody>${examRows}</tbody></table>`}
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>This is an official performance report generated by ${context.institute?.name || "the institute"}.</p>
  </div>
</div>
</body></html>`);
  win.document.close();
  win.print();
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TeacherReportsPage() {
  const params = useParams();
  const instituteId = params?.instituteId as string;

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentReport | null>(null);
  const [sortKey, setSortKey] = useState<"name" | "quizAvg" | "examAvg" | "overall">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterCourse, setFilterCourse] = useState("All");
  const [institute, setInstitute] = useState<Institute | null>(null);
  const [teacherName, setTeacherName] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!instituteId) return;
    setLoading(true);
    try {
      const token = authService.getToken();
      const user = authService.getUser();

      const [rawStudents, rawExams, instituteData] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/institutes/institutes/${instituteId}/courses/student-report`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(async (r) => {
          if (!r.ok) {
            console.error(`[student-report] HTTP ${r.status}`, await r.text().catch(() => ''));
            return [];
          }
          return r.json();
        }),
        examService.getMyExams(instituteId),
        instituteService.getInstituteById(instituteId),
      ]);

      setStudents(rawStudents as StudentRow[]);
      setExams(rawExams);
      setInstitute(instituteData);

      if (user) {
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
        setTeacherName(fullName);
      }
    } finally {
      setLoading(false);
    }
  }, [instituteId]);

  useEffect(() => { load(); }, [load]);

  // Build StudentReport from raw data
  const reports = useMemo<StudentReport[]>(() => {
    return students.map((s) => {
      const name = [s.firstName, s.lastName].filter(Boolean).join(" ") || s.email;

      // Flatten quizzes across all courses for this student
      const quizzes: (QuizResult & { courseName: string })[] = s.courses.flatMap((c) =>
        c.quizzes.map((q) => ({ ...q, courseName: c.courseName }))
      );

      // Exams
      const studentExams: ExamRow[] = exams
        .filter((e) => {
          const attempt = (e as any).studentAttempts?.[s.userId] ?? e.myAttempt;
          return !!attempt;
        })
        .map((e) => {
          const attempt = (e as any).studentAttempts?.[s.userId] ?? e.myAttempt!;
          return {
            examId: e.id,
            examTitle: e.title,
            courseId: e.courseId,
            score: attempt.score,
            totalMarks: attempt.totalMarks,
            passed: attempt.passed,
            submittedAt: attempt.submittedAt,
          };
        });

      const quizPcts = quizzes.filter((q) => q.score !== null).map((q) => pct(q.score!, q.totalMarks));
      const examPcts = studentExams.map((e) => pct(e.score, e.totalMarks));
      const quizAvg = avg(quizPcts);
      const examAvg = avg(examPcts);
      const overallAvg = avg([...quizPcts, ...examPcts]);

      return { userId: s.userId, name, email: s.email, quizzes, exams: studentExams, quizAvg, examAvg, overallAvg };
    });
  }, [students, exams]);

  // All unique courses across students
  const allCourses = useMemo(() => {
    const map = new Map<string, string>();
    students.forEach((s) => s.courses.forEach((c) => map.set(c.courseId, c.courseName)));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [students]);

  const filtered = useMemo(() => {
    let rows = reports;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
    }
    if (filterCourse !== "All") {
      rows = rows.filter((r) => {
        const s = students.find((st) => st.userId === r.userId);
        return s?.courses.some((c) => c.courseId === filterCourse);
      });
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sortKey === "name") return dir * a.name.localeCompare(b.name);
      if (sortKey === "quizAvg") return dir * ((a.quizAvg ?? -1) - (b.quizAvg ?? -1));
      if (sortKey === "examAvg") return dir * ((a.examAvg ?? -1) - (b.examAvg ?? -1));
      return dir * ((a.overallAvg ?? -1) - (b.overallAvg ?? -1));
    });
  }, [reports, search, filterCourse, sortKey, sortDir, students]);

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  function openStudent(r: StudentReport) { setSelectedStudent(r); }

  const getPDFContext = (studentId: string): PDFContext => {
    const studentData = students.find((s) => s.userId === studentId);
    return {
      institute,
      teacherName,
      studentCourses: studentData?.courses ?? [],
    };
  };

  function exportAllCSV() {
    const header = [
      "Student ID", "Name", "Email", "Enrolled Courses",
      "Overall Avg %", "Grade", "Status",
      "Quiz Avg %", "Quizzes Attempted", "Total Quizzes",
      "Exam Avg %", "Exams Attempted", "Exams Passed"
    ];
    
    const rows = filtered.map((r) => {
      const studentCourses = students.find((s) => s.userId === r.userId)?.courses ?? [];
      const coursesStr = studentCourses.map(c => c.courseName).join("; ");
      const status = (r.overallAvg ?? 0) >= 50 ? "Passing" : r.overallAvg === null ? "No Data" : "At Risk";
      const passedExams = r.exams.filter(e => e.passed).length;
      const quizzesAttempted = r.quizzes.filter((q) => q.score !== null).length;

      return [
        r.userId, r.name, r.email, coursesStr,
        r.overallAvg !== null ? String(r.overallAvg) : "—",
        grade(r.overallAvg), status,
        r.quizAvg !== null ? String(r.quizAvg) : "—",
        String(quizzesAttempted), String(r.quizzes.length),
        r.examAvg !== null ? String(r.examAvg) : "—",
        String(r.exams.length), String(passedExams)
      ];
    });
    
    downloadCSV([header, ...rows], `Class_Report_${new Date().toISOString().split("T")[0]}.csv`);
  }

  function exportDetailCSV(r: StudentReport) {
    const status = (r.overallAvg ?? 0) >= 50 ? "Passing" : r.overallAvg === null ? "No Data" : "At Risk";
    
    const rows: string[][] = [
      ["STUDENT PERFORMANCE REPORT"],
      ["Name:", r.name],
      ["Email:", r.email],
      ["Student ID:", r.userId],
      ["Generated On:", new Date().toLocaleString()],
      [],
      ["--- OVERALL SUMMARY ---"],
      ["Overall Average:", r.overallAvg !== null ? `${r.overallAvg}%` : "—"],
      ["Grade:", grade(r.overallAvg)],
      ["Status:", status],
      ["Quiz Average:", r.quizAvg !== null ? `${r.quizAvg}%` : "—"],
      ["Exam Average:", r.examAvg !== null ? `${r.examAvg}%` : "—"],
      ["Total Quizzes Available:", String(r.quizzes.length)],
      ["Quizzes Attempted:", String(r.quizzes.filter((q) => q.score !== null).length)],
      ["Exams Attempted:", String(r.exams.length)],
      ["Exams Passed:", String(r.exams.filter(e => e.passed).length)],
      [],
      ["--- DETAILED QUIZ RESULTS ---"],
      ["Course Name", "Quiz Title", "Score Achieved", "Total Marks", "Percentage", "Attempt Date"],
      ...r.quizzes.map((q) => [
        q.courseName, 
        q.contentTitle, 
        String(q.score ?? "Not Attempted"), 
        String(q.totalMarks), 
        q.score !== null ? `${pct(q.score, q.totalMarks)}%` : "—", 
        fmtDate(q.attemptedAt)
      ]),
      [],
      ["--- DETAILED EXAM RESULTS ---"],
      ["Course ID", "Exam Title", "Score Achieved", "Total Marks", "Percentage", "Result Status", "Attempt Date"],
      ...r.exams.map((e) => [
        e.courseId, 
        e.examTitle, 
        String(e.score), 
        String(e.totalMarks), 
        `${pct(e.score, e.totalMarks)}%`, 
        e.passed ? "Pass" : "Fail", 
        fmtDate(e.submittedAt)
      ]),
    ];
    downloadCSV(rows, `Student_Report_${r.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`);
  }

  const SortBtn = ({ k, label }: { k: typeof sortKey; label: string }) => (
    <button onClick={() => toggleSort(k)} className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white transition-colors group">
      {label}
      <span className={`text-[10px] ${sortKey === k ? "opacity-100" : "opacity-0 group-hover:opacity-40"}`}>
        {sortKey === k && sortDir === "desc" ? "▼" : "▲"}
      </span>
    </button>
  );

  // Summary stats
  const totalStudents = reports.length;
  const avgOverall = avg(reports.map((r) => r.overallAvg ?? NaN).filter((n) => !isNaN(n)));
  const passCount = reports.filter((r) => (r.overallAvg ?? 0) >= 50).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Quiz &amp; exam performance across all your courses
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 transition-colors"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button
            onClick={exportAllCSV}
            disabled={loading || filtered.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Students", value: loading ? "—" : String(totalStudents), color: "text-brand-600 dark:text-brand-400" },
          { label: "Class Average", value: loading ? "—" : avgOverall !== null ? `${avgOverall}%` : "—", color: gradeColor(avgOverall) },
          { label: "Passing (≥50%)", value: loading ? "—" : `${passCount}/${totalStudents}`, color: "text-green-600 dark:text-green-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5">
            <span className="text-sm text-gray-500 dark:text-gray-400">{s.label}</span>
            <p className={`mt-1 text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student name or email…"
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        {allCourses.length > 1 && (
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="All">All Courses</option>
            {allCourses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03]">
        {loading ? (
          <div className="py-20 text-center text-sm text-gray-400 dark:text-gray-500">Loading report data…</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-sm text-gray-400 dark:text-gray-500">
            {reports.length === 0 ? "No students enrolled in your courses yet." : "No students match your filters."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-white/[0.02]">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    <SortBtn k="name" label="Student" />
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Courses</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    <SortBtn k="quizAvg" label="Quiz Avg" />
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    <SortBtn k="examAvg" label="Exam Avg" />
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    <SortBtn k="overall" label="Overall" />
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Grade</th>
                  <th className="px-5 py-3 text-end text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map((r) => {
                  const studentCourses = students.find((s) => s.userId === r.userId)?.courses ?? [];
                  return (
                    <tr key={r.userId} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-800 dark:text-white/90">{r.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{r.email}</p>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-500 dark:text-gray-400">
                        {studentCourses.slice(0, 2).map((c) => (
                          <span key={c.courseId} className="inline-block bg-gray-100 dark:bg-white/[0.06] rounded-full px-2 py-0.5 mr-1 mb-0.5">
                            {c.courseName}
                          </span>
                        ))}
                        {studentCourses.length > 2 && (
                          <span className="text-gray-400">+{studentCourses.length - 2}</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`font-semibold ${gradeColor(r.quizAvg)}`}>
                          {r.quizAvg !== null ? `${r.quizAvg}%` : "—"}
                        </span>
                        <p className="text-xs text-gray-400">{r.quizzes.filter((q) => q.score !== null).length}/{r.quizzes.length} done</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`font-semibold ${gradeColor(r.examAvg)}`}>
                          {r.examAvg !== null ? `${r.examAvg}%` : "—"}
                        </span>
                        <p className="text-xs text-gray-400">{r.exams.length} attempt{r.exams.length !== 1 ? "s" : ""}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${(r.overallAvg ?? 0) >= 70 ? "bg-green-500" : (r.overallAvg ?? 0) >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                              style={{ width: `${r.overallAvg ?? 0}%` }}
                            />
                          </div>
                          <span className={`font-semibold text-sm ${gradeColor(r.overallAvg)}`}>
                            {r.overallAvg !== null ? `${r.overallAvg}%` : "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                          grade(r.overallAvg) === "—" ? "bg-gray-100 dark:bg-gray-800 text-gray-400"
                          : (r.overallAvg ?? 0) >= 70 ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300"
                          : (r.overallAvg ?? 0) >= 50 ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300"
                          : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300"
                        }`}>
                          {grade(r.overallAvg)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-end">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => openStudent(r)}
                            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                          >
                            View
                          </button>
                          <button
                            onClick={() => exportDetailCSV(r)}
                            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                            title="Download CSV"
                          >
                            CSV
                          </button>
                          <button
                            onClick={() => printStudentReport(r, getPDFContext(r.userId))}
                            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-brand-200 dark:border-brand-500/40 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                            title="Download PDF"
                          >
                            PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer count */}
      {!loading && filtered.length > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-right -mt-2">
          Showing {filtered.length} of {reports.length} students
        </p>
      )}

      {/* ── Student Detail Modal ──────────────────────────────────────────────── */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedStudent(null)}>
          <div
            ref={modalRef}
            className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{selectedStudent.name}</h2>
                <p className="text-sm text-gray-400 dark:text-gray-500">{selectedStudent.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => exportDetailCSV(selectedStudent)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  CSV
                </button>
                <button
                  onClick={() => printStudentReport(selectedStudent, getPDFContext(selectedStudent.userId))}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-500 text-white hover:bg-brand-600"
                >
                  PDF
                </button>
                <button onClick={() => setSelectedStudent(null)} className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Summary strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 dark:divide-gray-700 border-b border-gray-100 dark:border-gray-700">
              {[
                { label: "Overall", value: selectedStudent.overallAvg !== null ? `${selectedStudent.overallAvg}%` : "—", sub: grade(selectedStudent.overallAvg) },
                { label: "Quiz Avg", value: selectedStudent.quizAvg !== null ? `${selectedStudent.quizAvg}%` : "—", sub: `${selectedStudent.quizzes.filter(q => q.score !== null).length} done` },
                { label: "Exam Avg", value: selectedStudent.examAvg !== null ? `${selectedStudent.examAvg}%` : "—", sub: `${selectedStudent.exams.length} done` },
                { label: "Status", value: (selectedStudent.overallAvg ?? 0) >= 50 ? "Passing" : selectedStudent.overallAvg === null ? "No data" : "At Risk", sub: "" },
              ].map((s) => (
                <div key={s.label} className="px-4 py-3 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                  <p className={`text-lg font-bold ${gradeColor(selectedStudent.overallAvg)}`}>{s.value}</p>
                  {s.sub && <p className="text-xs text-gray-400">{s.sub}</p>}
                </div>
              ))}
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {/* Quiz results */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">Quiz Results</h3>
                {selectedStudent.quizzes.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">No quizzes available.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {selectedStudent.quizzes.map((q) => {
                      const p = q.score !== null ? pct(q.score, q.totalMarks) : null;
                      return (
                        <div key={q.contentId} className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">{q.contentTitle}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{q.courseName} · {fmtDate(q.attemptedAt)}</p>
                          </div>
                          {p !== null ? (
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="w-24 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                                <div className={`h-full rounded-full ${p >= 70 ? "bg-green-500" : p >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${p}%` }} />
                              </div>
                              <span className={`text-xs font-semibold w-10 text-right ${gradeColor(p)}`}>{p}%</span>
                              <span className="text-xs text-gray-400 w-12 text-right">{q.score}/{q.totalMarks}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic shrink-0">Not attempted</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Exam results */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">Exam Results</h3>
                {selectedStudent.exams.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">No exam attempts yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {selectedStudent.exams.map((e) => {
                      const p = pct(e.score, e.totalMarks);
                      return (
                        <div key={e.examId} className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">{e.examTitle}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{fmtDate(e.submittedAt)}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${e.passed ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300" : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300"}`}>
                              {e.passed ? "Pass" : "Fail"}
                            </span>
                            <div className="w-24 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                              <div className={`h-full rounded-full ${p >= 70 ? "bg-green-500" : p >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${p}%` }} />
                            </div>
                            <span className={`text-xs font-semibold w-10 text-right ${gradeColor(p)}`}>{p}%</span>
                            <span className="text-xs text-gray-400 w-16 text-right">{e.score}/{e.totalMarks}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
