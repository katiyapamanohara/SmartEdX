"use client";

import { useSidebar } from "@/context/SidebarContext";
import InstituteHeader from "@/layout/institute/InstituteHeader";
import InstituteSidebar from "@/layout/institute/InstituteSidebar";
import InstituteBackdrop from "@/layout/institute/InstituteBackdrop";
import React, { useEffect } from "react";
import { useParams } from "next/navigation";
import { authService } from "@/services/authService";

export default function InstituteLayout({
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
    <div className="min-h-screen xl:flex">
      {/* Sidebar and Backdrop */}
      <InstituteSidebar />
      <InstituteBackdrop />
      {/* Main Content Area */}
      <div
        className={`flex-1 transition-all  duration-300 ease-in-out ${mainContentMargin}`}
      >
        {/* Header */}
        <InstituteHeader />
        {/* Page Content */}
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">{children}</div>
      </div>

    </div>
  );
}
