"use client";
import React from 'react';
import dynamic from 'next/dynamic';
const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function AnalyticsPage() {
    // Mock Chart Data
    const performanceSeries = [{
        name: 'Score',
        data: [65, 78, 75, 82, 88, 95]
    }];
    
    const performanceOptions: any = {
        chart: { type: 'area', height: 350, toolbar: { show: false } },
        stroke: { curve: 'smooth', width: 2 },
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.2, stops: [0, 90, 100] } },
        xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] },
        colors: ['#4F46E5']
    };

    const radarSeries = [{
        name: 'Mastery',
        data: [80, 50, 30, 90, 100, 20],
    }];

    const radarOptions: any = {
        chart: { height: 350, type: 'radar', toolbar: { show: false } },
        xaxis: { categories: ['Coding', 'Design', 'Data', 'Writing', 'Math', 'Science'] },
        colors: ['#10B981']
    };


  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Performance Analytics</h1>
                <p className="text-gray-500 dark:text-gray-400">AI-driven insights into your learning journey.</p>
            </div>
            <button className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors">
                Export Report
            </button>
      </div>

        {/* AI Insight Card */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                ✨
            </div>
            <div>
                <h3 className="tex-lg font-bold mb-1">AI Recommendation</h3>
                <p className="text-indigo-100 leading-relaxed">
                    Based on your recent quiz scores, you are excelling in <strong>Web Development</strong> but struggling with <strong>Data Structure</strong> concepts. 
                    We recommend taking the "Advanced Algorithms" refresh module to boost your score by an estimated 15%.
                </p>
            </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Performance Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-4">Overall Performance</h3>
              <div id="chart">
                <ReactApexChart options={performanceOptions} series={performanceSeries} type="area" height={300} />
              </div>
          </div>

          {/* Radar Chart */}
           <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-4">Skill Mastery</h3>
              <div id="radar-chart">
                <ReactApexChart options={radarOptions} series={radarSeries} type="radar" height={300} />
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
              { label: "Hours Learned", value: "124h", change: "+12%", color: "text-blue-600" },
              { label: "Avg. Quiz Score", value: "88%", change: "+5%", color: "text-green-600" },
              { label: "Certificates", value: "4", change: "", color: "text-purple-600" },
              { label: "Class Rank", value: "Top 10%", change: "↑ 2 spots", color: "text-orange-600" },
          ].map((stat, i) => (
               <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                   <p className="text-gray-500 text-xs font-bold uppercase mb-2">{stat.label}</p>
                   <div className="flex items-end gap-2">
                       <span className={`text-3xl font-bold ${stat.color}`}>{stat.value}</span>
                       <span className="text-xs text-gray-400 mb-1">{stat.change}</span>
                   </div>
               </div>
          ))}
      </div>
    </div>
  );
}
