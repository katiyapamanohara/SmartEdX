"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { authService } from "@/services/authService";
import { studentService } from "@/services/studentService";
import { UserCircleIcon } from "@/icons";

// ─── Face Enrollment Section ──────────────────────────────────────────────────

type FaceStatus = "idle" | "loading-models" | "ready" | "detecting" | "captured" | "saving" | "success" | "error";

function FaceEnrollmentSection({ initialEnrolled }: { initialEnrolled: boolean }) {
  const [enrolled, setEnrolled] = useState(initialEnrolled);
  const [status, setStatus] = useState<FaceStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [removing, setRemoving] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionLoopRef = useRef<number | null>(null);
  const faceapiRef = useRef<any>(null);

  const stopCamera = useCallback(() => {
    if (detectionLoopRef.current) {
      cancelAnimationFrame(detectionLoopRef.current);
      detectionLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setFaceDetected(false);
    setCapturing(false);
    if (status !== "success") setStatus("idle");
  }, [status]);

  const loadModels = async () => {
    setStatus("loading-models");
    setErrorMsg("");
    try {
      const faceapi = (await import("@vladmandic/face-api")).default;
      faceapiRef.current = faceapi;
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      ]);
      return true;
    } catch (e) {
      setErrorMsg("Failed to load face detection models. Please try again.");
      setStatus("error");
      return false;
    }
  };

  const startCamera = async () => {
    setErrorMsg("");
    const ok = await loadModels();
    if (!ok) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
      streamRef.current = stream;
      setShowCamera(true);
      setStatus("ready");

      // Wait for video to be ready
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          startDetectionLoop();
        }
      }, 300);
    } catch {
      setErrorMsg("Camera access denied. Please allow camera permissions.");
      setStatus("error");
    }
  };

  const startDetectionLoop = () => {
    const faceapi = faceapiRef.current;
    if (!faceapi) return;

    const loop = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        detectionLoopRef.current = requestAnimationFrame(loop);
        return;
      }

      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks();

        setFaceDetected(!!detection);

        // Draw overlay on canvas
        if (canvasRef.current && videoRef.current) {
          const dims = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
          faceapi.matchDimensions(canvasRef.current, dims);
          canvasRef.current.getContext("2d")?.clearRect(0, 0, dims.width, dims.height);
          if (detection) {
            const resized = faceapi.resizeResults(detection, dims);
            faceapi.draw.drawDetections(canvasRef.current, resized);
            faceapi.draw.drawFaceLandmarks(canvasRef.current, resized);
          }
        }
      } catch {
        // ignore detection errors in loop
      }

      detectionLoopRef.current = requestAnimationFrame(loop);
    };

    detectionLoopRef.current = requestAnimationFrame(loop);
  };

  const captureAndEnroll = async () => {
    const faceapi = faceapiRef.current;
    if (!faceapi || !videoRef.current) return;

    setCapturing(true);
    setStatus("detecting");
    setErrorMsg("");

    try {
      // Take 5 samples and average the descriptors for accuracy
      const samples: Float32Array[] = [];
      for (let i = 0; i < 5; i++) {
        const result = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 416 }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!result) {
          setErrorMsg("No face detected. Please face the camera directly and try again.");
          setStatus("ready");
          setCapturing(false);
          return;
        }
        samples.push(result.descriptor);
        await new Promise((r) => setTimeout(r, 200));
      }

      // Average the descriptors
      const avg = new Float32Array(128);
      for (const s of samples) s.forEach((v, i) => (avg[i] += v / samples.length));
      const descriptor = Array.from(avg);

      setStatus("saving");
      stopCamera();

      const res = await studentService.enrollFace(descriptor);
      if (res?.faceEnrolled) {
        setEnrolled(true);
        setStatus("success");
      } else {
        setErrorMsg("Failed to save face data. Please try again.");
        setStatus("error");
      }
    } catch (e) {
      setErrorMsg("Face capture failed. Please try again.");
      setStatus("ready");
      setCapturing(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm("Remove your enrolled face? You will need to re-enroll to use face verification.")) return;
    setRemoving(true);
    const res = await studentService.removeFace();
    if (res !== null) setEnrolled(false);
    setRemoving(false);
    setStatus("idle");
  };

  // Clean up on unmount
  useEffect(() => () => stopCamera(), [stopCamera]);

  const statusLabel: Record<FaceStatus, string> = {
    idle: "",
    "loading-models": "Loading AI models…",
    ready: "Camera ready — position your face in the frame",
    detecting: "Capturing face samples…",
    captured: "Face captured",
    saving: "Saving…",
    success: "Face enrolled successfully!",
    error: "",
  };

  return (
    <div className="space-y-4">
      {/* Status banner */}
      {enrolled && status !== "success" && (
        <div className="flex items-center gap-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 px-4 py-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-green-500 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-700 dark:text-green-300">Face enrolled</p>
            <p className="text-xs text-green-600/80 dark:text-green-400/80 mt-0.5">Your face is registered for identity verification during exams.</p>
          </div>
        </div>
      )}

      {status === "success" && (
        <div className="flex items-center gap-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 px-4 py-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-green-500 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
          </svg>
          <p className="text-sm font-medium text-green-700 dark:text-green-300">Face enrolled successfully!</p>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-4 py-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-red-500 shrink-0">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p>
        </div>
      )}

      {/* Camera view */}
      {showCamera && (
        <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-black relative">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full max-h-72 object-cover"
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
          />
          {/* Face indicator */}
          <div className="absolute top-3 left-3">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${faceDetected ? "bg-green-500 text-white" : "bg-gray-800/80 text-gray-300"}`}>
              {faceDetected ? "Face Detected ✓" : "No Face Detected"}
            </span>
          </div>
        </div>
      )}

      {statusLabel[status] && status !== "success" && !errorMsg && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">{statusLabel[status]}</p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {!showCamera && status !== "saving" && (
          <button
            onClick={startCamera}
            disabled={status === "loading-models"}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-60 transition-colors font-medium"
          >
            {status === "loading-models" ? (
              <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>Loading…</>
            ) : (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"/><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"/></svg>
              {enrolled ? "Re-enroll Face" : "Enroll Face"}</>
            )}
          </button>
        )}

        {showCamera && (
          <>
            <button
              onClick={captureAndEnroll}
              disabled={capturing || !faceDetected}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 transition-colors font-medium"
            >
              {capturing ? (
                <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>Capturing…</>
              ) : (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="3"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                Capture &amp; Enroll</>
              )}
            </button>
            <button
              onClick={stopCamera}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
          </>
        )}

        {status === "saving" && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Saving face data…
          </div>
        )}

        {enrolled && !showCamera && status !== "saving" && (
          <button
            onClick={handleRemove}
            disabled={removing}
            className="px-4 py-2 text-sm rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50 transition-colors"
          >
            {removing ? "Removing…" : "Remove Face"}
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500">
        Your face data is converted to a numerical descriptor and stored securely. No images are saved.
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AccountSettingPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const profile = await studentService.getMyProfile();
      if (profile) {
        setUser(profile);
      } else {
        setUser(authService.getUser());
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

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

  const Toggle = ({ label, sublabel, checked, onChange }: { label: string; sublabel?: string; checked: boolean; onChange: () => void }) => (
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
            {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : "Student"}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email || "—"}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 capitalize">
              {typeof user?.role === "string" ? user.role : user?.role?.name || "student"}
            </span>
            {user?.faceEnrolled && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
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
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Register your face to enable identity verification during exams. This helps ensure exam integrity and prevents impersonation.
          </p>
          <FaceEnrollmentSection initialEnrolled={!!user?.faceEnrolled} />
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
  );
}
