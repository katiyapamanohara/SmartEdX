import Assistant from "@/components/assistant/Assistant";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "AI Assistant | Articom SaaS Dashboard",
  description: "Intelligent AI assistant to help with questions and tasks",
  // other metadata
};

export default function AssistantPage() {
  return (
    <div className="h-full flex flex-col">
      <PageBreadcrumb pageTitle="Assistant" />
      <div className="flex-1">
        <Assistant />
      </div>
    </div>
  );
}