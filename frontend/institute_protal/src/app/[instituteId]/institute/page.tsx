"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { instituteService } from "@/services/instituteService";
import { authService } from "@/services/authService";
import { GroupIcon, BoxIconLine, ArrowUpIcon } from "@/icons";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const API = process.env.NEXT_PUBLIC_API_URL;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", INR: "₹", AUD: "A$", CAD: "C$",
  SGD: "S$", AED: "د.إ", LKR: "Rs", JPY: "¥", CNY: "¥", BRL: "R$",
  MYR: "RM", NGN: "₦", PKR: "₨", ZAR: "R",
};

function currencySymbol(currency?: string) {
  return CURRENCY_SYMBOLS[currency ?? "USD"] ?? currency ?? "$";
}

function token() { return authService.getToken(); }

async function fetchJson(url: string) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" } });
  if (!r.ok) return null;
  return r.json();
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface StudentRow {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  courses: {
    courseId: string;
    courseName: string;
    assignedTeacherId?: string;
    assignedTeacherName?: string;
    price?: number;
    paidAt?: string;
    quizzes: { score: number | null; totalMarks: number; contentId: string; contentTitle: string; attemptedAt: string | null }[];
  }[];
}

interface TeacherAlert {
  teacherId: string;
  teacherName: string;
  courseName: string;
  avgScore: number;
  studentCount: number;
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, loading, color = "brand" }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; loading: boolean; color?: string;
}) {
  const badge: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
    green: "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
    red:   "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400",
  };
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
      <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
        {icon}
      </div>
      <div className="flex items-end justify-between mt-5">
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
          <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
            {loading ? <span className="animate-pulse text-gray-300 dark:text-gray-700">---</span> : value}
          </h4>
          {sub && !loading && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${badge[color] ?? badge.brand}`}>
          <ArrowUpIcon className="w-3 h-3" /> Live
        </span>
      </div>
    </div>
  );
}

// ── Alert banner ───────────────────────────────────────────────────────────────

function AlertBanner({ alerts }: { alerts: TeacherAlert[] }) {
  if (!alerts.length) return null;
  return (
    <div className="col-span-12">
      <div className="rounded-2xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10 p-5">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <h3 className="text-sm font-bold text-red-700 dark:text-red-400">Performance Alerts — Lecturer Review Required</h3>
        </div>
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className="flex items-center justify-between gap-4 rounded-xl bg-white dark:bg-red-900/20 border border-red-100 dark:border-red-800 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{a.teacherName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{a.courseName} · {a.studentCount} students</p>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-lg font-bold text-red-600 dark:text-red-400">{a.avgScore}%</span>
                <p className="text-[10px] text-red-400 font-medium">avg score</p>
              </div>
              <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                Needs Improvement
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────────

export default function InstituteDashboard() {
  const params = useParams();
  const instituteId = params?.instituteId as string;

  const [loading, setLoading] = useState(true);
  const [studentRows, setStudentRows] = useState<StudentRow[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [teacherCount, setTeacherCount] = useState(0);
  const [courseCount, setCourseCount] = useState(0);
  const [enrollmentByMonth, setEnrollmentByMonth] = useState<number[]>(Array(12).fill(0));
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    if (!instituteId) return;
    (async () => {
      setLoading(true);
      try {
        const [students, teachers, courses, enrollment, report, institute] = await Promise.all([
          instituteService.getInstituteUsers(instituteId, "student"),
          instituteService.getTeacherCount(instituteId),
          instituteService.getCourses(instituteId),
          instituteService.getMonthlyStudentEnrollment(instituteId),
          fetchJson(`${API}/api/institutes/institutes/${instituteId}/courses/student-report`),
          instituteService.getInstituteById(instituteId),
        ]);
        setStudentCount(students.length);
        setTeacherCount(teachers);
        setCourseCount(courses.length);
        setEnrollmentByMonth(enrollment);
        setStudentRows(Array.isArray(report) ? report : []);
        if (institute?.currency) setCurrency(institute.currency);
      } catch (e) {
        console.error("InstituteDashboard:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [instituteId]);

  // ── Derived analytics ──────────────────────────────────────────────────────

  const totalRevenue = useMemo(() => {
    let sum = 0;
    studentRows.forEach(s => s.courses.forEach(c => { if (c.price) sum += parseFloat(String(c.price)); }));
    return sum;
  }, [studentRows]);

  const revenueByMonth = useMemo(() => {
    const arr = Array(12).fill(0);
    studentRows.forEach(s =>
      s.courses.forEach(c => {
        if (c.price && c.paidAt) {
          const m = new Date(c.paidAt).getMonth();
          arr[m] += parseFloat(String(c.price));
        }
      })
    );
    return arr;
  }, [studentRows]);

  // Teacher performance map: teacherId -> { scores[], name, courses }
  const teacherPerf = useMemo(() => {
    const map = new Map<string, { name: string; scores: number[]; courses: Set<string>; studentCount: number }>();
    studentRows.forEach(s =>
      s.courses.forEach(c => {
        const tid = c.assignedTeacherId;
        const tname = c.assignedTeacherName ?? "Unknown Teacher";
        if (!tid) return;
        if (!map.has(tid)) map.set(tid, { name: tname, scores: [], courses: new Set(), studentCount: 0 });
        const entry = map.get(tid)!;
        entry.courses.add(c.courseId);
        entry.studentCount++;
        c.quizzes.forEach(q => {
          if (q.score !== null && q.totalMarks > 0)
            entry.scores.push(Math.round((q.score / q.totalMarks) * 100));
        });
      })
    );
    return map;
  }, [studentRows]);

  const teacherAlerts = useMemo((): TeacherAlert[] => {
    const alerts: TeacherAlert[] = [];
    teacherPerf.forEach((val, tid) => {
      if (!val.scores.length) return;
      const avg = Math.round(val.scores.reduce((a, b) => a + b, 0) / val.scores.length);
      if (avg < 50) {
        alerts.push({
          teacherId: tid,
          teacherName: val.name,
          courseName: `${val.courses.size} course${val.courses.size !== 1 ? "s" : ""}`,
          avgScore: avg,
          studentCount: val.studentCount,
        });
      }
    });
    return alerts.sort((a, b) => a.avgScore - b.avgScore);
  }, [teacherPerf]);

  const teacherTableRows = useMemo(() => {
    return Array.from(teacherPerf.entries()).map(([tid, val]) => {
      const avg = val.scores.length ? Math.round(val.scores.reduce((a, b) => a + b, 0) / val.scores.length) : null;
      return { tid, name: val.name, courses: val.courses.size, students: val.studentCount, avg };
    }).sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));
  }, [teacherPerf]);

  // Student overall avg
  const studentAvg = useMemo(() => {
    const all: number[] = [];
    studentRows.forEach(s =>
      s.courses.forEach(c =>
        c.quizzes.forEach(q => {
          if (q.score !== null && q.totalMarks > 0)
            all.push(Math.round((q.score / q.totalMarks) * 100));
        })
      )
    );
    return all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : null;
  }, [studentRows]);

  // Recent payments (last 6 entries)
  const recentPayments = useMemo(() => {
    const list: { student: string; course: string; amount: number; date: string }[] = [];
    studentRows.forEach(s =>
      s.courses.forEach(c => {
        if (c.price && c.paidAt)
          list.push({
            student: `${s.firstName} ${s.lastName}`.trim() || s.email,
            course: c.courseName,
            amount: parseFloat(String(c.price)),
            date: c.paidAt,
          });
      })
    );
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
  }, [studentRows]);

  // ── Chart configs ──────────────────────────────────────────────────────────

  const sym = currencySymbol(currency);

  const revenueChartOptions: ApexOptions = {
    colors: ["#465fff"],
    chart: { fontFamily: "Outfit, sans-serif", type: "bar", height: 180, toolbar: { show: false } },
    plotOptions: { bar: { horizontal: false, columnWidth: "40%", borderRadius: 5, borderRadiusApplication: "end" } },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 4, colors: ["transparent"] },
    xaxis: { categories: MONTHS, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { formatter: (v) => `${sym}${v}` } },
    grid: { yaxis: { lines: { show: true } } },
    fill: { opacity: 1 },
    tooltip: { y: { formatter: (v) => `${sym}${v.toFixed(2)}` } },
  };

  const enrollmentChartOptions: ApexOptions = {
    colors: ["#10b981"],
    chart: { fontFamily: "Outfit, sans-serif", type: "area", height: 150, toolbar: { show: false }, sparkline: { enabled: false } },
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 2 },
    xaxis: { categories: MONTHS, axisBorder: { show: false }, axisTicks: { show: false } },
    grid: { yaxis: { lines: { show: false } } },
    fill: { type: "gradient", gradient: { opacityFrom: 0.4, opacityTo: 0 } },
    tooltip: { y: { formatter: (v) => `${v} students` } },
  };

  const scoreColor = (avg: number | null) => {
    if (avg === null) return "text-gray-400";
    if (avg >= 70) return "text-green-600 dark:text-green-400";
    if (avg >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">

      {/* ── Alerts ── */}
      <AlertBanner alerts={teacherAlerts} />

      {/* ── Stat cards ── */}
      <div className="col-span-12">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:gap-6">
          <StatCard loading={loading} color="brand" label="Total Students" value={studentCount.toLocaleString()}
            icon={<GroupIcon className="text-gray-800 size-6 dark:text-white/90" />} />
          <StatCard loading={loading} color="brand" label="Total Lecturers" value={teacherCount.toLocaleString()}
            icon={<GroupIcon className="text-gray-800 size-6 dark:text-white/90" />} />
          <StatCard loading={loading} color="green" label="Total Courses" value={courseCount.toLocaleString()}
            icon={<BoxIconLine className="text-gray-800 size-6 dark:text-white/90" />} />
          <StatCard loading={loading} color="amber" label="Total Revenue"
            value={totalRevenue ? `${sym}${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
            sub={totalRevenue ? "from course enrollments" : "No paid courses yet"}
            icon={
              <svg className="w-6 h-6 text-gray-800 dark:text-white/90" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            } />
        </div>
      </div>

      {/* ── Revenue chart ── */}
      <div className="col-span-12 lg:col-span-8">
        <div className="rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Monthly Revenue</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Income from course enrollments</p>
            </div>
            <span className="text-lg font-bold text-gray-800 dark:text-white">
              {loading ? "—" : `${sym}${totalRevenue.toFixed(2)}`}
            </span>
          </div>
          <div className="max-w-full overflow-x-auto">
            <div className="-ml-5 min-w-[550px] xl:min-w-full pl-2">
              <ReactApexChart options={revenueChartOptions} series={[{ name: "Revenue", data: revenueByMonth }]} type="bar" height={180} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Enrollment chart ── */}
      <div className="col-span-12 lg:col-span-4">
        <div className="rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/3 h-full">
          <div className="mb-2">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Student Enrollment</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">New students per month</p>
          </div>
          {!loading && (
            <ReactApexChart options={enrollmentChartOptions} series={[{ name: "Students", data: enrollmentByMonth }]} type="area" height={150} />
          )}
        </div>
      </div>

      {/* ── Teacher performance ── */}
      <div className="col-span-12 lg:col-span-6">
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Lecturer Performance</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Average student quiz score per lecturer</p>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
          ) : teacherTableRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No quiz data yet</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {teacherTableRows.map((t) => (
                <div key={t.tid} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-xs shrink-0">
                    {t.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.courses} course{t.courses !== 1 ? "s" : ""} · {t.students} student{t.students !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={`text-base font-bold ${scoreColor(t.avg)}`}>
                      {t.avg !== null ? `${t.avg}%` : "—"}
                    </span>
                    {t.avg !== null && t.avg < 50 && (
                      <p className="text-[10px] text-red-500 font-medium">⚠ Low</p>
                    )}
                  </div>
                  {/* Score bar */}
                  <div className="hidden sm:block w-20 shrink-0">
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${t.avg !== null && t.avg >= 70 ? "bg-green-500" : t.avg !== null && t.avg >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${t.avg ?? 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Student progress overview ── */}
      <div className="col-span-12 lg:col-span-6">
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 overflow-hidden h-full">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Student Progress Overview</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Overall quiz performance across all courses</p>
            </div>
            {studentAvg !== null && (
              <span className={`text-2xl font-black ${scoreColor(studentAvg)}`}>{studentAvg}%</span>
            )}
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
          ) : studentRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No student data yet</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-72 overflow-y-auto">
              {studentRows.slice(0, 10).map((s) => {
                const allScores: number[] = [];
                s.courses.forEach(c =>
                  c.quizzes.forEach(q => {
                    if (q.score !== null && q.totalMarks > 0)
                      allScores.push(Math.round((q.score / q.totalMarks) * 100));
                  })
                );
                const avg = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : null;
                return (
                  <div key={s.userId} className="flex items-center gap-4 px-5 py-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 font-bold text-xs shrink-0">
                      {(s.firstName || s.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                        {`${s.firstName} ${s.lastName}`.trim() || s.email}
                      </p>
                      <p className="text-xs text-gray-400">{s.courses.length} course{s.courses.length !== 1 ? "s" : ""}</p>
                    </div>
                    <span className={`text-sm font-bold ${scoreColor(avg)}`}>
                      {avg !== null ? `${avg}%` : "—"}
                    </span>
                    <div className="hidden sm:block w-20 shrink-0">
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${avg !== null && avg >= 70 ? "bg-green-500" : avg !== null && avg >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${avg ?? 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent payments ── */}
      <div className="col-span-12">
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Recent Payments</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Latest course enrollment payments</p>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
          ) : recentPayments.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No payments recorded yet. Add prices to courses to track revenue.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide border-b border-gray-100 dark:border-gray-800">
                    <th className="px-5 py-3 text-left font-medium">Student</th>
                    <th className="px-5 py-3 text-left font-medium">Course</th>
                    <th className="px-5 py-3 text-left font-medium">Amount</th>
                    <th className="px-5 py-3 text-left font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {recentPayments.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/2">
                      <td className="px-5 py-3 font-medium text-gray-800 dark:text-white">{p.student}</td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{p.course}</td>
                      <td className="px-5 py-3 font-semibold text-green-600 dark:text-green-400">{sym}{p.amount.toFixed(2)}</td>
                      <td className="px-5 py-3 text-gray-400">
                        {new Date(p.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
