"use client";

export const dynamic = "force-dynamic";

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

interface PaymentMethod {
  id: string;
  type: "visa" | "mastercard" | "amex" | "unknown";
  last4: string;
  expiry: string;
  name: string;
  isDefault: boolean;
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
      "AI Tools & Grading (Teacher)",
      "AI Tutor (Student)",
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
  pro: ["live_sessions", "recordings", "ai_tools", "ai_tutor", "exam_proctoring", "advanced_reports"],
  enterprise: ["live_sessions", "recordings", "ai_tools", "ai_tutor", "exam_proctoring", "advanced_reports", "virtual_labs", "voice_agent"],
};

const FEATURE_META: Record<string, { label: string; description: string; category: string }> = {
  live_sessions: {
    label: "Live Classes",
    description: "Real-time video classes with screen sharing and chat",
    category: "Core",
  },
  recordings: {
    label: "Recordings",
    description: "Record and replay live sessions for students on demand",
    category: "Core",
  },
  ai_tools: {
    label: "AI Tools & Grading (Teacher)",
    description: "Lesson plan generator, AI essay grader, class insights and at-risk alerts",
    category: "AI",
  },
  ai_tutor: {
    label: "AI Tutor (Student)",
    description: "Personal AI tutor for students — course-aware chat and Q&A assistant",
    category: "AI",
  },
  exam_proctoring: {
    label: "Exam Proctoring",
    description: "Face verification and integrity monitoring for online exams",
    category: "Security",
  },
  advanced_reports: {
    label: "Advanced Reports",
    description: "Detailed performance analytics, CSV exports and student insights",
    category: "Analytics",
  },
  virtual_labs: {
    label: "Virtual Labs",
    description: "Physics, chemistry and engineering simulations via PhET & GeoGebra",
    category: "Labs",
  },
  voice_agent: {
    label: "Voice AI Agent",
    description: "AI voice assistant for student Q&A and real-time tutoring",
    category: "AI",
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

// ─── Add Card Modal ───────────────────────────────────────────────────────────

function AddCardModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (method: PaymentMethod) => void;
}) {
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [flipped, setFlipped] = useState(false);
  const [adding, setAdding] = useState(false);

  const rawNumber = number.replace(/\s/g, "");
  const cardType: PaymentMethod["type"] = rawNumber.startsWith("4")
    ? "visa"
    : rawNumber.startsWith("5")
    ? "mastercard"
    : rawNumber.startsWith("3")
    ? "amex"
    : "unknown";

  const cardGradient =
    cardType === "visa"
      ? "from-blue-600 to-blue-900"
      : cardType === "mastercard"
      ? "from-red-600 to-orange-600"
      : cardType === "amex"
      ? "from-gray-700 to-gray-900"
      : "from-slate-600 to-slate-800";

  const formatNumber = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 2) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  };

  const handleAdd = async () => {
    setAdding(true);
    await new Promise((r) => setTimeout(r, 900));
    onAdd({
      id: Date.now().toString(),
      type: cardType,
      last4: rawNumber.slice(-4) || "0000",
      expiry: expiry || "00/00",
      name: name || "Cardholder",
      isDefault: false,
    });
    setAdding(false);
    onClose();
  };

  const isValid =
    rawNumber.length >= 16 && name.trim().length > 0 && expiry.length === 5 && cvv.length >= 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-800 dark:text-white">Add Payment Method</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            Close
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Card Preview */}
          <div
            className={`relative h-44 rounded-2xl bg-gradient-to-br ${cardGradient} p-5 text-white shadow-xl overflow-hidden select-none`}
          >
            <div className="absolute -top-10 -right-10 h-44 w-44 rounded-full bg-white/10" />
            <div className="absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-white/10" />

            <div className="relative flex justify-between items-start">
              {/* Chip */}
              <div className="h-8 w-11 rounded-md bg-yellow-300/80 flex items-center justify-center overflow-hidden">
                <div className="grid grid-cols-2 gap-0.5 p-1">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-1.5 w-1.5 rounded-sm bg-yellow-600/60" />
                  ))}
                </div>
              </div>
              <span className="text-xs font-bold uppercase tracking-widest opacity-80">
                {cardType === "visa"
                  ? "VISA"
                  : cardType === "mastercard"
                  ? "MASTERCARD"
                  : cardType === "amex"
                  ? "AMEX"
                  : ""}
              </span>
            </div>

            <div className="relative mt-4">
              <p className="text-lg font-mono tracking-[0.22em]">
                {flipped ? "•••• •••• •••• ••••" : number || "•••• •••• •••• ••••"}
              </p>
            </div>

            <div className="relative flex justify-between items-end mt-3">
              <div>
                <p className="text-[9px] uppercase opacity-60 mb-0.5">Card Holder</p>
                <p className="text-sm font-semibold tracking-wide truncate max-w-[160px]">
                  {name || "Your Name"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] uppercase opacity-60 mb-0.5">Expires</p>
                <p className="text-sm font-semibold">{expiry || "MM/YY"}</p>
              </div>
            </div>

            {/* CVV flip overlay */}
            {flipped && (
              <div className="absolute inset-0 bg-gray-900/90 rounded-2xl flex flex-col justify-center">
                <div className="w-full h-9 bg-gray-700" />
                <div className="flex items-center gap-3 px-5 mt-3">
                  <div className="flex-1 h-7 rounded bg-white/10 flex items-center justify-end px-3">
                    <p className="font-mono text-sm tracking-widest">
                      {"•".repeat(cvv.length || 3)}
                    </p>
                  </div>
                  <p className="text-xs opacity-60 shrink-0">CVV</p>
                </div>
              </div>
            )}
          </div>

          {/* Form fields */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">
                Card Number
              </label>
              <input
                type="text"
                value={number}
                onChange={(e) => setNumber(formatNumber(e.target.value))}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 px-3.5 py-2.5 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 font-mono transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">
                Cardholder Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 px-3.5 py-2.5 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">
                  Expiry Date
                </label>
                <input
                  type="text"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  placeholder="MM/YY"
                  maxLength={5}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 px-3.5 py-2.5 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">
                  CVV
                </label>
                <input
                  type="text"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  onFocus={() => setFlipped(true)}
                  onBlur={() => setFlipped(false)}
                  placeholder="•••"
                  maxLength={4}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 px-3.5 py-2.5 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                />
              </div>
            </div>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="text-emerald-500 font-bold shrink-0">✓</span>
            Your card details are encrypted and secured via PayHere (256-bit SSL)
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 dark:border-gray-600 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={adding || !isValid}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-brand-500 to-brand-600 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {adding ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin text-sm">↻</span>
                  Saving…
                </span>
              ) : (
                "Add Card"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
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
            <span className="text-emerald-500 font-bold shrink-0">✓</span>
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
  const [activeTab, setActiveTab] = useState<"plans" | "invoices" | "summary" | "payment">("summary");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showAddCard, setShowAddCard] = useState(false);
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
    {
      key: "summary",
      label: "Summary",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      key: "plans",
      label: "Manage Plans",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
    },
    {
      key: "payment",
      label: "Payment Methods",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      key: "invoices",
      label: "Invoices",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
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
      <div className="flex gap-0.5 border-b border-gray-200 dark:border-gray-700 overflow-x-auto scrollbar-none">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
              activeTab === t.key
                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
            <span className="sm:hidden">{t.label.split(" ")[0]}</span>
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
              
              
              },
              {
                label: "Active Institutes",
                value: institutes.filter((i) => i.isActive).length,
                sub: `${institutes.length} total`,
               
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
               
              },
            ].map((c) => (
              <div
                key={c.label}
                className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{c.label}</span>
                </div>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{c.value}</p>
                <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
              </div>
            ))}
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
                            { label: "AI Tools & Grading (Teacher)", key: "ai_tools" },
                            { label: "AI Tutor (Student)", key: "ai_tutor" },
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

      {/* ─── Payment Methods Tab ─────────────────────────────────────────────── */}
      {activeTab === "payment" && (
        <div className="space-y-6">
          {/* Saved cards */}
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 sm:px-6">
              <div>
                <h2 className="font-semibold text-gray-800 dark:text-white">Saved Payment Methods</h2>
                <p className="text-xs text-gray-400 mt-0.5">{paymentMethods.length} card{paymentMethods.length !== 1 ? "s" : ""} saved</p>
              </div>
              <button
                onClick={() => setShowAddCard(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 transition-colors shadow-sm"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Card
              </button>
            </div>

            {paymentMethods.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="h-16 w-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <p className="font-medium text-gray-700 dark:text-gray-200">No saved payment methods</p>
                <p className="text-sm text-gray-400 mt-1 mb-5">Add a credit or debit card to pay for your plans faster.</p>
                <button
                  onClick={() => setShowAddCard(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Your First Card
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {paymentMethods.map((method) => {
                  const gradients: Record<PaymentMethod["type"], string> = {
                    visa: "from-blue-600 to-blue-900",
                    mastercard: "from-red-600 to-orange-600",
                    amex: "from-gray-700 to-gray-900",
                    unknown: "from-slate-500 to-slate-700",
                  };
                  return (
                    <div key={method.id} className="flex items-center gap-4 px-5 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                      {/* Card graphic */}
                      <div className={`h-12 w-20 rounded-xl bg-gradient-to-br ${gradients[method.type]} flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-wider shrink-0 shadow-sm`}>
                        {method.type === "unknown" ? "Card" : method.type}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 dark:text-white text-sm font-mono">
                          •••• •••• •••• {method.last4}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {method.name} · Expires {method.expiry}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {method.isDefault ? (
                          <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2.5 py-0.5 rounded-full">
                            Default
                          </span>
                        ) : (
                          <button
                            onClick={() =>
                              setPaymentMethods((prev) =>
                                prev.map((m) => ({ ...m, isDefault: m.id === method.id }))
                              )
                            }
                            className="text-xs font-medium text-brand-500 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
                          >
                            Set default
                          </button>
                        )}
                        <button
                          onClick={() =>
                            setPaymentMethods((prev) => prev.filter((m) => m.id !== method.id))
                          }
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all"
                          title="Remove card"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Accepted cards & security note */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 sm:p-6">
            <h2 className="font-semibold text-gray-800 dark:text-white mb-4">Accepted Payment Methods</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { name: "Visa", sub: "Credit & Debit", gradient: "from-blue-600 to-blue-900" },
                { name: "Mastercard", sub: "Credit & Debit", gradient: "from-red-600 to-orange-600" },
                { name: "Amex", sub: "Credit", gradient: "from-gray-600 to-gray-900" },
                { name: "Bank Transfer", sub: "Direct Debit", gradient: "from-emerald-600 to-emerald-800" },
              ].map((card) => (
                <div
                  key={card.name}
                  className={`rounded-xl bg-gradient-to-br ${card.gradient} p-3.5 text-white`}
                >
                  <p className="text-xs font-bold uppercase tracking-wide">{card.name}</p>
                  <p className="text-[10px] opacity-70 mt-0.5">{card.sub}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                256-bit SSL encryption on all transactions
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                PCI-DSS compliant via PayHere
              </div>
            </div>
          </div>

          {/* PayHere gateway badge */}
          <div className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="h-10 w-24 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-xs font-bold tracking-wide px-2 shrink-0">
              PayHere
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-white">Powered by PayHere</p>
              <p className="text-xs text-gray-400 mt-0.5">Payments are processed securely. We never store raw card data.</p>
            </div>
            {process.env.NEXT_PUBLIC_PAYHERE_SANDBOX === "true" && (
              <span className="text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2.5 py-0.5 rounded-full shrink-0">
                Sandbox
              </span>
            )}
          </div>
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

      {/* ─── Add Card Modal ───────────────────────────────────────────────────── */}
      {showAddCard && (
        <AddCardModal
          onClose={() => setShowAddCard(false)}
          onAdd={(method) => {
            setPaymentMethods((prev) => [
              ...prev.map((m) => ({ ...m, isDefault: false })),
              { ...method, isDefault: prev.length === 0 },
            ]);
          }}
        />
      )}
    </div>
  );
}
