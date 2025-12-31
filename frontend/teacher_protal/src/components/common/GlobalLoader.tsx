"use client";

import React, { useEffect, useState } from "react";

let globalLoadingState = false;
let listeners: Array<() => void> = [];

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

export const setGlobalLoading = (loading: boolean) => {
  globalLoadingState = loading;
  notifyListeners();
};

export const useGlobalLoading = () => {
  // small state to force updates when globalLoadingState changes
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  return globalLoadingState;
};

const GlobalLoader: React.FC = () => {
  const isLoading = useGlobalLoading();

  if (!isLoading) return null;

  return (
    <div
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" />
      <div className="z-10 pointer-events-auto">
        <div className="flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-t-transparent border-white rounded-full animate-spin" />
        </div>
      </div>
    </div>
  );
};

export default GlobalLoader;
