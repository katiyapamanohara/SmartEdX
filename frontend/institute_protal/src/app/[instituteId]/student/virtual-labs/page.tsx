"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { instituteService } from "@/services/instituteService";
import { SUBJECT_META } from "@/lib/simulationCatalog";
import { useInstituteFeatures } from "@/hooks/useInstituteFeatures";

type SimContent = {
  id: string;
  title: string;
  description?: string;
  type: string;
  url: string;
  courseName: string;
  courseId: string;
  moduleName: string;
};

export default function StudentVirtualLabsPage() {
  const params = useParams();
  const instituteId = params.instituteId as string;

  const { isLoading: featuresLoading } = useInstituteFeatures({
    requiredFeature: "virtual_labs",
    redirectTo: `/${instituteId}/student`,
  });

  const [simulations, setSimulations] = useState<SimContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [activeSim, setActiveSim] = useState<SimContent | null>(null);

  useEffect(() => {
    const fetchSimulations = async () => {
      setIsLoading(true);
      try {
        const courses = await instituteService.getMyEnrolledCourses(instituteId);
        const sims: SimContent[] = [];

        for (const course of courses) {
          const modules = await instituteService.getCourseModules(instituteId, course.id);
          for (const mod of modules) {
            const contents = await instituteService.getModuleContents(instituteId, course.id, mod.id);
            for (const content of contents) {
              if (content.type === "simulation") {
                sims.push({
                  id: content.id,
                  title: content.title,
                  description: content.description,
                  type: content.type,
                  url: content.url,
                  courseName: (course as any).title ?? "Course",
                  courseId: course.id,
                  moduleName: (mod as any).title ?? "Module",
                });
              }
            }
          }
        }
        setSimulations(sims);
      } catch (e) {
        console.error("Failed to load virtual labs:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSimulations();
  }, [instituteId]);

  // Detect subject from title keywords for visual grouping
  const detectSubject = (title: string): string => {
    const lower = title.toLowerCase();
    if (lower.includes("physic") || lower.includes("wave") || lower.includes("motion") || lower.includes("force") || lower.includes("energy") || lower.includes("optic")) return "physics";
    if (lower.includes("chem") || lower.includes("acid") || lower.includes("reaction") || lower.includes("molecule") || lower.includes("atom")) return "chemistry";
    if (lower.includes("bio") || lower.includes("cell") || lower.includes("gene") || lower.includes("evolution") || lower.includes("natural")) return "biology";
    if (lower.includes("math") || lower.includes("calcul") || lower.includes("algebr") || lower.includes("geometr") || lower.includes("function")) return "mathematics";
    if (lower.includes("circuit") || lower.includes("electr") || lower.includes("engineer") || lower.includes("signal")) return "engineering";
    return "mathematics"; // default
  };

  const courses = ["all", ...Array.from(new Set(simulations.map((s) => s.courseName)))];

  const filtered = simulations.filter((sim) => {
    const matchesCourse = activeFilter === "all" || sim.courseName === activeFilter;
    const matchesSearch = search === "" || sim.title.toLowerCase().includes(search.toLowerCase());
    return matchesCourse && matchesSearch;
  });

  if (featuresLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[500px] gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Loading your virtual labs...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Virtual Labs</h1>
        <p className="text-sm text-gray-500 mt-1">
          Interactive simulations assigned to your enrolled courses.
        </p>
      </div>

      {simulations.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <p className="text-5xl mb-4">🧪</p>
          <h2 className="text-base font-bold text-gray-700 dark:text-white mb-2">No simulations yet</h2>
          <p className="text-sm text-gray-400 max-w-sm">
            Your teachers haven&apos;t assigned any virtual labs to your courses yet. Check back later!
          </p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="Search simulations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <div className="flex gap-2 flex-wrap">
              {courses.map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveFilter(c)}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    activeFilter === c
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {c === "all" ? "All Courses" : c}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-400">{filtered.length} simulation{filtered.length !== 1 ? "s" : ""} available</p>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((sim) => {
              const subject = detectSubject(sim.title);
              const meta = SUBJECT_META[subject] ?? SUBJECT_META["mathematics"];
              return (
                <div
                  key={sim.id}
                  className="flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <div
                    className="h-20 flex items-center justify-center text-3xl"
                    style={{ background: meta.color }}
                  >
                    {meta.icon}
                  </div>

                  <div className="flex-1 p-4 space-y-2">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-white leading-tight">{sim.title}</h3>
                    {sim.description && (
                      <p className="text-xs text-gray-500 line-clamp-2">{sim.description}</p>
                    )}
                    <div className="flex flex-col gap-1 text-[10px] text-gray-400">
                      <span>📚 {sim.courseName}</span>
                      <span>📁 {sim.moduleName}</span>
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <button
                      onClick={() => setActiveSim(sim)}
                      className="w-full py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Launch Simulation
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-3xl mb-2">🔍</p>
              <p className="text-sm">No simulations match your search.</p>
            </div>
          )}
        </>
      )}

      {/* Fullscreen Simulation Player */}
      {activeSim && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-5 py-3 bg-gray-900 border-b border-gray-700">
            <div>
              <h2 className="text-sm font-bold text-white">{activeSim.title}</h2>
              <p className="text-[10px] text-gray-400">{activeSim.courseName} · {activeSim.moduleName}</p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={activeSim.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Open in New Tab ↗
              </a>
              <button
                onClick={() => setActiveSim(null)}
                className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>

          {/* iFrame */}
          <iframe
            src={activeSim.url}
            title={activeSim.title}
            className="flex-1 w-full"
            allow="fullscreen; autoplay"
            style={{ border: "none" }}
          />
        </div>
      )}
    </div>
  );
}
