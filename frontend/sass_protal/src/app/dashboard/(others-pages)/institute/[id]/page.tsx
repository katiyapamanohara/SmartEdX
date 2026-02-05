"use client";

import React, { useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { useParams, useSearchParams, useRouter, usePathname } from "next/navigation";
import { ApexOptions } from "apexcharts";

// Dynamically import Chart to avoid SSR issues
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

function InstituteCustomizeContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const instituteId = params?.id as string;
  const activeTab = searchParams.get("tab") || "dashboard";
  const instituteName = "testing-assistant";

  // Form State
  const [name, setName] = useState(instituteName);
  const [description, setDescription] = useState("setting");
  const [category, setCategory] = useState("education");
  const [location, setLocation] = useState("New York");
  const [selectedModel, setSelectedModel] = useState("gpt-4");
  const [logo, setLogo] = useState<string | null>(null);

  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSave = () => {
    console.log("Saving changes:", {
      name,
      description,
      category,
      location,
      selectedModel,
    });
    alert("Changes saved successfully!");
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard title="Total Cost" value="0$" icon={<CostIcon />} />
              <StatsCard title="Messages" value="0" icon={<MsgIcon />} />
              <StatsCard title="AI Assistants" value="1" icon={<AIIcon />} />
              <StatsCard title="Knowledge Bases" value="0" icon={<KBIcon />} />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 p-6 border border-gray-200 rounded-2xl bg-white dark:bg-gray-900 dark:border-gray-800">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Monthly Usage</h3>
                <RadialUsageChart />
                <p className="text-center text-sm text-gray-500 mt-4">You used 0 tokens this month.</p>
              </div>
              <div className="lg:col-span-2 p-6 border border-gray-200 rounded-2xl bg-white dark:bg-gray-900 dark:border-gray-800">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Token History</h3>
                <UsageHistoryChart />
              </div>
            </div>
          </div>
        );
      case "settings":
        return (
          <FormSection title="General Information" description="Basic details about your institute.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Institute Name" value={name} onChange={setName} />
              <Input label="Location" value={location} onChange={setLocation} />
              <div className="md:col-span-2">
                <Select label="Category" value={category} onChange={setCategory}>
                  <option value="education">Education</option>
                  <option value="technology">Technology</option>
                  <option value="business">Business</option>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Textarea label="Description" value={description} onChange={setDescription} />
              </div>
            </div>
          </FormSection>
        );
      case "branding":
        return (
          <FormSection title="Branding" description="Update your institute's visual identity.">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-2xl bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700 overflow-hidden flex items-center justify-center">
                {logo ? <img src={logo} className="w-full h-full object-cover" /> : <UploadIcon />}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-3">
                  <button onClick={() => setLogo(null)} className="px-4 py-2 text-xs font-semibold text-red-500 bg-red-500/10 rounded-lg">Remove</button>
                  <button className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg">Change Logo</button>
                </div>
                <p className="text-xs text-gray-500">Recommended: Square, at least 500x500px.</p>
              </div>
            </div>
          </FormSection>
        );
      case "ai-config":
        return (
          <FormSection title="AI Configuration" description="Control how AI agents behave.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ModelOption 
                name="GPT-4 Turbo" 
                desc="Most capable" 
                active={selectedModel === "gpt-4"} 
                onClick={() => setSelectedModel("gpt-4")} 
              />
              <ModelOption 
                name="GPT-3.5 Turbo" 
                desc="Fast and cost-effective" 
                active={selectedModel === "gpt-3.5"} 
                onClick={() => setSelectedModel("gpt-3.5")} 
              />
            </div>
          </FormSection>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Customize Institute</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your institute settings and preferences.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span className="cursor-pointer hover:underline" onClick={() => router.push('/dashboard/institute')}>Institutes</span>
          <span>{">"}</span>
          <span className="text-gray-800 dark:text-white font-medium">{instituteName}</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <div className="p-5 border border-gray-200 rounded-2xl bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm sticky top-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                <InstituteIcon />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 dark:text-white line-clamp-1">{instituteName}</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-green-500/10 text-green-500">ACTIVE</span>
              </div>
            </div>

            <nav className="space-y-1.5">
              <SideNavItem active={activeTab === "dashboard"} onClick={() => handleTabChange("dashboard")}>Dashboard</SideNavItem>
              <SideNavItem active={activeTab === "settings"} onClick={() => handleTabChange("settings")}>General Settings</SideNavItem>
              <SideNavItem active={activeTab === "branding"} onClick={() => handleTabChange("branding")}>Branding</SideNavItem>
              <SideNavItem active={activeTab === "ai-config"} onClick={() => handleTabChange("ai-config")}>AI Config</SideNavItem>
              <SideNavItem disabled>Billing</SideNavItem>
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          <div className="min-h-[600px]">
            {renderTabContent()}
          </div>
          
          {activeTab !== "dashboard" && (
            <div className="flex items-center justify-end gap-3 p-6 border border-gray-200 rounded-2xl bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm">
              <button className="px-6 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors">Discard</button>
              <button 
                onClick={handleSave} 
                className="px-8 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25"
              >
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InstituteCustomizePage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading settings...</div>}>
      <InstituteCustomizeContent />
    </Suspense>
  );
}

// UI Components

function StatsCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="p-6 border border-gray-200 rounded-2xl bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm">
      <div className="mb-4 text-gray-400">{icon}</div>
      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h4>
      <p className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
    </div>
  );
}

