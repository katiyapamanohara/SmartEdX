"use client";

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/dashboard/AppHeader";
import AppSidebar from "@/layout/dashboard/AppSidebar";
import Backdrop from "@/layout/dashboard/Backdrop";
import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authService } from "@/services/authService";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const user = authService.getUser();
    if (user) {
      if (user.isNew && pathname !== '/onboard') {
        router.push('/onboard');
      } else if (!user.isNew && pathname === '/onboard') {
        router.push('/dashboard');
      }
    }
  }, [router, pathname]);

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  return (
    <div className="min-h-screen xl:flex">
      {/* Sidebar and Backdrop */}
      <AppSidebar />
      <Backdrop />
      {/* Main Content Area */}
      <div
        className={`flex-1 transition-all  duration-300 ease-in-out ${mainContentMargin}`}
      >
        {/* Header */}
        <AppHeader />
        {/* Page Content */}
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">{children}</div>
      </div>
    </div>
  );
}
