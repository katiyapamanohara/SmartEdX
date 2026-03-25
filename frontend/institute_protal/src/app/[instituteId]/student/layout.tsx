"use client";

import { useSidebar } from "@/context/SidebarContext";
import { LiveSessionProvider } from "@/context/LiveSessionContext";
import LivePipWidget from "@/components/live/LivePipWidget";
import StudentHeader from "@/layout/student/StudentHeader";
import StudentSidebar from "@/layout/student/StudentSidebar";
import StudentBackdrop from "@/layout/student/StudentBackdrop";
import React, { useEffect } from "react";
import { useParams } from "next/navigation";
import { authService } from "@/services/authService";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const params = useParams();
  const instituteId = params.instituteId as string;

  useEffect(() => {
    if (instituteId) {
      authService.validateInstitute(instituteId);
    }
  }, [instituteId]);

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  return (
    <LiveSessionProvider>
      <div className="min-h-screen xl:flex">
        <StudentSidebar />
        <StudentBackdrop />
        <div className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}>
          <StudentHeader />
          <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">{children}</div>
        </div>
      </div>
      <LivePipWidget />
    </LiveSessionProvider>
  );
}
