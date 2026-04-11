"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/authService";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.replace("/signin");
      return;
    }
    const user = authService.getUser();
    if (user?.role !== "admin") {
      router.replace("/dashboard");
      return;
    }
    setAuthorized(true);
  }, [router]);

  if (!authorized) return null;

  return <>{children}</>;
}