function SideNavItem({ children, active, onClick, disabled }: { children: React.ReactNode; active?: boolean; onClick?: () => void; disabled?: boolean }) {
  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`px-4 py-3 text-sm font-semibold rounded-xl transition-all border ${
        active
          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 border-blue-600"
          : "text-gray-500 border-gray-100 dark:border-gray-800 " + (disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer")
      }`}
    >
      {children}
    </div>
  );
}

function FormSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="p-8 border border-gray-200 rounded-2xl bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm">
      <div className="mb-8">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h3>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{label}</label>
      <input
        type="text"
        className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-800/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{label}</label>
      <div className="relative">
        <select
          className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-800/50 appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {children}
        </select>
        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
      </div>
    </div>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{label}</label>
      <textarea
        rows={4}
        className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-800/50 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function ModelOption({ name, desc, active, onClick }: { name: string; desc: string; active: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`p-5 border-2 rounded-2xl cursor-pointer transition-all ${
        active ? "border-blue-600 bg-blue-50/50 dark:bg-blue-600/5" : "border-gray-100 dark:border-gray-800 hover:border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <h4 className={`font-bold text-sm ${active ? "text-blue-600" : "text-gray-800 dark:text-white"}`}>{name}</h4>
        {active && <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center"><svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></div>}
      </div>
      <p className="text-xs text-gray-500">{desc}</p>
    </div>
  );
}

// Icons

const InstituteIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
const CostIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const MsgIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>;
const AIIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
const KBIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
const UploadIcon = () => <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;

// Charts Logic (Radial)
function RadialUsageChart() {
  const options: ApexOptions = {
    chart: { type: 'radialBar' },
    plotOptions: {
      radialBar: {
        startAngle: -90, endAngle: 90,
        hollow: { size: '65%' },
        track: { background: '#f1f5f9', strokeWidth: '100%' },
        dataLabels: {
          name: { show: false },
          value: { offsetY: -2, fontSize: '24px', fontWeight: 'bold' }
        }
      }
    },
    colors: ['#2563eb'],
    labels: ['Used'],
  };
  return <ReactApexChart options={options} series={[0]} type="radialBar" height={240} />;
}

// Charts Logic (Bar)
function UsageHistoryChart() {
  const options: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    colors: ['#2563eb'],
    plotOptions: { bar: { borderRadius: 6, columnWidth: '30%' } },
    xaxis: { categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], axisBorder: { show: false }, axisTicks: { show: false } },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
  };
  return <ReactApexChart options={options} series={[{ name: 'Usage', data: [0, 0, 0, 0, 0] }]} type="bar" height={250} />;
}
