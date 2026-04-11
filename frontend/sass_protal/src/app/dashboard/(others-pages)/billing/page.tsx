"use client";

import React, { useEffect, useRef, useState } from "react";
import { authService } from "@/services/authService";

// PayHere types
declare global {
  interface Window {
    payhere: {
      startPayment: (payment: Record<string, unknown>) => void;
      onCompleted: (orderId: string) => void;
      onDismissed: () => void;
      onError: (error: string) => void;
    };
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Institute {
  id: string;
  name: string;
  category?: string;
  country?: string;
  studentCount?: string;
  plan: string;
  enabledFeatures: string[];
  isActive: boolean;
  createdAt: string;
  logo?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLANS = [
  {
    key: "starter",
    label: "Starter",
    price: 29,
    yearlyPrice: 290,
    color: "from-blue-500 to-blue-600",
    textColor: "text-blue-600 dark:text-blue-400",
    badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    borderActive: "border-blue-500 ring-2 ring-blue-500/20",
    features: [
      "Live Classes",
      "Recordings",
      "Up to 200 students",
      "Basic support",
    ],
  },
  {
    key: "pro",
    label: "Pro",
    price: 79,
    yearlyPrice: 790,
    color: "from-violet-500 to-violet-600",
    textColor: "text-violet-600 dark:text-violet-400",
    badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    borderActive: "border-violet-500 ring-2 ring-violet-500/20",
    popular: true,
    features: [
      "Everything in Starter",
      "AI Tools & Grading",
      "Exam Proctoring",
      "Advanced Reports",
      "Up to 1,000 students",
      "Priority support",
    ],
  },
  {
    key: "enterprise",
    label: "Enterprise",
    price: 199,
    yearlyPrice: 1990,
    color: "from-amber-500 to-amber-600",
    textColor: "text-amber-600 dark:text-amber-400",
    badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    borderActive: "border-amber-500 ring-2 ring-amber-500/20",
    features: [
      "Everything in Pro",
      "Virtual Labs",
      "Voice AI Agent",
      "Unlimited students",
      "Dedicated support",
      "Custom integrations",
    ],
  },
];

const PLAN_FEATURES: Record<string, string[]> = {
  starter: ["live_sessions", "recordings"],
  pro: ["live_sessions", "recordings", "ai_tools", "exam_proctoring", "advanced_reports"],
  enterprise: ["live_sessions", "recordings", "ai_tools", "exam_proctoring", "advanced_reports", "virtual_labs", "voice_agent"],
};

const FEATURE_META: Record<string, { label: string; description: string; icon: React.ReactNode; category: string }> = {
  live_sessions: {
    label: "Live Classes",
    description: "Real-time video classes with screen sharing and chat",
    category: "Core",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  recordings: {
    label: "Recordings",
    description: "Record and replay live sessions for students on demand",
    category: "Core",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  ai_tools: {
    label: "AI Tools & Grading",
    description: "Lesson plan generator, AI essay grader, class insights and at-risk alerts",
    category: "AI",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
      </svg>
    ),
  },
  exam_proctoring: {
    label: "Exam Proctoring",
    description: "Face verification and integrity monitoring for online exams",
    category: "Security",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  advanced_reports: {
    label: "Advanced Reports",
    description: "Detailed performance analytics, CSV exports and student insights",
    category: "Analytics",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  virtual_labs: {
    label: "Virtual Labs",
    description: "Physics, chemistry and engineering simulations via PhET & GeoGebra",
    category: "Labs",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  voice_agent: {
    label: "Voice AI Agent",
    description: "AI voice assistant for student Q&A and real-time tutoring",
    category: "AI",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
  },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateInvoices(institutes: Institute[]) {
  const invoices: {
    id: string;
    date: string;
    institute: string;
    plan: string;
    amount: number;
    status: "paid" | "pending" | "failed";
  }[] = [];

  const planPrice: Record<string, number> = { starter: 29, pro: 79, enterprise: 199 };
  const now = new Date();

  institutes.forEach((inst) => {
    const created = new Date(inst.createdAt);
    // Generate up to 6 monthly invoices per institute
    for (let i = 0; i < 6; i++) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      if (d < created) break;
      const price = planPrice[inst.plan || "starter"] || 29;
      invoices.push({
        id: `INV-${inst.id.slice(0, 6).toUpperCase()}-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`,
        date: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
        institute: inst.name,
        plan: inst.plan || "starter",
        amount: price,
        status: i === 0 ? "pending" : "paid",
      });
    }
  });

  return invoices.sort((a, b) => b.id.localeCompare(a.id));
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  institute,
  onUpgrade,
  upgrading,
  billing,
}: {
  plan: typeof PLANS[0];
  institute: Institute;
  onUpgrade: (instituteId: string, plan: string) => void;
  upgrading: string | null;
  billing: "monthly" | "yearly";
}) {
  const isCurrent = (institute.plan || "starter") === plan.key;
  const price = billing === "yearly" ? plan.yearlyPrice : plan.price * 12;
  const monthly = billing === "yearly" ? Math.round(plan.yearlyPrice / 12) : plan.price;
  const isDowngrade =
    ["starter", "pro", "enterprise"].indexOf(plan.key) <
    ["starter", "pro", "enterprise"].indexOf(institute.plan || "starter");

  return (
    <div
      className={`relative flex flex-col rounded-2xl border-2 bg-white p-6 dark:bg-gray-800 transition-all ${
        isCurrent
          ? plan.borderActive
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
      }`}
    >
      {plan.popular && !isCurrent && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-500 px-3 py-0.5 text-xs font-bold text-white">
          Most Popular
        </span>
      )}
      {isCurrent && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-0.5 text-xs font-bold text-white">
          Current Plan
        </span>
      )}

      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${plan.color} text-white mb-4`}>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      </div>

      <h3 className="text-lg font-bold text-gray-800 dark:text-white">{plan.label}</h3>

      <div className="my-3">
        <span className={`text-3xl font-extrabold ${plan.textColor}`}>${monthly}</span>
        <span className="text-sm text-gray-400">/mo</span>
        {billing === "yearly" && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
            ${price}/yr — save ${plan.price * 12 - plan.yearlyPrice}
          </p>
        )}
      </div>

      <ul className="space-y-2 mb-6 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            {f}
          </li>
        ))}
      </ul>

      <button
        disabled={isCurrent || upgrading === institute.id + plan.key}
        onClick={() => onUpgrade(institute.id, plan.key)}
        className={`w-full rounded-xl py-2.5 text-sm font-semibold transition-all ${
          isCurrent
            ? "bg-gray-100 text-gray-400 cursor-default dark:bg-gray-700 dark:text-gray-500"
            : isDowngrade
            ? "border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            : `bg-gradient-to-r ${plan.color} text-white hover:opacity-90 shadow-sm`
        }`}
      >
        {upgrading === institute.id + plan.key ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Updating…
          </span>
        ) : isCurrent ? (
          "Active"
        ) : isDowngrade ? (
          "Downgrade"
        ) : (
          <span className="flex items-center justify-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Pay & Upgrade
          </span>
        )}
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [selectedInstitute, setSelectedInstitute] = useState<string>("");
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"plans" | "invoices" | "summary">("summary");
  const payhereLoaded = useRef(false);

  // Load PayHere JS SDK once
  useEffect(() => {
    if (payhereLoaded.current) return;
    payhereLoaded.current = true;
    const script = document.createElement("script");
    script.src = process.env.NEXT_PUBLIC_PAYHERE_SANDBOX === "true"
      ? "https://www.payhere.lk/lib/payhere.js"
      : "https://www.payhere.lk/lib/payhere.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  useEffect(() => {
    authService
      .getInstitutes()
      .then((data: Institute[]) => {
        setInstitutes(data);
        if (data.length > 0) setSelectedInstitute(data[0].id);
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const finaliseUpgrade = async (instituteId: string, plan: string) => {
    await authService.updateInstituteFeatures(instituteId, {
      plan,
      enabledFeatures: PLAN_FEATURES[plan],
    });
    setInstitutes((prev) =>
      prev.map((i) =>
        i.id === instituteId
          ? { ...i, plan, enabledFeatures: PLAN_FEATURES[plan] }
          : i
      )
    );
    setSuccessMsg(`Plan upgraded to ${plan.charAt(0).toUpperCase() + plan.slice(1)} successfully!`);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const handleUpgrade = async (instituteId: string, plan: string) => {
    const institute = institutes.find((i) => i.id === instituteId);
    if (!institute) return;

    const planDef = PLANS.find((p) => p.key === plan);
    if (!planDef) return;

    // Downgrade — no payment needed
    const PLAN_ORDER = ["starter", "pro", "enterprise"];
    const isDowngrade = PLAN_ORDER.indexOf(plan) < PLAN_ORDER.indexOf(institute.plan || "starter");

    if (isDowngrade) {
      setUpgrading(instituteId + plan);
      try {
        await finaliseUpgrade(instituteId, plan);
      } catch (e: any) {
        setError("Failed to update plan: " + e.message);
        setTimeout(() => setError(null), 4000);
      } finally {
        setUpgrading(null);
      }
      return;
    }

    // Upgrade — trigger PayHere payment
    setUpgrading(instituteId + plan);
    try {
      const user = authService.getUser();
      const amount = billing === "yearly" ? planDef.yearlyPrice : planDef.price;
      const orderId = `ORD-${instituteId.slice(0, 6).toUpperCase()}-${Date.now()}`;

      const params = await authService.payhereCheckout({
        orderId,
        amount,
        currency: "LKR",
        itemName: `SmartEdX ${planDef.label} Plan${billing === "yearly" ? " (Annual)" : " (Monthly)"}`,
        firstName: user?.firstName || "User",
        lastName: user?.lastName || "",
        email: user?.email || "",
        phone: "0771234567",
        address: "No.1, Main Street",
        city: "Colombo",
        country: "Sri Lanka",
      });

      // Backend signals that merchant credentials are not configured —
      // activate the plan directly (dev/sandbox bypass).
      if ((params as any).devBypass) {
        await finaliseUpgrade(instituteId, plan);
        setUpgrading(null);
        return;
      }

      if (typeof window.payhere === "undefined") {
        setError("Payment gateway not loaded. Please refresh and try again.");
        setTimeout(() => setError(null), 5000);
        setUpgrading(null);
        return;
      }

      window.payhere.onCompleted = async (_paidOrderId: string) => {
        try {
          await finaliseUpgrade(instituteId, plan);
        } catch {
          setSuccessMsg("Payment received! Your plan will be updated shortly.");
          setTimeout(() => setSuccessMsg(null), 6000);
        }
        setUpgrading(null);
      };

      window.payhere.onDismissed = () => {
        setUpgrading(null);
      };

      window.payhere.onError = (err: string) => {
        // If PayHere SDK can't reach its servers (e.g. invalid merchant ID
        // or network issue), fall back to a direct upgrade in sandbox mode.
        if (params.sandbox) {
          finaliseUpgrade(instituteId, plan).catch(() => {});
          setUpgrading(null);
          return;
        }
        setError(
          err.toLowerCase().includes("initialize")
            ? "Payment gateway not configured correctly. Contact support."
            : "Payment failed: " + err,
        );
        setTimeout(() => setError(null), 6000);
        setUpgrading(null);
      };

      window.payhere.startPayment(params);
    } catch (e: any) {
      setError("Failed to initiate payment: " + e.message);
      setTimeout(() => setError(null), 4000);
      setUpgrading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-72">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
      </div>
    );
  }

  const currentInstitute = institutes.find((i) => i.id === selectedInstitute);
  const invoices = generateInvoices(institutes);

  const planPrice: Record<string, number> = { starter: 29, pro: 79, enterprise: 199 };
  const totalMRR = institutes.reduce((sum, i) => sum + (planPrice[i.plan || "starter"] || 0), 0);
  const totalARR = billing === "yearly"
    ? institutes.reduce((sum, i) => {
        const p = PLANS.find((p) => p.key === (i.plan || "starter"));
        return sum + (p?.yearlyPrice || 0);
      }, 0)
    : totalMRR * 12;

  const TABS = [
    { key: "summary", label: "Summary" },
    { key: "plans", label: "Manage Plans" },
    { key: "invoices", label: "Invoices" },
  ] as const;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Billing & Plans</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage subscriptions and payment details for your institutes
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center gap-2 rounded-xl bg-gray-100 p-1 dark:bg-gray-800 self-start sm:self-auto">
          {(["monthly", "yearly"] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${
                billing === b
                  ? "bg-white text-brand-600 shadow-sm dark:bg-gray-700 dark:text-brand-400"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {b}
              {b === "yearly" && (
                <span className="ml-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">-17%</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {successMsg}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-5 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px ${
              activeTab === t.key
                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Summary Tab ─────────────────────────────────────────────────────── */}
      {activeTab === "summary" && (
        <div className="space-y-6">
          {/* MRR / ARR cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                label: billing === "monthly" ? "Monthly Cost" : "Annual Cost",
                value: billing === "monthly" ? `$${totalMRR}` : `$${totalARR}`,
                sub: `${institutes.length} institute${institutes.length !== 1 ? "s" : ""}`,
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                gradient: "from-brand-500 to-brand-600",
              },
              {
                label: "Active Institutes",
                value: institutes.filter((i) => i.isActive).length,
                sub: `${institutes.length} total`,
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                ),
                gradient: "from-emerald-500 to-emerald-600",
              },
              {
                label: "Next Billing Date",
                value: (() => {
                  const d = new Date();
                  d.setMonth(d.getMonth() + 1);
                  d.setDate(1);
                  return `${MONTHS[d.getMonth()]} 1, ${d.getFullYear()}`;
                })(),
                sub: "Auto-renews",
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ),
                gradient: "from-amber-500 to-amber-600",
              },
            ].map((c) => (
              <div
                key={c.label}
                className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{c.label}</span>
                  <div className={`bg-gradient-to-br ${c.gradient} rounded-xl p-2 text-white`}>{c.icon}</div>
                </div>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{c.value}</p>
                <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
              </div>
            ))}
          </div>

          {/* Per-institute plan overview */}
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 sm:px-6">
              <h2 className="font-semibold text-gray-800 dark:text-white">Institute Plans</h2>
            </div>

            {institutes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                </svg>
                <p className="text-gray-500 dark:text-gray-400 font-medium">No institutes found</p>
                <p className="text-sm text-gray-400 mt-1">Create an institute to start managing billing.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      <th className="px-5 py-3 sm:px-6">Institute</th>
                      <th className="px-5 py-3">Plan</th>
                      <th className="px-5 py-3">Price</th>
                      <th className="px-5 py-3 hidden sm:table-cell">Features</th>
                      <th className="px-5 py-3 hidden md:table-cell">Status</th>
                      <th className="px-5 py-3 text-right sm:px-6">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {institutes.map((inst) => {
                      const planDef = PLANS.find((p) => p.key === (inst.plan || "starter"))!;
                      const monthlyAmt = billing === "yearly"
                        ? Math.round((planDef?.yearlyPrice || 29 * 10) / 12)
                        : planDef?.price || 29;

                      return (
                        <tr key={inst.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-5 py-4 sm:px-6">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                {inst.name[0]?.toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-gray-800 dark:text-white truncate max-w-[120px]">{inst.name}</p>
                                <p className="text-xs text-gray-400">{inst.category || "General"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${planDef?.badgeColor}`}>
                              {inst.plan || "starter"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-gray-800 dark:text-white">${monthlyAmt}<span className="text-xs text-gray-400 font-normal">/mo</span></p>
                            {billing === "yearly" && (
                              <p className="text-xs text-emerald-600 dark:text-emerald-400">${planDef?.yearlyPrice}/yr</p>
                            )}
                          </td>
                          <td className="px-5 py-4 hidden sm:table-cell">
                            <div className="flex flex-wrap gap-1 max-w-[180px]">
                              {(inst.enabledFeatures || []).slice(0, 2).map((f) => (
                                <span key={f} className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                  {f.replace(/_/g, " ")}
                                </span>
                              ))}
                              {(inst.enabledFeatures || []).length > 2 && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 dark:bg-gray-700">
                                  +{(inst.enabledFeatures || []).length - 2}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 hidden md:table-cell">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${inst.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${inst.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                              {inst.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right sm:px-6">
                            <button
                              onClick={() => { setSelectedInstitute(inst.id); setActiveTab("plans"); }}
                              className="text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 transition-colors"
                            >
                              Manage →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {institutes.length > 1 && (
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 dark:border-gray-600">
                        <td colSpan={2} className="px-5 py-3 sm:px-6 text-sm font-semibold text-gray-700 dark:text-gray-200">Total</td>
                        <td className="px-5 py-3 font-bold text-gray-800 dark:text-white">
                          ${billing === "monthly" ? totalMRR : Math.round(totalARR / 12)}<span className="text-xs text-gray-400 font-normal">/mo</span>
                        </td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>

          {/* ── Subscription Plans Showcase ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-800 dark:text-white">Subscription Plans</h2>
                <p className="text-xs text-gray-400 mt-0.5">See exactly what's included in each plan</p>
              </div>
              <button
                onClick={() => setActiveTab("plans")}
                className="text-xs font-semibold text-brand-500 hover:text-brand-600 dark:text-brand-400 flex items-center gap-1"
              >
                Manage Plans
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Plan cards with full feature breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {PLANS.map((plan) => {
                const activePlanInstitutes = institutes.filter((i) => (i.plan || "starter") === plan.key);
                const isAnyActive = activePlanInstitutes.length > 0;
                const planFeatureKeys = PLAN_FEATURES[plan.key] || [];

                return (
                  <div
                    key={plan.key}
                    className={`relative rounded-2xl border-2 bg-white dark:bg-gray-800 flex flex-col overflow-hidden transition-all ${
                      isAnyActive
                        ? plan.borderActive + " shadow-lg"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    {/* Plan header */}
                    <div className={`bg-gradient-to-br ${plan.color} px-5 pt-5 pb-4 text-white`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{plan.label}</p>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-3xl font-extrabold">${billing === "yearly" ? Math.round(plan.yearlyPrice / 12) : plan.price}</span>
                            <span className="text-sm opacity-75">/mo</span>
                          </div>
                          {billing === "yearly" && (
                            <p className="text-xs opacity-75 mt-0.5">${plan.yearlyPrice}/yr — save ${plan.price * 12 - plan.yearlyPrice}</p>
                          )}
                        </div>
                        {isAnyActive && (
                          <span className="shrink-0 text-xs font-bold bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                        {plan.popular && !isAnyActive && (
                          <span className="shrink-0 text-xs font-bold bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
                            Popular
                          </span>
                        )}
                      </div>
                      <p className="text-xs opacity-70 mt-2">{planFeatureKeys.length} platform features included</p>
                    </div>

                    {/* Feature list */}
                    <div className="px-5 py-4 flex-1 space-y-2.5">
                      {Object.entries(FEATURE_META).map(([key, meta]) => {
                        const included = planFeatureKeys.includes(key);
                        return (
                          <div key={key} className={`flex items-start gap-2.5 ${!included ? "opacity-35" : ""}`}>
                            <div className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${
                              included
                                ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-600"
                            }`}>
                              {included ? (
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-xs font-semibold ${included ? "text-gray-800 dark:text-white" : "text-gray-400 dark:text-gray-600"}`}>
                                  {meta.label}
                                </span>
                                <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                                  meta.category === "AI" ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" :
                                  meta.category === "Security" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                                  meta.category === "Analytics" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" :
                                  meta.category === "Labs" ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" :
                                  "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                                }`}>{meta.category}</span>
                              </div>
                              <p className={`text-[11px] leading-tight mt-0.5 ${included ? "text-gray-400" : "text-gray-300 dark:text-gray-700"}`}>
                                {meta.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* CTA */}
                    <div className="px-5 pb-5">
                      {isAnyActive ? (
                        <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-semibold">
                          <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          Your current plan
                        </div>
                      ) : (
                        <button
                          onClick={() => setActiveTab("plans")}
                          className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r ${plan.color} hover:opacity-90 transition-opacity`}
                        >
                          Upgrade to {plan.label}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment gateway */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800 dark:text-white">Payment Gateway</h2>
              {process.env.NEXT_PUBLIC_PAYHERE_SANDBOX === "true" && (
                <span className="text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2.5 py-0.5 rounded-full">
                  Sandbox Mode
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <div className="h-10 w-24 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-xs font-bold tracking-wide px-2">
                PayHere
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white">Powered by PayHere</p>
                <p className="text-xs text-gray-400">Visa · Mastercard · Amex · Bank Transfer</p>
              </div>
              <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">Active</span>
            </div>
            <p className="mt-3 text-xs text-gray-400">
              Payments are securely processed by PayHere. Upgrading a plan will open the PayHere checkout.
            </p>
          </div>
        </div>
      )}

      {/* ─── Plans Tab ───────────────────────────────────────────────────────── */}
      {activeTab === "plans" && (
        <div className="space-y-6">
          {institutes.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
              <p className="text-gray-500 dark:text-gray-400">No institutes to manage. Create one first.</p>
            </div>
          ) : (
            <>
              {/* Institute selector */}
              {institutes.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {institutes.map((inst) => (
                    <button
                      key={inst.id}
                      onClick={() => setSelectedInstitute(inst.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                        selectedInstitute === inst.id
                          ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400"
                          : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <span className="h-5 w-5 rounded-md bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {inst.name[0]?.toUpperCase()}
                      </span>
                      {inst.name}
                    </button>
                  ))}
                </div>
              )}

              {currentInstitute && (
                <>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Managing plan for <span className="font-semibold text-gray-700 dark:text-gray-200">{currentInstitute.name}</span>
                    {" · "}currently on{" "}
                    <span className={`font-semibold capitalize ${PLANS.find((p) => p.key === (currentInstitute.plan || "starter"))?.textColor}`}>
                      {currentInstitute.plan || "starter"}
                    </span>
                  </p>

                  {/* Plan cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {PLANS.map((plan) => (
                      <PlanCard
                        key={plan.key}
                        plan={plan}
                        institute={currentInstitute}
                        onUpgrade={handleUpgrade}
                        upgrading={upgrading}
                        billing={billing}
                      />
                    ))}
                  </div>

                  {/* Feature comparison */}
                  <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 sm:px-6">
                      <h2 className="font-semibold text-gray-800 dark:text-white">Feature Comparison</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-gray-700">
                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase sm:px-6">Feature</th>
                            {PLANS.map((p) => (
                              <th key={p.key} className={`px-4 py-3 text-center text-xs font-semibold uppercase ${p.textColor}`}>
                                {p.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {[
                            { label: "Live Classes", key: "live_sessions" },
                            { label: "Recordings", key: "recordings" },
                            { label: "AI Tools & Grading", key: "ai_tools" },
                            { label: "Exam Proctoring", key: "exam_proctoring" },
                            { label: "Advanced Reports", key: "advanced_reports" },
                            { label: "Virtual Labs", key: "virtual_labs" },
                            { label: "Voice AI Agent", key: "voice_agent" },
                          ].map((feature) => (
                            <tr key={feature.key} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                              <td className="px-5 py-3 text-gray-700 dark:text-gray-300 sm:px-6">{feature.label}</td>
                              {PLANS.map((plan) => {
                                const included = PLAN_FEATURES[plan.key]?.includes(feature.key);
                                return (
                                  <td key={plan.key} className="px-4 py-3 text-center">
                                    {included ? (
                                      <svg className="w-5 h-5 text-emerald-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : (
                                      <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                          <tr className="border-t-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30">
                            <td className="px-5 py-3 font-semibold text-gray-700 dark:text-gray-200 sm:px-6">
                              {billing === "monthly" ? "Monthly Price" : "Annual Price"}
                            </td>
                            {PLANS.map((plan) => (
                              <td key={plan.key} className={`px-4 py-3 text-center font-bold ${plan.textColor}`}>
                                ${billing === "monthly" ? plan.price : plan.yearlyPrice}
                                <span className="text-xs font-normal text-gray-400">
                                  /{billing === "monthly" ? "mo" : "yr"}
                                </span>
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── Invoices Tab ────────────────────────────────────────────────────── */}
      {activeTab === "invoices" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 sm:px-6">
              <h2 className="font-semibold text-gray-800 dark:text-white">Invoice History</h2>
              <span className="text-xs text-gray-400">{invoices.length} records</span>
            </div>

            {invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500 font-medium">No invoices yet</p>
                <p className="text-sm text-gray-400 mt-1">Invoices will appear here after your first billing cycle.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                      <th className="px-5 py-3 sm:px-6">Invoice ID</th>
                      <th className="px-5 py-3">Period</th>
                      <th className="px-5 py-3 hidden sm:table-cell">Institute</th>
                      <th className="px-5 py-3 hidden md:table-cell">Plan</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right sm:px-6">Download</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {invoices.map((inv) => {
                      const planDef = PLANS.find((p) => p.key === inv.plan);
                      return (
                        <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-5 py-3.5 sm:px-6">
                            <span className="font-mono text-xs text-gray-600 dark:text-gray-300">{inv.id}</span>
                          </td>
                          <td className="px-5 py-3.5 text-gray-600 dark:text-gray-300">{inv.date}</td>
                          <td className="px-5 py-3.5 hidden sm:table-cell text-gray-700 dark:text-gray-200 font-medium truncate max-w-[120px]">
                            {inv.institute}
                          </td>
                          <td className="px-5 py-3.5 hidden md:table-cell">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${planDef?.badgeColor}`}>
                              {inv.plan}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-gray-800 dark:text-white">
                            ${inv.amount.toFixed(2)}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                              inv.status === "paid"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : inv.status === "pending"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                inv.status === "paid" ? "bg-emerald-500" : inv.status === "pending" ? "bg-amber-500" : "bg-red-500"
                              }`} />
                              {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right sm:px-6">
                            <button
                              onClick={() => {
                                const content = [
                                  "SmartEdX Invoice",
                                  "=================",
                                  `Invoice ID: ${inv.id}`,
                                  `Period: ${inv.date}`,
                                  `Institute: ${inv.institute}`,
                                  `Plan: ${inv.plan}`,
                                  `Amount: $${inv.amount.toFixed(2)}`,
                                  `Status: ${inv.status}`,
                                ].join("\n");
                                const blob = new Blob([content], { type: "text/plain" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `${inv.id}.txt`;
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                              className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              PDF
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Total paid */}
          {invoices.length > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-5 py-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Total paid ({invoices.filter((i) => i.status === "paid").length} invoices)
              </span>
              <span className="font-bold text-gray-800 dark:text-white">
                ${invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
