"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { authService } from "@/services/authService";
import { studentService } from "@/services/studentService";
import { UserCircleIcon } from "@/icons";

// ─── Types ───────────────────────────────────────────────────────────────────

type FaceStatus =
  | "idle"
  | "ready"
  | "capturing"
  | "processing"
  | "saving"
  | "success"
  | "error";

// ─── Face Enrollment Modal ────────────────────────────────────────────────────

function FaceEnrollmentModal({
  onClose,
  onEnrolled,
}: {
  onClose: () => void;
  onEnrolled: () => void;
}) {
  const [status, setStatus] = useState<FaceStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [cameraReady, setCameraReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  // Assign srcObject after render so autoPlay can start cleanly
  useEffect(() => {
    if (cameraReady && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraReady]);

  // Start camera on mount
  useEffect(() => {
    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        });
        streamRef.current = stream;
        setStatus("ready");
        setCameraReady(true); // triggers the srcObject effect above
      } catch {
        setErrorMsg("Camera access denied. Please allow camera permissions.");
        setStatus("error");
      }
    }
    initCamera();
    return () => stopCamera();
  }, [stopCamera]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && status !== "processing" && status !== "saving") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  const captureAndEnroll = async () => {
    if (!videoRef.current) return;
    setStatus("capturing");
    setErrorMsg("");

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const imageB64 = canvas.toDataURL("image/jpeg", 0.92);

    stopCamera();
    setStatus("processing");

    try {
      const extracted = await studentService.enrollFaceFromBase64(imageB64);
      if (!extracted) throw new Error("No response from face server");

      setStatus("saving");
      const saved = await studentService.enrollFace(extracted.descriptor);
      if (saved?.faceEnrolled) {
        setStatus("success");
        setTimeout(() => {
          onEnrolled();
          onClose();
        }, 1800);
      } else {
        throw new Error("Failed to save face data");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Face enrollment failed. Please try again.");
      setStatus("error");
    }
  };

  const retryCamera = async () => {
    setErrorMsg("");
    setStatus("idle");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      setStatus("ready");
      setCameraReady(true); // triggers the srcObject effect above
    } catch {
      setErrorMsg("Camera access denied. Please allow camera permissions.");
      setStatus("error");
    }
  };

  const isBusy =
    status === "capturing" || status === "processing" || status === "saving";

  // Step indicators
  const steps: { key: FaceStatus[]; label: string }[] = [
    { key: ["idle", "ready"], label: "Position Face" },
    { key: ["capturing", "processing"], label: "Analyzing" },
    { key: ["saving"], label: "Saving" },
    { key: ["success"], label: "Done" },
  ];

  const activeStep =
    status === "success"
      ? 3
      : status === "saving"
      ? 2
      : status === "capturing" || status === "processing"
      ? 1
      : 0;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isBusy) handleClose();
      }}
    >
      {/* Modal card */}
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="text-brand-600 dark:text-brand-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
                Face Enrollment
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Powered by Facenet512
              </p>
            </div>
          </div>
          {!isBusy && (
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-0 px-6 py-3 bg-gray-50 dark:bg-gray-800/50">
          {steps.map((step, i) => (
            <React.Fragment key={i}>
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    i < activeStep
                      ? "bg-green-500 text-white"
                      : i === activeStep
                      ? "bg-brand-500 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-400"
                  }`}
                >
                  {i < activeStep ? (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`text-xs font-medium ${
                    i === activeStep
                      ? "text-brand-600 dark:text-brand-400"
                      : i < activeStep
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-px mx-2 ${i < activeStep ? "bg-green-400" : "bg-gray-200 dark:bg-gray-700"}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Camera preview / status area */}
          <div className="relative rounded-xl overflow-hidden bg-gray-900 aspect-video flex items-center justify-center">
            {/* Video element — always rendered so ref works */}
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                cameraReady && status === "ready" ? "opacity-100" : "opacity-0"
              }`}
            />

            {/* Face guide overlay */}
            {cameraReady && status === "ready" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-40 h-52 border-2 border-dashed border-white/60 rounded-full opacity-70" />
              </div>
            )}

            {/* Live badge */}
            {cameraReady && status === "ready" && (
              <div className="absolute top-3 left-3">
                <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-500 text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  LIVE
                </span>
              </div>
            )}

            {/* Spinner overlay for processing states */}
            {isBusy && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 gap-3">
                <svg className="animate-spin w-8 h-8 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <p className="text-sm text-gray-300 font-medium">
                  {status === "capturing" && "Capturing…"}
                  {status === "processing" && "Analyzing face with AI…"}
                  {status === "saving" && "Saving face data…"}
                </p>
                {status === "processing" && (
                  <p className="text-xs text-gray-500 text-center px-6">
                    DeepFace is extracting your 512-d biometric descriptor
                  </p>
                )}
              </div>
            )}

            {/* Success overlay */}
            {status === "success" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-900/80 gap-3">
                <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <p className="text-green-300 font-semibold text-sm">Face Enrolled Successfully!</p>
              </div>
            )}

            {/* Error / idle — no camera */}
            {!cameraReady && !isBusy && status !== "success" && (
              <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
                {status === "error" ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-red-400">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                    <p className="text-sm text-red-400">{errorMsg}</p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-gray-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-400">Starting camera…</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Instructions */}
          {status === "ready" && (
            <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 px-3 py-2.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-blue-500 shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
              </svg>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Centre your face inside the oval guide. Ensure good lighting and look directly at the camera, then click <strong>Capture</strong>.
              </p>
            </div>
          )}

          {/* Error message (after processing failure) */}
          {status === "error" && errorMsg && cameraReady === false && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-3 py-2.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-red-500 shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-xs text-red-600 dark:text-red-400">{errorMsg}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            {status === "ready" && (
              <button
                onClick={captureAndEnroll}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition-colors text-sm font-semibold"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="3" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                </svg>
                Capture &amp; Enroll
              </button>
            )}

            {status === "error" && (
              <button
                onClick={retryCamera}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition-colors text-sm font-semibold"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
            )}

            {!isBusy && status !== "success" && (
              <button
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-sm"
              >
                Cancel
              </button>
            )}
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            Only a 512-d numerical descriptor is stored — no images are saved on our servers.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AccountSettingPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const profile = await studentService.getMyProfile();
      const resolved = profile ?? authService.getUser();
      setUser(resolved);
      setEnrolled(!!resolved?.faceEnrolled);
      setLoading(false);
    }
    loadProfile();
  }, []);

  const handleRemove = async () => {
    if (!confirm("Remove your enrolled face? You will need to re-enroll to use face verification.")) return;
    setRemoving(true);
    const res = await studentService.removeFace();
    if (res !== null) setEnrolled(false);
    setRemoving(false);
  };

  const [notifications, setNotifications] = useState({
    emailAssignments: true,
    emailMessages: true,
    sessionReminders: false,
    pushAll: false,
  });

  const toggle = (key: keyof typeof notifications) =>
    setNotifications((p) => ({ ...p, [key]: !p[key] }));

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
      <div className="px-6 py-4">
        <h2 className="font-semibold text-gray-800 dark:text-white">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-5">{children}</div>
    </div>
  );

  const Toggle = ({
    label,
    sublabel,
    checked,
    onChange,
  }: {
    label: string;
    sublabel?: string;
    checked: boolean;
    onChange: () => void;
  }) => (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-800 dark:text-white/90">{label}</p>
        {sublabel && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sublabel}</p>}
      </div>
      <label className="inline-flex items-center cursor-pointer shrink-0">
        <input type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} />
        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-500" />
      </label>
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-6 max-w-2xl mx-auto py-10 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  return (
    <>
      {/* Face Enrollment Modal */}
      {showEnrollModal && (
        <FaceEnrollmentModal
          onClose={() => setShowEnrollModal(false)}
          onEnrolled={() => setEnrolled(true)}
        />
      )}

      <div className="flex flex-col gap-6 max-w-2xl mx-auto">
        <div className="py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your account and preferences</p>
        </div>

        {/* Avatar + Name Banner */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 p-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center shrink-0">
            {user?.firstName ? (
              <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                {user.firstName.charAt(0).toUpperCase()}
              </span>
            ) : (
              <UserCircleIcon className="w-10 h-10 text-brand-400" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-lg">
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : "Student"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email || "—"}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 capitalize">
                {typeof user?.role === "string" ? user.role : user?.role?.name || "student"}
              </span>
              {enrolled && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  Face Enrolled
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <Section title="Profile Information">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">First Name</label>
                <div className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
                  {user?.firstName || "—"}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Last Name</label>
                <div className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
                  {user?.lastName || "—"}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email Address</label>
              <div className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
                {user?.email || "—"}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Role</label>
              <div className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 capitalize">
                {typeof user?.role === "string" ? user.role : user?.role?.name || "Student"}
              </div>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Profile details are managed by your institute administrator.
            </p>
          </div>
        </Section>

        {/* Face Recognition */}
        <Section title="Face Recognition">
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Register your face to enable identity verification during exams. This helps ensure exam integrity and prevents impersonation.
            </p>

            {/* Enrolled status card */}
            {enrolled && (
              <div className="flex items-center gap-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-green-600 dark:text-green-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-700 dark:text-green-300">Face registered</p>
                  <p className="text-xs text-green-600/80 dark:text-green-400/80 mt-0.5">
                    Your biometric descriptor is active for exam identity verification.
                  </p>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowEnrollModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition-colors font-semibold"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                </svg>
                {enrolled ? "Re-enroll Face" : "Enroll Face"}
              </button>

              {enrolled && (
                <button
                  onClick={handleRemove}
                  disabled={removing}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-xl border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                >
                  {removing ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Removing…
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                      Remove Face
                    </>
                  )}
                </button>
              )}
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500">
              Your face is processed by our AI server (Facenet512 model). Only a numerical descriptor is stored — no images are saved.
            </p>
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <Toggle
            label="Assignment Deadlines"
            sublabel="Get emailed when an assignment deadline is approaching"
            checked={notifications.emailAssignments}
            onChange={() => toggle("emailAssignments")}
          />
          <Toggle
            label="New Messages"
            sublabel="Email alerts for messages from your teachers"
            checked={notifications.emailMessages}
            onChange={() => toggle("emailMessages")}
          />
          <Toggle
            label="Session Reminders"
            sublabel="Reminder 15 minutes before a live class starts"
            checked={notifications.sessionReminders}
            onChange={() => toggle("sessionReminders")}
          />
          <Toggle
            label="Push Notifications"
            sublabel="Browser push notifications for all activity"
            checked={notifications.pushAll}
            onChange={() => toggle("pushAll")}
          />
        </Section>

        {/* Account */}
        <Section title="Account">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">Sign Out</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Sign out from your current session</p>
            </div>
            <button
              onClick={() => authService.logout()}
              className="px-4 py-2 text-sm rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </Section>
      </div>
    </>
  );
}
