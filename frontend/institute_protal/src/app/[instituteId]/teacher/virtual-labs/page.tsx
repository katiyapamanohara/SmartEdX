"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  SIMULATIONS,
  SUBJECT_META,
  DIFFICULTY_COLORS,
  type Simulation,
} from "@/lib/simulationCatalog";
import { instituteService } from "@/services/instituteService";
import { useInstituteFeatures } from "@/hooks/useInstituteFeatures";

type Module = { id: string; title: string };
type Course = { id: string; title: string; modules?: Module[] };

export default function TeacherVirtualLabsPage() {
  const params = useParams();
  const instituteId = params.instituteId as string;

  const { isLoading: featuresLoading } = useInstituteFeatures({
    requiredFeature: "virtual_labs",
    redirectTo: `/${instituteId}/teacher`,
  });

  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Simulation | null>(null);
  const [previewSim, setPreviewSim] = useState<Simulation | null>(null);

  // Assign modal state
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [modules, setModules] = useState<Module[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);

  const subjects = ["all", ...Object.keys(SUBJECT_META)];
  const difficulties = ["all", "beginner", "intermediate", "advanced"];

  const filtered = SIMULATIONS.filter((sim) => {
    const matchesSearch =
      search === "" ||
      sim.title.toLowerCase().includes(search.toLowerCase()) ||
      sim.topic.toLowerCase().includes(search.toLowerCase()) ||
      sim.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesSubject = subjectFilter === "all" || sim.subject === subjectFilter;
    const matchesDifficulty = difficultyFilter === "all" || sim.difficulty === difficultyFilter;
    return matchesSearch && matchesSubject && matchesDifficulty;
  });

  useEffect(() => {
    if (!selected) return;
    const fetchCourses = async () => {
      setLoadingCourses(true);
      try {
        const data = await instituteService.getCourses(instituteId);
        setCourses(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
  }, [selected, instituteId]);

  useEffect(() => {
    if (!selectedCourseId) {
      setModules([]);
      setSelectedModuleId("");
      return;
    }
    const fetchModules = async () => {
      try {
        const mods = await instituteService.getCourseModules(instituteId, selectedCourseId);
        setModules(Array.isArray(mods) ? mods : []);
        setSelectedModuleId(mods[0]?.id ?? "");
      } catch (e) {
        console.error(e);
        setModules([]);
      }
    };
    fetchModules();
  }, [selectedCourseId, instituteId]);

  const handleAssign = async () => {
    if (!selected || !selectedCourseId || !selectedModuleId) return;
    setIsAssigning(true);
    try {
      await instituteService.createTeacherContent(instituteId, selectedCourseId, selectedModuleId, {
        title: selected.title,
        description: selected.description,
        type: "simulation",
        url: selected.url,
        order: 99,
      });
      setAssignSuccess(true);
      setTimeout(() => {
        setAssignSuccess(false);
        setSelected(null);
        setSelectedCourseId("");
        setSelectedModuleId("");
      }, 2000);
    } catch (e) {
      console.error(e);
      alert("Failed to assign simulation. Please try again.");
    } finally {
      setIsAssigning(false);
    }
  };

  if (featuresLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Virtual Labs</h1>
        <p className="text-sm text-gray-500 mt-1">
          Browse and assign interactive simulations to your course modules.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <input
          type="text"
          placeholder="Search simulations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 outline-none"
        >
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s === "all"
                ? "All Subjects"
                : `${SUBJECT_META[s]?.icon ?? ""} ${SUBJECT_META[s]?.label ?? s}`}
            </option>
          ))}
        </select>
        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
          className="px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 outline-none"
        >
          {difficulties.map((d) => (
            <option key={d} value={d}>
              {d === "all" ? "All Levels" : d.charAt(0).toUpperCase() + d.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <p className="text-xs text-gray-400">
        Showing {filtered.length} of {SIMULATIONS.length} simulations
      </p>

      {/* Simulation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((sim) => {
          const meta = SUBJECT_META[sim.subject];
          return (
            <div
              key={sim.id}
              className="flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Color header */}
              <div
                className="h-24 flex items-center justify-center text-4xl"
                style={{ background: meta?.color ?? "#e5e7eb" }}
              >
                {meta?.icon ?? "🔬"}
              </div>

              <div className="flex-1 p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white leading-tight">
                    {sim.title}
                  </h3>
                  <span
                    className={`shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-full ${DIFFICULTY_COLORS[sim.difficulty]}`}
                  >
                    {sim.difficulty}
                  </span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">{sim.description}</p>

                <div className="flex flex-wrap gap-1 pt-1">
                  {sim.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1 text-[10px] text-gray-400">
                  <span>{meta?.label ?? sim.subject}</span>
                  <span>{sim.platform}</span>
                </div>
              </div>

              <div className="p-4 pt-0 flex gap-2">
                <button
                  onClick={() => setPreviewSim(sim)}
                  className="flex-1 py-2 text-xs font-semibold border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Preview
                </button>
                <button
                  onClick={() => {
                    setSelected(sim);
                    setAssignSuccess(false);
                  }}
                  className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Assign
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-sm font-medium">No simulations match your filters.</p>
        </div>
      )}

      {/* Preview Modal */}
      {previewSim && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <div>
                <h2 className="text-base font-bold text-gray-800 dark:text-white">{previewSim.title}</h2>
                <p className="text-xs text-gray-500">{previewSim.topic} · {previewSim.platform}</p>
              </div>
              <button
                onClick={() => setPreviewSim(null)}
                className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={previewSim.url}
                title={previewSim.title}
                className="w-full h-full min-h-[500px]"
                allow="fullscreen"
                style={{ border: "none" }}
              />
            </div>
            <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
              <button
                onClick={() => setPreviewSim(null)}
                className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelected(previewSim);
                  setPreviewSim(null);
                }}
                className="px-5 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Assign to Module
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-800 dark:text-white">Assign Simulation</h2>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center gap-3">
              <span className="text-2xl">{SUBJECT_META[selected.subject]?.icon ?? "🔬"}</span>
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-white">{selected.title}</p>
                <p className="text-xs text-gray-500">{selected.topic}</p>
              </div>
            </div>

            {assignSuccess ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-2">✅</div>
                <p className="text-sm font-bold text-green-600">Simulation assigned successfully!</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Select Course</label>
                    {loadingCourses ? (
                      <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        Loading courses...
                      </div>
                    ) : (
                      <select
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 outline-none"
                      >
                        <option value="">Choose a course...</option>
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {selectedCourseId && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Select Module</label>
                      <select
                        value={selectedModuleId}
                        onChange={(e) => setSelectedModuleId(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 outline-none"
                      >
                        <option value="">Choose a module...</option>
                        {modules.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setSelected(null)}
                    className="flex-1 py-2.5 text-sm text-gray-500 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssign}
                    disabled={isAssigning || !selectedCourseId || !selectedModuleId}
                    className="flex-1 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isAssigning ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Assigning...
                      </>
                    ) : (
                      "Assign to Module"
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
