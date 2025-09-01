import TemplatesPage from "@/components/assistant/Templates";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Assistant Templates | Articom SaaS Dashboard",
  description: "Choose from pre-built templates for your AI assistant",
};

export default function AssistantTemplatesPage() {
  return (
    <div className="h-full flex flex-col">
      <PageBreadcrumb pageTitle="Assistant Templates" />
      <div className="flex-1">
        <TemplatesPage />
      </div>
    </div>
  );
}