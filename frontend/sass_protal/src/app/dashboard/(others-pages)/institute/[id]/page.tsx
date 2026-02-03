"use client";

import React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ApexOptions } from "apexcharts";

// Dynamically import Chart to avoid SSR issues
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export default function InstituteCustomizePage() {
    const params = useParams();
    const instituteId = params?.id as string;
    const instituteName = "testing-assistant"; // Mock name based on ID in real app

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Customize Assistant
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Customize your assistant settings and preferences.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
             <span>Assistants</span>
             <span>{">"}</span>
             <span className="text-gray-800 dark:text-white">{instituteName}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content Area - mimicking the dashboard view in the image */}
          <div className="lg:col-span-1 space-y-6 hidden lg:block">
              {/* Sidebar-like card for the assistant info */}
              <div className="p-5 border border-gray-200 rounded-2xl bg-white dark:bg-gray-900 dark:border-gray-800">
                  <div className="flex items-center gap-3 mb-6">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-800 dark:text-white">{instituteName}</h3>
                            <span className="px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-800 text-gray-500">NOT PUBLISHED</span>
                        </div>
                  </div>

                  <nav className="space-y-1">
                      <NavItem active>Dashboard</NavItem>
                      <NavItem>Manage Services</NavItem>
                      <NavItem>Agents</NavItem>
                      <NavItem>Knowledge Base</NavItem>
                      <NavItem>Workflows</NavItem>
                      <NavItem>Deployment</NavItem>
                  </nav>
              </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
              {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatsCard title="Total Cost" value="0$" icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                } />
                <StatsCard title="Messages" value="0" icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                } />
                 <StatsCard title="AI Assistants" value="1" icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                } />
                 <StatsCard title="Knowledge Bases" value="0" icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                } />
            </div>

            {/* Charts Grid */}
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Radial Chart */}
                <div className="lg:col-span-1 p-6 border border-gray-200 rounded-2xl bg-white dark:bg-gray-900 dark:border-gray-800">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Monthly Token Usage</h3>
                            <p className="text-sm text-gray-500">Tokens used out of your monthly quota</p>
                        </div>
                         <button className="text-gray-400 hover:text-gray-500">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                        </button>
                    </div>
                     <div className="flex justify-center">
                         <RadialUsageChart />
                     </div>
                     <div className="text-center mt-4">
                         <p className="text-sm text-gray-500">You used 0 tokens this month.</p>
                     </div>
                </div>

                {/* Main Usage Chart */}
                <div className="lg:col-span-2 p-6 border border-gray-200 rounded-2xl bg-white dark:bg-gray-900 dark:border-gray-800">
                     <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">Token Usage</h3>
                         <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                             <button className="px-3 py-1 text-xs font-medium rounded bg-white dark:bg-gray-700 shadow-sm text-gray-800 dark:text-white">Monthly</button>
                             <button className="px-3 py-1 text-xs font-medium rounded text-gray-500 hover:text-gray-700 dark:text-gray-400">Weekly</button>
                             <button className="px-3 py-1 text-xs font-medium rounded text-gray-500 hover:text-gray-700 dark:text-gray-400">Daily</button>
                         </div>
                    </div>
                    <UsageHistoryChart />
                </div>
             </div>
          </div>
      </div>
    </div>
  );
}

// Components

function StatsCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
    return (
        <div className="p-6 border border-gray-200 rounded-2xl bg-white dark:bg-gray-900 dark:border-gray-800">
            <div className="mb-4 text-gray-400 dark:text-gray-500">
                {icon}
            </div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h4>
            <p className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
        </div>
    )
}

function NavItem({ children, active }: { children: React.ReactNode; active?: boolean }) {
    return (
        <div className={`px-4 py-2.5 text-sm font-medium rounded-lg cursor-pointer transition-colors ${
            active 
            ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' 
            : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
        }`}>
            {children}
        </div>
    )
}

function RadialUsageChart() {
    const options: ApexOptions = {
        chart: {
            type: 'radialBar',
        },
        plotOptions: {
            radialBar: {
                startAngle: -90,
                endAngle: 90,
                hollow: {
                    margin: 15,
                    size: '60%',
                },
                track: {
                    background: '#e7e7e7',
                    strokeWidth: '97%',
                    margin: 5, // margin is in pixels
                    dropShadow: {
                        enabled: false,
                    }
                },
                dataLabels: {
                    show: true,
                    name: {
                        show: false,
                    },
                    value: {
                        offsetY: -2,
                        fontSize: '22px',
                        color: undefined,
                        formatter: function (val) {
                            return val + "%";
                        }
                    }
                }
            }
        },
        fill: {
            type: 'gradient',
            gradient: {
                shade: 'light',
                shadeIntensity: 0.4,
                inverseColors: false,
                opacityFrom: 1,
                opacityTo: 1,
                stops: [0, 50, 53, 91]
            },
        },
        labels: ['Usage'],
        colors: ['#465fff'],
    };

    return (
        <ReactApexChart options={options} series={[0]} type="radialBar" height={250} />
    )
}

function UsageHistoryChart() {
    const options: ApexOptions = {
        chart: {
            type: 'bar',
            toolbar: { show: false }
        },
        colors: ['#465fff'],
        plotOptions: {
            bar: {
                borderRadius: 4,
                columnWidth: '20%',
            }
        },
        dataLabels: {
            enabled: false
        },
        xaxis: {
            categories: ['0', '0.5', '1', '1.5', '2'],
            labels: {
                show: false
            },
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
             labels: {
                style: {
                    colors: '#9ca3af'
                }
             }
        },
        grid: {
            borderColor: '#f1f1f1',
             strokeDashArray: 0,
             xaxis: {
                 lines: {
                     show: false
                 } 
             },
             yaxis: {
                 lines: {
                     show: false // hiding grid lines to look cleaner like image
                 }
             },
        }
    };

    return (
        <ReactApexChart options={options} series={[{ name: 'Usage', data: [] }]} type="bar" height={300} />
    )
}

