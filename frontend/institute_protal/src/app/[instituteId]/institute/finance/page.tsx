"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { instituteService } from "@/services/instituteService";
import { authService } from "@/services/authService";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const API = process.env.NEXT_PUBLIC_API_URL;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", INR: "₹", AUD: "A$", CAD: "C$",
  SGD: "S$", AED: "د.إ", LKR: "Rs", JPY: "¥", CNY: "¥", BRL: "R$",
  MYR: "RM", NGN: "₦", PKR: "₨", ZAR: "R",
};

function sym(currency?: string) {
  return CURRENCY_SYMBOLS[currency ?? "USD"] ?? currency ?? "$";
}

async function fetchJson(url: string) {
  const token = authService.getToken();
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
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
    price?: number;
    paidAt?: string;
  }[];
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, trend, loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  trend?: { value: string; up: boolean } | null;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          {icon}
        </div>
        {trend && !loading && (
          <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${trend.up ? "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400" : "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400"}`}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              {trend.up
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.307a11.95 11.95 0 0 1 5.814-5.519l2.74-1.22m0 0-5.94-2.28m5.94 2.28-2.28 5.941" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6 9 12.75l4.286-4.286a11.948 11.948 0 0 1 4.306 6.43l.776 2.898m0 0 3.182-5.511m-3.182 5.51-5.511-3.181" />}
            </svg>
            {trend.value}
          </span>
        )}
      </div>
      <div className="mt-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">
          {loading ? <span className="animate-pulse text-gray-300 dark:text-gray-700">—</span> : value}
        </h4>
        {sub && !loading && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const params = useParams();
  const instituteId = params?.instituteId as string;

  const [loading, setLoading] = useState(true);
  const [studentRows, setStudentRows] = useState<StudentRow[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [activeTab, setActiveTab] = useState<"overview" | "transactions" | "courses">("overview");
  const [txPage, setTxPage] = useState(1);
  const TX_PER_PAGE = 10;

  useEffect(() => {
    if (!instituteId) return;
    (async () => {
      setLoading(true);
      try {
        const [report, institute] = await Promise.all([
          fetchJson(`${API}/api/institutes/institutes/${instituteId}/courses/student-report`),
          instituteService.getInstituteById(instituteId),
        ]);
        setStudentRows(Array.isArray(report) ? report : []);
        if (institute?.currency) setCurrency(institute.currency);
      } catch (e) {
        console.error("FinancePage:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [instituteId]);

  const s = sym(currency);

  // ── Derived metrics ──────────────────────────────────────────────────────────

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  const allTransactions = useMemo(() => {
    const list: { student: string; email: string; course: string; courseId: string; amount: number; date: string }[] = [];
    studentRows.forEach(st =>
      st.courses.forEach(c => {
        if (c.price && c.paidAt)
          list.push({
            student: `${st.firstName} ${st.lastName}`.trim() || st.email,
            email: st.email,
            course: c.courseName,
            courseId: c.courseId,
            amount: parseFloat(String(c.price)),
            date: c.paidAt,
          });
      })
    );
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [studentRows]);

  const totalRevenue = useMemo(() => allTransactions.reduce((sum, t) => sum + t.amount, 0), [allTransactions]);

  const thisMonthRevenue = useMemo(() => allTransactions
    .filter(t => { const d = new Date(t.date); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; })
    .reduce((sum, t) => sum + t.amount, 0), [allTransactions, thisMonth, thisYear]);

  const lastMonthRevenue = useMemo(() => allTransactions
    .filter(t => { const d = new Date(t.date); return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear; })
    .reduce((sum, t) => sum + t.amount, 0), [allTransactions, lastMonth, lastMonthYear]);

  const monthTrend = lastMonthRevenue > 0
    ? { value: `${Math.abs(Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100))}%`, up: thisMonthRevenue >= lastMonthRevenue }
    : null;

  const revenueByMonth = useMemo(() => {
    const arr = Array(12).fill(0);
    allTransactions.forEach(t => {
      const d = new Date(t.date);
      if (d.getFullYear() === thisYear) arr[d.getMonth()] += t.amount;
    });
    return arr;
  }, [allTransactions, thisYear]);

  // Paid vs unpaid per paid course
  const courseRevenue = useMemo(() => {
    const map = new Map<string, { name: string; price: number; paid: number; unpaid: number; revenue: number }>();
    studentRows.forEach(st =>
      st.courses.forEach(c => {
        if (!c.price) return;
        const numPrice = parseFloat(String(c.price));
        if (!map.has(c.courseId)) map.set(c.courseId, { name: c.courseName, price: numPrice, paid: 0, unpaid: 0, revenue: 0 });
        const entry = map.get(c.courseId)!;
        if (c.paidAt) { entry.paid++; entry.revenue += numPrice; }
        else entry.unpaid++;
      })
    );
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [studentRows]);

  const paidStudentCount = useMemo(() => {
    const ids = new Set<string>();
    studentRows.forEach(st => st.courses.forEach(c => { if (c.paidAt) ids.add(st.userId); }));
    return ids.size;
  }, [studentRows]);

  const unpaidCount = useMemo(() => {
    let n = 0;
    studentRows.forEach(st => st.courses.forEach(c => { if (c.price && !c.paidAt) n++; }));
    return n;
  }, [studentRows]);

  // ── Chart options ────────────────────────────────────────────────────────────

  const barOptions: ApexOptions = {
    colors: ["#465fff"],
    chart: { fontFamily: "Outfit, sans-serif", type: "bar", height: 220, toolbar: { show: false }, background: "transparent" },
    plotOptions: { bar: { horizontal: false, columnWidth: "42%", borderRadius: 6, borderRadiusApplication: "end" } },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 4, colors: ["transparent"] },
    xaxis: { categories: MONTHS, axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: "11px" } } },
    yaxis: { labels: { formatter: (v) => `${s}${v}`, style: { fontSize: "11px" } } },
    grid: { borderColor: "#f3f4f6", strokeDashArray: 4, yaxis: { lines: { show: true } } },
    fill: { opacity: 1 },
    tooltip: { theme: "light", y: { formatter: (v) => `${s}${v.toFixed(2)}` } },
  };

  const donutOptions: ApexOptions = {
    chart: { type: "donut", fontFamily: "Outfit, sans-serif", background: "transparent" },
    colors: ["#465fff", "#10b981", "#f59e0b"],
    labels: courseRevenue.slice(0, 3).map(c => c.name),
    legend: { position: "bottom", fontSize: "12px" },
    dataLabels: { enabled: false },
    plotOptions: { pie: { donut: { size: "65%" } } },
    tooltip: { y: { formatter: (v) => `${s}${v.toFixed(2)}` } },
  };

  // Paginate transactions
  const txSlice = allTransactions.slice((txPage - 1) * TX_PER_PAGE, txPage * TX_PER_PAGE);
  const totalTxPages = Math.max(1, Math.ceil(allTransactions.length / TX_PER_PAGE));

  const fmtDate = (d: string) => new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Finance</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Revenue, payments and course earnings</p>
        </div>
        <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full font-medium shrink-0">
          Currency: {currency}
        </span>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:gap-6">
        <StatCard
          loading={loading} label="Total Revenue"
          value={totalRevenue ? `${s}${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
          sub={allTransactions.length ? `${allTransactions.length} transactions` : "No payments yet"}
          trend={null}
          icon={
            <svg className="w-6 h-6 text-gray-800 dark:text-white/90" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          }
        />
        <StatCard
          loading={loading} label="This Month"
          value={thisMonthRevenue ? `${s}${thisMonthRevenue.toFixed(2)}` : "—"}
          sub={MONTHS[thisMonth]}
          trend={monthTrend}
          icon={
            <svg className="w-6 h-6 text-gray-800 dark:text-white/90" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
          }
        />
        <StatCard
          loading={loading} label="Paid Students"
          value={paidStudentCount.toLocaleString()}
          sub="Unique paying students"
          trend={null}
          icon={
            <svg className="w-6 h-6 text-gray-800 dark:text-white/90" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          }
        />
        <StatCard
          loading={loading} label="Pending Payments"
          value={unpaidCount.toLocaleString()}
          sub="Unpaid paid-course slots"
          trend={null}
          icon={
            <svg className="w-6 h-6 text-gray-800 dark:text-white/90" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          }
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Monthly revenue bar */}
        <div className="col-span-12 lg:col-span-8 rounded-2xl border border-gray-200 bg-white px-5 pt-5 pb-2 dark:border-gray-800 dark:bg-white/3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Monthly Revenue ({thisYear})</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Course enrollment income per month</p>
            </div>
            <span className="text-lg font-bold text-gray-800 dark:text-white">
              {loading ? "—" : `${s}${totalRevenue.toFixed(2)}`}
            </span>
          </div>
          <div className="min-w-0 overflow-x-auto">
            <div className="-ml-4 min-w-[500px] xl:min-w-full">
              <ReactApexChart
                options={barOptions}
                series={[{ name: "Revenue", data: revenueByMonth }]}
                type="bar" height={220}
              />
            </div>
          </div>
        </div>

        {/* Revenue by course donut */}
        <div className="col-span-12 lg:col-span-4 rounded-2xl border border-gray-200 bg-white px-5 pt-5 pb-4 dark:border-gray-800 dark:bg-white/3 flex flex-col">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Revenue by Course</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-3">Top earning courses</p>
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Loading…</div>
          ) : courseRevenue.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">No paid courses yet</div>
          ) : (
            <ReactApexChart
              options={donutOptions}
              series={courseRevenue.slice(0, 3).map(c => c.revenue)}
              type="donut" height={210}
            />
          )}
        </div>
      </div>

      {/* ── Tab navigation ── */}
      <div className="flex flex-wrap gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
        {(["overview", "transactions", "courses"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {tab === "overview" ? "Payment Status" : tab === "transactions" ? "Transactions" : "Course Earnings"}
          </button>
        ))}
      </div>

      {/* ── Payment Status tab ── */}
      {activeTab === "overview" && (
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Student Payment Status</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Per-student enrollment payment details for paid courses</p>
          </div>
          {loading ? (
            <div className="p-10 text-center text-sm text-gray-400">Loading…</div>
          ) : studentRows.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-400">No student data found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide border-b border-gray-100 dark:border-gray-800">
                    <th className="px-5 py-3 text-left font-medium">Student</th>
                    <th className="px-5 py-3 text-left font-medium">Course</th>
                    <th className="px-5 py-3 text-left font-medium">Price</th>
                    <th className="px-5 py-3 text-left font-medium">Status</th>
                    <th className="px-5 py-3 text-left font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {studentRows.flatMap(st =>
                    st.courses
                      .filter(c => c.price)
                      .map((c, i) => (
                        <tr key={`${st.userId}-${c.courseId}-${i}`} className="hover:bg-gray-50 dark:hover:bg-white/2">
                          <td className="px-5 py-3">
                            <div className="font-medium text-gray-800 dark:text-white">
                              {`${st.firstName} ${st.lastName}`.trim() || st.email}
                            </div>
                            <div className="text-xs text-gray-400">{st.email}</div>
                          </td>
                          <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{c.courseName}</td>
                          <td className="px-5 py-3 font-semibold text-gray-800 dark:text-white">{s}{parseFloat(String(c.price)).toFixed(2)}</td>
                          <td className="px-5 py-3">
                            {c.paidAt ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Paid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> Pending
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-gray-400">{c.paidAt ? fmtDate(c.paidAt) : "—"}</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
              {studentRows.every(st => st.courses.every(c => !c.price)) && (
                <div className="p-10 text-center text-sm text-gray-400">No paid courses configured. Add prices to courses to track payments.</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Transactions tab ── */}
      {activeTab === "transactions" && (
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">All Transactions</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{allTransactions.length} total payments</p>
            </div>
            <span className="text-sm font-bold text-gray-800 dark:text-white">{s}{totalRevenue.toFixed(2)}</span>
          </div>
          {loading ? (
            <div className="p-10 text-center text-sm text-gray-400">Loading…</div>
          ) : allTransactions.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-400">No transactions recorded yet</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide border-b border-gray-100 dark:border-gray-800">
                      <th className="px-5 py-3 text-left font-medium">#</th>
                      <th className="px-5 py-3 text-left font-medium">Student</th>
                      <th className="px-5 py-3 text-left font-medium">Course</th>
                      <th className="px-5 py-3 text-left font-medium">Amount</th>
                      <th className="px-5 py-3 text-left font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {txSlice.map((t, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/2">
                        <td className="px-5 py-3 text-gray-400 text-xs">{(txPage - 1) * TX_PER_PAGE + i + 1}</td>
                        <td className="px-5 py-3">
                          <div className="font-medium text-gray-800 dark:text-white">{t.student}</div>
                          <div className="text-xs text-gray-400">{t.email}</div>
                        </td>
                        <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{t.course}</td>
                        <td className="px-5 py-3 font-semibold text-green-600 dark:text-green-400">{s}{t.amount.toFixed(2)}</td>
                        <td className="px-5 py-3 text-gray-400">{fmtDate(t.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {totalTxPages > 1 && (
                <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    Showing {(txPage - 1) * TX_PER_PAGE + 1}–{Math.min(txPage * TX_PER_PAGE, allTransactions.length)} of {allTransactions.length}
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={txPage === 1}
                      onClick={() => setTxPage(p => p - 1)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      disabled={txPage === totalTxPages}
                      onClick={() => setTxPage(p => p + 1)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Course Earnings tab ── */}
      {activeTab === "courses" && (
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Course Earnings Breakdown</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Revenue per paid course</p>
          </div>
          {loading ? (
            <div className="p-10 text-center text-sm text-gray-400">Loading…</div>
          ) : courseRevenue.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-400">No paid courses configured. Set a price on a course to track earnings.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide border-b border-gray-100 dark:border-gray-800">
                    <th className="px-5 py-3 text-left font-medium">Course</th>
                    <th className="px-5 py-3 text-left font-medium">Price</th>
                    <th className="px-5 py-3 text-left font-medium">Paid</th>
                    <th className="px-5 py-3 text-left font-medium">Pending</th>
                    <th className="px-5 py-3 text-left font-medium">Revenue</th>
                    <th className="px-5 py-3 text-left font-medium">Collection Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {courseRevenue.map((c, i) => {
                    const total = c.paid + c.unpaid;
                    const rate = total > 0 ? Math.round((c.paid / total) * 100) : 0;
                    return (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/2">
                        <td className="px-5 py-3 font-medium text-gray-800 dark:text-white">{c.name}</td>
                        <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{s}{c.price.toFixed(2)}</td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> {c.paid}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {c.unpaid > 0 ? (
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> {c.unpaid}
                            </span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="px-5 py-3 font-bold text-gray-800 dark:text-white">{s}{c.revenue.toFixed(2)}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${rate >= 70 ? "bg-green-500" : rate >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-white/2 border-t border-gray-200 dark:border-gray-700">
                    <td className="px-5 py-3 font-bold text-gray-700 dark:text-white/80" colSpan={4}>Total</td>
                    <td className="px-5 py-3 font-bold text-gray-800 dark:text-white">{s}{totalRevenue.toFixed(2)}</td>
                    <td className="px-5 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
